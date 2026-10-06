"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCheck,
  ChevronRight,
  CircleAlert,
  Clock3,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  Users,
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

const BG = "#06111a";
const SURFACE = "#0d1923";
const RAISED = "#101e29";
const BORDER = "#1e2c36";
const TEXT = "#f4f7f9";
const MUTED = "#9ba8b3";
const GREEN = "#08c875";
const BLUE = "#2f8cff";
const ORANGE = "#ff9518";

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
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [conversationSource, setConversationSource] = useState<"baileys" | "autopilot-log">("baileys");
  const [threadSource, setThreadSource] = useState<"baileys" | "autopilot-log">("baileys");

  useEffect(() => {
    if (!session) return;
    const timer = window.setTimeout(() => {
      void loadConversations(query, filter);
    }, query ? 240 : 0);
    return () => window.clearTimeout(timer);
  }, [session, query, filter]);

  useEffect(() => {
    if (!session) return;
    const requested =
      typeof window === "undefined"
        ? ""
        : new URLSearchParams(window.location.search).get("chat") || "";
    if (!requested) return;
    setSelected((current) => current || {
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
    });
  }, [session]);

  useEffect(() => {
    if (!selected || !session) {
      setMessages([]);
      return;
    }
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

  return (
    <div className="min-h-dvh" style={{ background: BG, color: TEXT }}>
      <header className="sticky top-0 z-30 border-b" style={{ background: "rgba(6,17,26,.96)", borderColor: BORDER, backdropFilter: "blur(16px)" }}>
        <div className="mx-auto flex h-[70px] max-w-[1540px] items-center gap-3 px-4 md:px-6">
          <Link href="/whatsapp" aria-label="Retour à WhatsApp Overview" className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-white/5" style={{ color: MUTED }}>
            <ArrowLeft size={19} />
          </Link>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#08b963]">
            <WhatsAppIcon size={24} />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-[16px] font-semibold">Conversations WhatsApp</h1>
            <p className="text-[11px]" style={{ color: MUTED }}>
              {conversationSource === "baileys"
                ? "Source directe : session Baileys Toumaï"
                : "Journal Toumaï · compatibilité production"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setComposeOpen(true)}
            className="ml-auto flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white"
            style={{ background: GREEN }}
          >
            <Send size={16} /> <span className="hidden sm:inline">Nouveau message</span>
          </button>
        </div>
      </header>

      <main className="mx-auto grid min-h-[calc(100dvh-70px)] max-w-[1540px] lg:grid-cols-[390px_minmax(0,1fr)]">
        <aside className={`${selected ? "hidden lg:block" : "block"} border-r`} style={{ borderColor: BORDER, background: SURFACE }}>
          <div className="border-b p-4" style={{ borderColor: BORDER }}>
            <div className="relative">
              <Search className="absolute left-3 top-3" size={17} color={MUTED} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher une conversation"
                className="h-10 w-full rounded-xl border bg-transparent pl-10 pr-3 text-sm outline-none focus:border-[#2f8cff]"
                style={{ borderColor: BORDER }}
              />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl p-1" style={{ background: RAISED }}>
              <FilterButton active={filter === "all"} onClick={() => setFilter("all")} label="Toutes" />
              <FilterButton active={filter === "pending"} onClick={() => setFilter("pending")} label="En attente" />
              <FilterButton active={filter === "unread"} onClick={() => setFilter("unread")} label="Non lues" />
            </div>

            {conversationSource === "autopilot-log" && !loadingList && !listError && (
              <div className="mt-3 rounded-xl border px-3 py-2.5 text-[11px] leading-5" style={{ borderColor: "rgba(255,149,24,.28)", background: "rgba(255,149,24,.06)", color: "#e9b878" }}>
                Mode compatibilité actif : Toumaï affiche les conversations déjà journalisées pendant que la nouvelle route Baileys est propagée en production.
              </div>
            )}
          </div>

          <div className="h-[calc(100dvh-196px)] overflow-y-auto">
            {loadingList && [0, 1, 2, 3, 4, 5].map((index) => (
              <div key={index} className="mx-3 my-2 h-[72px] animate-pulse rounded-xl bg-white/[0.025]" />
            ))}

            {!loadingList && listError && (
              <div className="m-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                <div className="flex items-start gap-3">
                  <CircleAlert size={18} className="mt-0.5 shrink-0 text-red-300" />
                  <div>
                    <p className="text-sm font-semibold">Passerelle indisponible</p>
                    <p className="mt-1 text-xs leading-5 text-red-200/80">{listError}</p>
                    <button type="button" onClick={() => void loadConversations(query, filter)} className="mt-3 text-xs font-semibold text-red-200">Réessayer</button>
                  </div>
                </div>
              </div>
            )}

            {!loadingList && !listError && conversations.length === 0 && (
              <div className="px-6 py-12 text-center">
                <MessageCircle className="mx-auto" size={24} color={MUTED} />
                <p className="mt-3 text-sm font-medium">Aucune conversation</p>
                <p className="mt-1 text-xs" style={{ color: MUTED }}>Aucun résultat pour ce filtre.</p>
              </div>
            )}

            {!loadingList && !listError && conversations.map((conversation) => (
              <button
                type="button"
                key={conversation.id}
                onClick={() => chooseConversation(conversation)}
                className="flex w-full items-center gap-3 border-b px-4 py-3 text-left transition"
                style={{
                  borderColor: BORDER,
                  background: selected?.id === conversation.id ? "rgba(47,140,255,.08)" : "transparent",
                }}
              >
                <Avatar name={conversation.name} kind={conversation.kind} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-[13px] font-semibold">{conversation.name}</p>
                    <time className="shrink-0 text-[10px]" style={{ color: MUTED }}>{formatTime(conversation.last_message.timestamp_ms)}</time>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-[11px]" style={{ color: MUTED }}>
                      {conversation.last_message.from_me ? "Vous : " : ""}{conversation.last_message.text || "Message"}
                    </p>
                    {conversation.unread_count > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white" style={{ background: GREEN }}>
                        {Math.min(conversation.unread_count, 99)}
                      </span>
                    )}
                    {conversation.pending && conversation.unread_count === 0 && <span className="h-2 w-2 rounded-full" style={{ background: ORANGE }} />}
                  </div>
                </div>
              </button>
            ))}

            {!loadingList && !listError && hasMore && nextOffset !== null && (
              <div className="p-3">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => void loadConversations(query, filter, { append: true, offset: nextOffset })}
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

        <section className={`${selected ? "block" : "hidden lg:block"} min-w-0`}>
          {!selected ? (
            <div className="flex h-[calc(100dvh-70px)] items-center justify-center px-6 text-center">
              <div>
                <MessageCircle className="mx-auto" size={30} color={MUTED} />
                <h2 className="mt-4 text-lg font-semibold">Sélectionnez une conversation</h2>
                <p className="mt-2 text-sm" style={{ color: MUTED }}>L’historique est lu directement depuis la session WhatsApp liée.</p>
              </div>
            </div>
          ) : (
            <div className="flex h-[calc(100dvh-70px)] flex-col">
              <div className="flex min-h-[72px] items-center gap-3 border-b px-4 md:px-6" style={{ borderColor: BORDER, background: SURFACE }}>
                <button
                  type="button"
                  aria-label="Retour aux conversations"
                  onClick={backToConversationList}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl hover:bg-white/5 lg:hidden"
                  style={{ color: MUTED }}
                >
                  <ArrowLeft size={18} />
                </button>
                <Avatar name={selected.name} kind={selected.kind} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{selected.name}</p>
                  <p className="mt-0.5 truncate text-[11px]" style={{ color: MUTED }}>
                    {selected.number ? `+${selected.number}` : selected.kind === "group" ? "Groupe WhatsApp" : selected.id}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadThread(selected)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border hover:bg-white/5"
                  style={{ borderColor: BORDER, color: MUTED }}
                  aria-label="Actualiser la conversation"
                >
                  <RefreshCw size={16} className={loadingThread ? "animate-spin" : ""} />
                </button>
                <button
                  type="button"
                  onClick={() => setComposeOpen(true)}
                  className="flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-semibold text-white"
                  style={{ background: GREEN }}
                >
                  <Send size={15} /> Répondre
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-5 md:px-8">
                {threadSource === "autopilot-log" && !loadingThread && !threadError && (
                  <div className="mx-auto mb-4 max-w-3xl rounded-xl border px-3 py-2.5 text-[11px] leading-5" style={{ borderColor: "rgba(255,149,24,.28)", background: "rgba(255,149,24,.06)", color: "#e9b878" }}>
                    Historique partiel : seuls les échanges réellement journalisés par Toumaï sont affichés jusqu’à la promotion complète de l’historique Baileys.
                  </div>
                )}
                {loadingThread && <div className="mx-auto max-w-3xl space-y-3">{[0, 1, 2, 3].map((index) => <div key={index} className="h-16 animate-pulse rounded-2xl bg-white/[0.025]" />)}</div>}

                {!loadingThread && threadError && (
                  <div className="mx-auto max-w-2xl rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200">
                    {threadError}
                  </div>
                )}

                {!loadingThread && !threadError && messages.length === 0 && (
                  <div className="flex h-full items-center justify-center text-center">
                    <div>
                      <Clock3 className="mx-auto" size={24} color={MUTED} />
                      <p className="mt-3 text-sm font-medium">Aucun message disponible</p>
                      <p className="mt-1 text-xs" style={{ color: MUTED }}>La passerelle n’a renvoyé aucun historique pour cette conversation.</p>
                    </div>
                  </div>
                )}

                {!loadingThread && !threadError && messages.length > 0 && (
                  <div className="mx-auto flex max-w-3xl flex-col gap-2">
                    {messages.map((message, index) => (
                      <MessageBubble key={message.id || `${message.timestamp_ms}-${index}`} message={message} />
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t px-4 py-3 md:px-6" style={{ borderColor: BORDER, background: SURFACE }}>
                <button
                  type="button"
                  onClick={() => setComposeOpen(true)}
                  className="mx-auto flex h-12 w-full max-w-3xl items-center gap-3 rounded-xl border px-4 text-left text-sm"
                  style={{ borderColor: BORDER, background: RAISED, color: MUTED }}
                >
                  <Send size={17} />
                  Répondre à {selected.name}
                  <ChevronRight className="ml-auto" size={17} />
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      <WhatsAppComposeModal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        initialRecipient={selected?.id}
        initialName={selected?.name}
        onSent={() => {
          if (selected) window.setTimeout(() => void loadThread(selected), 700);
          void loadConversations(query, filter);
        }}
      />
    </div>
  );
}

function FilterButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg px-2 py-2 text-[11px] font-semibold transition"
      style={{ background: active ? SURFACE : "transparent", color: active ? TEXT : MUTED }}
    >
      {label}
    </button>
  );
}

function Avatar({ name, kind }: { name: string; kind: "contact" | "group" }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#123b2c]" style={{ color: GREEN }}>
      {kind === "group" ? <Users size={17} /> : <span className="text-[11px] font-bold">{initials(name)}</span>}
    </div>
  );
}

function MessageBubble({ message }: { message: WaLiveMessage }) {
  const when = message.timestamp_ms
    ? new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(message.timestamp_ms))
    : "";
  return (
    <div className={`flex ${message.from_me ? "justify-end" : "justify-start"}`}>
      <div
        className="max-w-[78%] rounded-2xl px-3.5 py-2.5 shadow-sm"
        style={{
          background: message.from_me ? "#0f543b" : RAISED,
          border: `1px solid ${message.from_me ? "rgba(8,200,117,.18)" : BORDER}`,
        }}
      >
        {!message.from_me && message.sender && <p className="mb-1 text-[10px] font-semibold" style={{ color: GREEN }}>{message.sender}</p>}
        <p className="whitespace-pre-wrap break-words text-[13px] leading-5">{message.text || `[${message.type}]`}</p>
        <div className="mt-1 flex items-center justify-end gap-1.5">
          <span className="text-[9px]" style={{ color: "#b1bec8" }}>{when}</span>
          {message.from_me && (message.status === "read" ? <CheckCheck size={13} color={BLUE} /> : <CheckCheck size={13} color="#aebac4" />)}
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
    return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(date);
  }
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(date);
}
