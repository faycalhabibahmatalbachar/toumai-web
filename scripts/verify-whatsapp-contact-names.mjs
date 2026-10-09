import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync("lib/whatsapp-identity.ts", "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
}}).outputText;
const exposed = {};
vm.runInNewContext(compiled, { exports: exposed, RegExp, String, Object });
const {
  actualWhatsAppName, reconcileWhatsAppConversation,
  applyVerifiedContactName, applyVerifiedGroupName,
} = exposed;
const contact = { id: "23566000111@s.whatsapp.net", kind: "contact", name: "WhatsApp", name_source: "unresolved", picture_url: null };
const group = { id: "120363001234567@g.us", kind: "group", name: "Groupe WhatsApp", name_source: "group" };

for (const generic of ["WhatsApp", "Groupe WhatsApp", "WhatsApp Group", "Contact WhatsApp", "120363001234567@g.us", "12345678901234567"]) {
  assert.equal(actualWhatsAppName(generic, group.id), null, `Generic is not a real name: ${generic}`);
}
const saved = applyVerifiedContactName(contact, { jid: contact.id, name: "Aïcha du carnet", name_source: "saved_contact" });
assert.equal(saved.name, "Aïcha du carnet");
assert.equal(saved.name_source, "saved_contact");
const polluted = reconcileWhatsAppConversation(saved, { ...contact, name: "WhatsApp" });
assert.equal(polluted.name, saved.name, "Background refresh must keep the saved contact name");
assert.equal(polluted.name_source, "saved_contact");
assert.equal(applyVerifiedContactName(contact, { jid: "666666666@s.whatsapp.net", name: "Autre contact", name_source: "saved_contact" }).name, "WhatsApp",
  "Never match a saved identity to a different JID");
assert.equal(applyVerifiedContactName(contact, { jid: contact.id, name: "WhatsApp", name_source: "saved_contact" }).name, "WhatsApp");
assert.equal(reconcileWhatsAppConversation(saved, { ...contact, name: "Profil Aïcha", name_source: "profile" }).name, saved.name,
  "Never demote a saved contact to a profile name");
assert.equal(reconcileWhatsAppConversation(contact, { ...contact, name: "Profil Aïcha", name_source: "profile" }).name, "Profil Aïcha");
const identifiedGroup = applyVerifiedGroupName(group, { id: group.id, name: "Famille Mahamat", name_source: "group" });
assert.equal(identifiedGroup.name, "Famille Mahamat");
assert.equal(reconcileWhatsAppConversation(identifiedGroup, group).name, "Famille Mahamat",
  "Polling must not reset a real group subject");
assert.equal(applyVerifiedGroupName(group, { id: "888888@g.us", name: "Groupe privé", name_source: "group" }).name, "Groupe WhatsApp");
assert.equal(applyVerifiedGroupName(group, { id: group.id, name: "Groupe WhatsApp", name_source: "group" }).name, "Groupe WhatsApp");
assert.equal(applyVerifiedContactName({ ...contact, id: "127356346239942@lid", name: "WhatsApp" },
  { jid: "127356346239942@lid", name: "127356346239942", name_source: "profile" }).name, "WhatsApp");
assert.equal(reconcileWhatsAppConversation(identifiedGroup, { ...group, id: "999999@g.us", name: "Groupe WhatsApp" }).id,
  "999999@g.us", "Never leak titles across unrelated group IDs");

const page = readFileSync("app/whatsapp/conversations/page.tsx", "utf8");
const display = readFileSync("lib/whatsapp-display.ts", "utf8");
assert.match(page, /getWaGroupNameBook\(\)/, "Group titles need a real metadata lookup");
assert.match(page, /reconcileWhatsAppConversation\(previous\.get\(item\.id\), item\)/, "Polls must retain known names");
assert.match(page, /wa:conversations:list:v3/, "Older generic-name snapshots must be retired");
assert.match(display, /groupe whatsapp\|whatsapp group/, "Generic group labels are not valid names");

console.log("WhatsApp exact-JID real contact + group identities, poll-safe reconciliation: PASS");
