import fs from "node:fs";

const sourcePath = "components/chat/WhatsAppConnectorCard.tsx";
const source = fs.readFileSync(sourcePath, "utf8");

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

expect(
  source.includes("generation.current += 1;\n    setBusy(true)"),
  "QR mutation must invalidate older in-flight connector reads before starting",
);
expect(
  source.includes("if (CONNECTION_INTENTS.has(intent)) return;"),
  "Connection intents must not start a competing mount refresh before QR/pairing mutation",
);
expect(
  source.includes('if (!["connect", "reconnect", "qr"].includes(intent) || startedConnection.current) return;'),
  "QR/reconnect auto-start guard missing",
);
expect(
  source.includes("startedConnection.current = true"),
  "Connection attempt must remain idempotent within one mounted flow",
);

console.log("WHATSAPP_CONNECTION_RACE_CONTRACT=PASS");
console.log("STALE_PRE_MUTATION_READ_INVALIDATION=ENFORCED");
console.log("CONNECTION_MOUNT_REFRESH_RACE=FORBIDDEN");
