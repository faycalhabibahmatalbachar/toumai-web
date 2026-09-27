"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { SELECTABLE_MODELS, findModel } from "@/lib/models";

/** A compact listbox anchored above the chat composer. */
export function ModelSelector({
  value,
  onChange,
  dismissKey,
  suspended = false,
}: {
  value: string;
  onChange: (id: string) => void;
  /** Changing conversations dismisses any transient composer menu. */
  dismissKey?: string | number | null;
  /** The mobile drawer owns focus while it is open. */
  suspended?: boolean;
}) {
  const [openFor, setOpenFor] = useState<{ key: string | number | null | undefined } | null>(null);
  const open = Boolean(openFor && openFor.key === dismissKey && !suspended);
  const [focusIndex, setFocusIndex] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listId = useId();
  const current = findModel(value) ?? SELECTABLE_MODELS[0];
  const enabledIndexes = SELECTABLE_MODELS.flatMap((model, index) => model.disabled ? [] : [index]);

  function close(restoreFocus: boolean) {
    setOpenFor(null);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function openMenu(initial?: number) {
    if (suspended || !enabledIndexes.length) return;
    const selected = SELECTABLE_MODELS.findIndex((model) => model.id === value && !model.disabled);
    setFocusIndex(initial ?? (selected >= 0 ? selected : enabledIndexes[0]));
    setOpenFor({ key: dismissKey });
  }

  function moveFocus(key: "ArrowDown" | "ArrowUp" | "Home" | "End") {
    if (!enabledIndexes.length) return;
    const position = enabledIndexes.indexOf(focusIndex);
    const next = key === "Home" ? enabledIndexes[0]
      : key === "End" ? enabledIndexes[enabledIndexes.length - 1]
      : enabledIndexes[(position + (key === "ArrowDown" ? 1 : -1) + enabledIndexes.length) % enabledIndexes.length];
    setFocusIndex(next);
  }

  function focusBeyondMenu(backward: boolean) {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const candidates = Array.from(document.querySelectorAll<HTMLElement>(
      'a[href], button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])',
    )).filter((element) =>
      element.getClientRects().length > 0 &&
      !element.closest("[inert]") &&
      (!wrapperRef.current?.contains(element) || element === trigger),
    );
    const index = candidates.indexOf(trigger);
    const next = candidates[index + (backward ? -1 : 1)];
    if (next) next.focus();
    else trigger.focus();
  }

  useLayoutEffect(() => {
    if (open) optionRefs.current[focusIndex]?.focus();
  }, [open, focusIndex]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) close(false);
    }
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close(true);
      }
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!suspended) return;
    const frame = requestAnimationFrame(() => setOpenFor(null));
    return () => cancelAnimationFrame(frame);
  }, [suspended]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => open ? close(false) : openMenu()}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openMenu(event.key === "ArrowUp" ? enabledIndexes[enabledIndexes.length - 1] : undefined);
          }
        }}
        aria-label={`Modèle : ${current.name}. Changer de modèle`}
        aria-haspopup="listbox"
        aria-controls={open ? listId : undefined}
        aria-expanded={open}
        title="Changer de modèle"
        className="flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[14px] font-medium text-[var(--text-secondary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
      >
        {current.name}
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div
          id={listId}
          role="listbox"
          aria-label="Choisir un modèle"
          className="absolute bottom-full right-0 z-20 mb-2 w-[17rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] py-1"
          style={{ boxShadow: "var(--chat-elev-2, 0 24px 60px -24px rgba(0,0,0,.6))" }}
          onKeyDown={(event) => {
            if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
              event.preventDefault();
              moveFocus(event.key as "ArrowDown" | "ArrowUp" | "Home" | "End");
            } else if (event.key === "Tab") {
              event.preventDefault();
              focusBeyondMenu(event.shiftKey);
              setOpenFor(null);
            }
          }}
        >
          {SELECTABLE_MODELS.map((model, index) => {
            const active = model.id === value;
            return (
              <button
                key={model.id}
                ref={(element) => { optionRefs.current[index] = element; }}
                type="button"
                role="option"
                aria-selected={active}
                disabled={model.disabled}
                tabIndex={focusIndex === index ? 0 : -1}
                onFocus={() => setFocusIndex(index)}
                onClick={() => {
                  if (model.disabled) return;
                  onChange(model.id);
                  close(true);
                }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-[var(--hover)] focus-visible:bg-[var(--hover)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-medium text-[var(--text-primary)]">{model.name}</span>
                  <span className="block text-[13px] leading-snug text-[var(--text-secondary)]">{model.tagline}</span>
                </span>
                <span className="w-4 shrink-0 text-[var(--primary)]" aria-hidden="true">
                  {active && <CheckIcon />}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[var(--text-tertiary)] transition-transform" style={{ transform: open ? "rotate(180deg)" : undefined }} aria-hidden="true">
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
