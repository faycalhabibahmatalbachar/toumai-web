"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Bot,
  BookOpen,
  Check,
  CheckCheck,
  CircleAlert,
  Info,
  Languages,
  LayoutDashboard,
  ListTodo,
  Menu,
  MessageCircle,
  MoreVertical,
  Paperclip,
  Plug,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Smile,
  Sparkles,
  Users,
  Workflow,
  X,
} from "lucide-react";

import { WhatsAppIcon } from "@/components/settings/BrandIcons";
import { WhatsAppComposeModal } from "@/components/whatsapp/WhatsAppComposeModal";
import { useExigerCompte } from "@/hooks/useExigerCompte";
import { useAuth } from "@/lib/auth-context";
import { errorMessage } from "@/lib/errors";
import {
  getWaConversationMessages,
  getWaLiveConversations,
  type WaLiveConversation,
  type WaLiveMessage,
} from "@/lib/whatsapp-enterprise-api";
import { safeWhatsAppVisibleText } from "@/lib/whatsapp-display";

const PAGE_BG = "#06111a";
const SIDEBAR_BG = "#0a151e";
const SURFACE = "#0d1923";
const RAISED = "#101e29";
const BORDER = "#1e2c36";
const TEXT = "#f4f7f9";
const MUTED = "#9ba8b3";
const FAINT = "#6f7f8d";
const GREEN = "#08c875";
const ORANGE = "#ff9518";

