"use client";

import { useCallback, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

/** Enveloppe une zone (typiquement le composeur du chat) pour accepter le
 * glisser-déposer de fichiers — affiche un overlay pendant le survol. */
export function DropZone({
  onFiles,
  accept = "image/*",
  children,
}: {
  onFiles: (files: File[]) => void;
  accept?: string;
  children: ReactNode;
}) {
  const [active, setActive] = useState(false);

  const matches = useCallback(
    (file: File) => {
      if (accept === "*") return true;
      const patterns = accept.split(",").map((p) => p.trim());
      return patterns.some((p) => {
        if (p.endsWith("/*")) return file.type.startsWith(p.slice(0, -1));
        return file.type === p;
      });
    },
    [accept],
  );

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.types.includes("Files")) setActive(true);
  }

  function onDragLeave(e: React.DragEvent) {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setActive(false);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setActive(false);
    const files = Array.from(e.dataTransfer.files).filter(matches);
    if (files.length > 0) onFiles(files);
  }

  return (
    <div className="relative" onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
      {children}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-2xl border-2 border-dashed"
            style={{
              borderColor: "var(--primary)",
              background: "color-mix(in srgb, var(--primary) 8%, var(--background))",
            }}
          >
            <p className="text-sm font-medium" style={{ color: "var(--primary)" }}>
              Déposez le fichier ici
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
