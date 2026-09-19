import fs from "node:fs";

const panel = fs.readFileSync("components/chat/ReasoningPanel.tsx", "utf8");

function expect(ok, message) {
  if (!ok) throw new Error(message);
}

expect(panel.includes("reasoning: _privateReasoning"), "Reasoning prop must be explicitly private");
expect(!panel.includes("{text}"), "Raw reasoning text must never be rendered");
expect(!panel.includes("AnimatePresence"), "Private reasoning must not have an expandable panel");
expect(!panel.includes("motion.div"), "Private reasoning must not be animated into view");
expect(panel.includes("Réflexion en cours…"), "Streaming may expose only a public activity label");
expect(panel.includes("Réflexion ·"), "Completed reasoning may expose only measured duration");

console.log("Reasoning privacy UI: PASS");