const NAV_ITEMS = [
  { href: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/agent", label: "Agents", icon: Bot },
  { href: "/library", label: "Connaissances", icon: BookOpen },
  { href: "/automations", label: "Automatisations", icon: Workflow },
] as const;

const LOWER_NAV = [
  { href: "/settings?tab=connectors", label: "Intégrations", icon: Plug },
  { href: "/settings", label: "Paramètres", icon: Settings },
] as const;

type Filter = "all" | "pending" | "unread";

export default function WhatsAppConversationsPage() {
  const { session } = useAuth();
  useExigerCompte();

  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [conversations, setConversations] = useState<WaLiveConversation[]>([]);
  const [selected, setSelected] = useState<WaLiveConversation | null>(null);
  const [messages, setMessages] = useState<WaLiveMessage[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTarget, setComposeTarget] = useState<WaLiveConversation | null>(null);
  const [composeSeed, setComposeSeed] = useState("");
  const [replyDraft, setReplyDraft] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const visibleMessages = useMemo(
    () =>
      messages
        .map((message) => ({ ...message, text: safeWhatsAppVisibleText(message.text) || "" }))
        .filter((message) => Boolean(message.text) || message.type !== "text"),
    [messages],
  );

  const unreadCount = useMemo(
    () => conversations.filter((conversation) => conversation.unread_count > 0).length,
    [conversations],
  );
  const pendingCount = useMemo(
    () => conversations.filter((conversation) => conversation.pending).length,
    [conversations],
  );

  useEffect(() => {
    if (!session) return;
    const timer = window.setTimeout(() => {
      void loadConversations(query, filter);
    }, query ? 220 : 0);
    return () => window.clearTimeout(timer);
  }, [session, query, filter, loadConversations]);

  useEffect(() => {
    if (!session || typeof window === "undefined") return;
    const requested = new URLSearchParams(window.location.search).get("chat") || "";
    if (!requested) return;

    const timer = window.setTimeout(() => {
      setSelected((current) =>
        current || {
          id: requested,
          name: "Contact WhatsApp",
          number: waNumberFromId(requested),
          kind: requested.endsWith("@g.us") ? "group" : "contact",
          unread_count: 0,
          pending: false,
          last_message: {
            id: "",
            chat_id: requested,
            text: "",
            from_me: false,
            sender: "",
            type: "text",
            timestamp_ms: 0,
          },
        },
      );
    }, 0);

    return () => window.clearTimeout(timer);
  }, [session]);

  useEffect(() => {
    if (!selected || !session) return;
    void loadThread(selected);
  }, [selected, session, loadThread]);

  const loadConversations = useCallback(async (
    search: string,
    selectedFilter: Filter,
    options: { append?: boolean; offset?: number } = {},
  ) => {
    const append = Boolean(options.append);
    const offset = options.offset ?? 0;
    if (append) setLoadingMore(true);
    else setLoadingList(true);
    setListError(null);

    try {
      const data = await getWaLiveConversations({
        search: search.trim() || undefined,
        pending: selectedFilter === "pending",
        unread: selectedFilter === "unread",
        offset,
        limit: 80,
      });
      setConversations((current) => {
        if (!append) return data.conversations;
        const merged = [...current, ...data.conversations];
        return Array.from(new Map(merged.map((item) => [item.id, item])).values());
      });
      setHasMore(data.has_more);
      setNextOffset(data.next_offset);

      const requested =
        typeof window === "undefined"
          ? ""
          : new URLSearchParams(window.location.search).get("chat") || "";
      if (requested) {
        const exact = data.conversations.find((item) => item.id === requested);
        if (exact) setSelected(exact);
      } else if (
        data.conversations.length &&
        typeof window !== "undefined" &&
        window.innerWidth >= 1024
      ) {
        setSelected((current) => current || data.conversations[0]);
      }
    } catch (error) {
      if (!append) setConversations([]);
      setListError(errorMessage(error, "history"));
    } finally {
      if (append) setLoadingMore(false);
      else setLoadingList(false);
    }
  }, []);

  const loadThread = useCallback(async (conversation: WaLiveConversation) => {
    setLoadingThread(true);
    setThreadError(null);
    try {
      const data = await getWaConversationMessages(conversation.id, 120);
      setMessages(data.messages);
    } catch (error) {
      setMessages([]);
      setThreadError(errorMessage(error, "history"));
    } finally {
      setLoadingThread(false);
    }
  }, []);

  function chooseConversation(conversation: WaLiveConversation) {
    setReplyDraft("");
    setMessages([]);
    setSelected(conversation);
    if (typeof window !== "undefined") {
      const next = new URL(window.location.href);
      next.searchParams.set("chat", conversation.id);
      window.history.replaceState(null, "", next);
    }
  }

  function backToConversationList() {
    setSelected(null);
    setMessages([]);
    if (typeof window !== "undefined") {
      const next = new URL(window.location.href);
      next.searchParams.delete("chat");
      window.history.replaceState(null, "", next);
    }
  }

  function openNewMessage() {
    setComposeTarget(null);
    setComposeSeed("");
    setComposeOpen(true);
  }

  function openReplyReview() {
    if (!selected || !replyDraft.trim()) return;
    setComposeTarget(selected);
    setComposeSeed(replyDraft.trim());
    setComposeOpen(true);
  }

  return (
    <div className="min-h-dvh" style={{ background: PAGE_BG, color: TEXT }}>
      <aside
        className="fixed inset-y-0 left-0 z-50 hidden w-[253px] border-r lg:block"
        style={{ background: SIDEBAR_BG, borderColor: BORDER }}
      >
        <SidebarContent />
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fermer la navigation"
            className="absolute inset-0 bg-black/65"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside
            className="relative h-full w-[286px] border-r shadow-2xl"
            style={{ background: SIDEBAR_BG, borderColor: BORDER }}
          >
            <button
              type="button"
              aria-label="Fermer la navigation"
              onClick={() => setMobileNavOpen(false)}
              className="absolute right-3 top-4 flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/5"
              style={{ color: MUTED }}
            >
              <X size={19} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="lg:pl-[253px]">
        <main className="grid h-dvh min-h-0 lg:grid-cols-[420px_minmax(0,1fr)] xl:grid-cols-[480px_minmax(0,1fr)] 2xl:grid-cols-[500px_minmax(0,1fr)]">
          <aside
            className={`${selected ? "hidden lg:flex" : "flex"} min-h-0 flex-col border-r`}
            style={{ borderColor: BORDER, background: SURFACE }}
          >
            <div
              className="flex min-h-[76px] items-center gap-3 border-b px-4"
              style={{ borderColor: BORDER, background: PAGE_BG }}
            >
              <button
                type="button"
                aria-label="Ouvrir la navigation"
                onClick={() => setMobileNavOpen(true)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl hover:bg-white/5 lg:hidden"
                style={{ color: MUTED }}
              >
                <Menu size={20} />
              </button>

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#0ac86d] shadow-[0_8px_28px_rgba(8,200,117,.16)]">
                <WhatsAppIcon size={26} />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-[18px] font-semibold tracking-[-0.02em]">WhatsApp</h1>
                <p className="mt-0.5 truncate text-[10px]" style={{ color: MUTED }}>
                  Centre de conversation Toumaï
                </p>
              </div>

              <button
                type="button"
                onClick={openNewMessage}
                className="ml-auto flex h-10 shrink-0 items-center gap-2 rounded-xl px-3.5 text-[12px] font-semibold text-white shadow-[0_8px_28px_rgba(8,200,117,.16)]"
                style={{ background: GREEN }}
              >
                <Send size={15} />
                <span className="hidden xl:inline">Nouveau message</span>
              </button>
            </div>

            <div className="border-b px-4 pb-3 pt-3" style={{ borderColor: BORDER }}>
              <h2 className="sr-only">Conversations</h2>
              <div className="flex items-center gap-2">
                <div className="relative min-w-0 flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2" size={17} color={MUTED} />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Rechercher une conversation…"
                    className="h-11 w-full rounded-xl border bg-transparent pl-10 pr-3 text-[12px] outline-none transition focus:border-[#2f8cff]"
                    style={{ borderColor: BORDER, background: RAISED }}
                  />
                </div>
                <button
                  type="button"
                  disabled
                  title="Filtres avancés bientôt disponibles"
                  aria-label="Filtres avancés"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border opacity-70"
                  style={{ borderColor: BORDER, background: RAISED, color: MUTED }}
                >
                  <SlidersHorizontal size={17} />
                </button>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <FilterButton
                  active={filter === "all"}
                  onClick={() => setFilter("all")}
                  label="Toutes"
                  count={filter === "all" ? conversations.length : undefined}
                />
                <FilterButton
                  active={filter === "unread"}
                  onClick={() => setFilter("unread")}
                  label="Non lues"
                  count={filter === "all" ? unreadCount : undefined}
                />
                <FilterButton
                  active={filter === "pending"}
                  onClick={() => setFilter("pending")}
                  label="En attente"
                  count={filter === "all" ? pendingCount : undefined}
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {loadingList && [0, 1, 2, 3, 4, 5, 6].map((index) => (
                <div key={index} className="mx-3 my-2 h-[72px] animate-pulse rounded-xl bg-white/[0.025]" />
              ))}

              {!loadingList && listError && (
                <div className="m-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                  <div className="flex items-start gap-3">
                    <CircleAlert size={18} className="mt-0.5 shrink-0 text-red-300" />
                    <div>
                      <p className="text-sm font-semibold">Conversations indisponibles</p>
                      <p className="mt-1 text-xs leading-5 text-red-200/80">{listError}</p>
                      <button
                        type="button"
                        onClick={() => void loadConversations(query, filter)}
                        className="mt-3 text-xs font-semibold text-red-200"
                      >
                        Réessayer
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!loadingList && !listError && conversations.length === 0 && (
                <div className="px-6 py-14 text-center">
                  <MessageCircle className="mx-auto" size={24} color={FAINT} />
                  <p className="mt-3 text-sm font-medium">Aucune conversation</p>
                  <p className="mt-1 text-xs" style={{ color: MUTED }}>
                    Aucun résultat pour ce filtre.
                  </p>
                </div>
              )}

              {!loadingList && !listError && conversations.map((conversation) => (
                <ConversationListItem
                  key={conversation.id}
                  conversation={conversation}
                  active={selected?.id === conversation.id}
                  onClick={() => chooseConversation(conversation)}
                />
              ))}

              {!loadingList && !listError && hasMore && nextOffset !== null && (
                <div className="p-3">
                  <button
                    type="button"
                    disabled={loadingMore}
                    onClick={() =>
                      void loadConversations(query, filter, {
                        append: true,
                        offset: nextOffset,
                      })
                    }
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border text-xs font-semibold disabled:opacity-50"
                    style={{ borderColor: BORDER, color: MUTED }}
                  >
                    <RefreshCw size={14} className={loadingMore ? "animate-spin" : ""} />
                    {loadingMore ? "Chargement…" : "Charger plus"}
                  </button>
                </div>
              )}
            </div>
          </aside>

          <section className={`${selected ? "flex" : "hidden lg:flex"} min-h-0 min-w-0 flex-col`} style={{ background: PAGE_BG }}>
            {!selected ? (
              <EmptyConversationState onNewMessage={openNewMessage} />
            ) : (
              <>
                <div
                  className="flex min-h-[76px] items-center gap-3 border-b px-4 md:px-5"
                  style={{ borderColor: BORDER, background: SURFACE }}
                >
                  <button
                    type="button"
                    aria-label="Retour aux conversations"
                    onClick={backToConversationList}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl hover:bg-white/5 lg:hidden"
                    style={{ color: MUTED }}
                  >
                    <ArrowLeft size={18} />
                  </button>

                  <Avatar name={displayConversationName(selected)} kind={selected.kind} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <h2 className="truncate text-[15px] font-semibold tracking-[-0.01em]">
                        {displayConversationName(selected)}
                      </h2>
                      {selected.pending && (
                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold"
                          style={{ background: "rgba(255,149,24,.12)", color: ORANGE }}
                        >
                          En attente
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-[10px]" style={{ color: MUTED }}>
                      {displayConversationSecondary(selected)}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled
                    title="Recherche dans la conversation bientôt disponible"
                    aria-label="Rechercher dans la conversation"
                    className="flex h-10 w-10 items-center justify-center rounded-xl border opacity-75"
                    style={{ borderColor: BORDER, background: RAISED, color: MUTED }}
                  >
                    <Search size={17} />
                  </button>
                  <button
                    type="button"
                    disabled
                    title="Informations du contact bientôt disponibles"
                    aria-label="Informations du contact"
                    className="hidden h-10 w-10 items-center justify-center rounded-xl border opacity-75 sm:flex"
                    style={{ borderColor: BORDER, background: RAISED, color: MUTED }}
                  >
                    <Info size={17} />
                  </button>
                  <button
                    type="button"
                    disabled
                    title="Plus d’options bientôt disponibles"
                    aria-label="Plus d’options"
                    className="hidden h-10 w-10 items-center justify-center rounded-xl border opacity-75 sm:flex"
                    style={{ borderColor: BORDER, background: RAISED, color: MUTED }}
                  >
                    <MoreVertical size={17} />
                  </button>
                </div>

                <div
                  className="min-h-0 flex-1 overflow-y-auto px-3 py-5 md:px-6 lg:px-8"
                  style={{
                    backgroundColor: "#06131c",
                    backgroundImage:
                      "radial-gradient(circle at 20% 20%, rgba(8,200,117,.025) 0 1px, transparent 1.5px), radial-gradient(circle at 80% 65%, rgba(255,255,255,.018) 0 1px, transparent 1.5px)",
                    backgroundSize: "38px 38px, 52px 52px",
                  }}
                >
                  {loadingThread && (
                    <div className="mx-auto max-w-[920px] space-y-3">
                      {[0, 1, 2, 3].map((index) => (
                        <div key={index} className="h-16 animate-pulse rounded-2xl bg-white/[0.025]" />
                      ))}
                    </div>
                  )}

                  {!loadingThread && threadError && (
                    <div className="mx-auto max-w-[920px] rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200">
                      {threadError}
                    </div>
                  )}

                  {!loadingThread && !threadError && visibleMessages.length === 0 && (
                    <div className="flex min-h-[360px] items-center justify-center text-center">
                      <div>
                        <MessageCircle className="mx-auto" size={26} color={FAINT} />
                        <p className="mt-3 text-sm font-medium">Aucun message visible</p>
                        <p className="mt-1 max-w-sm text-xs leading-5" style={{ color: MUTED }}>
                          Aucun échange exploitable n’est disponible pour cette conversation.
                        </p>
                      </div>
                    </div>
                  )}

                  {!loadingThread && !threadError && visibleMessages.length > 0 && (
                    <div className="mx-auto w-full max-w-[980px]">
                      <ThreadMessages messages={visibleMessages} />
                    </div>
                  )}
                </div>

                <div className="border-t px-3 pt-2.5 md:px-5" style={{ borderColor: BORDER, background: SURFACE }}>
                  <div className="mx-auto max-w-[980px]">
                    <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
                      <span
                        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[10px] font-semibold"
                        style={{ background: "rgba(139,92,246,.10)", color: "#c4a8ff" }}
                      >
                        <Sparkles size={13} />
                        Assistant IA
                      </span>
                      <AiAction icon={<Sparkles size={13} />} label="Réponse suggérée" />
                      <AiAction icon={<MessageCircle size={13} />} label="Résumer" />
                      <AiAction icon={<Languages size={13} />} label="Traduire" />
                      <AiAction icon={<ListTodo size={13} />} label="Créer une tâche" />
                    </div>
                  </div>
                </div>

                <div className="px-3 pb-3 md:px-5" style={{ background: SURFACE }}>
                  <div className="mx-auto max-w-[980px]">
                    <div
                      className="flex items-end gap-2 rounded-[16px] border p-2"
                      style={{ borderColor: BORDER, background: RAISED }}
                    >
                      <button
                        type="button"
                        disabled
                        aria-label="Emoji"
                        title="Emoji bientôt disponible"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl opacity-65"
                        style={{ color: MUTED }}
                      >
                        <Smile size={19} />
                      </button>
                      <button
                        type="button"
                        disabled
                        aria-label="Joindre un fichier"
                        title="Pièces jointes bientôt disponibles"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl opacity-65"
                        style={{ color: MUTED }}
                      >
                        <Paperclip size={19} />
                      </button>

                      <textarea
                        value={replyDraft}
                        onChange={(event) => setReplyDraft(event.target.value.slice(0, 4096))}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey && replyDraft.trim()) {
                            event.preventDefault();
                            openReplyReview();
                          }
                        }}
                        placeholder="Écrire un message…"
                        rows={1}
                        className="min-h-10 max-h-32 min-w-0 flex-1 resize-none bg-transparent px-1 py-2.5 text-[13px] leading-5 outline-none"
                      />

                      <span
                        className="hidden shrink-0 items-center gap-1.5 px-2 text-[9px] lg:inline-flex"
                        style={{ color: FAINT }}
                      >
                        <ShieldCheck size={14} color={GREEN} />
                        Confirmation avant envoi
                      </span>

                      <button
                        type="button"
                        disabled={!replyDraft.trim()}
                        onClick={openReplyReview}
                        aria-label="Vérifier l’envoi"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-[0_8px_28px_rgba(8,200,117,.18)] disabled:cursor-not-allowed disabled:opacity-35"
                        style={{ background: GREEN }}
                      >
                        <Send size={18} />
                      </button>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between px-1 text-[9px]" style={{ color: FAINT }}>
                      <span className="lg:hidden">Confirmation requise avant chaque envoi.</span>
                      <span className="ml-auto">{replyDraft.length}/4096</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        </main>
      </div>

      <WhatsAppComposeModal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        initialRecipient={composeTarget?.id}
        initialName={composeTarget?.name}
        initialMessage={composeSeed}
        onSent={() => {
          setReplyDraft("");
          setComposeSeed("");
          if (selected) window.setTimeout(() => void loadThread(selected), 700);
          void loadConversations(query, filter);
        }}
      />
    </div>
  );
}

function SidebarContent() {
  return (
    <div className="flex h-full flex-col p-4">
      <Link href="/chat" className="flex h-12 items-center gap-3 px-3" aria-label="Toumaï AI">
        <Image
          src="/logo.png"
          alt=""
          width={38}
          height={38}
          priority
          className="h-[38px] w-[38px] shrink-0 object-contain"
        />
        <span className="text-[23px] font-bold tracking-[-0.03em]">Toumaï AI</span>
      </Link>

      <nav className="mt-8 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex h-11 items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition hover:bg-white/[0.035]"
            style={{ color: MUTED }}
          >
            <Icon size={19} />
            <span>{label}</span>
          </Link>
        ))}

        <div
          className="mt-2 flex h-11 items-center gap-3 rounded-xl border px-3 text-[13px] font-semibold"
          style={{
            color: "#ffb35a",
            borderColor: "rgba(255,149,24,.25)",
            background: "rgba(255,149,24,.08)",
          }}
        >
          <WhatsAppIcon size={19} />
          <span>WhatsApp</span>
        </div>

        <div className="ml-[24px] mt-1 space-y-1 border-l pl-3" style={{ borderColor: BORDER }}>
          <Link
            href="/whatsapp"
            className="flex h-9 items-center rounded-lg px-3 text-[11px] transition hover:bg-white/[0.035]"
            style={{ color: MUTED }}
          >
            Overview
          </Link>
          <div
            className="relative flex h-10 items-center overflow-hidden rounded-xl px-3 text-[11px] font-semibold"
            style={{
              color: "#e9fff5",
              background: "linear-gradient(90deg, rgba(8,200,117,.22), rgba(8,200,117,.10))",
            }}
          >
            <span className="absolute inset-y-1 left-0 w-[3px] rounded-r-full" style={{ background: GREEN }} />
            Conversations
          </div>
          <Link
            href="/whatsapp/automations"
            className="flex h-9 items-center rounded-lg px-3 text-[11px] transition hover:bg-white/[0.035]"
            style={{ color: MUTED }}
          >
            Automatisations
          </Link>
        </div>
      </nav>

      <div className="mt-auto space-y-1">
        {LOWER_NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex h-11 items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition hover:bg-white/[0.035]"
            style={{ color: MUTED }}
          >
            <Icon size={19} />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ConversationListItem({
  conversation,
  active,
  onClick,
}: {
  conversation: WaLiveConversation;
  active: boolean;
  onClick: () => void;
}) {
  const preview = safeWhatsAppVisibleText(conversation.last_message.text) || "Message WhatsApp";
  const name = displayConversationName(conversation);
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex w-full items-center gap-3 border-b px-4 py-3 text-left transition hover:bg-white/[0.03]"
      style={{
        borderColor: BORDER,
        background: active
          ? "linear-gradient(90deg, rgba(8,200,117,.13), rgba(8,200,117,.055))"
          : "transparent",
      }}
    >
      {active && <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full" style={{ background: GREEN }} />}
      <Avatar name={name} kind={conversation.kind} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-[12px] font-semibold">{name}</p>
          <time className="shrink-0 text-[9px]" style={{ color: FAINT }}>
            {formatTime(conversation.last_message.timestamp_ms)}
          </time>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-[10px]" style={{ color: MUTED }}>
            {conversation.last_message.from_me ? "Vous : " : ""}
            {preview}
          </p>
          {conversation.unread_count > 0 && (
            <span
              className="flex h-[19px] min-w-[19px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
              style={{ background: GREEN }}
            >
              {Math.min(conversation.unread_count, 99)}
            </span>
          )}
          {conversation.pending && conversation.unread_count === 0 && (
            <span className="h-2 w-2 rounded-full" style={{ background: ORANGE }} />
          )}
        </div>
      </div>
    </button>
  );
}

function EmptyConversationState({ onNewMessage }: { onNewMessage: () => void }) {
  return (
    <div className="flex h-full flex-1 items-center justify-center px-6 text-center">
      <div className="max-w-sm">
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ background: "rgba(8,200,117,.08)", color: GREEN }}
        >
          <MessageCircle size={26} />
        </div>
        <h2 className="mt-4 text-[18px] font-semibold">Vos conversations WhatsApp</h2>
        <p className="mt-2 text-sm leading-6" style={{ color: MUTED }}>
          Sélectionnez une conversation à gauche ou commencez un nouvel échange.
        </p>
        <button
          type="button"
          onClick={onNewMessage}
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-semibold text-white"
          style={{ background: GREEN }}
        >
          <Send size={15} />
          Nouveau message
        </button>
      </div>
    </div>
  );
}

function FilterButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-2 rounded-full border px-3 text-[10px] font-semibold transition"
      style={{
        background: active ? "rgba(8,200,117,.13)" : RAISED,
        borderColor: active ? "rgba(8,200,117,.55)" : BORDER,
        color: active ? "#e8fff4" : MUTED,
      }}
    >
      <span className="truncate">{label}</span>
      {typeof count === "number" && (
        <span
          className="flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[9px]"
          style={{ background: active ? "rgba(8,200,117,.22)" : "rgba(255,255,255,.06)", color: active ? "#baffdc" : MUTED }}
        >
          {Math.min(count, 99)}
        </span>
      )}
    </button>
  );
}

