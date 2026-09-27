import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => cleanup());

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn((query: string) => ({
    matches: query.includes("767px"),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
});

// jsdom has no layout engine; visible controls still need to be tabbable in tests.
HTMLElement.prototype.getClientRects = function () {
  return this.hidden || this.getAttribute("aria-hidden") === "true" ? [] as unknown as DOMRectList : [this.getBoundingClientRect()] as unknown as DOMRectList;
};

window.requestAnimationFrame = (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 0);
window.cancelAnimationFrame = (id: number) => window.clearTimeout(id);
