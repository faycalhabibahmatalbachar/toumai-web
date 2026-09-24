import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const stream = readFileSync(new URL("../lib/chat-stream.ts", import.meta.url), "utf8");
const card = readFileSync(new URL("../components/chat/CodingRunCard.tsx", import.meta.url), "utf8");

assert.match(stream, /export interface CodingDebugDiagnostic\s*{/);
assert.match(stream, /status:\s*"diagnosed"\s*\|\s*"insufficient_evidence"/);
assert.match(stream, /evidence:\s*CodingCommandEvidence\[\]/);
assert.match(stream, /candidate_files:\s*string\[\]/);
assert.match(stream, /debug_cycle\?:\s*CodingDebugCycle/);

assert.match(
  card,
  /id:\s*"repair",\s*label:\s*"Debug & Repair",\s*agents:\s*\["debugger",\s*"repair"\]/,
);
assert.match(card, /repair:\s*"Repair"/);
assert.match(card, /debugCycle\?\.status === "escalated"/);

console.log("coding debug/repair contract: ok");
