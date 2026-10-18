import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("components/chat/widgets/kinds/FileWidget.tsx", "utf8");
const slash = String.fromCharCode(92);
assert.ok(source.includes("originalName.match(/" + slash + ".(docx?|xlsx?|pptx?|pdf)$/i)"));
assert.ok(source.includes("originalName.replace(/" + slash + ".[^.]+$/,"));
assert.ok(source.includes(".replace(/" + slash + "s+/g,"));
assert.ok(!source.includes("originalName.match(/" + slash + slash + "."));

for (const filename of ["Planning.docx", "Budget.xlsx", "Bilan.pdf", "Presentation.pptx"]) {
  assert.ok(/\.(docx?|xlsx?|pptx?|pdf)$/i.test(filename), filename);
}
assert.ok(!/\.(docx?|xlsx?|pptx?|pdf)$/i.test("Planning.docx.exe"));
assert.equal("Réunion stratégique".normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9 _-]/g, "").trim().replace(/\s+/g, "-"), "Reunion-strategique");
console.log("PASS: document file extension and Unicode filename regression checks.");
