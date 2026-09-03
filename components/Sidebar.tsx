"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  deleteSession,
  groupSessionsByDate,
  listSessions,
  renameSession,
  setSessionArchived,
  setSessionPinned,
  type ChatSession,
} from "@/lib/chat-api";
import { getProfile, type UserProfile } from "@/lib/user-api";
import { cacheRead, cacheWrite, useCacheSeed } from "@/lib/swr-cache";
import { describeError } from "@/lib/errors";

interface SidebarProps {
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  /** Ouvre le partage d'une conversation. Absent = l'entrée reste inerte,
      donc on ne l'affiche pas : un bouton qui ne fait rien est un défaut. */
  onShare?: (sessionId: string) => void;
  refreshKey: number;
  open: boolean;
  onClose: () => void;
}

const COLLAPSE_KEY = "toumai_sidebar_collapsed";

export function Sidebar({ activeId, onSelect, onNewChat, onShare, refreshKey, open, onClose }: SidebarProps) {
  const { session } = useAuth();
  // Cache persistant : l'historique s'affiche instantanément au retour sur la
  // page (seed hydration-safe avant peinture), puis se revalide en arrière-plan.
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  useCacheSeed<ChatSession[]>("chat:sessions", (cached) => {
    if (cached.length) {
      setSessions(cached);
      setLoading(false);
    }
  });
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
  /** La conversation dont on demande confirmation avant de la détruire.
      `null` = aucune boîte ouverte. On garde l'objet, pas l'identifiant :
      la boîte affiche le titre, et demander « supprimer cette
      conversation ? » sans dire laquelle n'aide personne. */
  const [toConfirm, setToConfirm] = useState<ChatSession | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  // Profil seedé depuis le cache (hydration-safe) : nom + avatar affichés
  // avant peinture — plus de « Connexion… » à chaque retour sur la page.
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  // Ne jamais afficher « Session invité » à un compte connecté le temps que
  // le profil charge — on attend la réponse avant de trancher (sauf si le
  // cache a déjà tranché).
  const [profileResolved, setProfileResolved] = useState(false);
  useCacheSeed<UserProfile>("user:profile", (p) => {
    setDisplayName(p.full_name ?? null);
    setAvatarUrl(p.avatar_url ?? null);
    setProfileResolved(true);
  });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session) return;
    if (session.is_guest) {
      setProfileResolved(true);
      return;
    }
    getProfile()
      .then((p) => {
        cacheWrite("user:profile", p);
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
    // LE SQUELETTE NE DOIT APPARAÎTRE QUE SI LE CACHE EST VIDE.
    //
    // On lisait `sessions.length` — c'est-à-dire l'état de CE rendu-ci. Or le
    // cache est semé par un `useLayoutEffect`, dont la mise à jour d'état
    // n'arrive qu'au rendu SUIVANT : cet effet voyait donc toujours une liste
    // vide, et allumait le squelette même quand la liste était déjà connue.
    // D'où la liste qui « se recharge sous les yeux » à chaque ouverture.
    //
    // On interroge le cache directement : la réponse ne dépend plus de
    // l'ordre dans lequel React applique les états.
    setLoading(cacheRead("chat:sessions") == null);
    setError(null);
    listSessions()
      .then((data) => {
        if (cancelled) return;
        setSessions(data);
        cacheWrite("chat:sessions", data);
      })
      .catch((err) => {
        // « Failed to fetch » n'est pas une phrase adressée à quelqu'un : on
        // passe par le même traducteur d'erreurs que le reste de l'app.
        if (!cancelled) setError(describeError(err, "history").message || "Historique indisponible pour le moment.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, refreshKey]);

  /** Range une conversation sans la détruire. */
  async function handleArchive(s: ChatSession) {
    setMenuId(null);
    // Optimiste : elle disparaît tout de suite. Attendre le réseau ferait
    // douter d'un clic qui a pourtant été pris.
    setSessions((prev) => {
      const next = prev.filter((x) => x.id !== s.id);
      cacheWrite("chat:sessions", next);
      return next;
    });
    try {
      await setSessionArchived(s.id, true);
      if (activeId === s.id) onNewChat();
    } catch {
      // L'ARCHIVAGE A ÉCHOUÉ : on la remet. Une conversation disparue de
      // l'écran mais toujours en base est pire qu'un clic sans effet — on
      // croirait l'avoir rangée, et elle reviendrait au prochain chargement.
      setSessions((prev) => {
        const next = [...prev, s].sort((a, b) =>
          (b.created_at || "").localeCompare(a.created_at || ""),
        );
        cacheWrite("chat:sessions", next);
        return next;
      });
    }
  }

  async function handleDelete(id: string) {
    setToConfirm(null);
    setMenuId(null);
    setDeletingId(id);
    try {
      await deleteSession(id);
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== id);
        cacheWrite("chat:sessions", next);
        return next;
      });
      if (activeId === id) onNewChat();
    } catch {
      // L'échec de suppression laisse la conversation visible — pas d'état incohérent.
    } finally {
      setDeletingId(null);
    }
  }

  /** La conversation actuellement tenue par le curseur, ou `null`.
   *
   * CE QUE LE GLISSEMENT PERMET, ET CE QU'IL NE PERMET PAS
   * ------------------------------------------------------
   * Deux dépôts, et deux seulement : le groupe « Épinglées » pour hisser une
   * conversation en tête, et la corbeille pour la supprimer.
   *
   * Un réordonnancement LIBRE a été écarté, et c'est un choix, pas un oubli :
   * la liste est groupée par date. Traîner une conversation d'« Hier » vers
   * « Aujourd'hui » lui ferait afficher un jour qui n'est pas le sien, et un
   * ordre manuel sans colonne en base repartirait à zéro au rechargement —
   * un rangement qui ne tient pas est pire que pas de rangement du tout.
   *
   * « Mettre en haut » a déjà son geste, il persiste, et il porte un nom :
   * épingler. Le glissement lui donne simplement un raccourci direct. */
  const [glisse, setGlisse] = useState<ChatSession | null>(null);
  /** La zone actuellement survolée pendant le glissement — pour l'éclairer. */
  const [surZone, setSurZone] = useState<"epingle" | "corbeille" | null>(null);

  async function togglePin(s: ChatSession) {
    setMenuId(null);
    const next = !s.pinned;
    setSessions((prev) => {
      const updated = prev.map((x) => (x.id === s.id ? { ...x, pinned: next } : x));
      cacheWrite("chat:sessions", updated);
      return updated;
    });
    try {
      await setSessionPinned(s.id, next);
    } catch {
      setSessions((prev) => prev.map((x) => (x.id === s.id ? { ...x, pinned: s.pinned } : x)));
    }
  }

  /** Fait défiler un titre trop long, au survol, et seulement s'il déborde.
   *
   * POURQUOI MESURER PLUTÔT QU'ANIMER TOUT LE MONDE
   * -----------------------------------------------
   * Un titre coupé par « … » est illisible précisément quand on en a besoin :
   * quand plusieurs conversations commencent par les mêmes mots. Mais animer
   * un titre qui tient déjà entièrement produirait un tressautement gratuit
   * sur presque toutes les lignes.
   *
   * `scrollWidth > clientWidth` répond exactement à la question posée — « ce
   * texte est-il coupé ? » — et la durée suit la distance, pour que défiler
   * dix caractères ne prenne pas le même temps que d'en défiler cinquante. */
  function survolerTitre(e: React.MouseEvent<HTMLSpanElement>) {
    const el = e.currentTarget;
    const debord = el.scrollWidth - el.clientWidth;
    if (debord <= 4) return;
    el.style.setProperty("--defile", `-${debord}px`);
    el.style.setProperty("--defile-duree", `${Math.max(1.6, debord / 45)}s`);
    el.dataset.defile = "1";
  }

  function quitterTitre(e: React.MouseEvent<HTMLSpanElement>) {
    delete e.currentTarget.dataset.defile;
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
    setSessions((prev) => {
      const updated = prev.map((s) => (s.id === id ? { ...s, title } : s));
      cacheWrite("chat:sessions", updated);
      return updated;
    });
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
        {/* En-tête du menu : ouvert, le nom du produit et l'icône « fermer le
            panneau » ; replié, l'icône « ouvrir le panneau » seule. */}
        <div className={`hidden px-3 pt-3 md:block ${collapsed ? "md:px-3.5" : ""}`}>
          {collapsed ? (
            /* Rail replié : l'icône du panneau, pas la marque. Un logo posé là
               n'annonce pas ce que le clic va faire, et il occupait la place
               d'une commande. */
            <button
              onClick={toggleCollapsed}
              aria-label="Afficher le menu"
              title="Afficher le menu"
              className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-secondary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
            >
              <PanelOpenIcon />
            </button>
          ) : (
            /* Le nom seul, sans la marque : le logo est déjà partout ailleurs
               (onglet, réponses, écran d'accueil) et il n'apportait rien ici
               qu'une répétition. */
            <div className="flex items-center gap-2.5 px-2">
              {/* CLIQUABLE, ET C'EST ATTENDU : le nom d'un produit en haut à
                  gauche ramène à son accueil dans à peu près toutes les
                  interfaces. Ici il n'était qu'un décor.

                  `landing-serif` : la police de la marque, déjà utilisée sur
                  l'écran d'accueil. Le nom du produit méritait autre chose
                  que la police du corps de texte. */}
              <button
                onClick={() => {
                  onClose();
                  onNewChat();
                }}
                title="Nouvelle conversation"
                aria-label="Toumaï AI — nouvelle conversation"
                className="landing-serif min-w-0 flex-1 truncate rounded-lg px-1 py-0.5 text-left text-[20px] font-semibold tracking-tight transition hover:opacity-70"
              >
                Toumaï AI
              </button>
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
            className={`nav-anim flex items-center gap-2.5 rounded-full border border-[var(--border)] text-sm font-medium text-[var(--text-primary)] transition hover:border-[color-mix(in_srgb,var(--primary)_45%,transparent)] ${
              collapsed ? "md:h-9 md:w-9 md:justify-center md:px-0 w-full px-2.5 py-2" : "w-full px-2.5 py-2"
            }`}
            style={{ background: "var(--card)" }}
          >
            <ComposeIcon />
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
              className="nav-anim hidden h-9 w-9 items-center justify-center rounded-full text-[var(--text-secondary)] transition hover:bg-[var(--hover)] md:flex"
            >
              <SearchIcon />
            </button>
          ) : null}
          <label
            className={`nav-anim flex items-center gap-2.5 rounded-full border border-transparent px-2.5 py-2 text-[var(--text-secondary)] transition focus-within:border-[var(--border)] focus-within:bg-[var(--card)] hover:bg-[var(--hover)] ${
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
              className={`nav-anim flex items-center gap-2.5 rounded-lg text-sm text-[var(--text-secondary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)] ${
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
            /* DÉPOSER DANS UN GROUPE = ÉPINGLER OU DÉTACHER.
               Les groupes de dates ne sont pas des dossiers : on ne peut pas
               « ranger » une conversation d'hier dans aujourd'hui. Seul
               « Épinglées » désigne un état réel, modifiable et durable — donc
               seul lui accepte un dépôt, et il le refuse si la conversation
               s'y trouve déjà. */
            <div
              key={group.label}
              className="mb-4"
              onDragOver={(e) => {
                if (!glisse) return;
                const versEpingle = group.label === "Épinglées";
                if (versEpingle === Boolean(glisse.pinned)) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (versEpingle) setSurZone("epingle");
              }}
              onDragLeave={() => setSurZone((z) => (z === "epingle" ? null : z))}
              onDrop={(e) => {
                e.preventDefault();
                const cible = glisse;
                setGlisse(null);
                setSurZone(null);
                if (!cible) return;
                const versEpingle = group.label === "Épinglées";
                if (versEpingle !== Boolean(cible.pinned)) togglePin(cible);
              }}
              data-survol={
                group.label === "Épinglées" && surZone === "epingle" ? "1" : undefined
              }
            >
              <p className="px-2.5 pb-1.5 pt-1 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-[var(--text-tertiary)]">
                {group.label}
                {group.label === "Épinglées" && surZone === "epingle" && (
                  <span className="ml-1.5 normal-case tracking-normal text-[var(--primary)]">
                    déposer pour épingler
                  </span>
                )}
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
                  <div
                    key={s.id}
                    className="sb-row group relative"
                    data-active={s.id === activeId}
                    draggable
                    onDragStart={(e) => {
                      setGlisse(s);
                      e.dataTransfer.effectAllowed = "move";
                      // Certains navigateurs refusent de démarrer un
                      // glissement sans charge utile.
                      e.dataTransfer.setData("text/plain", s.id);
                    }}
                    onDragEnd={() => {
                      setGlisse(null);
                      setSurZone(null);
                    }}
                    data-glisse={glisse?.id === s.id ? "1" : undefined}
                  >
                    <button
                      onClick={() => {
                        onSelect(s.id);
                        onClose();
                      }}
                      className={`flex w-full items-center gap-1.5 rounded-lg px-2.5 py-[7px] text-left text-sm transition ${
                        s.id === activeId
                          ? "bg-[var(--card)] font-medium text-[var(--text-primary)]"
                          : "text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      {/* ÉPINGLER SANS OUVRIR DE MENU.
                          Le geste demandait trois clics — les trois points, le
                          menu, l'entrée — pour une bascule. Épinglée, l'icône
                          reste visible parce qu'elle porte alors une
                          information ; sinon elle n'apparaît qu'au survol,
                          pour ne pas encombrer une liste au repos. */}
                      <span
                        role="button"
                        aria-label={s.pinned ? "Détacher le chat" : "Épingler le chat"}
                        title={s.pinned ? "Détacher" : "Épingler"}
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePin(s);
                        }}
                        className={`shrink-0 rounded p-0.5 transition ${
                          s.pinned
                            ? "text-[var(--primary)] opacity-100"
                            : "text-[var(--text-tertiary)] opacity-0 hover:text-[var(--text-primary)] group-hover:opacity-100"
                        }`}
                      >
                        <PinIcon />
                      </span>
                      <span
                        onMouseEnter={survolerTitre}
                        onMouseLeave={quitterTitre}
                        // La voie de secours quand l'animation est refusée
                        // (mouvement réduit) ou sur un écran tactile, où il
                        // n'y a pas de survol du tout.
                        title={s.title || "Sans titre"}
                        className="sb-titre min-w-0 flex-1 truncate"
                      >
                        {s.title || "Sans titre"}
                      </span>
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
                        {/* PARTAGER ET RENOMMER : ce qu'on fait le plus
                            souvent, donc en haut et sous le pouce. */}
                        <button
                          onClick={() => {
                            setMenuId(null);
                            onShare?.(s.id);
                          }}
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-[var(--hover)]"
                        >
                          <ShareIcon />
                          Partager
                        </button>
                        <button
                          onClick={() => startRename(s)}
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-[var(--hover)]"
                        >
                          <EditIcon />
                          Renommer
                        </button>

                        <div className="my-1 h-px bg-[var(--border)]" />

                        {/* RANGER : les deux gestes qui changent où vit la
                            conversation, sans toucher à son contenu. */}
                        <button
                          onClick={() => togglePin(s)}
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-[var(--hover)]"
                        >
                          <PinIcon />
                          {s.pinned ? "Détacher le chat" : "Épingler le chat"}
                        </button>
                        <button
                          onClick={() => handleArchive(s)}
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-[var(--hover)]"
                        >
                          <ArchiveIcon />
                          Archiver
                        </button>

                        <div className="my-1 h-px bg-[var(--border)]" />

                        {/* SUPPRIMER, seul et en dernier : le seul geste
                            irréversible du menu ne doit pas voisiner avec
                            ceux qu'on fait sans réfléchir. */}
                        <button
                          onClick={() => {
                            setMenuId(null);
                            setToConfirm(s);
                          }}
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[var(--error)] transition hover:bg-[var(--hover)]"
                        >
                          <TrashIcon />
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

        {/* LA CORBEILLE, VISIBLE SEULEMENT QUAND ELLE SERT.
            Elle n'existe que pendant un glissement : une corbeille affichée en
            permanence est un bouton de suppression posé à demeure sous le
            curseur, et c'est exactement ce qu'on veut éviter.

            Le dépôt n'efface RIEN : il ouvre la même confirmation nommée que
            le menu. Un geste peut déraper — le doigt glisse, la souris saute —
            et un geste qui dérape ne doit jamais coûter une conversation. */}
        {glisse && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setSurZone("corbeille");
            }}
            onDragLeave={() => setSurZone((z) => (z === "corbeille" ? null : z))}
            onDrop={(e) => {
              e.preventDefault();
              const cible = glisse;
              setGlisse(null);
              setSurZone(null);
              if (cible) setToConfirm(cible);
            }}
            className={`mx-3 mb-2 flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed py-6 transition ${
              surZone === "corbeille"
                ? "scale-[1.02] border-[var(--error)] bg-[color-mix(in_srgb,var(--error)_12%,transparent)] text-[var(--error)]"
                : "border-[var(--border)] text-[var(--text-tertiary)]"
            }`}
          >
            <span className={surZone === "corbeille" ? "scale-125 transition" : "transition"}>
              <TrashIcon />
            </span>
            <span className="px-3 text-center text-[11px] leading-snug">
              {surZone === "corbeille"
                ? "Relâchez pour supprimer"
                : "Déposez ici pour supprimer"}
            </span>
          </div>
        )}

        {collapsed && <div className="hidden flex-1 md:block" aria-hidden="true" />}
        {/* Session invité : proposer la connexion directement depuis la sidebar. */}
        {session?.is_guest && (
          <div className={`px-3 pb-1 ${collapsed ? "md:hidden" : ""}`}>
            <Link
              href="/login"
              onClick={onClose}
              className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ background: "var(--primary)" }}
            >
              Se connecter
            </Link>
            <Link
              href="/register"
              onClick={onClose}
              className="mt-1.5 flex w-full items-center justify-center rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--hover)]"
            >
              Créer un compte
            </Link>
          </div>
        )}
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

      {/* ── LA CONFIRMATION DE SUPPRESSION ──────────────────────────────────
          Elle manquait : un clic dans un menu détruisait une conversation
          sans un mot, et il n'existe aucun moyen de la retrouver. C'est le
          seul geste irréversible de toute l'interface.

          Elle NOMME la conversation. « Supprimer cette conversation ? » sans
          dire laquelle n'aide personne — surtout après un clic dans un menu
          qu'on vient de fermer. */}
      {toConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titre-suppression"
          onClick={() => setToConfirm(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="titre-suppression"
              className="text-base font-semibold text-[var(--text-primary)]"
            >
              Supprimer cette conversation ?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
              «&nbsp;{toConfirm.title || "Nouvelle conversation"}&nbsp;» et tous ses
              messages seront définitivement perdus. Pour la retirer de la liste
              sans la perdre, utilisez plutôt <strong>Archiver</strong>.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setToConfirm(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--hover)]"
              >
                Annuler
              </button>
              <button
                autoFocus
                onClick={() => handleDelete(toConfirm.id)}
                className="rounded-lg bg-[var(--error)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** « Ouvrir le panneau » — miroir de PanelCloseIcon, montré au survol du logo. */
function PanelOpenIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M9.5 4v16M13 10l2.5 2-2.5 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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

/** Un stylo, pas un « + ». Ouvrir une conversation n'est pas ajouter une ligne
 * dans une liste : c'est se mettre à écrire. */
function ComposeIcon() {
  return (
    <svg className="ico ico-write" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M12 20h9" strokeLinecap="round" />
      <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="ico ico-search" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
    </svg>
  );
}

function LibraryIcon() {
  return (
    <svg className="ico ico-book" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
    <svg className="ico ico-chat" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 01-13.5 7.8L3 21l1.2-4.5A9 9 0 1121 12z" strokeLinejoin="round" />
      <path d="M9 10h.01M12 10h.01M15 10h.01" strokeLinecap="round" />
    </svg>
  );
}

function PlugIcon() {
  return (
    <svg className="ico ico-plug" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
    <svg className="ico ico-gear"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
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

function ShareIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M12 3v13M12 3L8 7M12 3l4 4M4 15v4a2 2 0 002 2h12a2 2 0 002-2v-4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M3 7h18v3H3zM5 10v9a1 1 0 001 1h12a1 1 0 001-1v-9M10 14h4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7v13a1 1 0 001 1h10a1 1 0 001-1V7M10 11v6M14 11v6"
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
