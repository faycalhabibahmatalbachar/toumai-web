"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CheckCheck,
  Loader2,
  Search,
  Send,
  X,
} from "lucide-react";

import { WhatsAppProfileAvatar } from "@/components/whatsapp/WhatsAppProfileAvatar";
import { getWaCarnet, getWaProfilePictures, type WaCarnet, type WaContact } from "@/lib/connectors-api";
import { cacheSeed } from "@/lib/swr-cache";
import { WA_CACHE } from "@/lib/whatsapp-cache";
import { errorMessage } from "@/lib/errors";
import { displayWhatsAppIdentity, displayWhatsAppSecondary } from "@/lib/whatsapp-display";
import {
  getWaMessageStatus,
  sendWaManualMessage,
  type WaMessageStatus,
} from "@/lib/whatsapp-enterprise-api";

const SURFACE = "#0d1923";
const SURFACE_RAISED = "#101e29";
const BORDER = "#1e2c36";
const TEXT = "#f4f7f9";
const MUTED = "#9ba8b3";
const GREEN = "#08c875";
const BLUE = "#2f8cff";
const ORANGE = "#ff9518";

type Stage = "compose" | "result";

export function WhatsAppComposeModal({
  open,
  onClose,
  initialRecipient,
  initialName,
  initialMessage,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  initialRecipient?: string;
  initialName?: string;
  initialMessage?: string;
  onSent?: (chatId: string) => void;
}) {
  const [stage, setStage] = useState<Stage>("compose");
  const [query, setQuery] = useState("");
  const [contacts, setContacts] = useState<WaContact[]>([]);
  const [selected, setSelected] = useState<WaContact | null>(null);
  const [message, setMessage] = useState("");
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WaMessageStatus | null>(null);
  const [accepted, setAccepted] = useState<{ chatId: string; msgId: string | null } | null>(null);
  const pollToken = useRef(0);

  useEffect(() => {
    if (!open) return;
    setStage("compose");
    setMessage(initialMessage || "");
    setError(null);
    setResult(null);
    setAccepted(null);
    setQuery(initialName || initialRecipient || "");
    setSelected(
      initialRecipient
        ? {
            jid: initialRecipient,
            number: initialRecipient.includes("@") ? initialRecipient.split("@", 1)[0] : initialRecipient,
            name: initialName || initialRecipient,
          }
        : null,
    );
  }, [open, initialRecipient, initialName, initialMessage]);

  useEffect(() => {
    if (!open || selected) return;
    const value = query.trim();
    if (!value) {
      setContacts([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const cached = cacheSeed<WaCarnet>(WA_CACHE.carnet(value));
      if (cached && !cancelled) {
        setContacts(cached.contacts.slice(0, 8));
        setLoadingContacts(false);
      } else {
        setLoadingContacts(true);
      }
      try {
        const shortlist = (await getWaCarnet(value)).contacts.slice(0, 8);
        if (!cancelled) setContacts(shortlist);
        void getWaProfilePictures(shortlist.map((contact) => contact.jid))
          .then((pictures) => {
            if (cancelled) return;
            setContacts((current) =>
              current.map((contact) => ({
                ...contact,
                picture_url: pictures[contact.jid] ?? contact.picture_url ?? null,
              })),
            );
          })
          .catch(() => {
            // Une photo ne doit jamais retarder la recherche de contacts.
          });
      } catch {
        if (!cancelled) setContacts([]);
      } finally {
        if (!cancelled) setLoadingContacts(false);
      }
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, query, selected]);

  useEffect(() => {
    if (!accepted?.msgId || stage !== "result") return;
    const token = ++pollToken.current;
    let tries = 0;

    const poll = async () => {
      if (token !== pollToken.current || !accepted.msgId) return;
      tries += 1;
      try {
        const next = await getWaMessageStatus(accepted.msgId, accepted.chatId);
        if (token !== pollToken.current) return;
        setResult(next);
        if (["delivered", "read", "played", "failed"].includes(next.status) || tries >= 8) return;
      } catch {
        if (tries >= 8) return;
      }
      window.setTimeout(poll, 2000);
    };

    void poll();
    return () => {
      pollToken.current += 1;
    };
  }, [accepted, stage]);

  const rawRecipient = query.trim();
  const manualRecipient = useMemo(() => {
    const clean = rawRecipient.replace(/[\s\-().+]/g, "");
    return /^\d{7,15}$/.test(clean) ? clean : null;
  }, [rawRecipient]);
  const recipient = selected?.jid || manualRecipient || "";
  const recipientLabel = selected?.name || (manualRecipient ? `+${manualRecipient}` : "");
  const canSend = Boolean(recipient && message.trim() && message.length <= 4096);

  async function sendNow() {
    if (!recipient || !message.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const response = await sendWaManualMessage({
        to: recipient,
        message: message.trim(),
        chat_name: recipientLabel,
      });
      setAccepted({ chatId: response.chat_id, msgId: response.msg_id });
      setResult({
        msg_id: response.msg_id || "",
        chat_id: response.chat_id,
        known: Boolean(response.msg_id),
        status: response.status,
        server_ack_confirmed: false,
        delivery_confirmed: response.delivery_confirmed,
        read_confirmed: response.read_confirmed,
        failed: false,
      });
      setStage("result");
      onSent?.(response.chat_id);
    } catch (exc) {
      setError(errorMessage(exc, "generic"));
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="Fermer"
        className="absolute inset-0 bg-black/70 backdrop-blur-[3px]"
        onClick={sending ? undefined : onClose}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="wa-compose-title"
        className="relative z-10 w-full max-w-[610px] overflow-hidden rounded-[22px] border shadow-[0_28px_90px_rgba(0,0,0,.46)]"
        style={{ background: SURFACE, borderColor: BORDER, color: TEXT }}
      >
        <header className="flex items-center gap-3 border-b px-5 py-4" style={{ borderColor: BORDER }}>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#073d2c]" style={{ color: GREEN }}>
            <Send size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="wa-compose-title" className="text-[16px] font-semibold">
              {stage === "compose" ? "Nouveau message" : "Message WhatsApp"}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Fermer"
            disabled={sending}
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-white/5 disabled:opacity-40"
            style={{ color: MUTED }}
          >
            <X size={19} />
          </button>
        </header>
        {stage === "compose" && (
          <div className="p-5">
            <label className="text-[12px] font-semibold">Destinataire</label>
            {selected ? (
              <div className="mt-2 flex items-center gap-3 rounded-xl border px-3 py-3" style={{ borderColor: BORDER, background: SURFACE_RAISED }}>
                <WhatsAppProfileAvatar
                  name={displayWhatsAppIdentity({ name: selected.name, number: selected.number, id: selected.jid, kind: "contact" })}
                  kind="contact"
                  pictureUrl={selected.picture_url}
                  size={40}
                  eager
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {displayWhatsAppIdentity({ name: selected.name, number: selected.number, id: selected.jid, kind: "contact" })}
                  </p>
                  <p className="mt-0.5 truncate text-[11px]" style={{ color: MUTED }}>
                    {displayWhatsAppSecondary({ number: selected.number, id: selected.jid, kind: "contact" })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(null);
                    setQuery("");
                    setContacts([]);
                  }}
                  className="rounded-lg px-2.5 py-1.5 text-xs hover:bg-white/5"
                  style={{ color: MUTED }}
                >
                  Changer
                </button>
              </div>
            ) : (
              <div className="relative mt-2">
                <Search className="absolute left-3 top-3.5" size={17} color={MUTED} />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Nom du contact ou numéro international"
                  className="h-11 w-full rounded-xl border bg-transparent pl-10 pr-3 text-sm outline-none focus:border-[#2d8fff]"
                  style={{ borderColor: BORDER }}
                />
                {(loadingContacts || contacts.length > 0 || manualRecipient) && (
                  <div className="mt-2 overflow-hidden rounded-xl border" style={{ borderColor: BORDER, background: SURFACE_RAISED }}>
                    {loadingContacts && (
                      <div className="flex items-center gap-2 px-3 py-3 text-xs" style={{ color: MUTED }}>
                        <Loader2 size={15} className="animate-spin" /> Recherche dans le carnet…
                      </div>
                    )}
                    {!loadingContacts && contacts.map((contact) => (
                      <button
                        type="button"
                        key={contact.jid}
                        onClick={() => {
                          setSelected(contact);
                          setContacts([]);
                        }}
                        className="flex w-full items-center gap-3 border-b px-3 py-3 text-left last:border-b-0 hover:bg-white/[0.035]"
                        style={{ borderColor: BORDER }}
                      >
                        <WhatsAppProfileAvatar
                          name={displayWhatsAppIdentity({ name: contact.name, number: contact.number, id: contact.jid, kind: "contact" })}
                          kind="contact"
                          pictureUrl={contact.picture_url}
                          size={36}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold">
                            {displayWhatsAppIdentity({ name: contact.name, number: contact.number, id: contact.jid, kind: "contact" })}
                          </span>
                          <span className="mt-0.5 block truncate text-[11px]" style={{ color: MUTED }}>
                            {displayWhatsAppSecondary({ number: contact.number, id: contact.jid, kind: "contact" })}
                          </span>
                        </span>
                      </button>
                    ))}
                    {!loadingContacts && manualRecipient && !contacts.some((contact) => contact.number === manualRecipient) && (
                      <button
                        type="button"
                        onClick={() => setSelected({ jid: manualRecipient, number: manualRecipient, name: `+${manualRecipient}` })}
                        className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-white/[0.035]"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#173044]" style={{ color: BLUE }}>
                          <Send size={16} />
                        </div>
                        <span>
                          <span className="block text-[13px] font-semibold">Envoyer à +{manualRecipient}</span>
                          <span className="mt-0.5 block text-[11px]" style={{ color: MUTED }}>Utiliser ce numéro</span>
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="mt-5 flex items-center justify-between">
              <label htmlFor="wa-message" className="text-[12px] font-semibold">Message</label>
              <span className="text-[10px] tabular-nums" style={{ color: message.length > 4096 ? "#ff6b6b" : MUTED }}>
                {message.length}/4096
              </span>
            </div>
            <textarea
              id="wa-message"
              value={message}
              onChange={(event) => setMessage(event.target.value.slice(0, 4097))}
              placeholder="Écrivez votre message…"
              rows={7}
              className="mt-2 w-full resize-none rounded-xl border px-3 py-3 text-sm leading-6 outline-none focus:border-[#2d8fff]"
              style={{ background: SURFACE_RAISED, borderColor: message.length > 4096 ? "#ff6b6b" : BORDER }}
            />

            {error && <p className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-300">{error}</p>}

            <div className="mt-5 flex items-center justify-end gap-4">
              <button
                type="button"
                disabled={!canSend || sending}
                onClick={() => void sendNow()}
                className="flex h-11 min-w-[150px] items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-35"
                style={{ background: GREEN }}
              >
                {sending ? <><Loader2 size={17} className="animate-spin" /> Envoi…</> : <><Send size={17} /> Envoyer</>}
              </button>
            </div>
          </div>
        )}

        {stage === "result" && (
          <div className="p-6 text-center">
            <StatusIcon status={result?.status || "unknown"} />
            <h3 className="mt-4 text-xl font-semibold">{statusTitle(result?.status || "unknown")}</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6" style={{ color: MUTED }}>
              {statusDescription(result?.status || "unknown")}
            </p>

            <div className="mx-auto mt-5 grid max-w-[430px] grid-cols-3 gap-2 text-left">
              <ProofStep label="Envoyé" active={Boolean(accepted?.msgId)} />
              <ProofStep label="Livré" active={Boolean(result?.delivery_confirmed)} />
              <ProofStep label="Lu" active={Boolean(result?.read_confirmed)} />
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-6 h-11 rounded-xl border px-6 text-sm font-semibold"
              style={{ borderColor: BORDER, background: SURFACE_RAISED }}
            >
              Fermer
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function ProofStep({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="rounded-xl border px-3 py-3 text-center" style={{ borderColor: active ? "rgba(8,200,117,.45)" : BORDER, background: SURFACE_RAISED }}>
      <Check size={15} className="mx-auto" color={active ? GREEN : MUTED} />
      <p className="mt-1.5 text-[11px]" style={{ color: active ? TEXT : MUTED }}>{label}</p>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  const success = ["delivered", "read", "played"].includes(status);
  const failed = status === "failed";
  const color = failed ? "#ff6b6b" : success ? GREEN : BLUE;
  return (
    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full" style={{ background: `${color}18`, color }}>
      {status === "read" || status === "played" ? <CheckCheck size={30} /> : failed ? <X size={28} /> : <Check size={28} />}
    </div>
  );
}

function statusTitle(status: string) {
  if (status === "read" || status === "played") return "Message lu";
  if (status === "delivered") return "Message livré";
  if (status === "sent") return "Message envoyé";
  if (status === "failed") return "Échec de l’envoi";
  if (status === "accepted") return "Message accepté";
  return "Envoi enregistré";
}

function statusDescription(status: string) {
  if (status === "read" || status === "played") return "Le destinataire a lu votre message.";
  if (status === "delivered") return "Le message a été livré au destinataire.";
  if (status === "sent") return "Message envoyé. Livraison en attente.";
  if (status === "failed") return "L’envoi a échoué. Vous pouvez réessayer.";
  if (status === "accepted") return "Envoi en cours de confirmation.";
  return "Statut de livraison en attente.";
}
