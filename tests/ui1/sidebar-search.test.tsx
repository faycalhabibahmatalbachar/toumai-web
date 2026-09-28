import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const listSessionsMock = vi.hoisted(() => vi.fn());
const authSession = vi.hoisted(() => ({ access_token: "test" }));
vi.mock("next/link", () => ({ default: ({ href, children, ...props }: React.PropsWithChildren<{ href: string; [key: string]: unknown }>) => <a href={href} {...props}>{children}</a> }));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ session: authSession }) }));
vi.mock("@/lib/chat-api", () => ({
  listSessions: listSessionsMock,
  groupSessionsByDate: (sessions: Array<unknown>) => sessions.length ? [{ label: "AUJOURD'HUI", items: sessions }] : [],
  deleteSession: vi.fn(), renameSession: vi.fn(), setSessionArchived: vi.fn(), setSessionPinned: vi.fn(),
}));
vi.mock("@/lib/user-api", () => ({ getProfile: () => Promise.resolve({ full_name: "Test", avatar_url: null }), nomAffichable: (name: string) => name }));
vi.mock("@/lib/swr-cache", () => ({ cacheRead: () => null, cacheWrite: vi.fn(), useCacheSeed: vi.fn() }));
vi.mock("@/lib/errors", () => ({ describeError: () => ({ message: "Erreur" }) }));
vi.mock("@/lib/prechargement-conversations", () => ({ prechargerConversation: vi.fn(), prechargerLesRecentes: vi.fn() }));

import { Sidebar } from "@/components/Sidebar";

const sessions = [
  { id: "one", title: "FGI Tchad", created_at: "2026-09-27T12:00:00Z" },
  { id: "two", title: "They want the assistant to", created_at: "2026-09-27T11:00:00Z" },
];

beforeEach(() => {
  document.documentElement.lang = "fr";
  window.localStorage.clear();
  listSessionsMock.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(sessions), 30)));
});

describe("UI-1 sidebar", () => {
  it("TC-UI-HISTORY-EMPTY-01 distinguishes no results from loading and empty history", async () => {
    const user = userEvent.setup();
    render(<Sidebar activeId={null} onSelect={() => {}} onNewChat={() => {}} refreshKey={0} open onClose={() => {}} />);
    await screen.findByText("FGI Tchad");
    await user.type(screen.getByRole("searchbox"), "zzzz-audit");
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Aucune conversation trouvée"));
    expect(screen.getByRole("status").textContent).toContain("Essayez un autre mot-clé.");
    expect(screen.queryByText("Aucune conversation enregistrée.")).toBeNull();
  });

  it("shows the title fallback in the rendered history row", async () => {
    render(<Sidebar activeId={null} onSelect={() => {}} onNewChat={() => {}} refreshKey={0} open onClose={() => {}} />);
    await waitFor(() => expect(screen.getAllByText("Nouvelle conversation").length).toBeGreaterThan(0));
    expect(screen.queryByText("They want the assistant to")).toBeNull();
  });

  it("shows a distinct empty history state when the account has no sessions", async () => {
    listSessionsMock.mockResolvedValue([]);
    render(<Sidebar activeId={null} onSelect={() => {}} onNewChat={() => {}} refreshKey={0} open onClose={() => {}} />);
    await screen.findByText("Aucune conversation enregistrée.");
    expect(screen.queryByText("Aucune conversation trouvée")).toBeNull();
  });

  it("keeps focus inside the mobile drawer and closes it with Escape", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Sidebar activeId={null} onSelect={() => {}} onNewChat={() => {}} refreshKey={0} open onClose={onClose} />);
    const dialog = await screen.findByRole("dialog", { name: "Conversations" });
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    const controls = Array.from(dialog.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])'))
      .filter((element) => element.getClientRects().length > 0);
    controls[controls.length - 1].focus();
    await user.keyboard("{Tab}");
    expect(document.activeElement).toBe(controls[0]);
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });
});
