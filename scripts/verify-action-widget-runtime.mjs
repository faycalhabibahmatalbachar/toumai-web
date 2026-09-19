import fs from "node:fs";

const path = "components/chat/widgets/ActionExecutionCard.tsx";
const source = fs.readFileSync(path, "utf8");
const richPath = "components/chat/RichResponseBlocks.tsx";
const richSource = fs.readFileSync(richPath, "utf8");
const primitives = fs.readFileSync("components/chat/widgets/primitives.tsx", "utf8");
const steps = fs.readFileSync("components/chat/widgets/kinds/ActionStepsWidget.tsx", "utf8");
const runtime = fs.readFileSync("components/chat/widgets/runtime.tsx", "utf8");

function expect(condition, message) {
  if (!condition) {
    console.error(`✗ ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`✓ ${message}`);
  }
}

expect(source.includes('max-w-[480px]'), "action card is capped at a compact desktop width");
expect(!source.includes('max-w-[560px]'), "legacy oversized 560px action card is removed");
expect(source.includes('min-h-11'), "confirmation controls keep >=44px touch targets");
expect(source.includes('useReducedMotion'), "reduced-motion preference is respected");
expect(source.includes('runtime.tools.pendingStatus(') && runtime.includes('/agent/actions/pending/status'), "persistent confirmation is reconciled after reload");
expect(source.includes('confirmation.pending_id'), "pending_id remains the server authority for confirmation");
expect(!source.includes('"already_processed"') && !source.includes("Action déjà traitée"), "consumed pending rows are never rendered as a fake success state");
expect(source.includes("confirmInFlight.current"), "double clicks are locked before the network request");
expect(source.includes("body.data?.action"), "reload reconciliation consumes stored action truth");
expect(source.includes('status === "confirmed" || status === "executing"'), "in-flight actions remain running until terminal server state");
expect(source.includes('status === "uncertain"'), "indeterminate provider outcomes have a dedicated reconciliation branch");
expect(source.includes('"Résultat à vérifier"'), "uncertain outcomes are never painted as success");
expect(source.includes("éviter un doublon"), "uncertain outcomes explain why automatic replay is blocked");
expect(source.includes('__toumai_batch__'), "batch workflows stay rendered as one action surface");
expect(source.includes('data-action-runtime="true"'), "action runtime marks its single visual surface");
expect(source.includes('.prose-toumai{display:none}'), "duplicated assistant prose is hidden when an action surface owns the turn");
expect(source.includes('Créer le groupe'), "group creation uses a structured short row");
expect(source.includes('Envoyer le message'), "message sending uses a structured short row");
expect(source.includes('Terminé avec ${Math.max(1, problems)} problème'), "partial success has a concise problem summary");
expect(source.includes('Non inclus dans votre formule.'), "quota failure is reduced to a user-facing concise detail");
expect(source.includes('groupe WhatsApp'), "internal group JIDs are sanitized from details");
expect(source.includes('focus-visible:ring-2'), "keyboard focus remains visible");
// Les cartes reposent sur WidgetCard : live = aria-live polite, alert = role alert.
expect(primitives.includes('aria-live={live ? "polite" : undefined}') && /\n\s+live\r?\n/.test(source), "runtime updates are announced politely");
expect(primitives.includes('role={alert ? "alert" : undefined}') && source.includes('alert={state === "failed"}'), "alert role is reserved for real failures");

expect(steps.includes('max-w-[30rem]'), "server action result blocks use a compact width");
expect(richSource.includes('return hideConfirmation ? null : <ActionStepsWidget'), "action result blocks are suppressed when ActionExecutionCard owns the turn");
expect(!richSource.includes('Workflow terminé avec un résultat partiel') && !steps.includes('Workflow terminé avec un résultat partiel'), "legacy verbose partial-success heading is removed");
expect(steps.includes('`Terminé avec ${problems'), "rich action blocks use the concise problem summary");
expect(steps.includes('Non inclus dans votre formule.'), "rich action blocks normalize quota failures");
expect(steps.includes('displayText('), "rich action blocks sanitize backend display text");
expect(primitives.includes('motion-reduce:animate-none'), "rich action block progress respects reduced motion");
expect(steps.includes('alert={s.overall === "failed"}'), "partial success does not misuse alert role");

if (process.exitCode) process.exit(process.exitCode);
console.log("Action widget runtime regression checks passed.");
