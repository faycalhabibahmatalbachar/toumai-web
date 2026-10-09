"use client";

import { Loader2, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { WhatsAppProfileAvatar } from "@/components/whatsapp/WhatsAppProfileAvatar";
import { getWaCarnet, getWaProfilePictures, type WaContact } from "@/lib/connectors-api";
import { errorMessage } from "@/lib/errors";
import { displayWhatsAppIdentity, displayWhatsAppSecondary } from "@/lib/whatsapp-display";
import { sendWaContactCard, type WaLiveConversation } from "@/lib/whatsapp-enterprise-api";

const SURFACE = "#0d1923";
const RAISED = "#101e29";
const BORDER = "#1e2c36";
const TEXT = "#f4f7f9";
const MUTED = "#9ba8b3";
const FAINT = "#6f7f8d";
const GREEN = "#08c875";

export function WhatsAppContactShareModal({
  open,
  conversation,
  onClose,
  onSent,
}: {
  open: boolean;
  conversation: WaLiveConversation | null;
  onClose: () => void;
  onSent: () => void;
}) {
  const [query, setQuery] = useState("");
  const [contacts, setContacts] = useState<WaContact[]>([]);
  const [selected, setSelected] = useState<WaContact | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const shortlist = (await getWaCarnet(query.trim() || undefined)).contacts.slice(0, 80);
        let pictures: Record<string, string | null> = {};
        try {
          pictures = await getWaProfilePictures(shortlist.map((contact) => contact.jid));
        } catch {
          // Le partage reste disponible si WhatsApp ne donne pas certaines photos.
        }
        if (!cancelled) {
          setContacts(
            shortlist.map((contact) => ({
              ...contact,
              picture_url: pictures[contact.jid] ?? contact.picture_url ?? null,
            })),
          );
        }
      } catch (exc) {
        if (!cancelled) {
          setContacts([]);
          setError(errorMessage(exc, "history"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, query.trim() ? 180 : 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, query]);

  const selectedTarget = useMemo(() => {
    if (!selected) return "";
    return selected.number || selected.jid || selected.name;
  }, [selected]);

  if (!open || !conversation) return null;

  const activeConversation = conversation;

  function close() {
    if (busy) return;
    setQuery("");
    setContacts([]);
    setSelected(null);
    setError(null);
    onClose();
  }

  async function submit() {
    if (!selected || !selectedTarget || busy) return;
    setBusy(true);
    setError(null);
    try {
      await sendWaContactCard({
        to: activeConversation.id,
        contact_to_share: selectedTarget,
        display_name: selected.name || selected.number || undefined,
        confirmed: true,
      });
      setQuery("");
      setContacts([]);
      setSelected(null);
      setError(null);
      onSent();
      onClose();
    } catch (exc) {
      setError(errorMessage(exc, "generic"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[98] flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="Fermer le partage de contact"
        className="absolute inset-0 bg-black/70 backdrop-blur-[3px]"
        onClick={close}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="wa-contact-share-title"
        className="relative z-10 flex max-h-[78vh] w-full max-w-[520px] flex-col overflow-hidden rounded-[22px] border shadow-[0_28px_90px_rgba(0,0,0,.46)]"
        style={{ background: SURFACE, borderColor: BORDER, color: TEXT }}
      >
        <header className="flex items-center border-b px-5 py-4" style={{ borderColor: BORDER }}>
          <div className="min-w-0 flex-1">
            <h2 id="wa-contact-share-title" className="text-[16px] font-semibold">Partager un contact</h2>
            <p className="mt-0.5 truncate text-[11px]" style={{ color: MUTED }}>{activeConversation.name}</p>
          </div>
          <button
            type="button"
            aria-label="Fermer"
            onClick={close}
            disabled={busy}
            className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-white/[0.05] disabled:opacity-40"
            style={{ color: MUTED }}
          >
            <X size={18} />
          </button>
        </header>

        <div className="border-b p-4" style={{ borderColor: BORDER }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={15} color={MUTED} />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher un contact"
              className="h-11 w-full rounded-xl border bg-transparent pl-9 pr-3 text-sm outline-none focus:border-[#08c875]"
              style={{ borderColor: BORDER, background: RAISED, color: TEXT }}
            />
          </div>
        </div>

        <div className="min-h-[260px] flex-1 overflow-y-auto p-2">
          {loading && (
            <div className="flex h-40 items-center justify-center gap-2 text-xs" style={{ color: MUTED }}>
              <Loader2 size={17} className="animate-spin" /> Chargement du carnet…
            </div>
          )}
          {!loading && contacts.length === 0 && (
            <div className="flex h-40 items-center justify-center text-center text-xs" style={{ color: FAINT }}>
              Aucun contact trouvé.
            </div>
          )}
          {!loading && contacts.map((contact) => {
            const active = selected?.jid === contact.jid;
            return (
              <button
                key={contact.jid}
                type="button"
                onClick={() => setSelected(contact)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/[0.04]"
                style={{ background: active ? "rgba(8,200,117,.08)" : "transparent" }}
              >
                <WhatsAppProfileAvatar
                  name={displayWhatsAppIdentity({ name: contact.name, number: contact.number, id: contact.jid, kind: "contact" })}
                  kind="contact"
                  pictureUrl={contact.picture_url}
                  size={40}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-semibold">
                    {displayWhatsAppIdentity({ name: contact.name, number: contact.number, id: contact.jid, kind: "contact" })}
                  </span>
                  <span className="mt-0.5 block truncate text-[10px]" style={{ color: FAINT }}>
                    {displayWhatsAppSecondary({ number: contact.number, id: contact.jid, kind: "contact" })}
                  </span>
                </span>
                <span
                  className="h-5 w-5 rounded-full border"
                  style={{
                    borderColor: active ? GREEN : "#52616c",
                    boxShadow: active ? `inset 0 0 0 5px ${GREEN}` : "none",
                  }}
                />
              </button>
            );
          })}
        </div>

        {error && (
          <p className="mx-4 mb-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-300">
            {error}
          </p>
        )}

        <footer className="flex justify-end gap-2 border-t p-4" style={{ borderColor: BORDER }}>
          <button
            type="button"
            onClick={close}
            disabled={busy}
            className="h-11 rounded-xl border px-4 text-sm font-medium disabled:opacity-40"
            style={{ borderColor: BORDER }}
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={!selected || busy}
            onClick={() => void submit()}
            className="flex h-11 min-w-[150px] items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white disabled:opacity-45"
            style={{ background: GREEN }}
          >
            {busy ? <><Loader2 size={17} className="animate-spin" /> Envoi…</> : "Partager"}
          </button>
        </footer>
      </section>
    </div>
  );
}
