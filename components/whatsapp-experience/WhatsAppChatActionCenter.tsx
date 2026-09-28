"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { WaContact, WaEtat, WhatsAppState } from "@/lib/connectors-api";
import { useWidgetRuntime } from "@/components/chat/widgets/runtime";
import { WhatsAppActionCenter } from "./WhatsAppActionCenter";
import { WhatsAppActionPreview } from "./WhatsAppActionPreview";
import { WhatsAppConnectionFlow } from "./WhatsAppConnectionFlow";
import { WhatsAppContactPicker } from "./WhatsAppContactPicker";
import { WhatsAppPermissionGate } from "./WhatsAppPermissionGate";
import { WhatsAppRecentActivity } from "./WhatsAppRecentActivity";
import {
  whatsappActionNeedsContact,
  whatsappStarterFor,
  whatsappStarterForContact,
} from "@/lib/whatsapp-ui/presentation";
import type {
  WhatsAppActionDefinition,
  WhatsAppConnectionPresentation,
  WhatsAppExperienceState,
} from "@/lib/whatsapp-ui/types";

function maskNumber(value?: string | null) {
  if (!value) return null;
  const clean = value.replace(/\s+/g, "");
  if (clean.length <= 7) return clean;
  const prefix = clean.startsWith("+") ? clean.slice(0, 7) : `+${clean.slice(0, 6)}`;
  return `${prefix}•••${clean.slice(-3)}`;
}

function presentationFrom(etat: WaEtat | null, raw: WhatsAppState | null): WhatsAppConnectionPresentation {
  const code = etat?.code;
  const rawStatus = raw?.status;
  const number = etat?.numero || raw?.number || null;

  if (code === "connecte" || rawStatus === "connected") {
    return {
      status: "connected",
      maskedNumber: maskNumber(number),
      profileName: etat?.nom_profil || null,
    };
  }
  if (code === "session_expiree" || rawStatus === "session_expiree") {
    return { status: "expired", maskedNumber: maskNumber(number) };
  }
  if (code === "injoignable" || rawStatus === "injoignable") {
    return { status: "offline", maskedNumber: maskNumber(number) };
  }
  if (["connexion", "qr", "jumelage"].includes(code || "") || ["connecting", "qr", "pairing"].includes(rawStatus || "")) {
    return { status: "connecting", maskedNumber: maskNumber(number) };
  }
  if (code === "deconnecte" || rawStatus === "disconnected" || code === "non_configure" || rawStatus === "unconfigured") {
    return { status: "disconnected", maskedNumber: maskNumber(number) };
  }
  return { status: "unknown", maskedNumber: maskNumber(number) };
}

function focusable(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true");
}

