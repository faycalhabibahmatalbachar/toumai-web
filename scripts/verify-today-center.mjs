import fs from "node:fs";

const page = fs.readFileSync("app/today/page.tsx", "utf8");
const api = fs.readFileSync("lib/today-api.ts", "utf8");
const sidebar = fs.readFileSync("components/Sidebar.tsx", "utf8");

function expect(ok, message) {
  if (!ok) throw new Error(message);
}

expect(api.includes('http.get<TodayResponse>("/today")'), "Today client must use GET /today through shared http client");
expect(page.includes('from "@/lib/today-api"'), "Today page must consume the typed Today client");
expect(page.includes("useExigerCompte"), "Today page must require an authenticated account");
expect(page.includes("getProfile") && page.includes("prenomAffichable"), "Today greeting must use the real profile");
expect(!page.includes("Bonjour Fayçal") && !page.includes("Bonjour Faycal"), "Today page must not hardcode the user name");
expect(sidebar.includes('{ href: "/today", label: "Aujourd’hui"'), "Today must be reachable from the main sidebar");
expect(!page.includes("supabase") && !page.includes("from(\""), "Today page must not bypass the API with direct database calls");
expect(page.includes("aria-live") && page.includes("focus-visible"), "Today header must keep basic accessibility feedback");

console.log("Today Center W1 contracts: PASS");
