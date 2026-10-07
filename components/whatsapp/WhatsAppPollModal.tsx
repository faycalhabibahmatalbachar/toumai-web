"use client";

import { Check, Loader2, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";

import { errorMessage } from "@/lib/errors";
import { sendWaPoll, type WaLiveConversation } from "@/lib/whatsapp-enterprise-api";

const SURFACE = "#0d1923";
const RAISED = "#101e29";
const BORDER = "#1e2c36";
const TEXT = "#f4f7f9";
const MUTED = "#9ba8b3";
const FAINT = "#6f7f8d";
const GREEN = "#08c875";

export function WhatsAppPollModal({
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
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [multiple, setMultiple] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanOptions = useMemo(
    () => options.map((option) => option.trim()).filter(Boolean),
    [options],
  );

  if (!open || !conversation) return null;

  function close() {
    if (busy) return;
    setQuestion("");
    setOptions(["", ""]);
    setMultiple(false);
    setError(null);
    onClose();
  }

  async function submit() {
    if (busy || !question.trim() || cleanOptions.length < 2) return;
    setBusy(true);
    setError(null);
    try {
      await sendWaPoll({
        to: conversation.id,
        question: question.trim(),
        options: cleanOptions,
        selectable_count: multiple ? cleanOptions.length : 1,
        confirmed: true,
      });
      setQuestion("");
      setOptions(["", ""]);
      setMultiple(false);
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
        aria-label="Fermer le sondage"
        className="absolute inset-0 bg-black/70 backdrop-blur-[3px]"
        onClick={close}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="wa-poll-title"
        className="relative z-10 w-full max-w-[540px] overflow-hidden rounded-[22px] border shadow-[0_28px_90px_rgba(0,0,0,.46)]"
        style={{ background: SURFACE, borderColor: BORDER, color: TEXT }}
      >
        <header className="flex items-center border-b px-5 py-4" style={{ borderColor: BORDER }}>
          <div className="min-w-0 flex-1">
            <h2 id="wa-poll-title" className="text-[16px] font-semibold">Créer un sondage</h2>
            <p className="mt-0.5 truncate text-[11px]" style={{ color: MUTED }}>{conversation.name}</p>
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

        <div className="p-5">
          <label className="text-[11px] font-semibold" style={{ color: MUTED }}>
            Question
            <input
              autoFocus
              value={question}
              maxLength={255}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Posez votre question"
              className="mt-2 h-11 w-full rounded-xl border px-3 text-sm outline-none focus:border-[#08c875]"
              style={{ borderColor: BORDER, background: RAISED, color: TEXT }}
            />
          </label>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold" style={{ color: MUTED }}>Options</p>
              <span className="text-[9px]" style={{ color: FAINT }}>{cleanOptions.length}/12</span>
            </div>
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    value={option}
                    maxLength={100}
                    onChange={(event) => {
                      const next = [...options];
                      next[index] = event.target.value;
                      setOptions(next);
                    }}
                    placeholder={`Option ${index + 1}`}
                    className="h-11 min-w-0 flex-1 rounded-xl border px-3 text-sm outline-none focus:border-[#08c875]"
                    style={{ borderColor: BORDER, background: RAISED, color: TEXT }}
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      aria-label={`Supprimer l’option ${index + 1}`}
                      onClick={() => setOptions((current) => current.filter((_, idx) => idx !== index))}
                      className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-white/[0.05]"
                      style={{ color: MUTED }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 12 && (
              <button
                type="button"
                onClick={() => setOptions((current) => [...current, ""])}
                className="mt-2 flex h-10 items-center gap-2 rounded-xl px-2 text-xs font-medium"
                style={{ color: GREEN }}
              >
                <Plus size={16} /> Ajouter une option
              </button>
            )}
          </div>

          <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3" style={{ borderColor: BORDER, background: RAISED }}>
            <span
              className="flex h-5 w-5 items-center justify-center rounded border"
              style={{ borderColor: multiple ? GREEN : "#50606c", background: multiple ? GREEN : "transparent" }}
            >
              {multiple && <Check size={13} color="white" />}
            </span>
            <input
              type="checkbox"
              checked={multiple}
              onChange={(event) => setMultiple(event.target.checked)}
              className="sr-only"
            />
            <span className="text-[12px]" style={{ color: MUTED }}>Autoriser plusieurs réponses</span>
          </label>

          {error && (
            <p className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}

          <div className="mt-5 flex justify-end gap-2">
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
              onClick={() => void submit()}
              disabled={busy || !question.trim() || cleanOptions.length < 2}
              className="flex h-11 min-w-[150px] items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white disabled:opacity-45"
              style={{ background: GREEN }}
            >
              {busy ? <><Loader2 size={17} className="animate-spin" /> Envoi…</> : "Envoyer le sondage"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
