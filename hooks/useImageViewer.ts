"use client";
import { useCallback, useEffect, useState } from "react";

/**
 * État du lightbox : quelle image est ouverte dans un groupe donné, plus
 * zoom/pan — partagé par ImageViewer et déclenché depuis ImageGrid/ImageBubble.
 */
export function useImageViewer(count: number) {
  const [index, setIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const open = useCallback((i: number) => {
    setIndex(i);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const close = useCallback(() => setIndex(null), []);

  const next = useCallback(() => {
    setIndex((i) => (i === null ? null : (i + 1) % count));
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [count]);

  const prev = useCallback(() => {
    setIndex((i) => (i === null ? null : (i - 1 + count) % count));
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [count]);

  const toggleZoom = useCallback(() => {
    setZoom((z) => (z > 1 ? 1 : 2));
    setPan({ x: 0, y: 0 });
  }, []);

  // Navigation clavier : flèches + Échap — actives seulement quand ouvert.
  useEffect(() => {
    if (index === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, close, next, prev]);

  return { index, isOpen: index !== null, zoom, setZoom, pan, setPan, open, close, next, prev, toggleZoom };
}
