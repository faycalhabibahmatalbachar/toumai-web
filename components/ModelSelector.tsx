"use client";

import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { SELECTABLE_MODELS, findModel } from "@/lib/models";

type PopoverPosition = {
  left: number;
  top: number;
  width: number;
};

/**
 * Sélecteur de modèle du composeur.
 *
 * Le panneau est rendu dans document.body afin de ne jamais être rogné par le
 * composeur ou un parent avec overflow/transform. Sur mobile il est centré
 * dans le viewport ; sur écran large il s'aligne sur le bord droit du bouton.
 * Dans les deux cas sa position verticale reste réellement ancrée au bouton.
 */
export function ModelSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<PopoverPosition>({
    left: 16,
    top: 96,
    width: 320,
  });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const current = findModel(value) ?? SELECTABLE_MODELS[0];
  const titleId = useId();

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger || typeof window === "undefined") return;

    const rect = trigger.getBoundingClientRect();
    const margin = 12;
    const viewportWidth = window.innerWidth;
    const isMobile = viewportWidth < 640;
    const width = Math.min(isMobile ? 304 : 320, viewportWidth - margin * 2);

    const left = isMobile
      ? Math.max(margin, (viewportWidth - width) / 2)
      : Math.min(
          Math.max(margin, rect.right - width),
          viewportWidth - width - margin,
        );

    setPosition({
      left,
      top: Math.max(16, rect.top - 12),
      width,
    });
  }, []);

  useEffect(() => {
    if (!open) return;

    updatePosition();

    const onViewportChange = () => updatePosition();
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    window.visualViewport?.addEventListener("resize", onViewportChange);
    window.visualViewport?.addEventListener("scroll", onViewportChange);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
      window.visualViewport?.removeEventListener("resize", onViewportChange);
      window.visualViewport?.removeEventListener("scroll", onViewportChange);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, updatePosition]);

  const toggle = () => {
    if (!open) updatePosition();
    setOpen((previous) => !previous);
  };

  const menu =
    open && typeof document !== "undefined"
      ? createPortal(
          <AnimatePresence>
            <motion.div
              className="fixed inset-0 z-[80] bg-transparent"
              aria-hidden="true"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
            />

            <div
              className="fixed z-[90]"
              style={{
                left: position.left,
                top: position.top,
                width: position.width,
                transform: "translateY(-100%)",
              }}
            >
              <motion.div
                role="listbox"
                aria-labelledby={titleId}
                className="overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--card)] p-1.5 shadow-[0_18px_54px_-28px_rgba(0,0,0,0.68)] backdrop-blur-xl"
                initial={{ opacity: 0, y: 8, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.99 }}
                transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
              >
                <div className="px-2.5 pb-1.5 pt-1">
                  <p
                    id={titleId}
                    className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-tertiary)]"
                  >
                    Choisir un modèle
                  </p>
                </div>

                <div className="space-y-0.5">
                  {SELECTABLE_MODELS.map((model) => {
                    const active = model.id === value;
                    const menuSubtitle =
                      model.id === "auto"
                        ? "Rapide · Code & quotidien"
                        : model.id === "sayibi-reflexion"
                          ? "Raisonnement avancé · Tâches complexes"
                          : model.tagline;

                    return (
                      <button
                        key={model.id}
                        role="option"
                        aria-selected={active}
                        onClick={() => {
                          onChange(model.id);
                          setOpen(false);
                          requestAnimationFrame(() => triggerRef.current?.focus());
                        }}
                        className={[
                          "group flex min-h-[58px] w-full items-center gap-2.5 rounded-[14px] px-3 py-2 text-left outline-none transition",
                          "hover:bg-[var(--hover)] focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--card)]",
                          active ? "bg-[var(--hover)]" : "",
                        ].join(" ")}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface,transparent)] text-[var(--text-secondary)]">
                          {model.id === "auto" ? <BoltIcon /> : <SparklesIcon />}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-semibold leading-[18px] text-[var(--text-primary)]">
                            {model.name}
                          </span>
                          <span className="mt-0.5 block truncate text-[11.5px] leading-4 text-[var(--text-tertiary)]">
                            {menuSubtitle}
                          </span>
                        </span>

                        <span
                          className={[
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition",
                            active
                              ? "bg-[var(--primary)] text-white"
                              : "text-transparent group-hover:text-[var(--text-tertiary)]",
                          ].join(" ")}
                          aria-hidden="true"
                        >
                          {active ? <CheckIcon /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          </AnimatePresence>,
          document.body,
        )
      : null;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Changer de modèle"
        className="flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-[14px] font-medium text-[var(--text-secondary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        {current.name}
        <ChevronIcon open={open} />
      </button>
      {menu}
    </div>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className="text-[var(--text-tertiary)] transition-transform"
      style={{ transform: open ? "rotate(180deg)" : undefined }}
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      aria-hidden="true"
    >
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      aria-hidden="true"
    >
      <path d="M13 2 4.8 13h6.4L11 22l8.2-11h-6.4L13 2Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M12 3c.6 3.1 2.4 4.9 5.5 5.5C14.4 9.1 12.6 10.9 12 14c-.6-3.1-2.4-4.9-5.5-5.5C9.6 7.9 11.4 6.1 12 3Z" strokeLinejoin="round" />
      <path d="M18.5 14.5c.3 1.5 1.2 2.4 2.7 2.7-1.5.3-2.4 1.2-2.7 2.7-.3-1.5-1.2-2.4-2.7-2.7 1.5-.3 2.4-1.2 2.7-2.7Z" strokeLinejoin="round" />
    </svg>
  );
}