function Avatar({
  name,
  kind,
  size = "md",
}: {
  name: string;
  kind: "contact" | "group";
  size?: "md" | "lg";
}) {
  const dimensions = size === "lg" ? "h-10 w-10" : "h-9 w-9";
  return (
    <div
      className={`${dimensions} flex shrink-0 items-center justify-center rounded-full bg-[#0f4735]`}
      style={{ color: GREEN }}
    >
      {kind === "group" ? (
        <Users size={size === "lg" ? 17 : 15} />
      ) : (
        <span className="text-[10px] font-bold">{initials(name)}</span>
      )}
    </div>
  );
}

function ThreadMessages({ messages }: { messages: WaLiveMessage[] }) {
  const groups = groupMessagesByDay(messages);
  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <div key={group.key} className="flex flex-col gap-2.5">
          <div className="sticky top-0 z-10 flex justify-center py-1">
            <span
              className="rounded-full border px-3 py-1 text-[9px] font-medium shadow-sm"
              style={{ background: "rgba(14,30,41,.94)", borderColor: BORDER, color: MUTED }}
            >
              {group.label}
            </span>
          </div>
          {group.messages.map((message, index) => (
            <MessageBubble key={message.id || `${message.timestamp_ms}-${index}`} message={message} />
          ))}
        </div>
      ))}
    </div>
  );
}

