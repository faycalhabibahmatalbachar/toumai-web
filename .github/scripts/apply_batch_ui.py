from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    if old not in text:
        raise SystemExit(f"Pattern not found in {path}: {old[:180]!r}")
    if text.count(old) != 1:
        raise SystemExit(f"Pattern occurs {text.count(old)} times in {path}")
    p.write_text(text.replace(old, new, 1), encoding="utf-8")


# ── Descriptor du lot : une confirmation pour N actions ──────────────────────
replace_once(
    "lib/tool-ui.ts",
    '''export function describeTool(tool: string, args: Record<string, unknown> = {}): ToolUiDescriptor {
  if (tool === "whatsapp_group_manage" || tool === "whatsapp_group_participants") {''',
    '''export function describeTool(tool: string, args: Record<string, unknown> = {}): ToolUiDescriptor {
  if (tool === "__toumai_batch__") {
    const actions = Array.isArray(args.actions)
      ? args.actions.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
      : [];
    const destructive = actions.some((item) => item.risk === "destructive");
    const count = actions.length;
    return {
      title: count ? `${count} actions à exécuter` : "Plusieurs actions à exécuter",
      awaiting: count ? `${count} actions prêtes` : "Actions prêtes",
      running: "Exécution des actions…",
      verifying: "Vérification des actions…",
      success: count ? `${count} actions terminées` : "Actions terminées",
      cancelled: "Actions annulées",
      risk: destructive ? "destructive" : "mass",
    };
  }

  if (tool === "whatsapp_group_manage" || tool === "whatsapp_group_participants") {''',
)

# ── Aperçu : le lot montre ses sous-actions, pas son JSON ────────────────────
replace_once(
    "components/chat/widgets/ActionExecutionCard.tsx",
    '''function previewLines(tool: string, args: Record<string, unknown>): string[] {
  const lines: string[] = [];''',
    '''function previewLines(tool: string, args: Record<string, unknown>): string[] {
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

  const lines: string[] = [];''',
)

# ── Les succès partiels doivent gagner sur success:false du wrapper HTTP ─────
old_state = '''  if (response.success === false) {
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
  return { state: "success", action, message };'''
new_state = '''  // Le statut normalisé du backend est plus précis que le booléen HTTP.
  // Un batch peut renvoyer success:false ET _action.status=partial_success :
  // l'afficher en échec total ferait perdre l'information des étapes réussies.
  if (raw === "partial_success" || raw === "verification_failed") {
    return { state: "partial_success", action, message };
  }
  if (["failed", "timeout", "unsupported"].includes(raw)) {
    return { state: "failed", action, message };
  }
  if (raw === "cancelled") return { state: "cancelled", action, message };
  if (raw === "awaiting_confirmation") return { state: "awaiting_confirmation", action, message };
  if (response.success === false) {
    const lower = message.toLowerCase();
    if (lower.includes("expir") || lower.includes("déjà été utilisée") || lower.includes("déjà été traité")) {
      return { state: "expired", action, message };
    }
    return { state: "failed", action, message };
  }
  return { state: "success", action, message };'''
replace_once("components/chat/widgets/ActionExecutionCard.tsx", old_state, new_state)

# ── Conserver les étapes réelles renvoyées par le batch ──────────────────────
replace_once(
    "components/chat/widgets/ActionExecutionCard.tsx",
    '''type ConfirmationResponse = {
  success?: boolean;
  message?: string;
  data?: Record<string, unknown> | null;
};''',
    '''type ResultStep = {
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
};''',
)

replace_once(
    "components/chat/widgets/ActionExecutionCard.tsx",
    '''  const [action, setAction] = useState<ActionPayload | undefined>();
  const [detailsOpen, setDetailsOpen] = useState(false);

  const done =''',
    '''  const [action, setAction] = useState<ActionPayload | undefined>();
  const [resultSteps, setResultSteps] = useState<ResultStep[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const batchCount = confirmation.tool === "__toumai_batch__" && Array.isArray(confirmation.args?.actions)
    ? confirmation.args.actions.length
    : 0;
  const done =''',
)

replace_once(
    "components/chat/widgets/ActionExecutionCard.tsx",
    '''      setAction(normalized.action);
      setResultMessage(normalized.message);
      setState(normalized.state);''',
    '''      setAction(normalized.action);
      setResultSteps(Array.isArray(body.data?.action_steps) ? body.data!.action_steps! : []);
      setResultMessage(normalized.message);
      setState(normalized.state);''',
)

# Résultat étape par étape sous le message du serveur.
replace_once(
    "components/chat/widgets/ActionExecutionCard.tsx",
    '''                  {state === "success" && action ? (
                    <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">''',
    '''                  {resultSteps.length ? (
                    <ol className="mt-3 space-y-1.5 rounded-xl border border-[var(--border)]/80 bg-[var(--background)]/35 px-3 py-2.5" aria-label="Résultat des actions">
                      {resultSteps.slice(0, 8).map((step, index) => {
                        const succeeded = step.state === "success" || step.state === "done";
                        const partial = step.state === "partial_success" || step.state === "warning";
                        return (
                          <li key={`${step.label || "action"}-${index}`} className="flex items-start gap-2 text-[11px] leading-5">
                            <span className={`mt-[3px] inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full ${
                              succeeded ? "text-emerald-600" : partial ? "text-amber-600" : "text-[var(--text-tertiary)]"
                            }`} aria-hidden="true">
                              {succeeded ? <Check className="h-3 w-3" /> : partial ? <AlertTriangle className="h-3 w-3" /> : <CircleX className="h-3 w-3" />}
                            </span>
                            <span className="min-w-0 text-[var(--text-secondary)]">
                              {step.label || `Action ${index + 1}`}
                              {step.detail ? <span className="block text-[10px] text-[var(--text-tertiary)]">{step.detail}</span> : null}
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                  ) : null}

                  {state === "success" && action ? (
                    <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">''',
)

# Bouton explicite pour un lot.
replace_once(
    "components/chat/widgets/ActionExecutionCard.tsx",
    '''                        {descriptor.risk === "destructive" ? "Confirmer l’action" : "Confirmer"}
                      </button>''',
    '''                        {batchCount > 1
                          ? `Confirmer les ${batchCount}`
                          : descriptor.risk === "destructive"
                            ? "Confirmer l’action"
                            : "Confirmer"}
                      </button>''',
)
