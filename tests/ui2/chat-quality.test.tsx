import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SourcesCard, cleanSourceSnippet } from "@/components/chat/widgets/kinds/ResearchWidgets";

describe("UI-2 chat quality", () => {
  it("TC-UI2-SOURCE-01 removes trailing editorial navigation without deleting the useful summary", () => {
    const snippet = "Une information vérifiée sur le forum. Skip to content Menu Menu HOME YOUTUBE ARCHIVE FACEBOOK X LINKEDIN";
    expect(cleanSourceSnippet(snippet)).toBe("Une information vérifiée sur le forum.");
    expect(cleanSourceSnippet("Résumé court et utile.")).toBe("Résumé court et utile.");
  });

  it("TC-UI2-SOURCE-02 preserves source identity and reveals a cleaned excerpt", async () => {
    const user = userEvent.setup();
    render(
      <SourcesCard
        sources={[{
          url: "https://example.com/forum",
          title: "Forum numérique inclusif",
          snippet: "Analyse locale et résultats utiles. Skip to content Menu Menu FACEBOOK X PINTEREST LINKEDIN",
        }]}
      />,
    );

    await user.click(screen.getByRole("button", { name: /1 source/i }));
    const source = screen.getByRole("link", { name: /Forum numérique inclusif/i });
    expect(source.textContent).toContain("example.com");
    expect(source.textContent).toContain("Analyse locale et résultats utiles.");
    expect(source.textContent).not.toMatch(/Skip to content|FACEBOOK|PINTEREST|LINKEDIN/i);
  });
});
