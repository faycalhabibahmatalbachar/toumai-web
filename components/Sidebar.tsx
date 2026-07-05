"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  deleteSession,
  groupSessionsByDate,
  listSessions,
  renameSession,
  setSessionPinned,
  type ChatSession,
} from "@/lib/chat-api";
import { getProfile } from "@/lib/user-api";
import { Logo } from "./Logo";

interface SidebarProps {
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  refreshKey: number;
  open: boolean;
  onClose: () => void;
}

const COLLAPSE_KEY = "toumai_sidebar_collapsed";

export function Sidebar({ activeId, onSelect, onNewChat, refreshKey, open, onClose }: SidebarProps) {
  const { session } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  // Repli façon Gemini (desktop uniquement) — rail d'icônes, persisté.
  const [collapsed, setCollapsed] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  function toggleCollapsed() {
    setCollapsed((c) => {
      window.localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      return !c;
    });
  }
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  // Ne jamais afficher « Session invité » à un compte connecté le temps que
  // le profil charge — on attend la réponse avant de trancher.
  const [profileResolved, setProfileResolved] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session) return;
    if (session.is_guest) {
      setProfileResolved(true);
      return;
    }
    getProfile()
      .then((p) => {
        setDisplayName(p.full_name ?? null);
        setAvatarUrl(p.avatar_url ?? null);
      })
      .catch(() => {})
      .finally(() => setProfileResolved(true));
  }, [session]);

  useEffect(() => {
    if (!menuId) return;
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuId(null);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuId]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    listSessions()
      .then((data) => {
        if (!cancelled) setSessions(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erreur réseau");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session, refreshKey]);

  async function handleDelete(id: string) {
    setMenuId(null);
    setDeletingId(id);
    try {
      await deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (activeId === id) onNewChat();
    } catch {
      // L'échec de suppression laisse la conversation visible — pas d'état incohérent.
    } finally {
      setDeletingId(null);
    }
  }

  async function togglePin(s: ChatSession) {
    setMenuId(null);
    const next = !s.pinned;
    setSessions((prev) => prev.map((x) => (x.id === s.id ? { ...x, pinned: next } : x)));
    try {
      await setSessionPinned(s.id, next);
    } catch {
      setSessions((prev) => prev.map((x) => (x.id === s.id ? { ...x, pinned: s.pinned } : x)));
    }
  }

  function startRename(s: ChatSession) {
    setMenuId(null);
    setRenamingId(s.id);
    setRenameDraft(s.title || "");
  }

  async function saveRename(id: string) {
    const title = renameDraft.trim();
    setRenamingId(null);
    if (!title) return;
    const prevTitle = sessions.find((s) => s.id === id)?.title;
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)));
    try {
      await renameSession(id, title);
    } catch {
      setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title: prevTitle ?? s.title } : s)));
    }
  }

  const filtered = query.trim()
    ? sessions.filter((s) => s.title.toLowerCase().includes(query.trim().toLowerCase()))
    : sessions;
  const grouped = groupSessionsByDate(filtered);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-[var(--border)] bg-[var(--surface)] transition-all md:static md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "md:w-[68px]" : "md:w-72"}`}
      >
        {/* En-tête du menu — comme Gemini : ouvert, on montre le logo + le nom
            avec une icône « fermer le panneau » au bout de la rangée ; replié,
            le logo seul sert de bouton d'ouverture. */}
        <div className={`hidden px-3 pt-3 md:block ${collapsed ? "md:px-3.5" : ""}`}>
          {collapsed ? (
            <button
              onClick={toggleCollapsed}
              aria-label="Afficher le menu"
              title="Afficher le menu"
              className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-[var(--hover)]"
            >
              <Logo size={24} />
            </button>
          ) : (
            <div className="flex select-none items-center gap-2.5 px-1">
              <Logo size={24} />
              <span className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight">
                Toumaï AI
              </span>
              <button
                onClick={toggleCollapsed}
                aria-label="Fermer la barre latérale"
                title="Fermer la barre latérale"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
              >
                <PanelCloseIcon />
              </button>
            </div>
          )}
        </div>

        <div className={`px-3 pt-3 pb-1 md:pt-2 ${collapsed ? "md:px-3.5" : ""}`}>
          <button
            onClick={() => {
              onNewChat();
              onClose();
            }}
            title="Nouvelle conversation"
            className={`flex items-center gap-2.5 rounded-full text-sm font-medium transition hover:bg-[var(--hover)] ${
              collapsed ? "md:h-9 md:w-9 md:justify-center md:px-0 w-full px-2.5 py-2" : "w-full px-2.5 py-2"
            }`}
            style={{ background: "var(--card)" }}
          >
            <PlusIcon />
            <span className={collapsed ? "md:hidden" : ""}>Nouvelle conversation</span>
          </button>
        </div>

        <div className={`px-3 pb-1 ${collapsed ? "md:px-3.5" : ""}`}>
          {collapsed ? (
            <button
              onClick={() => {
                toggleCollapsed();
                setTimeout(() => searchRef.current?.focus(), 50);
              }}
              title="Rechercher dans les conversations"
              aria-label="Rechercher dans les conversations"
              className="hidden h-9 w-9 items-center justify-center rounded-full text-[var(--text-secondary)] transition hover:bg-[var(--hover)] md:flex"
            >
              <SearchIcon />
            </button>
          ) : null}
          <label
            className={`flex items-center gap-2.5 rounded-full px-2.5 py-2 text-[var(--text-secondary)] transition focus-within:bg-[var(--hover)] hover:bg-[var(--hover)] ${
              collapsed ? "md:hidden" : ""
            }`}
          >
            <SearchIcon />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher"
              className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-secondary)]"
            />
          </label>
        </div>

        <div className={`px-3 pb-1 ${collapsed ? "md:px-3.5" : ""}`}>
          {/* L'Agent Navigateur n'a plus d'entrée : l'IA l'invoque seule quand
              l'utilisateur demande une navigation web. */}
          {[
            { href: "/library", label: "Bibliothèque", icon: <LibraryIcon /> },
            { href: "/whatsapp", label: "WhatsApp", icon: <WhatsAppNavIcon /> },
            { href: "/settings?tab=connectors", label: "Connecteurs", icon: <PlugIcon /> },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              title={item.label}
              className={`flex items-center gap-2.5 rounded-lg text-sm text-[var(--text-secondary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)] ${
                collapsed ? "md:h-9 md:w-9 md:justify-center md:rounded-full md:px-0 px-2.5 py-2" : "px-2.5 py-2"
              }`}
            >
              {item.icon}
              <span className={collapsed ? "md:hidden" : ""}>{item.label}</span>
            </Link>
          ))}
        </div>

        <nav className={`flex-1 overflow-y-auto px-2 pb-3 ${collapsed ? "md:hidden" : ""}`}>
          {loading && (
            <div className="flex flex-col gap-2 px-2 py-2" aria-hidden="true">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-8 animate-pulse rounded-lg bg-[var(--card)]" />
              ))}
            </div>
          )}
          {error && !loading && (
            <p className="px-2 py-3 text-xs text-[var(--error)]">{error}</p>
          )}
          {!loading && !error && sessions.length === 0 && (
            <p className="px-2 py-3 text-xs text-[var(--text-tertiary)]">
              Aucune conversation enregistrée.
            </p>
          )}
          {grouped.map((group) => (
            <div key={group.label} className="mb-3">
              <p className="px-2 pb-1 text-[11px] font-medium text-[var(--text-tertiary)]">
                {group.label}
              </p>
              {group.items.map((s) =>
                renamingId === s.id ? (
                  <input
                    key={s.id}
                    autoFocus
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    onBlur={() => saveRename(s.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveRename(s.id);
                      else if (e.key === "Escape") setRenamingId(null);
                    }}
                    className="w-full rounded-lg border border-[var(--primary)] bg-transparent px-2.5 py-2 text-sm outline-none"
                  />
                ) : (
                  <div key={s.id} className="group relative">
                    <button
                      onClick={() => {
                        onSelect(s.id);
                        onClose();
                      }}
                      className={`flex w-full items-center gap-1.5 rounded-lg px-2.5 py-2 text-left text-sm transition ${
                        s.id === activeId
                          ? "bg-[var(--card)] text-[var(--text-primary)]"
                          : "text-[var(--text-secondary)] hover:bg-[var(--hover)]"
                      }`}
                    >
                      {s.pinned && <PinIcon className="shrink-0 text-[var(--text-tertiary)]" />}
                      <span className="min-w-0 flex-1 truncate">{s.title || "Sans titre"}</span>
                      <span
                        role="button"
                        aria-label="Options de la conversation"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuId(menuId === s.id ? null : s.id);
                        }}
                        className={`shrink-0 rounded p-1 text-[var(--text-tertiary)] transition hover:text-[var(--text-primary)] ${
                          menuId === s.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        }`}
                      >
                        {deletingId === s.id ? "…" : <DotsIcon />}
                      </span>
                    </button>
                    {menuId === s.id && (
                      <div
                        ref={menuRef}
                        className="absolute right-0 top-full z-10 mt-1 w-44 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg"
                      >
                        <button
                          onClick={() => togglePin(s)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-[var(--hover)]"
                        >
                          <PinIcon />
                          {s.pinned ? "Détacher" : "Épingler"}
                        </button>
                        <button
                          onClick={() => startRename(s)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-[var(--hover)]"
                        >
                          <EditIcon />
                          Renommer
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--error)] transition hover:bg-[var(--hover)]"
                        >
                          <CloseIcon />
                          Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                ),
              )}
            </div>
          ))}
        </nav>

        {collapsed && <div className="hidden flex-1 md:block" aria-hidden="true" />}
        {/* Pied de sidebar — la carte profil est purement informative ; seule
            l'icône engrenage (cible de clic dédiée, avec son propre halo de
            survol) ouvre les paramètres. Pas de trait séparateur au-dessus. */}
        <div
          className={`flex items-center gap-2.5 px-3 py-3 ${
            collapsed ? "md:justify-center md:px-0" : ""
          }`}
        >
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold text-white"
            style={{ background: "linear-gradient(135deg, var(--primary), var(--thinking))" }}
            aria-hidden="true"
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : session ? (
              (displayName?.trim()[0] ?? "V").toUpperCase()
            ) : (
              "…"
            )}
          </div>
          <span
            className={`min-w-0 flex-1 truncate text-sm font-medium text-[var(--text-secondary)] ${
              collapsed ? "md:hidden" : ""
            }`}
          >
            {!session || !profileResolved
              ? "Connexion…"
              : session.is_guest
                ? "Session invité"
                : displayName || "Mon compte"}
          </span>
          <Link
            href="/settings"
            onClick={onClose}
            title="Paramètres"
            aria-label="Ouvrir les paramètres"
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)] ${
              collapsed ? "md:hidden" : ""
            }`}
          >
            <SettingsIcon />
          </Link>
        </div>
        {/* Mode replié : l'engrenage reste accessible seul, centré. */}
        {collapsed && (
          <div className="hidden justify-center pb-3 md:flex">
            <Link
              href="/settings"
              onClick={onClose}
              title="Paramètres"
              aria-label="Ouvrir les paramètres"
              className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-tertiary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
            >
              <SettingsIcon />
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}

function PanelCloseIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M9.5 4v16M15.5 10l-2.5 2 2.5 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
    </svg>
  );
}

function LibraryIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WhatsAppNavIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 01-13.5 7.8L3 21l1.2-4.5A9 9 0 1121 12z" strokeLinejoin="round" />
      <path d="M9 10h.01M12 10h.01M15 10h.01" strokeLinecap="round" />
    </svg>
  );
}

function PlugIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M9 2v4M15 2v4M7 7h10l-1 5a4 4 0 01-4 3.5v0A4 4 0 018 12l-1-5zM12 15.5V22"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="shrink-0"
    >
      <circle cx="12" cy="12" r="3" />
      <path
        d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      <path
        d="M12 17v5M8 3h8l-1 6 3 3v2H6v-2l3-3-1-6z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
