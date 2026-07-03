"use client";

import { useState } from "react";

const MODELS = [
  {
    id: "auto",
    name: "Sao 4",
    tagline: "Code & aide quotidienne",
    color: "var(--primary)",
  },
  {
    id: "sayibi-reflexion",
    name: "Toumaï 5",
    tagline: "Réflexion — raisonnement profond",
    color: "var(--thinking)",
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
        className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium transition hover:bg-white/5"
      >
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: current.color }}
        />
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
                <span
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                  style={{ background: m.color }}
                />
                <span>
                  <span className="block text-sm font-semibold">{m.name}</span>
                  <span className="block text-xs text-[var(--text-tertiary)]">
                    {m.tagline}
                  </span>
                </span>
                {m.id === value && (
                  <span className="ml-auto text-sm" style={{ color: m.color }}>
                    ✓
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
