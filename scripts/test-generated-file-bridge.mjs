import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Exercise the actual browser bridge implementation, not a copied fixture.
const source = readFileSync("lib/chat-response.ts", "utf8");
const transformed = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const context = { exports: {} };
vm.runInNewContext(transformed.outputText, context, { filename: "chat-response.js" });
const { blocksFromMetadata, mergeResponseBlocks } = context.exports;

const file = {
  id: "4a53f02b-32e2-4455-a107-ade5b27be883",
  name: "Mon programme hebdomadaire.docx",
  url: "https://signed.example.net/real.docx",
  format: "docx",
  status: "ready",
};
const activity = [{ type: "actions", steps: [] }];
const created = blocksFromMetadata({ generated_file: file });
assert.equal(created.length, 1);
assert.equal(created[0].type, "file");
assert.equal(created[0].file.id, file.id);
assert.equal(created[0].file.name, file.name);

const late = blocksFromMetadata({ blocks: activity, generated_file: file });
assert.equal(late.length, 2, "lost file when SSE already includes activity blocks");
assert.equal(late[1].type, "file");

const merged = mergeResponseBlocks(activity, late);
assert.equal(merged.filter((b) => b.type === "file").length, 1, "file card missing or duplicated");

const hasFile = blocksFromMetadata({
  blocks: [{ type: "file", file: { id: file.id, name: file.name } }],
  generated_file: file,
});
assert.equal(hasFile.length, 1, "duplicate file from structured and legacy metadata");

const maliciousProse = blocksFromMetadata({ generated_file: { name: file.name } });
assert.equal(maliciousProse.filter((b) => b.type === "file").length, 0,
  "invented file card without verified tool id");

const expired = blocksFromMetadata({
  generated_file: { id: file.id, name: file.name },
});
assert.equal(expired[0].file.id, file.id,
  "renewable file card must survive expiry of the original signed URL");

console.log("PASS: real chat-response bridge renders exactly one authentic file after SSE activity.");
