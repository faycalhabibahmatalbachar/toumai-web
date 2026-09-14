"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  CircleX,
  LoaderCircle,
  ShieldAlert,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { ToolConfirmation } from "@/lib/chat-stream";
import { authFetch } from "@/lib/http";
import { cancelToolAction } from "@/lib/chat-api";
import { describeTool, riskLabel } from "@/lib/tool-ui";

export type ActionRuntimeState =
  | "awaiting_confirmation"
  | "running"
  | "verifying"
  | "success"
  | "partial_success"
  | "failed"
  | "cancelled"
  | "expired";

type ActionPayload = {
  action_id?: string | null;
  status?: string;
  verified?: boolean;
  verification_method?: string | null;
  verification?: Record<string, unknown>;
  error_type?: string | null;
  consigne?: string;
};

type ConfirmationResponse = {
  success?: boolean;
  message?: string;
  data?: Record<string, unknown> | null;
};

function value(args: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const item = args[key];
    if (typeof item === "string" && item.trim()) return item.trim();
  }
  return "";
}

function maskPhone(raw: string): string {
  const compact = raw.replace(/\s+/g, "");
  if (!compact || compact.includes("@g.us")) return compact;
  const digits = compact.replace(/\D/g, "");
  if (digits.length < 7) return raw;
  const withPlus = compact.startsWith("+") ? `+${digits}` : `+${digits}`;
  return `${withPlus.slice(0, 7)}•••${withPlus.slice(-3)}`;
}

function previewLines(tool: string, args: Record<string, unknown>): string[] {
  const lines: string[] = [];
  const group = value(args, "group_name", "group_subject", "group", "chat_name");
  const recipient = value(args, "to_name", "contact_name", "participant_name", "to", "participant", "phone");
  const message = value(args, "message", "text", "body", "caption");
  const subject = value(args, "subject", "title");
  const sendAt = value(args, "send_at", "start", "datetime");
  const action = value(args, "action", "operation");
  const newValue = value(args, "value", "description", "name");

  if (group && !group.endsWith("@g.us")) lines.push(`Groupe · ${group}`);
  if (recipient) lines.push(`Destinataire · ${recipient.match(/^\+?\d{7,}$/) ? maskPhone(recipient) : recipient}`);
  if (subject && !message.includes(subject)) lines.push(`Objet · ${subject}`);
  if (message) lines.push(`« ${message.length > 160 ? `${message.slice(0, 157)}…` : message} »`);
  if (sendAt) lines.push(`Quand · ${sendAt}`);
  if (action && !["send_whatsapp", "send_email"].includes(tool)) {
    lines.push(`Opération · ${action}`);
  }
  if (newValue && newValue !== group && newValue !== message) {
    lines.push(`Valeur · ${newValue.length > 120 ? `${newValue.slice(0, 117)}…` : newValue}`);
  }
  return lines.slice(0, 4);
}

function normalizedState(response: ConfirmationResponse): {
  state: ActionRuntimeState;
  action?: ActionPayload;
  message: string;
} {
  const data = response.data && typeof response.data === "object" ? response.data : {};
  const action = data._action && typeof data._action === "object"
    ? (data._action as ActionPayload)
    : undefined;
  const raw = action?.status || "";
  const message = response.message || "";

  if (response.success === false) {
    const lower = message.toLowerCase();
    if (lower.includes("expir") || lower.includes("déjà été utilisée") || lower.includes("déjà été traité")) {
      return { state: "expired", action, message };
    }
    return { state: "failed", action, message };
  }
  if (raw === "partial_success" || raw === "verification_failed") {
    return { state: "partial_success", action, message };
  }
  if (["failed", "timeout", "unsupported"].includes(raw)) {
    return { state: "failed", action, message };
  }
  if (raw === "cancelled") return { state: "cancelled", action, message };
  if (raw === "awaiting_confirmation") return { state: "awaiting_confirmation", action, message };
  return { state: "success", action, message };
}

function StateIcon({ state }: { state: ActionRuntimeState }) {
  if (state === "running" || state === "verifying") {
    return <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />;
  }
  if (state === "success") return <Check className="h-4 w-4" aria-hidden="true" />;
  if (state === "partial_success") return <AlertTriangle className="h-4 w-4" aria-hidden="true" />;
  if (state === "failed" || state === "expired") return <CircleX className="h-4 w-4" aria-hidden="true" />;
  if (state === "cancelled") return <X className="h-4 w-4" aria-hidden="true" />;
  return <ShieldAlert className="h-4 w-4" aria-hidden="true" />;
}

function tone(state: ActionRuntimeState): string {
  if (state === "success") return "border-emerald-500/20 bg-emerald-500/8 text-emerald-700 dark:text-emerald-400";
  if (state === "partial_success") return "border-amber-500/20 bg-amber-500/8 text-amber-700 dark:text-amber-400";
  if (state === "failed" || state === "expired") return "border-red-500/20 bg-red-500/8 text-red-700 dark:text-red-400";
  return "border-[var(--border)] bg-[var(--card)] text-[var(--text-primary)]";
}

