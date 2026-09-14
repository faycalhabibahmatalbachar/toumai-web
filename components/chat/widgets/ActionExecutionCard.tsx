"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Circle,
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
  capability?: string;
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

type PreviewRow = {
  title: string;
  detail?: string;
  meta?: string;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function value(args: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const item = text(args[key]);
    if (item) return item;
  }
  return "";
}

function truncate(input: string, max = 86): string {
  const normalized = input.replace(/\s+/g, " ").trim();
  return normalized.length > max ? `${normalized.slice(0, max - 1)}…` : normalized;
}

function maskPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 7) return raw;
  if (digits.length >= 11 && digits.startsWith("235")) {
    return `+235 ${digits.slice(3, 5)}•••${digits.slice(-3)}`;
  }
  const prefix = digits.length > 10 ? digits.slice(0, 3) : digits.slice(0, 2);
  return `+${prefix} ${digits.slice(prefix.length, prefix.length + 2)}•••${digits.slice(-3)}`;
}

function participantValues(args: Record<string, unknown>): string[] {
  if (!Array.isArray(args.participants)) return [];
  return args.participants
    .filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    .map((item) => maskPhone(item));
}

function visibleGroup(args: Record<string, unknown>): string {
  const group = value(args, "group_name", "group_subject", "to_name", "group", "chat_name");
  return group && !group.endsWith("@g.us") ? group : "";
}

function quote(message: string): string {
  return message ? `“${truncate(message, 82)}”` : "";
}

function rowForAction(tool: string, args: Record<string, unknown>, capability = ""): PreviewRow {
  const action = value(args, "action", "operation").toLowerCase();
  const group = visibleGroup(args);
  const participants = participantValues(args);
  const message = value(args, "message", "text", "body", "caption");
  const newValue = value(args, "value", "name", "description");
  const recipient = value(args, "to_name", "contact_name", "participant_name", "to", "participant", "phone");

  if (tool === "whatsapp_group_manage" || capability.startsWith("whatsapp.group.")) {
    if (action === "create" || capability === "whatsapp.group.create") {
      const name = newValue || group;
      return {
        title: "Créer le groupe",
        detail: name || undefined,
        meta: participants.length ? `${participants.length} membre${participants.length > 1 ? "s" : ""}` : undefined,
      };
    }
    if (["add", "invite", "participant_add"].includes(action) || capability.includes("participant.add")) {
      return {
        title: participants.length > 1 ? "Ajouter les membres" : "Ajouter un membre",
        detail: participants.length ? participants.join(" · ") : group || undefined,
        meta: group || undefined,
      };
    }
    if (["remove", "kick", "participant_remove"].includes(action) || capability.includes("participant.remove")) {
      return {
        title: participants.length > 1 ? "Retirer les membres" : "Retirer un membre",
        detail: participants.length ? participants.join(" · ") : undefined,
        meta: group || undefined,
      };
    }
    if (["rename", "subject", "name", "nom"].includes(action) || capability.includes("rename")) {
      return { title: "Renommer le groupe", detail: newValue || undefined, meta: group || undefined };
    }
    if (["description", "describe", "desc"].includes(action)) {
      return { title: "Modifier la description", detail: newValue ? truncate(newValue) : undefined, meta: group || undefined };
    }
    if (["photo", "picture", "icon"].includes(action)) return { title: "Modifier la photo du groupe", detail: group || undefined };
    if (action === "promote") return { title: "Nommer administrateur", detail: participants[0], meta: group || undefined };
    if (action === "demote") return { title: "Retirer les droits administrateur", detail: participants[0], meta: group || undefined };
    if (action === "leave") return { title: "Quitter le groupe", detail: group || undefined };
    return { title: "Modifier le groupe", detail: group || undefined };
  }

  if (tool === "send_whatsapp" || capability === "whatsapp.message.send") {
    return { title: "Envoyer le message", detail: quote(message) || undefined };
  }
  if (tool === "whatsapp_send_media") return { title: "Envoyer le média", detail: group || (recipient ? maskPhone(recipient) : undefined) };
  if (tool === "whatsapp_set_status") return { title: "Publier le statut", detail: quote(message) || undefined };
  if (tool === "send_email" || tool === "send_mail") {
    return { title: "Envoyer l’e-mail", detail: value(args, "subject", "title") || undefined, meta: recipient || undefined };
  }
  if (tool === "calendar_create_event" || tool === "create_event") return { title: "Créer l’événement", detail: value(args, "title", "summary") || undefined };

  const descriptor = describeTool(tool, args);
  return { title: descriptor.title, detail: group || (message ? quote(message) : undefined) };
}

