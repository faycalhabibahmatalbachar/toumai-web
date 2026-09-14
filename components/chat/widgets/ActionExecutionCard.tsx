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
import { useEffect, useMemo, useState } from "react";
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
  | "expired"
  | "already_processed";

type ActionPayload = {
  action_id?: string | null;
  status?: string;
  verified?: boolean;
  verification_method?: string | null;
  verification?: Record<string, unknown>;
  error_type?: string | null;
  consigne?: string;
};

type ResultStep = {
  label?: string;
  state?: string;
  status?: string;
  verified?: boolean;
  detail?: string | null;
};

type ConfirmationResponse = {
  success?: boolean;
  message?: string;
  data?: (Record<string, unknown> & { action_steps?: ResultStep[] }) | null;
};

type PendingStatusResponse = {
  success?: boolean;
  data?: { status?: string; action_id?: string | null } | null;
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
  return `+${digits}`.slice(0, 7) + "•••" + digits.slice(-3);
}

function participantValues(args: Record<string, unknown>): string[] {
  if (!Array.isArray(args.participants)) return [];
  return args.participants
    .filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    .map((item) => maskPhone(item.trim()));
}

function previewLines(tool: string, args: Record<string, unknown>): string[] {
  if (tool === "__toumai_batch__") {
    const actions = Array.isArray(args.actions)
      ? args.actions.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
      : [];
    return actions.slice(0, 8).map((item, index) => {
      const label = typeof item.label === "string" && item.label.trim()
        ? item.label.trim()
        : typeof item.capability === "string" && item.capability.trim()
          ? item.capability.trim()
          : `Action ${index + 1}`;
      return `${index + 1}. ${label}`;
    });
  }

  const lines: string[] = [];
  const group = value(args, "group_name", "group_subject", "group", "chat_name");
  const recipient = value(args, "to_name", "contact_name", "participant_name", "to", "participant", "phone");
  const participants = participantValues(args);
  const message = value(args, "message", "text", "body", "caption");
  const subject = value(args, "subject", "title");
  const sendAt = value(args, "send_at", "start", "datetime");
  const action = value(args, "action", "operation");
  const newValue = value(args, "value", "description", "name");

  if (group && !group.endsWith("@g.us")) lines.push(`Groupe · ${group}`);
  if (participants.length) lines.push(`Membre${participants.length > 1 ? "s" : ""} · ${participants.join(", ")}`);
  else if (recipient) lines.push(`Destinataire · ${recipient.match(/^\+?\d{7,}$/) ? maskPhone(recipient) : recipient}`);
  if (subject && !message.includes(subject)) lines.push(`Objet · ${subject}`);
  if (message) lines.push(`« ${message.length > 160 ? `${message.slice(0, 157)}…` : message} »`);
  if (sendAt) lines.push(`Quand · ${sendAt}`);
  if (action && !["send_whatsapp", "send_email"].includes(tool)) lines.push(`Opération · ${action}`);
  if (newValue && newValue !== group && newValue !== message) {
    lines.push(`Valeur · ${newValue.length > 120 ? `${newValue.slice(0, 117)}…` : newValue}`);
  }
  return lines.slice(0, 5);
}

function normalizedState(response: ConfirmationResponse): {
  state: ActionRuntimeState;
  action?: ActionPayload;
  message: string;
} {
  const data = response.data && typeof response.data === "object" ? response.data : {};
  const action = data._action && typeof data._action === "object" ? (data._action as ActionPayload) : undefined;
  const raw = action?.status || "";
  const message = response.message || "";

  if (raw === "partial_success" || raw === "verification_failed") return { state: "partial_success", action, message };
  if (["failed", "timeout", "unsupported"].includes(raw)) return { state: "failed", action, message };
  if (raw === "cancelled") return { state: "cancelled", action, message };
  if (raw === "awaiting_confirmation") return { state: "awaiting_confirmation", action, message };
  if (response.success === false) {
    const lower = message.toLowerCase();
    if (lower.includes("déjà été traité") || lower.includes("déjà été utilisée") || lower.includes("déjà été utilisé")) {
      return { state: "already_processed", action, message };
    }
    if (lower.includes("expir")) return { state: "expired", action, message };
    return { state: "failed", action, message };
  }
  return { state: "success", action, message };
}