export function ActionExecutionCard({
  confirmation,
  compactWhenDone = true,
}: {
  confirmation: ToolConfirmation;
  compactWhenDone?: boolean;
}) {
  const descriptor = useMemo(
    () => describeTool(confirmation.tool, confirmation.args || {}),
    [confirmation.tool, confirmation.args],
  );
  const preview = useMemo(
    () => previewLines(confirmation.tool, confirmation.args || {}),
    [confirmation.tool, confirmation.args],
  );
  const [state, setState] = useState<ActionRuntimeState>("awaiting_confirmation");
  const [resultMessage, setResultMessage] = useState("");
  const [action, setAction] = useState<ActionPayload | undefined>();
  const [detailsOpen, setDetailsOpen] = useState(false);

  const done = ["success", "partial_success", "failed", "cancelled", "expired"].includes(state);
  const collapsed = compactWhenDone && done && !detailsOpen;

  async function confirm() {
    if (state !== "awaiting_confirmation") return;
    setState("running");
    setResultMessage("");
    try {
      const res = await authFetch("/chat/tool/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: confirmation.tool,
          args: confirmation.args,
          pending_id: confirmation.pending_id || undefined,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as ConfirmationResponse;
      if (!res.ok) throw new Error(body.message || `Erreur ${res.status}`);
      // La route ne répond qu'après l'exécution ET la relecture du connecteur.
      // Le statut affiché ci-dessous vient donc du journal serveur, jamais du LLM.
      const normalized = normalizedState(body);
      setAction(normalized.action);
      setResultMessage(normalized.message);
      setState(normalized.state);
    } catch (error) {
      setResultMessage(error instanceof Error ? error.message : "Impossible d’exécuter l’action.");
      setState("failed");
    }
  }

  async function cancel() {
    if (state !== "awaiting_confirmation") return;
    setState("cancelled");
    if (confirmation.pending_id) await cancelToolAction(confirmation.pending_id);
  }

  const headline =
    state === "awaiting_confirmation" ? descriptor.awaiting
      : state === "running" ? descriptor.running
        : state === "verifying" ? descriptor.verifying
          : state === "success" ? descriptor.success
            : state === "partial_success" ? "Terminé avec un point à vérifier"
              : state === "cancelled" ? descriptor.cancelled
                : state === "expired" ? "Confirmation expirée"
                  : "Action non terminée";

  const verified = action?.verified === true;

  return (
    <motion.section
      layout
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`mt-3 w-full max-w-[560px] overflow-hidden rounded-2xl border ${tone(state)}`}
      aria-live="polite"
      aria-label={descriptor.title}
    >
      <motion.div layout className={collapsed ? "px-3.5 py-2.5" : "px-4 py-3.5"}>
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
              state === "success"
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : state === "partial_success"
                  ? "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                  : state === "failed" || state === "expired"
                    ? "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400"
                    : "border-[var(--border)] bg-[var(--background)]/60 text-[var(--text-secondary)]"
            }`}
          >
            <StateIcon state={state} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{headline}</p>
                {!collapsed ? (
                  <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">
                    {state === "awaiting_confirmation" ? riskLabel(descriptor.risk) : descriptor.title}
                  </p>
                ) : null}
              </div>
              {done ? (
                <button
                  type="button"
                  onClick={() => setDetailsOpen((current) => !current)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-[var(--text-tertiary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
                  aria-expanded={detailsOpen}
                >
                  Détails
                  <ChevronDown className={`h-3.5 w-3.5 transition ${detailsOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                </button>
              ) : null}
            </div>

            <AnimatePresence initial={false}>
              {!collapsed ? (
                <motion.div
                  key="details"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                >
                  {preview.length ? (
                    <div className="mt-3 space-y-1.5 rounded-xl border border-[var(--border)]/80 bg-[var(--background)]/35 px-3 py-2.5">
                      {preview.map((line, index) => (
                        <p key={`${line}-${index}`} className="break-words text-[12px] leading-5 text-[var(--text-secondary)]">
                          {line}
                        </p>
                      ))}
                    </div>
                  ) : null}

                  {resultMessage && state !== "awaiting_confirmation" ? (
                    <p className={`mt-3 text-[12px] leading-5 ${
                      state === "failed" || state === "expired" ? "text-[var(--error)]" : "text-[var(--text-secondary)]"
                    }`}>
                      {resultMessage}
                    </p>
                  ) : null}

                  {state === "success" && action ? (
                    <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">
                      {verified ? "Résultat vérifié auprès du connecteur" : "Demande acceptée · vérification complète indisponible"}
                      {action.verification_method ? ` · ${action.verification_method}` : ""}
                    </p>
                  ) : null}

                  {state === "partial_success" ? (
                    <p className="mt-2 text-[11px] leading-5 text-amber-700 dark:text-amber-400">
                      Toumaï ne marque pas cette opération comme totalement réussie tant que le connecteur ne confirme pas toutes les étapes.
                    </p>
                  ) : null}

                  {state === "awaiting_confirmation" ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={confirm}
                        className={`min-h-10 rounded-xl px-4 text-[13px] font-semibold text-white transition active:scale-[0.98] ${
                          descriptor.risk === "destructive" ? "bg-red-600 hover:bg-red-700" : "bg-[var(--primary)] hover:opacity-90"
                        }`}
                      >
                        {descriptor.risk === "destructive" ? "Confirmer l’action" : "Confirmer"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void cancel()}
                        className="min-h-10 rounded-xl border border-[var(--border)] px-4 text-[13px] font-medium text-[var(--text-secondary)] transition hover:bg-[var(--hover)]"
                      >
                        Annuler
                      </button>
                    </div>
                  ) : null}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </motion.section>
  );
}
