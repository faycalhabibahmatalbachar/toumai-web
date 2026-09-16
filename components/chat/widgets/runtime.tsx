"use client";

/**
 * Les ACTIONS qu'un widget peut réellement déclencher.
 *
 * Un widget ne connaît pas l'API : il reçoit ce contexte. En production il
 * pointe sur les vraies routes serveur ; le laboratoire de widgets (dev
 * seulement) le remplace par une simulation explicite, pour éprouver chaque
 * état sans toucher à un compte réel.
 *
 * Règle : un bouton n'apparaît que si l'action existe ici. Aucune action
 * inventée pour « faire joli ».
 */

import { createContext, useContext, type ReactNode } from "react";
import {
  activateAutomation,
  cancelAutomation,
  duplicateAutomation,
  getAutomation,
  newRequestId,
  pauseAutomation,
  runAutomationNow,
  type Automation,
  type AutomationRun,
} from "@/lib/automations-api";
import {
  disconnectWhatsApp,
  getWaEtat,
  getWhatsAppStatus,
  linkWhatsAppQr,
  refreshWhatsAppCode,
  type WaEtat,
  type WhatsAppState,
} from "@/lib/connectors-api";
import { cancelToolAction } from "@/lib/chat-api";
import { authFetch } from "@/lib/http";

/** Réponse HTTP réduite à ce qu'une carte lit : le code et le corps JSON. */
export interface HttpResult {
  ok: boolean;
  status: number;
  body: Record<string, unknown>;
}

async function postJson(path: string, payload: unknown): Promise<HttpResult> {
  const res = await authFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, body };
}

export interface WidgetRuntime {
  automations: {
    get: (id: string) => Promise<Automation>;
    pause: (id: string) => Promise<Automation>;
    activate: (id: string) => Promise<Automation>;
    cancel: (id: string) => Promise<Automation>;
    duplicate: (id: string) => Promise<Automation>;
    runNow: (id: string) => Promise<AutomationRun>;
    /** Relecture périodique de l'état (ms). 0 = jamais. */
    refreshMs: number;
  };
  tools: {
    /** Relit l'état d'une confirmation écrite côté serveur. */
    pendingStatus: (pendingId: string) => Promise<HttpResult>;
    /** Exécute ce que le serveur a proposé (identifié par `pending_id`). */
    confirm: (payload: { tool: string; args: Record<string, unknown>; pending_id?: string }) => Promise<HttpResult>;
    cancel: (pendingId: string) => Promise<void>;
  };
  whatsapp: {
    getEtat: () => Promise<WaEtat>;
    getStatus: () => Promise<WhatsAppState>;
    linkQr: () => Promise<WhatsAppState>;
    refreshCode: () => Promise<{ pairingCode: string; codeExpiresAt: string }>;
    disconnect: () => Promise<unknown>;
  };
  links: {
    automation: (id: string) => string;
    connectors: string;
    plans: string;
  };
}

export const liveRuntime: WidgetRuntime = {
  automations: {
    get: getAutomation,
    pause: pauseAutomation,
    activate: activateAutomation,
    cancel: cancelAutomation,
    duplicate: duplicateAutomation,
    runNow: (id) => runAutomationNow(id, newRequestId("web-chat")),
    refreshMs: 30_000,
  },
  tools: {
    pendingStatus: (pendingId) => postJson("/agent/actions/pending/status", { pending_id: pendingId }),
    confirm: (payload) => postJson("/chat/tool/confirm", payload),
    cancel: cancelToolAction,
  },
  whatsapp: {
    getEtat: getWaEtat,
    getStatus: getWhatsAppStatus,
    linkQr: linkWhatsAppQr,
    refreshCode: refreshWhatsAppCode,
    disconnect: disconnectWhatsApp,
  },
  links: {
    automation: (id) => `/automations/?id=${encodeURIComponent(id)}`,
    connectors: "/settings/?tab=connectors",
    plans: "/billing/",
  },
};

const Ctx = createContext<WidgetRuntime>(liveRuntime);

export function WidgetRuntimeProvider({ value, children }: { value: WidgetRuntime; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWidgetRuntime() {
  return useContext(Ctx);
}
