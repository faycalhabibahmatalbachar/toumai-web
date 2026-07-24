"use client";

import { useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageToolbar } from "./ImageToolbar";
import type { ChatImage } from "./types";

function ChevronIcon({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d={dir === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Lightbox plein écran — molette pour zoomer, double-clic pour basculer
 * zoom, glisser pour déplacer une fois zoomé, pincer pour zoomer sur
 * mobile, flèches gauche/droite pour naviguer, Échap pour fermer (géré par
 * useImageViewer). Fond noir semi-transparent, animation d'ouverture/
 * fermeture.
 */
export function ImageViewer({
  images,
  index,
  zoom,
  setZoom,
  pan,
  setPan,
  onClose,
  onNext,
  onPrev,
  onToggleZoom,
}: {
  images: ChatImage[];
  index: number;
  zoom: number;
  setZoom: (z: number) => void;
  pan: { x: number; y: number };
  setPan: (p: { x: number; y: number }) => void;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleZoom: () => void;
}) {
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });
  const pinchDist = useRef<number | null>(null);
  const [dragCursor, setDragCursor] = useState(false);

  const image = images[index];

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const next = Math.min(4, Math.max(1, zoom - e.deltaY * 0.0018));
      setZoom(next);
      if (next === 1) setPan({ x: 0, y: 0 });
    },
    [zoom, setZoom, setPan],
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoom <= 1) return;
      dragging.current = true;
      setDragCursor(true);
      dragStart.current = { x: e.clientX, y: e.clientY };
      panStart.current = pan;
    },
    [zoom, pan],
  );

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPan({ x: panStart.current.x + dx, y: panStart.current.y + dy });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const endDrag = useCallback(() => {
    dragging.current = false;
    setDragCursor(false);
  }, []);

  function touchDistance(t: React.TouchList) {
    const [a, b] = [t[0], t[1]];
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pinchDist.current = touchDistance(e.touches);
    } else if (e.touches.length === 1 && zoom > 1) {
      dragging.current = true;
      dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      panStart.current = pan;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, pan]);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2 && pinchDist.current) {
        const d = touchDistance(e.touches);
        const scale = d / pinchDist.current;
        setZoom(Math.min(4, Math.max(1, zoom * scale)));
        pinchDist.current = d;
      } else if (e.touches.length === 1 && dragging.current) {
        const dx = e.touches[0].clientX - dragStart.current.x;
        const dy = e.touches[0].clientY - dragStart.current.y;
        setPan({ x: panStart.current.x + dx, y: panStart.current.y + dy });
      }
    },
    [zoom, setZoom, setPan],
  );

  const onTouchEnd = useCallback(() => {
    dragging.current = false;
    pinchDist.current = null;
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Visionneuse d'image"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90"
        onClick={onClose}
      >
        <button
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        >
          <CloseIcon />
        </button>

        {images.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPrev();
              }}
              aria-label="Image précédente"
              className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:left-5"
            >
              <ChevronIcon dir="left" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
              aria-label="Image suivante"
              className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-5"
            >
              <ChevronIcon dir="right" />
            </button>
          </>
        )}

        <motion.div
          key={image.id}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.94 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="relative flex h-full w-full items-center justify-center overflow-hidden p-6 sm:p-12"
          onClick={(e) => e.stopPropagation()}
          onWheel={onWheel}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onDoubleClick={onToggleZoom}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.url}
            alt={image.alt || "Image"}
            draggable={false}
            className="max-h-full max-w-full select-none object-contain"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              cursor: zoom > 1 ? (dragCursor ? "grabbing" : "grab") : "zoom-in",
              transition: dragging.current ? "none" : "transform 0.15s ease-out",
            }}
          />
        </motion.div>

        <div className="absolute bottom-5 left-1/2 z-10 -translate-x-1/2">
          <ImageToolbar image={image} variant="dark" />
        </div>

        {images.length > 1 && (
          <div className="absolute bottom-5 right-5 z-10 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur">
            {index + 1} / {images.length}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
