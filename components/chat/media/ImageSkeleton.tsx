"use client";

/** Placeholder animé pendant le chargement/la génération d'une image. */
export function ImageSkeleton({
  className = "",
  label,
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] ${className}`}
    >
      <div className="media-shimmer absolute inset-0" aria-hidden="true" />
      {label && (
        <p className="relative z-10 text-xs font-medium text-[var(--text-tertiary)]">{label}</p>
      )}
    </div>
  );
}
