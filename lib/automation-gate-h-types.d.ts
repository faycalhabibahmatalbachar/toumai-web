import "./automations-api";

declare module "./automations-api" {
  interface Automation {
    /** Immutable Automation OS definition version returned by the backend. */
    version?: number;
    /** Gate H server-owned Inbox classification. */
    inbox_section?: "attention" | "upcoming" | "paused" | "failed" | "done";
  }
}
