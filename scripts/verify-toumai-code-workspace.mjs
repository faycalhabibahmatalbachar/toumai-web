import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

const stream = read("lib/chat-stream.ts");
const message = read("components/ChatMessage.tsx");
const card = read("components/chat/CodingRunCard.tsx");
const workspace = read("components/chat/CodeWorkspace.tsx");
const context = read("components/chat/ChatContextPanel.tsx");
const evidence = read("lib/code-evidence.ts");
const css = read("app/globals.css");

const checks = [
  [
    "typed public evidence contract",
    stream.includes("CodingPublicEvent") &&
      stream.includes("terminal_logs?: CodingTerminalEvidence[]") &&
      stream.includes("deployments?: CodingDeploymentEvidence[]"),
  ],
  [
    "chat exposes requested public phases",
    ["Plan", "Agents", "Tâches", "Fichier actif", "Commands", "Tests", "Repair loop", "Security", "Review", "Deployment"]
      .every((label) => card.includes('label="' + label + '"')),
  ],
  [
    "coding run hides chain of thought",
    message.includes("message.reasoning && !message.codingRun"),
  ],
  [
    "workspace has all requested surfaces",
    ["Files", "Diff", "Terminal logs", "Tests", "Preview", "Browser screenshot", "Security", "Agents", "Artifacts", "Deployments"]
      .every((label) => workspace.includes('label: "' + label + '"')),
  ],
  [
    "workspace uses secret redaction",
    workspace.includes("redactSensitiveText") &&
      card.includes("redactSensitiveText") &&
      evidence.includes("Bearer [REDACTED]"),
  ],
  [
    "preview is sandboxed",
    workspace.includes('sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-scripts"'),
  ],
  [
    "context switches to code workspace",
    context.includes("<CodeWorkspace run={message.codingRun} project={message.codingProject} />") &&
      context.includes('"Workspace Code"'),
  ],
  [
    "mobile workspace remains fullscreen",
    css.includes(".chat-context-panel") &&
      css.includes("width: 100vw !important;") &&
      css.includes("max-width: none !important;"),
  ],
];

const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) {
  console.log((ok ? "PASS" : "FAIL") + " " + name);
}

if (failed.length) {
  console.error(
    "\nToumaï Code workspace verification failed: " +
      failed.map(([name]) => name).join(", "),
  );
  process.exit(1);
}

console.log(
  "\nToumaï Code workspace verification passed: " +
    checks.length +
    "/" +
    checks.length,
);
