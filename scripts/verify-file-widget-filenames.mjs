import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

// Inspect the actual FileWidget extension matcher rather than repeating it
// in a test-only regexp that could keep passing after a production regression.
const source = readFileSync("components/chat/widgets/kinds/FileWidget.tsx", "utf8");
const marker = "originalName.match(";
const start = source.indexOf(marker);
assert.notEqual(start, -1, "FileWidget must inspect originalName's extension");
const end = source.indexOf(")?.[1]", start);
assert.notEqual(end, -1, "FileWidget extension extraction contract changed");
const literal = source.slice(start + marker.length, end);
assert.match(literal, /^\/(?:\\.|[^/\\])+\/[a-z]*$/i, "Expected a regexp literal, not arbitrary code");
const matcher = vm.runInNewContext(literal, Object.create(null), { timeout: 1000 });
assert.equal(Object.prototype.toString.call(matcher), "[object RegExp]");

for (const [filename, expected] of [
  ["Planning.docx", "docx"],
  ["Budget.xlsx", "xlsx"],
  ["Bilan.pdf", "pdf"],
  ["Presentation.pptx", "pptx"],
  ["PLANNING.DOCX", "DOCX"],
]) {
  assert.equal(matcher.exec(filename)?.[1], expected, "Valid extension: " + filename);
}
for (const filename of [
  "Planning.docx.exe", "Budget.xlsx.zip", "file.pdf/evil", "rapport", "rapport.pdf.txt",
]) {
  assert.equal(matcher.exec(filename), null, "Unsafe or unsupported suffix: " + filename);
}

assert.ok(source.includes('originalName.replace(/\\.[^.]+$/, "")'), "Filename title must strip suffix");
assert.ok(source.includes('.replace(/\\s+/g, "-")'), "Filename title must collapse whitespace");
const normalized = "Réunion stratégique".normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-zA-Z0-9 _-]/g, "")
  .trim().replace(/\s+/g, "-");
assert.equal(normalized, "Reunion-strategique");
console.log("PASS: FileWidget live matcher, spoofed suffixes and Unicode title fallback");
