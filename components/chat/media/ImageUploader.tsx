"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { UploadItem } from "./types";

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function FileIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2v6h6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  );
}

/** Carte de suivi d'upload — nom, taille, progression, état, retry. Affichée
 * au-dessus du composeur pendant qu'un fichier est en cours d'envoi. */
export function ImageUploader({
  item,
  onRemove,
  onRetry,
}: {
  item: UploadItem;
  onRemove: () => void;
  onRetry: () => void;
}) {
  const isImage = item.file.type.startsWith("image/");
  const previewUrl = isImage ? URL.createObjectURL(item.file) : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8, height: 0 }}
        animate={{ opacity: 1, y: 0, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className="mb-2 flex items-center gap-3 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2.5"
      >
        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-[var(--background)]">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[var(--text-tertiary)]">
              <FileIcon />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-[var(--text-primary)]">{item.name}</p>
          <p className="text-[11px] text-[var(--text-tertiary)]">
            {fmtSize(item.size)}
            {item.status === "uploading" && ` · ${item.progress}%`}
            {item.status === "done" && " · Envoyé"}
            {item.status === "error" && ` · ${item.error || "Échec"}`}
          </p>
          {item.status === "uploading" && (
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-[var(--border)]">
              <motion.div
                className="h-full rounded-full"
                style={{ background: "var(--primary)" }}
                animate={{ width: `${item.progress}%` }}
                transition={{ ease: "easeOut" }}
              />
            </div>
          )}
        </div>

        {item.status === "error" && (
          <button
            onClick={onRetry}
            className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{ color: "var(--primary)" }}
          >
            Réessayer
          </button>
        )}
        <button
          onClick={onRemove}
          aria-label="Retirer"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-[var(--hover)]"
        >
          <CloseIcon />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
