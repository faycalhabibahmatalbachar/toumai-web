import fs from "node:fs";

const page = fs.readFileSync("app/login/page.tsx", "utf8").toLowerCase();
const forbidden = [
  "numéro existe sur whatsapp",
  "numéro n'existe pas sur whatsapp",
  "compte whatsapp non lié",
  "not registered on whatsapp",
  "registered on whatsapp",
];
for (const text of forbidden) {
  if (page.includes(text)) throw new Error(`WA_AUTH_COPY_PRIVACY_FAIL: ${text}`);
}
console.log("WA_AUTH_COPY_PRIVACY=PASS");