function StateIcon({ state }: { state: ActionRuntimeState }) {
  if (state === "running" || state === "verifying") return <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />;
  if (state === "success" || state === "already_processed") return <Check className="h-4 w-4" aria-hidden="true" />;
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
  const args = (confirmation.args || {}) as Record<string, unknown>;
  const descriptor = useMemo(() => describeTool(confirmation.tool, args), [confirmation.tool, confirmation.args]);
  const preview = useMemo(() => previewLines(confirmation.tool, args), [confirmation.tool, confirmation.args]);
  const [state, setState] = useState<ActionRuntimeState>("awaiting_confirmation");
  const [resultMessage, setResultMessage] = useState("");
  const [action, setAction] = useState<ActionPayload | undefined>();
  const [resultSteps, setResultSteps] = useState<ResultStep[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const batchCount = confirmation.tool === "__toumai_batch__" && Array.isArray(args.actions) ? args.actions.length : 0;
  const done = ["success", "partial_success", "failed", "cancelled", "expired", "already_processed"].includes(state);
  const collapsed = compactWhenDone && done && !detailsOpen;

  useEffect(() => {
    const pendingId = confirmation.pending_id;
    if (!pendingId) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const reconcile = async () => {
      try {
        const res = await authFetch("/agent/actions/pending/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pending_id: pendingId }),
        });
        const body = (await res.json().catch(() => ({}))) as PendingStatusResponse;
        if (disposed || !res.ok || body.success === false) return;
        const status = body.data?.status || "unknown";
        if (status === "awaiting_confirmation") {
          setState((current) => current === "awaiting_confirmation" ? current : current);
          return;
        }
        if (status === "confirmed" || status === "executing") {
          setState("running");
          timer = setTimeout(reconcile, 1800);
          return;
        }
        if (status === "done") {
          setState("already_processed");
          setResultMessage("Cette action a déjà été traitée. Elle ne sera pas exécutée une seconde fois.");
          return;
        }
        if (status === "failed") {
          setState("failed");
          setResultMessage("Cette action a déjà été traitée et s’est terminée en échec.");
          return;
        }
        if (status === "cancelled") {
          setState("cancelled");
          return;
        }
        if (status === "expired" || status === "unknown") {
          setState("expired");
          setResultMessage(status === "unknown" ? "Cette confirmation n’est plus active." : "Cette confirmation a expiré.");
        }
      } catch {
        // Une panne de réconciliation ne doit jamais déclencher une mutation ni
        // transformer la carte en succès. On conserve l'état local courant.
      }
    };

    void reconcile();
    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
    };
  }, [confirmation.pending_id]);

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
      const normalized = normalizedState(body);
      setAction(normalized.action);
      setResultSteps(Array.isArray(body.data?.action_steps) ? body.data!.action_steps! : []);
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
            : state === "partial_success" ? "Terminé avec un résultat partiel"
              : state === "cancelled" ? descriptor.cancelled
                : state === "expired" ? "Confirmation expirée"
                  : state === "already_processed" ? "Action déjà traitée"
                    : `Échec · ${descriptor.title}`;

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
                        <p key={`${line}-${index}`} className="break-words text-[12px] leading-5 text-[var(--text-secondary)]">{line}</p>
                      ))}
                    </div>
                  ) : null}

                  {resultMessage && state !== "awaiting_confirmation" ? (
                    <p className={`mt-3 text-[12px] leading-5 ${state === "failed" || state === "expired" ? "text-[var(--error)]" : "text-[var(--text-secondary)]"}`}>
                      {resultMessage}
                    </p>
                  ) : null}

                  {resultSteps.length ? (
                    <ol className="mt-3 space-y-1.5 rounded-xl border border-[var(--border)]/80 bg-[var(--background)]/35 px-3 py-2.5" aria-label="Résultat des actions">
                      {resultSteps.slice(0, 8).map((step, index) => {
                        const succeeded = step.state === "success" || step.state === "done";
                        const partial = step.state === "partial_success" || step.state === "warning";
                        const blocked = step.state === "blocked";
                        return (
                          <li key={`${step.label || "action"}-${index}`} className="flex items-start gap-2 text-[11px] leading-5">
                            <span className={`mt-[3px] inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full ${succeeded ? "text-emerald-600" : partial ? "text-amber-600" : "text-[var(--text-tertiary)]"}`} aria-hidden="true">
                              {succeeded ? <Check className="h-3 w-3" /> : partial ? <AlertTriangle className="h-3 w-3" /> : blocked ? <X className="h-3 w-3" /> : <CircleX className="h-3 w-3" />}
                            </span>
                            <span className="min-w-0 text-[var(--text-secondary)]">
                              {step.label || `Action ${index + 1}`}
                              {blocked ? <span className="block text-[10px] text-[var(--text-tertiary)]">Non exécutée</span> : null}
                              {step.detail ? <span className="block text-[10px] text-[var(--text-tertiary)]">{step.detail}</span> : null}
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                  ) : null}

                  {state === "success" && action ? (
                    <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">
                      {verified ? "Résultat vérifié auprès du connecteur" : "Demande acceptée · vérification complète indisponible"}
                      {action.verification_method ? ` · ${action.verification_method}` : ""}
                    </p>
                  ) : null}

                  {state === "partial_success" ? (
                    <p className="mt-2 text-[11px] leading-5 text-amber-700 dark:text-amber-400">
                      Seules les étapes réellement confirmées par le connecteur sont considérées comme réussies.
                    </p>
                  ) : null}

                  {state === "awaiting_confirmation" ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void confirm()}
                        className={`min-h-10 rounded-xl px-4 text-[13px] font-semibold text-white transition active:scale-[0.98] ${descriptor.risk === "destructive" ? "bg-red-600 hover:bg-red-700" : "bg-[var(--primary)] hover:opacity-90"}`}
                      >
                        {batchCount > 1 ? `Confirmer les ${batchCount}` : descriptor.risk === "destructive" ? "Confirmer l’action" : "Confirmer"}
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
