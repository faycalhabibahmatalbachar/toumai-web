import fs from "node:fs";

const page = fs.readFileSync("app/today/page.tsx", "utf8");
const api = fs.readFileSync("lib/today-api.ts", "utf8");
const sidebar = fs.readFileSync("components/Sidebar.tsx", "utf8");
const waiting = fs.readFileSync("components/today/WaitingSection.tsx", "utf8");

function expect(ok, message) {
  if (!ok) throw new Error(message);
}

expect(api.includes('http.get<TodayResponse>("/today")'), "Today client must use GET /today through shared http client");
expect(api.includes('http.get<TodayBrief>("/today/brief")'), "Daily Brief must use GET /today/brief through shared http client");
expect(api.includes('http.get<TodayWaitingResponse>("/today/waiting")'), "Waiting center must use GET /today/waiting through shared http client");
expect(page.includes('from "@/lib/today-api"'), "Today page must consume the typed Today client");
expect(page.includes("useExigerCompte"), "Today page must require an authenticated account");
expect(page.includes("getProfile") && page.includes("prenomAffichable"), "Today greeting must use the real profile");
expect(!page.includes("Bonjour Fayçal") && !page.includes("Bonjour Faycal"), "Today page must not hardcode the user name");
expect(sidebar.includes('{ href: "/today", label: "Aujourd’hui"'), "Today must be reachable from the main sidebar");
expect(!page.includes("supabase") && !page.includes("from(\""), "Today page must not bypass the API with direct database calls");
expect(page.includes("aria-live") && page.includes("focus-visible"), "Today header must keep basic accessibility feedback");
expect(page.includes("Brief Toumaï") && page.includes("brief.data.text"), "Daily Brief must render the server-provided text");
for (const hidden of ["brief.data.provider", "brief.data.model", "brief.data.fact_ids", "brief.data.generated_by", "brief.data.grounding_valid"]) {
  expect(!page.includes(hidden), `Normal Today UI must not expose Daily Brief debug field: ${hidden}`);
}
expect(!page.includes("provider message") && !page.includes("provider_message_id"), "Today UI must not expose provider identifiers");

for (const bucket of ["overdue", "now", "later_today", "evening", "unscheduled"]) {
  expect(page.includes(`key: "${bucket}"`), `Timeline bucket missing: ${bucket}`);
}
for (const label of ["En retard", "Maintenant", "Plus tard", "Ce soir", "À traiter"]) {
  expect(page.includes(`label: "${label}"`), `Human timeline label missing: ${label}`);
}
expect(api.includes("timezone: string") && api.includes("local_date: string"), "Today client must expose backend timezone/local_date");
expect(page.includes("timeZone: timezone") && page.includes("today.data?.local_date"), "Dates and times must follow backend local day/timezone");
expect(page.includes("SOURCE_LABELS") && page.includes("STATUS_LABELS") && page.includes("PRIORITY_LABELS"), "Technical source/status/priority codes must be translated");
expect(page.includes("safeHttpUrl") && page.includes("safeInternalPath"), "Today deep links must pass existing URL safety gates");
expect(page.includes("today.data.tomorrow_preview.slice(0, 4)"), "Tomorrow preview must stay compact");
expect(!page.includes(".sort("), "Web timeline must preserve backend ordering instead of recalculating priority");
expect(!page.includes("priority_reasons.map"), "Internal priority reason codes must not be rendered");



expect(page.includes("getTodayWaiting") && page.includes("today:waiting"), "Today page must load the waiting center");
expect(page.includes("<WaitingSection"), "Today page must render the W4 waiting section");
expect(waiting.includes("recipient_label") && waiting.includes("status_label"), "Waiting UI must render public recipient/status labels");
expect(waiting.includes("available_actions") && waiting.includes('includes("open")'), "Waiting UI may expose only backend-advertised open action in W4");
expect(waiting.includes("safeInternalPath"), "Waiting deep links must pass existing URL safety gates");
expect(waiting.includes("Contact WhatsApp"), "Waiting UI needs a privacy-safe recipient fallback");
expect(!waiting.includes("followup_now") && !waiting.includes("pause()") && !waiting.includes("resume()") && !waiting.includes("cancel()"), "W4 must remain read-only; mutations belong to W6");
expect(!waiting.includes(".sort("), "Waiting UI must preserve backend ordering");
expect(!waiting.includes("item.status}"), "Waiting UI must not render raw technical status codes");
expect(waiting.includes("overdue_count"), "Waiting UI must expose overdue state without technical internals");

console.log("Today Center W4 contracts: PASS");
