import type { WaSettings } from "@/lib/connectors-api";

export type WhatsAppPermissionKey = Exclude<keyof WaSettings, "status_audience">;

export type WhatsAppExperienceState =
  | "loading"
  | "ready"
  | "empty"
  | "awaiting_user"
  | "running"
  | "verifying"
  | "success"
  | "partial_success"
  | "failed"
  | "offline"
  | "expired"
  | "permission_denied"
  | "auth_required"
  | "unknown";

export type WhatsAppConnectionStatus =
  | "connected"
  | "disconnected"
  | "connecting"
  | "expired"
  | "offline"
  | "unknown";

export type WhatsAppActionGroup = "send" | "read" | "manage" | "automation";

export type WhatsAppActionIcon =
  | "message"
  | "image"
  | "document"
  | "voice"
  | "conversation"
  | "summary"
  | "group"
  | "status"
  | "schedule"
  | "contacts";

export type WhatsAppActionId =
  | "send_text"
  | "send_image"
  | "send_document"
  | "send_voice"
  | "read_conversation"
  | "summarize_conversation"
  | "manage_group"
  | "publish_status"
  | "schedule_message"
  | "browse_contacts";

export interface WhatsAppActionDefinition {
  id: WhatsAppActionId;
  group: WhatsAppActionGroup;
  label: string;
  description: string;
  icon: WhatsAppActionIcon;
  permission?: WhatsAppPermissionKey;
  sensitive?: boolean;
}

export interface WhatsAppConnectionPresentation {
  status: WhatsAppConnectionStatus;
  maskedNumber?: string | null;
  profileName?: string | null;
  stale?: boolean;
  detail?: string | null;
}

export const WHATSAPP_EXPERIENCE_STATES: readonly WhatsAppExperienceState[] = [
  "loading",
  "ready",
  "empty",
  "awaiting_user",
  "running",
  "verifying",
  "success",
  "partial_success",
  "failed",
  "offline",
  "expired",
  "permission_denied",
  "auth_required",
  "unknown",
] as const;

export function isWhatsAppTerminalState(state: WhatsAppExperienceState): boolean {
  return ["success", "partial_success", "failed", "expired"].includes(state);
}

/**
 * Intentionally strict: only a proven success may use a success treatment.
 * Partial/unknown/provider-accepted-only outcomes must never be promoted here.
 */
export function isWhatsAppProvenSuccess(state: WhatsAppExperienceState): boolean {
  return state === "success";
}
