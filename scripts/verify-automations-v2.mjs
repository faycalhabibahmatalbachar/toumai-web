// Automatisations Web : client d'Automation OS, lecture identique au mobile.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import ts from "typescript";

let failures = 0;
function expect(condition, message) {
  if (!condition) {
    console.error(`✗ ${message}`);
    failures += 1;
  } else {
    console.log(`✓ ${message}`);
  }
}

const source = fs
  .readFileSync("lib/automations-api.ts", "utf8")
  .replace('import { http } from "./http";', "const http = { get: async () => ({}), post: async () => ({}), patch: async () => ({}) };");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const tmp = path.join(os.tmpdir(), `automations-api-${process.pid}.mjs`);
fs.writeFileSync(tmp, outputText);
const api = await import(`file://${tmp.replaceAll("\\", "/")}`);
fs.rmSync(tmp, { force: true });

const base = (over = {}) => ({
  id: "a1", name: "Bonjour à Ali", status: "active", enabled: true,
  trigger: { kind: "exact_time", at: "2026-09-16T08:00:00+01:00", timezone: "Africa/Ndjamena" },
  next_run_at: "2026-09-16T07:00:00+00:00", recipient: "Ali", media_type: "text", last_run: null, ...over,
});
const none = new Set();

expect(api.sectionOf(base(), none) === "upcoming", "active with next run is upcoming");
expect(api.sectionOf(base({ status: "paused" }), none) === "paused", "paused section");
expect(api.sectionOf(base({ next_run_at: null, last_run: { status: "succeeded" } }), none) === "done", "one-shot success is done");
expect(api.sectionOf(base({ next_run_at: null, last_run: { status: "failed" } }), none) === "failed", "one-shot failure is failed");
expect(api.sectionOf(base({ status: "draft" }), none) === "attention", "draft needs action");
expect(api.sectionOf(base(), new Set(["a1"])) === "attention", "pending approval needs action");
const recurringFailed = base({ trigger: { kind: "recurrence", cron: "0 9 * * 1" }, last_run: { status: "failed" } });
expect(api.inFilter(recurringFailed, "upcoming", none) && api.inFilter(recurringFailed, "failed", none), "failed recurrence is both upcoming and failed");

expect(api.automationStatus(base()).label === "Programmée", "status: scheduled");
expect(api.automationStatus(base({ next_run_at: null, last_run: { status: "ambiguous" } })).label === "Résultat incertain", "status: uncertain");
expect(api.runStatus("succeeded", true).label === "Acceptée par WhatsApp", "accepted, never delivered");
const statuses = ["queued", "waiting", "running", "waiting_for_approval", "succeeded", "failed", "cancelled", "skipped", "ambiguous", "timed_out"];
expect(statuses.every((s) => !/livr/i.test(api.runStatus(s, true).label) && api.runStatus(s, true).label !== s), "no raw status code and no delivery claim");

expect(api.recurrenceLabel("0 8 * * *") === "Tous les jours · 08:00", "daily recurrence");
expect(api.recurrenceLabel("30 7 * * 1") === "Chaque lundi · 07:30", "weekly recurrence");
expect(api.recurrenceLabel("0 9 * * 1-5") === "Du lundi au vendredi · 09:00", "weekdays recurrence");
expect(api.recurrenceLabel("0 10 1 * *") === "Le 1 de chaque mois · 10:00", "monthly recurrence");
expect(api.recurrenceLabel("*/5 * * * *") === "Récurrence personnalisée", "custom recurrence not mistranslated");
for (const kind of ["event", "webhook", "condition_watch"]) {
  expect(api.scheduleLabel({ trigger: { kind }, next_run_at: null }) === "Déclencheur pas encore disponible", `${kind} never presented as active`);
  expect(!api.AVAILABLE_TRIGGERS.has(kind), `${kind} not offered`);
}

expect(api.errorMessage("L'hébergeur refuse l'accès au média (HTTP 403).", "automation_terminal_failure") === "L'hébergeur refuse l'accès au média (HTTP 403).", "readable server error kept");
expect(api.errorMessage("media_resolution_serialized", "media_resolution_serialized") === "Le média n’a pas pu être préparé.", "raw media code translated");
expect(api.errorMessage("Paused by operator", "operator_paused_for_resolver_failure_accounting_fix") === "Interrompue par l’équipe Toumaï.", "operator stop not shown as English internals");
expect(api.errorMessage(null, "automation_antibot_duplicate_guard", "ambiguous").includes("vérifiez dans WhatsApp"), "ambiguous result tells the user to check");

const withSteps = base({ definition: { steps: [{ id: "send", skill: "send_whatsapp", args: { to: "+23560000000", message: "Bonjour Ali" } }] } });
expect(api.contentPreview(withSteps) === "Bonjour Ali", "content preview reads the send step");
expect(!api.contentPreview(base({ definition: { steps: [{ id: "send", skill: "whatsapp_send_media", args: { url: "{{steps.source.output.url}}" } }] } })), "template placeholders never shown");
expect(api.newRequestId("web") !== api.newRequestId("web"), "request ids are unique");

const page = fs.readFileSync("app/automations/page.tsx", "utf8");
const client = fs.readFileSync("lib/automations-api.ts", "utf8");
const uxClient = fs.readFileSync("lib/automation-ux-api.ts", "utf8");
const widget = fs.readFileSync("components/chat/widgets/kinds/AutomationWidget.tsx", "utf8");
expect(client.includes('const BASE = "/automations/v2"'), "web client targets Automation OS v2");
expect(uxClient.includes('const BASE = "/automations/v2"'), "Gate H UX client targets same Automation OS v2");
expect(page.includes('from "@/lib/automations-api"'), "automations page uses the v2 client");
expect(page.includes('from "@/lib/automation-ux-api"'), "automations page uses server-owned Inbox/preview contract");
expect(!page.includes("getWhatsAppAutomations"), "legacy wa_scheduled_messages list is no longer the page source");
expect(page.includes('runAutomationNow(id, newRequestId("web"))'), "run now carries an idempotency key");
expect(uxClient.includes("Annuler cette automatisation ?"), "cancel is confirmed at the Gate H UX boundary");
expect(page.includes("cancelAutomationWithConfirmation(id)"), "detail uses the guarded cancel boundary");
expect(page.includes('new URLSearchParams(window.location.search).get("id")'), "widget deep-link remains supported");
expect(widget.includes("scheduleLabel(automation)"), "current unified chat widget uses the shared schedule wording");
expect(uxClient.includes('`${BASE}/stream`'), "authenticated realtime Inbox stream is wired");
expect(uxClient.includes('/preview`'), "dry-run preview is wired");
expect(uxClient.includes('/rollback`'), "immutable rollback is wired");

if (failures) process.exitCode = 1;