function previewRows(tool: string, args: Record<string, unknown>): PreviewRow[] {
  if (tool !== "__toumai_batch__") return [rowForAction(tool, args)];
  const actions = Array.isArray(args.actions)
    ? args.actions.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
  return actions.slice(0, 8).map((entry) => rowForAction(
    text(entry.tool),
    record(entry.args),
    text(entry.capability),
  ));
}

function batchSubject(rows: PreviewRow[]): string {
  const create = rows.find((row) => row.title === "Créer le groupe");
  return create?.detail || "";
}

function safeDetail(raw?: string | null): string {
  let detail = (raw || "").replace(/\b\d{8,20}@g\.us\b/gi, "groupe WhatsApp");
  detail = detail.replace(/\+?\d{8,15}/g, (phone) => maskPhone(phone));
  if (/non inclus/i.test(detail)) return "Non inclus dans votre formule.";
  return truncate(detail, 120);
}

function resultTitle(step: ResultStep): string {
  const capability = step.capability || "";
  const success = step.state === "success" || step.state === "done";
  const blocked = step.state === "blocked";
  if (capability === "whatsapp.group.create") return success ? "Groupe créé" : blocked ? "Création non exécutée" : "Création du groupe échouée";
  if (capability === "whatsapp.message.send") return success ? "Message envoyé" : blocked ? "Message non envoyé" : "Envoi du message échoué";
  if (capability.includes("participant.add")) return success ? "Membre ajouté" : blocked ? "Ajout non exécuté" : "Ajout du membre échoué";
  if (capability.includes("participant.remove")) return success ? "Membre retiré" : blocked ? "Retrait non exécuté" : "Retrait du membre échoué";
  if (capability.includes("rename")) return success ? "Groupe renommé" : "Renommage échoué";
  return truncate(step.label || (success ? "Action terminée" : "Action non terminée"), 64);
}

function resultDetail(step: ResultStep): string {
  const raw = safeDetail(step.detail);
  if ((step.state === "success" || step.state === "done") && step.capability === "whatsapp.group.create") {
    const match = (step.detail || "").match(/(\d+)\s+membre/i);
    if (match) return `${match[1]} participant${match[1] === "1" ? "" : "s"}`;
  }
  if (step.state === "blocked") return raw || "Non exécuté après l’échec d’une étape précédente.";
  return raw;
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
  if (state === "running" || state === "verifying") return <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />;
  if (state === "success" || state === "already_processed") return <Check className="h-4 w-4" aria-hidden="true" />;
  if (state === "partial_success") return <AlertTriangle className="h-4 w-4" aria-hidden="true" />;
  if (state === "failed" || state === "expired") return <CircleX className="h-4 w-4" aria-hidden="true" />;
  if (state === "cancelled") return <X className="h-4 w-4" aria-hidden="true" />;
  return <ShieldAlert className="h-4 w-4" aria-hidden="true" />;
}

function stateAccent(state: ActionRuntimeState): string {
  if (state === "success") return "border-l-emerald-500/70";
  if (state === "partial_success") return "border-l-amber-500/70";
  if (state === "failed" || state === "expired") return "border-l-red-500/70";
  return "border-l-[var(--border)]";
}

