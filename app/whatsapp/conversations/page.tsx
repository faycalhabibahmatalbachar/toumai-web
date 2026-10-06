"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bot,
  BookOpen,
  CheckCheck,
  ChevronRight,
  CircleAlert,
  LayoutDashboard,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Plug,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
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
const BLUE = "#2f8cff";
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
  const [conversationSource, setConversationSource] = useState<"baileys" | "autopilot-log">("baileys");
  const [threadSource, setThreadSource] = useState<"baileys" | "autopilot-log">("baileys");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const visibleMessages = useMemo(
    () =>
      messages
        .map((message) => ({ ...message, text: safeWhatsAppVisibleText(message.text) || "" }))
        .filter((message) => Boolean(message.text) || message.type !== "text"),
    [messages],
  );

  useEffect(() => {
    if (!session) return;
    const timer = window.setTimeout(() => {
      void loadConversations(query, filter);
    }, query ? 220 : 0);
    return () => window.clearTimeout(timer);
  }, [session, query, filter]);

  useEffect(() => {
    if (!session) return;
    const requested =
      typeof window === "undefined"
        ? ""
        : new URLSearchParams(window.location.search).get("chat") || "";
    if (!requested) return;
    setSelected((current) =>
      current || {
        id: requested,
        name: requested.split("@", 1)[0],
        number: requested.endsWith("@s.whatsapp.net") ? requested.split("@", 1)[0] : null,
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
  }, [session]);

  useEffect(() => {
    if (!selected || !session) {
      setMessages([]);
      setReplyDraft("");
      return;
    }
    setReplyDraft("");
    void loadThread(selected);
  }, [selected?.id, session]);

  async function loadConversations(
    search: string,
    selectedFilter: Filter,
    options: { append?: boolean; offset?: number } = {},
  ) {
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
      setConversationSource(data.source);

      const requested =
        typeof window === "undefined"
          ? ""
          : new URLSearchParams(window.location.search).get("chat") || "";
      if (requested) {
        const exact = data.conversations.find((item) => item.id === requested);
        if (exact) setSelected(exact);
      } else if (
        !selected &&
        data.conversations.length &&
        typeof window !== "undefined" &&
        window.innerWidth >= 1024
      ) {
        setSelected(data.conversations[0]);
      }
    } catch (error) {
      if (!append) setConversations([]);
      setListError(errorMessage(error, "history"));
    } finally {
      if (append) setLoadingMore(false);
      else setLoadingList(false);
    }
  }

  async function loadThread(conversation: WaLiveConversation) {
    setLoadingThread(true);
    setThreadError(null);
    try {
      const data = await getWaConversationMessages(conversation.id, 120);
      setMessages(data.messages);
      setThreadSource(data.source);
    } catch (error) {
      setMessages([]);
      setThreadError(errorMessage(error, "history"));
    } finally {
      setLoadingThread(false);
    }
  }

  function chooseConversation(conversation: WaLiveConversation) {
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
        <header
          className="sticky top-0 z-40 flex h-[70px] items-center border-b px-4 md:px-6"
          style={{
            background: "rgba(6,17,26,.96)",
            borderColor: BORDER,
            backdropFilter: "blur(16px)",
          }}
        >
          <button
            type="button"
            aria-label="Ouvrir la navigation"
            onClick={() => setMobileNavOpen(true)}
            className="mr-3 flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/5 lg:hidden"
            style={{ color: MUTED }}
          >
            <Menu size={20} />
          </button>

          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0ac86d]">
              <WhatsAppIcon size={24} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Link href="/whatsapp" className="text-[15px] font-semibold hover:opacity-90">
                  WhatsApp
                </Link>
                <ChevronRight size={15} color={FAINT} />
                <span className="truncate text-[13px]" style={{ color: MUTED }}>
                  Conversations
                </span>
              </div>
              <p className="mt-0.5 hidden text-[10px] sm:block" style={{ color: FAINT }}>
                Centre de conversation Toumaï
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openNewMessage}
            className="ml-auto flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white shadow-[0_8px_28px_rgba(8,200,117,.18)]"
            style={{ background: GREEN }}
          >
            <Send size={16} />
            <span className="hidden sm:inline">Nouveau message</span>
          </button>
        </header>

        <main className="grid h-[calc(100dvh-70px)] min-h-0 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside
            className={`${selected ? "hidden lg:flex" : "flex"} min-h-0 flex-col border-r`}
            style={{ borderColor: BORDER, background: SURFACE }}
          >
            <div className="border-b px-4 pb-3 pt-4" style={{ borderColor: BORDER }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-[16px] font-semibold tracking-[-0.01em]">Conversations</h1>
                  <p className="mt-1 text-[11px]" style={{ color: MUTED }}>
                    {conversations.length ? `${conversations.length} chargée${conversations.length > 1 ? "s" : ""}` : "Historique WhatsApp"}
                  </p>
                </div>
                <SourceBadge source={conversationSource} />
              </div>

              <div className="relative mt-4">
                <Search className="absolute left-3 top-[11px]" size={17} color={MUTED} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Rechercher"
                  className="h-10 w-full rounded-xl border bg-transparent pl-10 pr-3 text-sm outline-none focus:border-[#2f8cff]"
                  style={{ borderColor: BORDER, background: RAISED }}
                />
              </div>

              <div className="mt-3 flex items-center gap-1 rounded-xl p-1" style={{ background: RAISED }}>
                <FilterButton active={filter === "all"} onClick={() => setFilter("all")} label="Toutes" />
                <FilterButton active={filter === "pending"} onClick={() => setFilter("pending")} label="En attente" />
                <FilterButton active={filter === "unread"} onClick={() => setFilter("unread")} label="Non lues" />
              </div>

              {conversationSource === "autopilot-log" && !loadingList && !listError && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border px-3 py-2" style={{ borderColor: "rgba(255,149,24,.24)", background: "rgba(255,149,24,.045)" }}>
                  <ShieldCheck size={14} className="mt-0.5 shrink-0" color={ORANGE} />
                  <p className="text-[10px] leading-4" style={{ color: "#d8ad72" }}>
                    Mode compatibilité : seuls les échanges réellement journalisés par Toumaï sont affichés.
                  </p>
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {loadingList && [0, 1, 2, 3, 4, 5].map((index) => (
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

          <section className={`${selected ? "flex" : "hidden lg:flex"} min-h-0 min-w-0 flex-col`}>
            {!selected ? (
              <EmptyConversationState onNewMessage={openNewMessage} />
            ) : (
              <>
                <div
                  className="flex min-h-[68px] items-center gap-3 border-b px-4 md:px-5"
                  style={{ borderColor: BORDER, background: SURFACE }}
                >
                  <button
                    type="button"
                    aria-label="Retour aux conversations"
                    onClick={backToConversationList}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl hover:bg-white/5 lg:hidden"
                    style={{ color: MUTED }}
                  >
                    <ArrowLeft size={18} />
                  </button>

                  <Avatar name={selected.name} kind={selected.kind} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <h2 className="truncate text-[14px] font-semibold">{selected.name}</h2>
                      {selected.pending && (
                        <span className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold" style={{ background: "rgba(255,149,24,.12)", color: ORANGE }}>
                          En attente
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-[10px]" style={{ color: MUTED }}>
                      {selected.number
                        ? `+${selected.number}`
                        : selected.kind === "group"
                          ? "Groupe WhatsApp"
                          : selected.id}
                    </p>
                  </div>

                  <SourceBadge source={threadSource} compact />

                  <button
                    type="button"
                    onClick={() => void loadThread(selected)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border hover:bg-white/5"
                    style={{ borderColor: BORDER, color: MUTED }}
                    aria-label="Actualiser la conversation"
                  >
                    <RefreshCw size={15} className={loadingThread ? "animate-spin" : ""} />
                  </button>
                  <button
                    type="button"
                    aria-label="Plus d’options"
                    className="hidden h-9 w-9 items-center justify-center rounded-xl border hover:bg-white/5 sm:flex"
                    style={{ borderColor: BORDER, color: MUTED }}
                  >
                    <MoreHorizontal size={17} />
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5 md:px-7">
                  {threadSource === "autopilot-log" && !loadingThread && !threadError && (
                    <div className="mx-auto mb-4 flex max-w-[760px] items-center gap-2 rounded-xl border px-3 py-2" style={{ borderColor: "rgba(255,149,24,.22)", background: "rgba(255,149,24,.04)" }}>
                      <ShieldCheck size={14} color={ORANGE} />
                      <p className="text-[10px]" style={{ color: "#d4ae7b" }}>
                        Historique partiel — seuls les échanges journalisés par Toumaï sont visibles.
                      </p>
                    </div>
                  )}

                  {loadingThread && (
                    <div className="mx-auto max-w-[760px] space-y-3">
                      {[0, 1, 2, 3].map((index) => (
                        <div key={index} className="h-16 animate-pulse rounded-2xl bg-white/[0.025]" />
                      ))}
                    </div>
                  )}

                  {!loadingThread && threadError && (
                    <div className="mx-auto max-w-[760px] rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200">
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
                    <div className="mx-auto flex max-w-[760px] flex-col gap-2.5">
                      {visibleMessages.map((message, index) => (
                        <MessageBubble
                          key={message.id || `${message.timestamp_ms}-${index}`}
                          message={message}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t px-3 py-3 md:px-5" style={{ borderColor: BORDER, background: SURFACE }}>
                  <div className="mx-auto max-w-[820px]">
                    <div
                      className="flex items-end gap-2 rounded-[16px] border p-2"
                      style={{ borderColor: BORDER, background: RAISED }}
                    >
                      <button
                        type="button"
                        aria-label="Ajouter une pièce jointe"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl hover:bg-white/5"
                        style={{ color: FAINT }}
                      >
                        <Paperclip size={17} />
                      </button>

                      <textarea
                        value={replyDraft}
                        onChange={(event) => setReplyDraft(event.target.value.slice(0, 4096))}
                        placeholder={`Répondre à ${selected.name}`}
                        rows={1}
                        className="min-h-10 max-h-32 flex-1 resize-none bg-transparent px-1 py-2.5 text-[13px] leading-5 outline-none"
                      />

                      <button
                        type="button"
                        disabled={!replyDraft.trim()}
                        onClick={openReplyReview}
                        className="flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-35"
                        style={{ background: GREEN }}
                      >
                        <Send size={15} />
                        <span className="hidden sm:inline">Vérifier</span>
                      </button>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between px-1 text-[9px]" style={{ color: FAINT }}>
                      <span>Confirmation requise avant chaque envoi.</span>
                      <span>{replyDraft.length}/4096</span>
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
            className="flex h-9 items-center rounded-lg px-3 text-[11px] font-semibold"
            style={{ color: TEXT, background: "rgba(255,255,255,.045)" }}
          >
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
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex w-full items-center gap-3 border-b px-4 py-3 text-left transition hover:bg-white/[0.025]"
      style={{
        borderColor: BORDER,
        background: active ? "rgba(8,200,117,.055)" : "transparent",
      }}
    >
      {active && <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full" style={{ background: GREEN }} />}
      <Avatar name={conversation.name} kind={conversation.kind} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-[12px] font-semibold">{conversation.name}</p>
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
              className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
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

function SourceBadge({
  source,
  compact = false,
}: {
  source: "baileys" | "autopilot-log";
  compact?: boolean;
}) {
  const live = source === "baileys";
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-semibold"
      style={{
        color: live ? "#9fe8c6" : "#e7b673",
        borderColor: live ? "rgba(8,200,117,.24)" : "rgba(255,149,24,.25)",
        background: live ? "rgba(8,200,117,.06)" : "rgba(255,149,24,.05)",
      }}
      title={live ? "Source Baileys directe" : "Historique journalisé par Toumaï"}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: live ? GREEN : ORANGE }} />
      {compact ? (live ? "Baileys" : "Journal") : live ? "Baileys live" : "Journal partiel"}
    </span>
  );
}

function FilterButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 rounded-lg px-2 py-2 text-[10px] font-semibold transition"
      style={{
        background: active ? SURFACE : "transparent",
        color: active ? TEXT : MUTED,
      }}
    >
      {label}
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
        className="max-w-[72%] rounded-[16px] px-3.5 py-2.5 shadow-sm md:max-w-[68%]"
        style={{
          background: message.from_me ? "#0e503a" : RAISED,
          border: `1px solid ${message.from_me ? "rgba(8,200,117,.17)" : BORDER}`,
        }}
      >
        {!message.from_me && message.sender && (
          <p className="mb-1 text-[9px] font-semibold" style={{ color: GREEN }}>
            {message.sender}
          </p>
        )}
        <p className="whitespace-pre-wrap break-words text-[12px] leading-5">
          {message.text || `[${message.type}]`}
        </p>
        <div className="mt-1 flex items-center justify-end gap-1.5">
          <span className="text-[8px]" style={{ color: "#a7b5c0" }}>
            {when}
          </span>
          {message.from_me && (
            message.status === "read" ? (
              <CheckCheck size={12} color={BLUE} />
            ) : (
              <CheckCheck size={12} color="#aebac4" />
            )
          )}
        </div>
      </div>
    </div>
  );
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
