"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  CalendarDays,
  ChevronDown,
  Mail,
  MessageCircle,
  ShieldAlert,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ToolConfirmation } from "@/lib/chat-stream";
import { useWidgetRuntime } from "./runtime";
import { describeTool, riskLabel } from "@/lib/tool-ui";
import { normalizeStatus, toneOf, type StatusKey } from "@/lib/widgets/core";
import { ActionBar, ProgressSteps, WidgetCard, WidgetHeader, type ProgressStep } from "./primitives";

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
  /**
   * L'état canonique de l'opération, écrit par le serveur à partir de la preuve
   * reçue : requested, dispatching, provider_accepted, sent, delivered, read,
   * completed, unknown, failed… `status` reste l'ancien statut d'exécution ;
   * les deux ne disent pas la même chose, et c'est celui-ci qui fait foi.
   */
  operation_state?: string;
  /** La phrase écrite par le serveur. Elle s'affiche telle quelle. */
  statement?: string;
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

type PendingActionSummary = {
  status?: string;
  verified?: boolean;
  verification_method?: string | null;
  operation_state?: string | null;
  evidence_source?: string | null;
  error_type?: string | null;
  error_detail?: string | null;
};

type PendingStatusResponse = {
  success?: boolean;
  data?: {
    status?: string;
    action_id?: string | null;
    action?: PendingActionSummary | null;
  } | null;
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

  // Le DESTINATAIRE est l'information qu'on vérifie avant de confirmer : il
  // figure dans le titre de la ligne, jamais seulement dans les arguments.
  const who = group || (recipient ? (/\d{7,}/.test(recipient) ? maskPhone(recipient) : truncate(recipient, 40)) : "");
  if (tool === "send_whatsapp" || capability === "whatsapp.message.send") {
    return { title: who ? `Envoyer à ${who}` : "Envoyer le message", detail: quote(message) || undefined };
  }
  if (tool === "whatsapp_send_media") return { title: who ? `Envoyer un média à ${who}` : "Envoyer le média", detail: value(args, "caption") ? quote(value(args, "caption")) : undefined };
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
  const pendingStatus = text(data.pending_status);

  // Un retry de confirmation peut revenir pendant que la première requête
  // exécute encore l'action. Cet état n'est ni un succès ni un échec.
  if (pendingStatus === "confirmed" || pendingStatus === "executing") {
    return { state: "running", action, message };
  }
  if (pendingStatus === "cancelled") return { state: "cancelled", action, message };
  if (pendingStatus === "expired") return { state: "expired", action, message };
  if (pendingStatus === "uncertain") return { state: "partial_success", action, message };

  // L'ÉTAT CANONIQUE L'EMPORTE SUR LE STATUT D'EXÉCUTION.
  //
  // « success » voulait dire « l'outil n'a pas levé d'erreur », et la carte en
  // faisait un résultat réussi. Un message accepté par WhatsApp mais jamais
  // remis tombait donc dans la même case qu'un message lu. Quand le serveur
  // fournit l'état canonique, c'est lui qui décide.
  const canonique = action?.operation_state || "";
  if (canonique) {
    if (["failed", "blocked", "expired", "needs_relink"].includes(canonique)) {
      return { state: "failed", action, message };
    }
    if (canonique === "cancelled") return { state: "cancelled", action, message };
    if (canonique === "awaiting_confirmation") return { state: "awaiting_confirmation", action, message };
    // Ni réussi ni échoué : une issue inconnue ou partielle ne se peint pas en vert.
    if (["unknown", "partial_success", "reconciling"].includes(canonique)) {
      return { state: "partial_success", action, message };
    }
  }

  if (raw === "partial_success" || raw === "verification_failed") return { state: "partial_success", action, message };
  if (["failed", "timeout", "unsupported"].includes(raw)) return { state: "failed", action, message };
  if (raw === "cancelled") return { state: "cancelled", action, message };
  if (raw === "awaiting_confirmation") return { state: "awaiting_confirmation", action, message };
  if (response.success === false) {
    const lower = message.toLowerCase();
    if (lower.includes("déjà été traité") || lower.includes("déjà été utilisée") || lower.includes("déjà été utilisé")) {
      // Compatibilité avec un backend plus ancien : cette phrase ne prouve
      // jamais que l'action a réussi. On rend donc un état prudent.
      return { state: "partial_success", action, message };
    }
    if (lower.includes("expir")) return { state: "expired", action, message };
    return { state: "failed", action, message };
  }
  return { state: "success", action, message };
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
  const runtime = useWidgetRuntime();
  const [state, setState] = useState<ActionRuntimeState>("awaiting_confirmation");
  const [resultMessage, setResultMessage] = useState("");
  const [action, setAction] = useState<ActionPayload | undefined>();
  const [resultSteps, setResultSteps] = useState<ResultStep[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const confirmInFlight = useRef(false);

  const batchCount = confirmation.tool === "__toumai_batch__" ? rows.length : 0;
  const subject = batchSubject(rows);
  const done = ["success", "partial_success", "failed", "cancelled", "expired"].includes(state);
  const compactSuccess = compactWhenDone && ["success", "cancelled"].includes(state) && !detailsOpen;
  const problems = resultSteps.filter((step) => !["success", "done"].includes(step.state || "")).length;

  useEffect(() => {
    const pendingId = confirmation.pending_id;
    const live = state === "awaiting_confirmation" || state === "running" || state === "verifying";
    if (!pendingId || !live) return;

    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const scheduleNext = () => {
      if (!disposed) timer = setTimeout(reconcile, 1800);
    };

    const reconcile = async () => {
      try {
        const res = await runtime.tools.pendingStatus(pendingId);
        const body = res.body as PendingStatusResponse;
        if (disposed || !res.ok || body.success === false) {
          if (state === "running" || state === "verifying") scheduleNext();
          return;
        }

        const status = body.data?.status || "unknown";
        if (status === "awaiting_confirmation") {
          // Avant le clic, un seul contrôle suffit. Après le clic, un serveur
          // qui n'a pas encore réclamé l'action est reconsulté.
          if (state === "running" || state === "verifying") scheduleNext();
          return;
        }

        if (status === "confirmed" || status === "executing") {
          setState("running");
          scheduleNext();
          return;
        }

        const stored = body.data?.action;
        const actionPayload: ActionPayload | undefined = stored
          ? {
              action_id: body.data?.action_id || undefined,
              status: stored.status,
              verified: stored.verified,
              verification_method: stored.verification_method,
              operation_state: stored.operation_state || undefined,
              error_type: stored.error_type,
            }
          : undefined;

        if (status === "uncertain") {
          setAction(actionPayload);
          setState("partial_success");
          setResultMessage(
            stored?.error_detail
            || "Le résultat n’a pas pu être confirmé. L’action n’est pas relancée automatiquement afin d’éviter un doublon.",
          );
          return;
        }

        if (status === "done") {
          if (!actionPayload) {
            setState("partial_success");
            setResultMessage("L’action est terminée, mais son résultat détaillé n’est pas disponible.");
            return;
          }
          const normalized = normalizedState({
            success: true,
            message: stored?.error_detail || "Action terminée.",
            data: { _action: actionPayload },
          });
          setAction(actionPayload);
          setResultMessage(normalized.message);
          setState(normalized.state);
          return;
        }

        if (status === "failed") {
          setAction(actionPayload);
          setState("failed");
          setResultMessage(stored?.error_detail || "L’action s’est terminée en échec.");
          return;
        }

        if (status === "cancelled") {
          setState("cancelled");
          setResultMessage("Cette confirmation a été annulée. Aucune action n’a été exécutée.");
          return;
        }

        if (status === "expired" || status === "unknown") {
          setState("expired");
          setResultMessage(status === "unknown" ? "Cette confirmation n’est plus active." : "Cette confirmation a expiré.");
        }
      } catch {
        // Pendant une exécution, une panne de lecture ne doit pas transformer
        // l'action en succès/échec inventé. On continue simplement à vérifier.
        if (state === "running" || state === "verifying") scheduleNext();
      }
    };

    void reconcile();
    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
    };
  }, [confirmation.pending_id, runtime, state]);

  async function confirm() {
    if (state !== "awaiting_confirmation" || confirmInFlight.current) return;
    confirmInFlight.current = true;
    setState("running");
    setResultMessage("");
    try {
      const res = await runtime.tools.confirm({
        tool: confirmation.tool,
        args: confirmation.args,
        pending_id: confirmation.pending_id || undefined,
      });
      const body = res.body as ConfirmationResponse;
      if (!res.ok) throw new Error(body.message || "Impossible d’exécuter l’action.");
      const normalized = normalizedState(body);
      setAction(normalized.action);
      setResultSteps(Array.isArray(body.data?.action_steps) ? body.data!.action_steps! : []);
      setResultMessage(normalized.message);
      setState(normalized.state);
    } catch (error) {
      setResultMessage(error instanceof Error ? error.message : "Impossible d’exécuter l’action.");
      setState("failed");
    } finally {
      confirmInFlight.current = false;
    }
  }

  async function cancel() {
    if (state !== "awaiting_confirmation") return;
    setState("cancelled");
    if (confirmation.pending_id) await runtime.tools.cancel(confirmation.pending_id);
  }

  const headline = (() => {
    if (state === "awaiting_confirmation") return batchCount ? `${batchCount} actions à confirmer` : descriptor.awaiting;
    if (state === "running") return batchCount ? "Exécution…" : descriptor.running;
    if (state === "verifying") return descriptor.verifying;
    if (state === "success") return batchCount ? `${batchCount} actions terminées` : descriptor.success;
    if (state === "partial_success") {
      if (/incertain|pas pu être confirmé|pas pu le confirmer|éviter un doublon/i.test(resultMessage)) {
        return "Résultat à vérifier";
      }
      return `Terminé avec ${Math.max(1, problems)} problème${Math.max(1, problems) > 1 ? "s" : ""}`;
    }
    if (state === "cancelled") return descriptor.cancelled;
    if (state === "expired") return "Confirmation expirée";
    return `Échec · ${descriptor.title}`;
  })();

  const technicalMessage = safeDetail(resultMessage);
  // « Vérifié » est réservé à ce qui a été CONSTATÉ : remis, lu, ou relu auprès du
  // connecteur. Un identifiant de message rendu par la passerelle ne l'est pas.
  const etatCanonique = action?.operation_state || "";
  const verified = etatCanonique
    ? ["delivered", "read", "completed"].includes(etatCanonique)
    : action?.verified === true;
  const showPreview = state === "awaiting_confirmation" || state === "running" || state === "verifying";
  const showOutcomeRows = resultSteps.length > 0 && (state === "partial_success" || state === "failed" || detailsOpen);
  const destructive = descriptor.risk === "destructive";
  const status = RUNTIME_STATUS[state];
  const tone = toneOf(status);
  const subtitle = compactSuccess && subject
    ? subject
    : state === "awaiting_confirmation"
      ? channelLabel(confirmation.tool) || riskLabel(descriptor.risk)
      : state === "running"
        ? `${batchCount || 1} action${(batchCount || 1) > 1 ? "s" : ""}`
        : subject || descriptor.title;

  const previewSteps: ProgressStep[] = rows.map((row, index) => ({
    key: `${row.title}-${index}`,
    label: row.meta ? `${row.title} · ${row.meta}` : row.title,
    detail: row.detail,
    status: state === "running" && index === 0 ? "running" : "pending",
  }));
  const outcomeSteps: ProgressStep[] = resultSteps.slice(0, 8).map((step, index) => {
    const normalized = normalizeStatus(step.state);
    return {
      key: `${step.capability || step.label || "action"}-${index}`,
      label: resultTitle(step),
      detail: resultDetail(step) || undefined,
      status: normalized === "unknown" ? "failed" : normalized,
    };
  });

  return (
    <>
      {/* Une confirmation structurée remplace le paragraphe généré par le modèle
          dans le même tour. Cela supprime la duplication texte + carte sans
          toucher aux réponses ordinaires, aux sources ou au raisonnement. */}
      <style>{`.msg-row:has([data-action-runtime="true"]) .prose-toumai{display:none}`}</style>
      <motion.div
        data-action-runtime="true"
        layout
        transition={reduceMotion ? { duration: 0 } : { duration: 0.18, ease: "easeOut" }}
        className="max-w-[480px]"
      >
        <WidgetCard
          label={descriptor.title}
          tone={tone}
          accent={state !== "awaiting_confirmation"}
          live
          alert={state === "failed"}
          testId="action_execution"
        >
          <WidgetHeader
            icon={toolIcon(confirmation.tool, destructive)}
            tone={state === "awaiting_confirmation" && destructive ? "error" : undefined}
            title={headline}
            subtitle={subtitle}
            status={state === "awaiting_confirmation" ? undefined : status}
            trailing={done ? (
              <button
                type="button"
                onClick={() => setDetailsOpen((current) => !current)}
                className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-[11.5px] text-[var(--text-tertiary)] outline-none transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                aria-expanded={detailsOpen}
              >
                Détails
                <ChevronDown className={`h-3.5 w-3.5 transition-transform motion-reduce:transition-none ${detailsOpen ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>
            ) : undefined}
          />

          <AnimatePresence initial={false}>
            {showPreview ? (
              <motion.div
                key="preview"
                initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.16 }}
                className="overflow-hidden"
              >
                <ProgressSteps steps={previewSteps} label={batchCount ? "Actions du workflow" : "Action à exécuter"} />
                {state === "awaiting_confirmation" ? (
                  <>
                    {destructive ? <p className="px-3.5 pb-2.5 text-[12px] text-[var(--text-secondary)]">Cette action ne pourra pas être annulée.</p> : null}
                    <ActionBar>
                      <button
                        type="button"
                        onClick={() => void confirm()}
                        className={`inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-[12.5px] font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)] ${destructive ? "tmw-btn-danger" : "tmw-btn-primary"}`}
                      >
                        {batchCount > 1 ? `Confirmer les ${batchCount}` : "Confirmer"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void cancel()}
                        className="inline-flex min-h-11 items-center justify-center rounded-xl px-3.5 text-[12.5px] font-medium text-[var(--text-secondary)] outline-none transition hover:bg-[var(--hover)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                      >
                        Annuler
                      </button>
                    </ActionBar>
                  </>
                ) : null}
              </motion.div>
            ) : null}
          </AnimatePresence>

          {showOutcomeRows ? <ProgressSteps steps={outcomeSteps} label="Résultat des actions" /> : null}

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
                <div className="border-t border-[var(--border)] px-3.5 py-2.5 text-[11.5px] leading-4 text-[var(--text-tertiary)]">
                  {action?.statement ? <p className="mb-1 text-[var(--text-secondary)]">{action.statement}</p> : null}
                  {technicalMessage ? <p>{technicalMessage}</p> : null}
                  {verified ? <p className="mt-1 text-[var(--tmw-success)]">Résultat vérifié auprès du connecteur.</p> : null}
                  {!technicalMessage && !verified && !action?.statement ? <p>Aucun détail supplémentaire.</p> : null}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </WidgetCard>
      </motion.div>
    </>
  );
}

const RUNTIME_STATUS: Record<ActionRuntimeState, StatusKey> = {
  awaiting_confirmation: "awaiting_confirmation",
  running: "running",
  verifying: "verifying",
  success: "success",
  partial_success: "partial_success",
  failed: "failed",
  cancelled: "cancelled",
  expired: "expired",
};

/** Le canal touché, en clair : c'est ce qu'on lit en premier sous le titre. */
function channelLabel(tool: string): string {
  if (tool.includes("whatsapp") || tool === "__toumai_batch__") return "WhatsApp";
  if (tool.includes("mail")) return "E-mail";
  if (tool.includes("calendar") || tool.includes("event")) return "Google Agenda";
  return "";
}

function toolIcon(tool: string, destructive: boolean): LucideIcon {
  if (destructive) return ShieldAlert;
  if (tool.includes("group")) return Users;
  if (tool.includes("mail")) return Mail;
  if (tool.includes("calendar") || tool.includes("event")) return CalendarDays;
  if (tool.includes("whatsapp") || tool === "__toumai_batch__") return MessageCircle;
  return Zap;
}
