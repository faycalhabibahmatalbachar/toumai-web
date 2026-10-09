"use client";

import { Check, Forward, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";

import { getWaCarnet, type WaContact } from "@/lib/connectors-api";
import { errorMessage } from "@/lib/errors";
import {
  getWaMessageMediaBlob, sendWaManualMessage, sendWaMedia, uploadWaAttachment,
  type WaLiveMessage, type WaMediaType,
} from "@/lib/whatsapp-enterprise-api";

const supportedMedia: WaMediaType[] = ["image", "video", "gif", "voice", "audio", "document", "sticker"];
function transportType(type: string): WaMediaType | null {
  const normalized = type === "voix" ? "voice" : type;
  return supportedMedia.includes(normalized as WaMediaType) ? normalized as WaMediaType : null;
}

export function canForwardWhatsAppMessage(message: WaLiveMessage) {
  return Boolean(message.text?.trim()) || Boolean(transportType(message.type));
}

export function WhatsAppForwardMessageModal({
  message,
  onClose,
}: {
  message: WaLiveMessage | null;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [contacts, setContacts] = useState<WaContact[]>([]);
  const [recipient, setRecipient] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!message) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const found = await getWaCarnet(query.trim(), { revalidate: true });
        if (!cancelled) setContacts(found.contacts.slice(0, 10));
      } catch {
        if (!cancelled) setContacts([]);
      }
    }, 220);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [message, query]);

  if (!message) return null;

  const cleaned = recipient.replace(/[^0-9]/g, "");
  const target = recipient.includes("@") ? recipient.trim() : cleaned;
  const valid = recipient.includes("@") ? /^(?:[0-9]+)@(s\.whatsapp\.net|g\.us)$/.test(target) : cleaned.length >= 7 && cleaned.length <= 15;

  async function forwardCopy() {
    if (!message || busy || !valid) return;
    setBusy(true);
    setError("");
    try {
      const mediaType = transportType(message.type);
      if (mediaType) {
        // Read using the authenticated media endpoint; never send a private
        // original media URL directly to a second user.
        const blob = await getWaMessageMediaBlob(message.id);
        const fileName = message.file_name || `transfert-${message.id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0,32)}`;
        const file = new File([blob], fileName, { type: blob.type || message.mime_type || "application/octet-stream" });
        const uploaded = await uploadWaAttachment(file, { requestedType: mediaType });
        const result = await sendWaMedia({
          to: target,
          type: mediaType,
          url: uploaded.url,
          mimetype: uploaded.content_type || file.type,
          filename: uploaded.file_name || file.name,
          caption: message.text?.trim() || undefined,
          confirmed: true,
        });
        if (!result.accepted_by_gateway) throw new Error("La passerelle n’a pas accepté le partage.");
      } else if (message.text?.trim()) {
        const result = await sendWaManualMessage({ to: target, message: message.text.trim() });
        if (!result.accepted_by_gateway) throw new Error("La passerelle n’a pas accepté le partage.");
      } else return;
      setAccepted(true);
    } catch (err) {
      setError(errorMessage(err, "generic"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center px-4 py-6">
      <button type="button" aria-label="Fermer le transfert" className="absolute inset-0 bg-black/75" onClick={busy ? undefined : onClose} />
      <section role="dialog" aria-modal="true" aria-labelledby="wa-forward-title" className="relative z-10 w-full max-w-[420px] rounded-2xl border border-[#293b43] bg-[#101d26] p-5 text-[#f4f7f9] shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <Forward size={20} color="#08c875" />
          <h2 id="wa-forward-title" className="min-w-0 flex-1 text-[16px] font-semibold">Transférer une copie</h2>
          <button type="button" aria-label="Fermer" onClick={onClose} disabled={busy}><X size={19}/></button>
        </div>
        {accepted ? (
          <div role="status" className="space-y-3">
            <p className="flex items-center gap-2 text-sm"><Check size={17} color="#08c875" /> Partage accepté par la passerelle.</p>
            <p className="text-xs text-[#a8b9c2]">La livraison sur WhatsApp reste à confirmer.</p>
            <button type="button" onClick={onClose} className="rounded-lg bg-[#08c875] px-5 py-2 text-sm text-[#052017]">Fermer</button>
          </div>
        ) : (
          <>
            <p className="mb-3 text-[12px] text-[#a8b9c2]">Envoyez une nouvelle copie du {transportType(message.type) ? "média" : "texte"}. Cette action ne crée pas le marqueur officiel « Transféré » de WhatsApp.</p>
            <label htmlFor="wa-forward-recipient" className="text-[12px]">Contact ou numéro international</label>
            <input id="wa-forward-recipient" className="mt-1 h-11 w-full rounded-lg border border-[#31434d] bg-[#172632] px-3 text-sm outline-none focus:border-[#08c875]" value={query} onChange={(event) => { setQuery(event.target.value); setRecipient(event.target.value); }} placeholder="+235…" />
            {contacts.length > 0 && (
              <div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-[#2c3e48]">
                {contacts.map((contact) => (
                  <button key={contact.jid} type="button" onClick={() => { setRecipient(contact.jid); setQuery(contact.name || contact.number || contact.jid); setContacts([]); }} className="block w-full truncate px-3 py-2 text-left text-xs hover:bg-white/10">
                    {contact.name || contact.number || contact.jid}
                  </button>
                ))}
              </div>
            )}
            {error && <p role="alert" className="mt-3 text-xs text-[#ffb4b4]">{error}</p>}
            <button type="button" disabled={!valid || busy} onClick={() => void forwardCopy()} className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#08c875] text-sm font-semibold text-[#052017] disabled:opacity-40">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Forward size={16} />} Confirmer le transfert
            </button>
          </>
        )}
      </section>
    </div>
  );
}
