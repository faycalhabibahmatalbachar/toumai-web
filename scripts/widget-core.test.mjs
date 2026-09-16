// Tests de comportement du noyau des widgets (lib/widgets/core.ts).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

// Transpilé à la volée : le test tourne aussi sur Node 20 (CI).
const { outputText } = ts.transpileModule(fs.readFileSync("lib/widgets/core.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const tmp = path.join(os.tmpdir(), `widgets-core-${process.pid}.mjs`);
fs.writeFileSync(tmp, outputText);
const {
  aqiTone,
  cellText,
  detectTableKind,
  displayText,
  fileKind,
  formatBytes,
  maskPhone,
  normalizeStatus,
  parseDate,
  pick,
  pickNum,
  rec,
  safeHttpUrl,
  safeInternalPath,
  summarizeSteps,
  tableColumns,
  toneOf,
  weatherIcon,
} = await import(pathToFileURL(tmp).href);
fs.rmSync(tmp, { force: true });

test("la lecture tolère toutes les formes absentes ou fausses", () => {
  assert.deepEqual(rec(null), {});
  assert.deepEqual(rec([1, 2]), {});
  assert.equal(pick({ a: "", b: "  x " }, "a", "b"), "x");
  assert.equal(pick({}, "a"), "");
  assert.equal(pickNum({ t: "31.5" }, "t"), 31.5);
  assert.equal(pickNum({ t: "chaud" }, "t"), null);
});

test("seuls les liens http(s) sont ouvrables", () => {
  assert.equal(safeHttpUrl("javascript:alert(1)"), null);
  assert.equal(safeHttpUrl("data:text/html,<script>"), null);
  assert.equal(safeHttpUrl("/relatif"), null);
  assert.equal(safeHttpUrl("https://toumaiai.com/a"), "https://toumaiai.com/a");
  assert.equal(safeInternalPath("//evil.com"), null);
  assert.equal(safeInternalPath("/automations?id=1"), "/automations?id=1");
});

test("aucun identifiant WhatsApp ni numéro complet n'est affiché", () => {
  const out = displayText("Envoyé à 23566123478@s.whatsapp.net dans 120363041234567890@g.us");
  assert.ok(!out.includes("@"), out);
  assert.ok(out.includes("groupe WhatsApp"), out);
  assert.ok(out.includes("•••"), out);
  assert.equal(maskPhone("+235 66 12 34 78"), "+235 66•••478");
  assert.equal(maskPhone("123"), "123");
  assert.equal(displayText("Budget de 15 000 000 FCFA en 2026"), "Budget de 15 000 000 FCFA en 2026");
  assert.equal(displayText("Total 12,50 €"), "Total 12,50 €");
});

test("les statuts inconnus ne deviennent jamais un succès", () => {
  assert.equal(normalizeStatus("succeeded"), "success");
  assert.equal(normalizeStatus("verification_failed"), "partial_success");
  assert.equal(normalizeStatus("timed_out"), "failed");
  assert.equal(normalizeStatus("waiting_for_approval"), "awaiting_confirmation");
  assert.equal(normalizeStatus("quelque_chose"), "unknown");
  assert.equal(normalizeStatus(undefined), "unknown");
  assert.equal(toneOf("unknown"), "neutral");
  assert.equal(toneOf("partial_success"), "warning");
});

test("un résumé d'opérations en masse compte sans rien inventer", () => {
  const states = [...Array(97).fill("success"), ...Array(3).fill("failed")];
  const s = summarizeSteps(states);
  assert.equal(s.total, 100);
  assert.equal(s.succeeded, 97);
  assert.equal(s.failed, 3);
  assert.equal(s.overall, "partial_success");
  assert.equal(summarizeSteps([]).overall, "empty");
  assert.equal(summarizeSteps(["running", "success"]).overall, "running");
  assert.equal(summarizeSteps(["blocked", "blocked"]).overall, "blocked");
});

test("les tableaux serveur sont reconnus par leur forme, pas par hasard", () => {
  assert.equal(detectTableKind([{ subject: "A", from: "b@c.d" }], "Boîte de réception"), "emails");
  assert.equal(detectTableKind([{ send_at: "2026-09-16T15:12:00Z", to_name: "Tech", message: "Bonjour" }]), "scheduled_messages");
  assert.equal(detectTableKind([{ ville: "Sarh", population: 3 }]), "generic");
  assert.equal(detectTableKind([], "Messages programmés"), "scheduled_messages");
  assert.deepEqual(tableColumns([{ id: 1, name: "x", user_jid: "y", _meta: 1, score: 2 }]), ["name", "score"]);
  assert.equal(cellText({ a: 1 }), "…");
  assert.equal(cellText(true), "✓");
});

test("types de fichiers, tailles et dates restent stables", () => {
  assert.equal(fileKind("rapport.PDF"), "pdf");
  assert.equal(fileKind("x", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"), "sheet");
  assert.equal(fileKind("deck.pptx"), "slides");
  assert.equal(fileKind("archive.zip"), "archive");
  assert.equal(fileKind("sans-extension"), "unknown");
  assert.equal(formatBytes(2048), "2 Ko");
  assert.equal(formatBytes(-1), "");
  assert.equal(parseDate("pas une date"), null);
  assert.equal(parseDate(""), null);
  assert.ok(parseDate("2026-09-16T15:12:00+01:00") instanceof Date);
  assert.ok(parseDate(1789999999) instanceof Date);
});

test("météo et qualité de l'air ont une tonalité déterministe", () => {
  assert.equal(weatherIcon(0), "sun");
  assert.equal(weatherIcon(63), "rain");
  assert.equal(weatherIcon(null, "Ciel dégagé"), "sun");
  assert.equal(weatherIcon(null, "Brume de poussière"), "fog");
  assert.equal(weatherIcon(null, ""), "unknown");
  assert.equal(aqiTone(null), "neutral");
  assert.equal(aqiTone(42), "success");
  assert.equal(aqiTone(180), "error");
});