function MessageBubble({ message }: { message: WaLiveMessage }) {
  const when = message.timestamp_ms
    ? new Intl.DateTimeFormat("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(message.timestamp_ms))
    : "";

  return (
    <div className={`flex ${message.from_me ? "justify-end" : "justify-start"}`}>
      <div
        className="max-w-[82%] rounded-[14px] px-3.5 py-2.5 shadow-[0_6px_20px_rgba(0,0,0,.10)] sm:max-w-[70%] lg:max-w-[62%]"
        style={{
          background: message.from_me
            ? "linear-gradient(145deg,#0b6447,#0a533d)"
            : "linear-gradient(145deg,#182631,#14212b)",
          border: `1px solid ${message.from_me ? "rgba(8,200,117,.18)" : "rgba(255,255,255,.05)"}`,
        }}
      >
        {!message.from_me && message.sender && !isTechnicalWhatsAppIdentity(message.sender) && (
          <p className="mb-1 text-[9px] font-semibold" style={{ color: GREEN }}>
            {message.sender}
          </p>
        )}

        {message.type !== "text" && !message.text && (
          <div className="flex items-center gap-2 text-[11px]" style={{ color: "#dbe4ea" }}>
            <Paperclip size={15} color={GREEN} />
            <span>{messageTypeLabel(message.type)}</span>
          </div>
        )}

        {message.text && (
          <p className="whitespace-pre-wrap break-words text-[12px] leading-[1.65]">
            {message.text}
          </p>
        )}

        <div className="mt-1 flex items-center justify-end gap-1.5">
          <span className="text-[8px]" style={{ color: "#9eacb7" }}>
            {when}
          </span>
          {message.from_me && <DeliveryMark status={message.status} />}
        </div>
      </div>
    </div>
  );
}

function DeliveryMark({ status }: { status?: string | null }) {
  if (status === "read" || status === "played") {
    return <CheckCheck size={12} color="#53bdeb" aria-label="Lu" />;
  }
  if (status === "delivered") {
    return <CheckCheck size={12} color="#afbdc7" aria-label="Livré" />;
  }
  return <Check size={12} color="#afbdc7" aria-label="Envoyé" />;
}

function AiAction({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <button
      type="button"
      disabled
      title={`${label} — bientôt disponible`}
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[10px] font-medium opacity-75"
      style={{ borderColor: BORDER, background: RAISED, color: "#bdc8d0" }}
    >
      {icon}
      {label}
    </button>
  );
}

function displayConversationName(conversation: WaLiveConversation) {
  const candidate = (conversation.name || "").trim();
  if (candidate && !isTechnicalWhatsAppIdentity(candidate) && candidate !== conversation.id) {
    return candidate;
  }
  const number = validWhatsAppNumber(conversation.number);
  if (number) return `+${number}`;
  return conversation.kind === "group" ? "Groupe WhatsApp" : "Contact WhatsApp";
}

function displayConversationSecondary(conversation: WaLiveConversation) {
  const number = validWhatsAppNumber(conversation.number);
  if (number) return `+${number}`;
  return conversation.kind === "group" ? "Groupe WhatsApp" : "Contact WhatsApp";
}

function isTechnicalWhatsAppIdentity(value: string | null | undefined) {
  const text = (value || "").trim();
  if (!text) return false;
  return /@(lid|s\.whatsapp\.net|g\.us)$/i.test(text) || /^\d{16,}$/.test(text);
}

function validWhatsAppNumber(value: string | null | undefined) {
  const digits = (value || "").replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15 ? digits : null;
}

function waNumberFromId(value: string) {
  if (!value.endsWith("@s.whatsapp.net")) return null;
  return validWhatsAppNumber(value.split("@", 1)[0]);
}

function groupMessagesByDay(messages: WaLiveMessage[]) {
  const groups: Array<{ key: string; label: string; messages: WaLiveMessage[] }> = [];
  for (const message of messages) {
    const date = message.timestamp_ms ? new Date(message.timestamp_ms) : new Date();
    const key = Number.isNaN(date.getTime()) ? "unknown" : date.toISOString().slice(0, 10);
    const current = groups[groups.length - 1];
    if (!current || current.key !== key) {
      groups.push({ key, label: formatDayLabel(date), messages: [message] });
    } else {
      current.messages.push(message);
    }
  }
  return groups;
}

function formatDayLabel(date: Date) {
  if (Number.isNaN(date.getTime())) return "Conversation";
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return "Aujourd’hui";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Hier";
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

function messageTypeLabel(type: string) {
  const labels: Record<string, string> = {
    image: "Image",
    video: "Vidéo",
    audio: "Message vocal",
    document: "Document",
    sticker: "Sticker",
  };
  return labels[type] || "Pièce jointe";
}

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "WA";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatTime(timestampMs: number) {
  if (!timestampMs) return "";
  const date = new Date(timestampMs);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
  }).format(date);
}
