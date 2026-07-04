"use client";

import { useState } from "react";

const MODELS = [
  {
    id: "auto",
    name: "Sao 4",
    tagline: "Code & aide quotidienne",
  },
  {
    id: "sayibi-reflexion",
    name: "Toumaï 5",
    tagline: "Réflexion — raisonnement profond",
  },
];

export function ModelSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = MODELS.find((m) => m.id === value) ?? MODELS[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-white/5"
      >
        {current.name}
        <span className="text-xs text-[var(--text-tertiary)]">▾</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full right-0 z-20 mb-2 w-64 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xl">
            {MODELS.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  onChange(m.id);
                  setOpen(false);
                }}
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-white/5"
              >
                <span>
                  <span className="block text-sm font-semibold">{m.name}</span>
                  <span className="block text-xs text-[var(--text-tertiary)]">
                    {m.tagline}
                  </span>
                </span>
                {m.id === value && (
                  <span className="ml-auto text-[var(--text-primary)]">
                    <CheckIcon />
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
