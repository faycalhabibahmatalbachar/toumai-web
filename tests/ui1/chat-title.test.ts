import { describe, expect, it, vi } from "vitest";
import { displayChatTitle, reportTitleFallbacks, titleFallbackReason } from "@/lib/chat-title";

describe("UI-1 conversation title fallback", () => {
  it("TC-UI-TITLE-01 keeps a valid title", () => {
    expect(displayChatTitle("FGI Tchad : intelligence artificielle", "fr")).toBe("FGI Tchad : intelligence artificielle");
    expect(titleFallbackReason("FGI Tchad : intelligence artificielle")).toBeNull();
  });

  it("TC-UI-TITLE-02 localizes an empty title", () => {
    expect(displayChatTitle("  ", "fr")).toBe("Nouvelle conversation");
    expect(displayChatTitle("", "en")).toBe("New conversation");
    expect(displayChatTitle(null, "ar")).toBe("محادثة جديدة");
  });

  it("TC-UI-TITLE-03 handles generic, incomplete and malformed titles", () => {
    expect(displayChatTitle("They want the assistant to", "fr")).toBe("Nouvelle conversation");
    expect(displayChatTitle("Discussion about the", "en")).toBe("New conversation");
    expect(displayChatTitle("Title\ufffd", "fr")).toBe("Nouvelle conversation");
    expect(displayChatTitle("Nouvelle conversation", "fr")).toBe("Nouvelle conversation");
  });

  it("reports fallback reasons without logging conversation text", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    reportTitleFallbacks([{ title: "They want the assistant to" }, { title: "Valid title" }]);
    expect(warn).toHaveBeenCalledWith("[chat-title] display fallback used", { count: 1, reasons: ["meta"] });
    warn.mockRestore();
  });
});
