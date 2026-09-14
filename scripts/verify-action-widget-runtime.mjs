import fs from "node:fs";

const path = "components/chat/widgets/ActionExecutionCard.tsx";
const source = fs.readFileSync(path, "utf8");

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
expect(source.includes('/agent/actions/pending/status'), "persistent confirmation is reconciled after reload");
expect(source.includes('confirmation.pending_id'), "pending_id remains the server authority for confirmation");
expect(source.includes('__toumai_batch__'), "batch workflows stay rendered as one action surface");
expect(source.includes('data-action-runtime="true"'), "action runtime marks its single visual surface");
expect(source.includes('.prose-toumai{display:none}'), "duplicated assistant prose is hidden when an action surface owns the turn");
expect(source.includes('Créer le groupe'), "group creation uses a structured short row");
expect(source.includes('Envoyer le message'), "message sending uses a structured short row");
expect(source.includes('Terminé avec ${Math.max(1, problems)} problème'), "partial success has a concise problem summary");
expect(source.includes('Non inclus dans votre formule.'), "quota failure is reduced to a user-facing concise detail");
expect(source.includes('groupe WhatsApp'), "internal group JIDs are sanitized from details");
expect(source.includes('focus-visible:ring-2'), "keyboard focus remains visible");
expect(source.includes('aria-live="polite"'), "runtime updates are announced politely");
expect(source.includes('role={state === "failed" ? "alert" : undefined}'), "alert role is reserved for real failures");

if (process.exitCode) process.exit(process.exitCode);
console.log("Action widget runtime regression checks passed.");