function StepStatusIcon({ state }: { state?: string }) {
  if (state === "success" || state === "done") return <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />;
  if (state === "blocked") return <Circle className="h-3.5 w-3.5 text-[var(--text-tertiary)]" aria-hidden="true" />;
  if (state === "partial_success" || state === "warning") return <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />;
  return <CircleX className="h-4 w-4 text-red-600 dark:text-red-400" aria-hidden="true" />;
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
  const rows = useMemo(() => previewRows(confirmation.tool, args), [confirmation.tool, confirmation.args]);
  const reduceMotion = useReducedMotion();
  const [state, setState] = useState<ActionRuntimeState>("awaiting_confirmation");
  const [resultMessage, setResultMessage] = useState("");
  const [action, setAction] = useState<ActionPayload | undefined>();
  const [resultSteps, setResultSteps] = useState<ResultStep[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const batchCount = confirmation.tool === "__toumai_batch__" ? rows.length : 0;
  const subject = batchSubject(rows);
  const done = ["success", "partial_success", "failed", "cancelled", "expired", "already_processed"].includes(state);
  const compactSuccess = compactWhenDone && ["success", "already_processed", "cancelled"].includes(state) && !detailsOpen;
  const problems = resultSteps.filter((step) => !["success", "done"].includes(step.state || "")).length;

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
        if (status === "awaiting_confirmation") return;
        if (status === "confirmed" || status === "executing") {
          setState("running");
          timer = setTimeout(reconcile, 1800);
          return;
        }
        if (status === "done") {
          setState("already_processed");
          setResultMessage("Cette action a déjà été traitée. Elle ne sera pas relancée.");
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
        // La réconciliation est uniquement informative : aucune mutation n'est
        // déclenchée par le navigateur si le statut ne peut pas être relu.
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

  const headline = (() => {
    if (state === "awaiting_confirmation") return batchCount ? `${batchCount} actions à confirmer` : descriptor.awaiting;
    if (state === "running") return batchCount ? "Exécution…" : descriptor.running;
    if (state === "verifying") return descriptor.verifying;
    if (state === "success") return batchCount ? `${batchCount} actions terminées` : descriptor.success;
    if (state === "partial_success") return `Terminé avec ${Math.max(1, problems)} problème${Math.max(1, problems) > 1 ? "s" : ""}`;
    if (state === "cancelled") return descriptor.cancelled;
    if (state === "expired") return "Confirmation expirée";
    if (state === "already_processed") return "Action déjà traitée";
    return `Échec · ${descriptor.title}`;
  })();

  const technicalMessage = safeDetail(resultMessage);
  const verified = action?.verified === true;
  const showPreview = state === "awaiting_confirmation" || state === "running" || state === "verifying";
  const showOutcomeRows = resultSteps.length > 0 && (state === "partial_success" || state === "failed" || detailsOpen);

  return (
    <>
      {/* Une confirmation structurée remplace le paragraphe généré par le modèle
          dans le même tour. Cela supprime la duplication texte + carte sans
          toucher aux réponses ordinaires, aux sources ou au raisonnement. */}
      <style>{`.msg-row:has([data-action-runtime="true"]) .prose-toumai{display:none}`}</style>
      <motion.section
        data-action-runtime="true"
        layout
        transition={reduceMotion ? { duration: 0 } : { duration: 0.18, ease: "easeOut" }}
        className={`mt-2.5 w-full max-w-[480px] overflow-hidden rounded-2xl border border-[var(--border)] border-l-2 bg-[var(--card)] ${stateAccent(state)}`}
        aria-live="polite"
        aria-label={descriptor.title}
        role={state === "failed" ? "alert" : undefined}
      >
        <motion.div layout className={compactSuccess ? "px-3.5 py-2.5" : "px-3.5 py-3"}>
          <div className="flex min-h-8 min-w-0 items-center gap-2.5">
            <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
              state === "success" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : state === "partial_success" ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                  : state === "failed" || state === "expired" ? "bg-red-500/10 text-red-600 dark:text-red-400"
                    : "bg-[var(--background)] text-[var(--text-secondary)]"
            }`}>
              <StateIcon state={state} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{headline}</p>
              <p className="mt-0.5 truncate text-[10.5px] text-[var(--text-tertiary)]">
                {compactSuccess && subject
                  ? subject
                  : state === "awaiting_confirmation"
                    ? (batchCount ? "WhatsApp" : riskLabel(descriptor.risk))
                    : state === "running"
                      ? `${batchCount || 1} action${(batchCount || 1) > 1 ? "s" : ""}`
                      : subject || descriptor.title}
              </p>
            </div>
            {done ? (
              <button
                type="button"
                onClick={() => setDetailsOpen((current) => !current)}
                className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-[10.5px] text-[var(--text-tertiary)] outline-none transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                aria-expanded={detailsOpen}
              >
                Détails
                <ChevronDown className={`h-3.5 w-3.5 transition-transform motion-reduce:transition-none ${detailsOpen ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <AnimatePresence initial={false}>
            {showPreview ? (
              <motion.div
                key="preview"
                initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.16 }}
                className="mt-2.5 overflow-hidden"
              >
                <ol className="space-y-0.5" aria-label={batchCount ? "Actions du workflow" : "Action à exécuter"}>
                  {rows.map((row, index) => {
                    const active = state === "running" && index === 0;
                    return (
                      <li key={`${row.title}-${index}`} className="flex min-w-0 items-start gap-2 py-1.5">
                        <span className={`mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center ${active ? "text-[var(--primary)]" : "text-[var(--text-tertiary)]"}`} aria-hidden="true">
                          {active ? <LoaderCircle className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" /> : <Circle className="h-3 w-3" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-baseline justify-between gap-2">
                            <p className="min-w-0 truncate text-[12px] font-medium text-[var(--text-primary)]">{row.title}</p>
                            {row.meta ? <span className="shrink-0 text-[9.5px] text-[var(--text-tertiary)]">{row.meta}</span> : null}
                          </div>
                          {row.detail ? <p className="mt-0.5 break-words text-[10.5px] leading-4 text-[var(--text-tertiary)]">{row.detail}</p> : null}
                        </div>
                      </li>
                    );
                  })}
                </ol>

                {state === "awaiting_confirmation" ? (
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void confirm()}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-4 text-[12px] font-semibold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)]"
                    >
                      {batchCount > 1 ? `Confirmer les ${batchCount}` : "Confirmer"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void cancel()}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl px-3.5 text-[12px] font-medium text-[var(--text-secondary)] outline-none transition hover:bg-[var(--hover)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                    >
                      Annuler
                    </button>
                  </div>
                ) : null}
              </motion.div>
            ) : null}
          </AnimatePresence>

          {showOutcomeRows ? (
            <ol className="mt-2.5 space-y-0.5" aria-label="Résultat des actions">
              {resultSteps.slice(0, 8).map((step, index) => {
                const detail = resultDetail(step);
                return (
                  <li key={`${step.capability || step.label || "action"}-${index}`} className="flex min-w-0 items-start gap-2 py-1.5">
                    <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center"><StepStatusIcon state={step.state} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11.5px] font-medium leading-4 text-[var(--text-primary)]">{resultTitle(step)}</p>
                      {detail ? <p className="mt-0.5 text-[10px] leading-4 text-[var(--text-tertiary)]">{detail}</p> : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : null}

          <AnimatePresence initial={false}>
            {detailsOpen ? (
              <motion.div
                key="technical-details"
                initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.16 }}
                className="overflow-hidden"
              >
                <div className="mt-2.5 border-t border-[var(--border)] pt-2.5 text-[10px] leading-4 text-[var(--text-tertiary)]">
                  {technicalMessage ? <p>{technicalMessage}</p> : null}
                  {verified ? <p className="mt-1 text-emerald-600 dark:text-emerald-400">Résultat vérifié auprès du connecteur.</p> : null}
                  {state === "already_processed" ? <p className="mt-1">La confirmation a déjà été consommée : aucune seconde exécution n’est possible.</p> : null}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </motion.section>
    </>
  );
}