export function WhatsAppChatActionCenter({
  open,
  onClose,
  onPrepare,
}: {
  open: boolean;
  onClose: () => void;
  onPrepare: (starter: string) => void;
}) {
  const { whatsapp } = useWidgetRuntime();
  const [etat, setEtat] = useState<WaEtat | null>(null);
  const [raw, setRaw] = useState<WhatsAppState | null>(null);
  const [state, setState] = useState<WhatsAppExperienceState>("loading");
  const [connectionFlowOpen, setConnectionFlowOpen] = useState(false);
  const [recentActivityOpen, setRecentActivityOpen] = useState(false);
  const [permissionAction, setPermissionAction] = useState<WhatsAppActionDefinition | null>(null);
  const [pendingAction, setPendingAction] = useState<WhatsAppActionDefinition | null>(null);
  const [selectedContact, setSelectedContact] = useState<WaContact | null>(null);
  const generation = useRef(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const restorePreviousFocus = useRef(true);
  const connection = presentationFrom(etat, raw);

  const refresh = useCallback(async () => {
    const current = ++generation.current;
    setState("loading");
    const [nextEtat, nextRaw] = await Promise.all([
      whatsapp.getEtat().catch(() => null),
      whatsapp.getStatus().catch(() => null),
    ]);
    if (current !== generation.current) return;
    setEtat(nextEtat);
    setRaw(nextRaw);
    setState(nextEtat || nextRaw ? "ready" : "unknown");
  }, [whatsapp]);

  useEffect(() => {
    if (!open) {
      setConnectionFlowOpen(false);
      setRecentActivityOpen(false);
      setPermissionAction(null);
      setPendingAction(null);
      setSelectedContact(null);
      return;
    }
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    restorePreviousFocus.current = true;
    void refresh();
    const id = window.setTimeout(() => {
      dialogRef.current?.querySelector<HTMLElement>('[data-wa-sheet-close="true"]')?.focus();
    }, 0);
    return () => {
      window.clearTimeout(id);
      generation.current += 1;
      if (restorePreviousFocus.current) previousFocus.current?.focus();
    };
  }, [open, refresh]);

  useEffect(() => {
    if (!open || !connectionFlowOpen) return;
    const id = window.setInterval(() => void refresh(), 2500);
    return () => window.clearInterval(id);
  }, [open, connectionFlowOpen, refresh]);

  useEffect(() => {
    if (connectionFlowOpen && connection.status === "connected") {
      setConnectionFlowOpen(false);
    }
  }, [connectionFlowOpen, connection.status]);

  useEffect(() => {
    if (!open) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const keepFocusInside = (event: FocusEvent) => {
      if (!restorePreviousFocus.current || !dialogRef.current) return;
      const target = event.target;
      if (target instanceof Node && dialogRef.current.contains(target)) return;
      const items = focusable(dialogRef.current);
      const fallback = items[0] || dialogRef.current;
      window.requestAnimationFrame(() => {
        if (restorePreviousFocus.current && dialogRef.current && document.contains(fallback)) {
          fallback.focus();
        }
      });
    };
    document.addEventListener("focusin", keepFocusInside);
    return () => document.removeEventListener("focusin", keepFocusInside);
  }, [open]);

  if (!open) return null;

  function handoffToComposer(starter: string) {
    restorePreviousFocus.current = false;
    onPrepare(starter);
    onClose();
  }

  function continueAction(action: WhatsAppActionDefinition) {
    setPermissionAction(null);
    if (whatsappActionNeedsContact(action.id)) {
      setSelectedContact(null);
      setPendingAction(action);
      return;
    }
    handoffToComposer(whatsappStarterFor(action.id));
  }

  function prepare(action: WhatsAppActionDefinition) {
    if (action.permission) {
      setRecentActivityOpen(false);
      setSelectedContact(null);
      setPendingAction(null);
      setPermissionAction(action);
      return;
    }
    continueAction(action);
  }

  function selectContact(contact: WaContact) {
    if (!pendingAction || !contact.number) return;
    setSelectedContact(contact);
  }

  function confirmPreview() {
    if (!pendingAction || !selectedContact?.number) return;
    const starter = whatsappStarterForContact(pendingAction.id, {
      name: selectedContact.name,
      number: selectedContact.number,
    });
    setSelectedContact(null);
    setPendingAction(null);
    handoffToComposer(starter);
  }

  function modifyPreview() {
    setSelectedContact(null);
  }

  function backToActions() {
    setRecentActivityOpen(false);
    setPermissionAction(null);
    setSelectedContact(null);
    setPendingAction(null);
    window.requestAnimationFrame(() => {
      dialogRef.current?.querySelector<HTMLElement>('[data-testid="wa-v2-action-center"] button:not([disabled])')?.focus();
    });
  }

  function trapTab(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab" || !dialogRef.current) return;
    const items = focusable(dialogRef.current);
    if (!items.length) return;
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const index = active ? items.indexOf(active) : -1;
    if (event.shiftKey) {
      if (index <= 0) {
        event.preventDefault();
        items[items.length - 1].focus();
      }
      return;
    }
    if (index < 0 || index === items.length - 1) {
      event.preventDefault();
      items[0].focus();
    }
  }

  const previewStarter = pendingAction && selectedContact?.number
    ? whatsappStarterForContact(pendingAction.id, {
        name: selectedContact.name,
        number: selectedContact.number,
      })
    : "";

  const title = connectionFlowOpen
    ? "Connexion WhatsApp"
    : recentActivityOpen
      ? "Activité récente"
      : permissionAction
        ? "Vérifier la permission"
        : pendingAction && selectedContact
          ? "Vérifier avant de continuer"
          : pendingAction
            ? "Choisir un contact"
            : "Actions WhatsApp";

  return (
    <div className="fixed inset-0 z-[70]" data-testid="wa-v2-chat-overlay">
      <button
        type="button"
        aria-label="Fermer les actions WhatsApp"
        className="absolute inset-0 h-full w-full bg-black/35 backdrop-blur-[1px]"
        onClick={onClose}
        tabIndex={-1}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wa-v2-dialog-title"
        onKeyDown={trapTab}
        tabIndex={-1}
        className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-[28px] border border-[var(--border)] bg-[var(--background)] p-3 shadow-2xl sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[min(39rem,92vw)] sm:rounded-none sm:rounded-l-[28px] sm:p-4"
        data-testid="wa-v2-chat-sheet"
      >
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">Toumaï · Connecteur</p>
            <h2 id="wa-v2-dialog-title" className="mt-0.5 text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
          </div>
          <button
            type="button"
            data-wa-sheet-close="true"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-secondary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {connectionFlowOpen ? (
          <WhatsAppConnectionFlow
            expired={connection.status === "expired"}
            onBack={() => {
              setConnectionFlowOpen(false);
              void refresh();
            }}
          />
        ) : recentActivityOpen ? (
          <WhatsAppRecentActivity
            onBack={backToActions}
            onOpenAdvanced={() => window.location.assign("/whatsapp/")}
          />
        ) : permissionAction ? (
          <WhatsAppPermissionGate
            action={permissionAction}
            onAllowed={() => continueAction(permissionAction)}
            onBack={backToActions}
            onManagePermissions={() => window.location.assign("/settings/?tab=connectors")}
          />
        ) : pendingAction && selectedContact ? (
          <WhatsAppActionPreview
            action={pendingAction}
            contact={selectedContact}
            starter={previewStarter}
            onModify={modifyPreview}
            onConfirm={confirmPreview}
          />
        ) : pendingAction ? (
          <WhatsAppContactPicker
            actionLabel={pendingAction.label}
            onBack={backToActions}
            onSelect={selectContact}
          />
        ) : (
          <WhatsAppActionCenter
            connection={connection}
            state={state}
            onAction={prepare}
            onConnect={() => {
              setRecentActivityOpen(false);
              setSelectedContact(null);
              setPendingAction(null);
              setPermissionAction(null);
              setConnectionFlowOpen(true);
            }}
            onOpenRecentActivity={() => {
              setConnectionFlowOpen(false);
              setPermissionAction(null);
              setPendingAction(null);
              setSelectedContact(null);
              setRecentActivityOpen(true);
            }}
            onOpenAdvanced={() => window.location.assign("/whatsapp/")}
          />
        )}
      </div>
    </div>
  );
}
