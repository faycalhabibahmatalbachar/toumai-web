import fs from "node:fs";

const registry = fs.readFileSync("components/chat/widgets/registry.tsx", "utf8");
const reminder = fs.readFileSync("components/chat/widgets/kinds/ReminderWidget.tsx", "utf8");
const i18n = fs.readFileSync("lib/widgets/i18n.ts", "utf8");

function expect(ok, message) {
  if (!ok) throw new Error(message);
}

expect(registry.includes("personal_reminder:"), "personal_reminder must be registered");
expect(registry.includes("ReminderWidget"), "registry must render ReminderWidget");
expect(reminder.includes("BellRing"), "reminder needs a dedicated reminder icon");
expect(reminder.includes('testId="personal_reminder"'), "reminder needs a stable widget contract");
expect(reminder.includes("runtime.automations.get(id)"), "reminder must reconcile with server state");
expect(reminder.includes('runtime.automations.pause(id)'), "pause must use Automation OS");
expect(reminder.includes('runtime.automations.activate(id)'), "resume must use Automation OS");
expect(reminder.includes('runtime.automations.cancel(id)'), "cancel must use Automation OS");
expect(!reminder.includes("runNow("), "simple reminder card must not expose run-now");
expect(!reminder.includes("duplicate("), "simple reminder card must not expose duplicate");
expect(!reminder.toLowerCase().includes("whatsapp"), "personal reminder UI must not mention WhatsApp");
expect(!reminder.toLowerCase().includes("google calendar"), "personal reminder UI must not mention Google Calendar");
expect(reminder.includes("formatRelative"), "next reminder must include human relative time");
expect(reminder.includes("ConfirmationPanel"), "destructive cancel must be confirmed");
expect(i18n.includes('channel: "Notifications Toumaï"'), "French reminder channel microcopy missing");
expect(i18n.includes('created: "Rappel créé"'), "French success microcopy missing");
expect(i18n.includes('channel: "Toumaï notifications"'), "English reminder channel microcopy missing");
expect(i18n.includes('channel: "إشعارات Toumaï"'), "Arabic reminder channel microcopy missing");

console.log("personal-reminder-widget: PASS");
