"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import {
  ArrowLeft,
  Trash2,
  Pin,
  MoreVertical,
  MailOpen,
  Mail,
  Loader2,
  Eraser,
  BellOff,
  Archive,
  Bot,
  BookOpen,
  Check,
  CheckCheck,
  SmilePlus,
  Reply,
  Pencil,
  Copy,
  CircleAlert,
  Info,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Paperclip,
  Plug,
  RefreshCw,
  Search,
  Send,
  Settings,
  SlidersHorizontal,
  Smile,
  Sparkles,
  Users,
  Workflow,
  X,
} from "lucide-react";

import { WhatsAppIcon } from "@/components/settings/BrandIcons";
import { WhatsAppAttachmentModal } from "@/components/whatsapp/WhatsAppAttachmentModal";
import { WhatsAppAudioRecorder } from "@/components/whatsapp/WhatsAppAudioRecorder";
import { WhatsAppComposeModal } from "@/components/whatsapp/WhatsAppComposeModal";
import { WhatsAppConversationActionModal, type ConversationActionRequest } from "@/components/whatsapp/WhatsAppConversationActionModal";
import { WhatsAppEmojiPicker } from "@/components/whatsapp/WhatsAppEmojiPicker";
import { useExigerCompte } from "@/hooks/useExigerCompte";
import { useWhatsAppRealtimeInvalidation } from "@/hooks/useWhatsAppRealtime";
import { useAuth } from "@/lib/auth-context";
import { errorMessage } from "@/lib/errors";
import {
  editWaMessage,
  getWaContactInfo,
  getWaConversationMessages,
  getWaLiveConversations,
  inferWaMediaType,
  reactWaMessage,
  searchWaConversation,
  sendWaManualMessage,
  sendWaReply,
  uploadWaAttachment,
  type WaContactInfo,
  type WaLiveConversation,
  type WaLiveMessage,
  type WaMediaType,
  type WaUploadedFile,
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
const WHATSAPP_NATIVE_EDIT_WINDOW_MS = 15 * 60 * 1000;

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
type KindFilter = "all" | "contact" | "group";

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
  const [replyDraft, setReplyDraft] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<WaLiveMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<WaLiveMessage | null>(null);
  const [correctionTarget, setCorrectionTarget] = useState<WaLiveMessage | null>(null);
  const [mediaCorrectionTarget, setMediaCorrectionTarget] = useState<WaLiveMessage | null>(null);
  const [localReactions, setLocalReactions] = useState<Record<string, string>>({});
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [threadSearchOpen, setThreadSearchOpen] = useState(false);
  const [threadSearchQuery, setThreadSearchQuery] = useState("");
  const [threadSearchResults, setThreadSearchResults] = useState<WaLiveMessage[]>([]);
  const [threadSearchLoading, setThreadSearchLoading] = useState(false);
  const [threadSearchError, setThreadSearchError] = useState<string | null>(null);
  const [contactInfoOpen, setContactInfoOpen] = useState(false);
  const [contactInfo, setContactInfo] = useState<WaContactInfo | null>(null);
  const [contactInfoLoading, setContactInfoLoading] = useState(false);
  const [contactInfoError, setContactInfoError] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentUploaded, setAttachmentUploaded] = useState<WaUploadedFile | null>(null);
  const [attachmentType, setAttachmentType] = useState<WaMediaType | null>(null);
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [conversationMenuOpen, setConversationMenuOpen] = useState(false);
  const [muteMenuOpen, setMuteMenuOpen] = useState(false);
  const [actionRequest, setActionRequest] = useState<ConversationActionRequest | null>(null);

  const visibleMessages = useMemo(
    () =>
      messages
        .map((message) => ({ ...message, text: safeWhatsAppVisibleText(message.text) || "" }))
        .filter((message) => Boolean(message.text) || message.type !== "text"),
    [messages],
  );

  const visibleSearchResults = useMemo(
    () =>
      threadSearchResults
        .map((message) => ({ ...message, text: safeWhatsAppVisibleText(message.text) || "" }))
        .filter((message) => Boolean(message.text) || message.type !== "text"),
    [threadSearchResults],
  );

  const displayedMessages =
    threadSearchOpen && threadSearchQuery.trim()
      ? visibleSearchResults
      : visibleMessages;

  const unreadCount = useMemo(
    () => conversations.filter((conversation) => conversation.unread_count > 0).length,
    [conversations],
  );
  const pendingCount = useMemo(
    () => conversations.filter((conversation) => conversation.pending).length,
    [conversations],
  );

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
        kind: kindFilter === "all" ? undefined : kindFilter,
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
  }, [kindFilter]);

  const loadThread = useCallback(async (
    conversation: WaLiveConversation,
    options: { silent?: boolean } = {},
  ) => {
    const silent = Boolean(options.silent);
    if (!silent) {
      setLoadingThread(true);
      setThreadError(null);
    }
    try {
      const data = await getWaConversationMessages(conversation.id, 120);
      setMessages(data.messages);
      if (!silent) setThreadError(null);
    } catch (error) {
      // Une resynchronisation de fond ne doit jamais faire disparaître un fil
      // déjà visible ni démonter ses contrôles pendant une interaction.
      if (!silent) {
        setMessages([]);
        setThreadError(errorMessage(error, "history"));
      }
    } finally {
      if (!silent) setLoadingThread(false);
    }
  }, []);

  const refreshRealtimeConversations = useCallback(async () => {
    await loadConversations(query, filter);
    if (selected) await loadThread(selected, { silent: true });
  }, [filter, loadConversations, loadThread, query, selected]);

  useWhatsAppRealtimeInvalidation({
    enabled: Boolean(session),
    refreshOverview: () => undefined,
    refreshConversations: refreshRealtimeConversations,
    refreshAutomations: () => undefined,
    refreshConnection: () => undefined,
  });

  const runThreadSearch = useCallback(async () => {
    if (!selected || !threadSearchQuery.trim()) {
      setThreadSearchResults([]);
      setThreadSearchError(null);
      return;
    }
    setThreadSearchLoading(true);
    setThreadSearchError(null);
    try {
      const data = await searchWaConversation(
        selected.id,
        threadSearchQuery.trim(),
        60,
      );
      setThreadSearchResults(data.messages);
    } catch (error) {
      setThreadSearchResults([]);
      setThreadSearchError(errorMessage(error, "history"));
    } finally {
      setThreadSearchLoading(false);
    }
  }, [selected, threadSearchQuery]);

  const openContactInfo = useCallback(async () => {
    if (!selected || selected.kind !== "contact") return;
    setContactInfoOpen(true);
    setContactInfoLoading(true);
    setContactInfoError(null);
    try {
      const data = await getWaContactInfo(selected.id);
      setContactInfo(data);
    } catch (error) {
      setContactInfo(null);
      setContactInfoError(errorMessage(error, "history"));
    } finally {
      setContactInfoLoading(false);
    }
  }, [selected]);

  useEffect(() => {
    if (!threadSearchOpen || !threadSearchQuery.trim()) return;
    const timer = window.setTimeout(() => {
      void runThreadSearch();
    }, 220);
    return () => window.clearTimeout(timer);
  }, [threadSearchOpen, threadSearchQuery, runThreadSearch]);

  useEffect(() => {
    if (!session) return;
    const timer = window.setTimeout(() => {
      void loadConversations(query, filter);
    }, query ? 220 : 0);
    return () => window.clearTimeout(timer);
  }, [session, query, filter, kindFilter, loadConversations]);

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
    const timer = window.setTimeout(() => {
      void loadThread(selected);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selected, session, loadThread]);

  useEffect(() => {
    if (!session || typeof window === "undefined") return;

    const refreshThreadAndList = () => {
      if (document.visibilityState === "hidden") return;
      void refreshRealtimeConversations();
    };
    const refreshListOnly = () => {
      if (document.visibilityState === "hidden") return;
      void loadConversations(query, filter);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshThreadAndList();
    };

    // Le polling de secours ne remonte que la liste. Recharger tout le fil
    // toutes les 30 s détachait les contrôles interactifs (picker de réaction,
    // menu de message) en plein clic. Le fil actif reste temps réel via SSE,
    // puis se resynchronise au focus, au retour réseau et au retour d'onglet.
    const interval = window.setInterval(refreshListOnly, 30_000);
    window.addEventListener("online", refreshThreadAndList);
    window.addEventListener("focus", refreshThreadAndList);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("online", refreshThreadAndList);
      window.removeEventListener("focus", refreshThreadAndList);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [filter, loadConversations, query, session, refreshRealtimeConversations]);

  function chooseConversation(conversation: WaLiveConversation) {
    setReplyDraft("");
    setMessages([]);
    setThreadSearchOpen(false);
    setThreadSearchQuery("");
    setThreadSearchResults([]);
    setContactInfoOpen(false);
    setContactInfo(null);
    setEmojiOpen(false);
    setConversationMenuOpen(false);
    setMuteMenuOpen(false);
    setActionRequest(null);
    setAttachmentError(null);
    setSendError(null);
    setReplyingTo(null);
    setEditingMessage(null);
    setCorrectionTarget(null);
    setLocalReactions({});
    closeAttachmentReview();
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
    setThreadSearchOpen(false);
    setThreadSearchQuery("");
    setThreadSearchResults([]);
    setContactInfoOpen(false);
    setContactInfo(null);
    setEmojiOpen(false);
    setConversationMenuOpen(false);
    setMuteMenuOpen(false);
    setActionRequest(null);
    setAttachmentError(null);
    setSendError(null);
    setReplyingTo(null);
    setEditingMessage(null);
    setCorrectionTarget(null);
    setLocalReactions({});
    closeAttachmentReview();
    if (typeof window !== "undefined") {
      const next = new URL(window.location.href);
      next.searchParams.delete("chat");
      window.history.replaceState(null, "", next);
    }
  }

  function openNewMessage() {
    setComposeOpen(true);
  }

  async function sendCurrentMessage() {
    if (!selected || !replyDraft.trim() || sendingMessage) return;
    const text = replyDraft.trim();
    const replyTarget = replyingTo;
    const editTarget = editingMessage;

    setSendingMessage(true);
    setSendError(null);
    setEmojiOpen(false);

    if (editTarget) {
      try {
        await editWaMessage({
          chat_id: selected.id,
          msg_id: editTarget.id,
          new_text: text,
        });
        setMessages((current) =>
          current.map((message) =>
            message.id === editTarget.id ? { ...message, text } : message,
          ),
        );
        setReplyDraft("");
        setEditingMessage(null);
        setCorrectionTarget(null);
        window.setTimeout(() => void loadThread(selected, { silent: true }), 350);
      } catch (error) {
        if (isWaNativeEditExpired(editTarget)) {
          setEditingMessage(null);
          setReplyingTo(editTarget);
          setCorrectionTarget(editTarget);
          setReplyDraft(text);
          setSendError(
            "La fenêtre d’édition native WhatsApp est terminée. Votre texte est prêt à partir comme correction liée au message original.",
          );
        } else {
          setSendError(errorMessage(error, "generic"));
        }
      } finally {
        setSendingMessage(false);
      }
      return;
    }

    const localId = `local-${Date.now()}`;
    const optimistic: WaLiveMessage = {
      id: localId,
      chat_id: selected.id,
      text,
      from_me: true,
      sender: "",
      sender_jid: "",
      type: "text",
      timestamp_ms: Date.now(),
      status: "sending",
      quoted: replyTarget
        ? {
            id: replyTarget.id,
            text: replyTarget.text,
            sender: replyTarget.sender,
          }
        : null,
    };
    setMessages((current) => [...current, optimistic]);
    setReplyDraft("");
    setReplyingTo(null);

    try {
      const response = replyTarget
        ? await sendWaReply({
            chat_id: selected.id,
            msg_id: replyTarget.id,
            message: text,
            original_text: replyTarget.text,
            original_sender: replyTarget.sender_jid || "",
          })
        : await sendWaManualMessage({
            to: selected.id,
            message: text,
            chat_name: displayConversationName(selected),
          });

      setMessages((current) =>
        current.map((message) =>
          message.id === localId
            ? {
                ...message,
                id: response.msg_id || localId,
                status: response.status || "accepted",
              }
            : message,
        ),
      );
      setCorrectionTarget(null);
      void loadConversations(query, filter);
      window.setTimeout(() => void loadThread(selected, { silent: true }), 450);
    } catch (error) {
      setMessages((current) =>
        current.map((message) =>
          message.id === localId ? { ...message, status: "failed" } : message,
        ),
      );
      setReplyDraft(text);
      setReplyingTo(replyTarget);
      setSendError(errorMessage(error, "generic"));
    } finally {
      setSendingMessage(false);
    }
  }

  function startReply(message: WaLiveMessage) {
    setEditingMessage(null);
    setCorrectionTarget(null);
    setMediaCorrectionTarget(null);
    setReplyingTo(message);
    setReplyDraft("");
    setSendError(null);
    window.setTimeout(() => composerRef.current?.focus(), 0);
  }

  function startEdit(message: WaLiveMessage) {
    if (!message.from_me) return;

    if (!isTextMessageType(message.type)) {
      setEditingMessage(null);
      setReplyingTo(message);
      setCorrectionTarget(message);
      setMediaCorrectionTarget(message);
      setReplyDraft("");
      setSendError(null);
      window.setTimeout(() => composerRef.current?.focus(), 0);
      return;
    }

    if (!message.text) return;

    if (isWaNativeEditExpired(message)) {
      setEditingMessage(null);
      setReplyingTo(message);
      setCorrectionTarget(message);
      setMediaCorrectionTarget(null);
      setReplyDraft(message.text);
      setSendError(null);
      window.setTimeout(() => composerRef.current?.focus(), 0);
      return;
    }

    setReplyingTo(null);
    setCorrectionTarget(null);
    setMediaCorrectionTarget(null);
    setEditingMessage(message);
    setReplyDraft(message.text);
    setSendError(null);
    window.setTimeout(() => composerRef.current?.focus(), 0);
  }

  async function reactToMessage(message: WaLiveMessage, emoji: string) {
    if (!selected || !message.id) return;
    setSendError(null);
    setLocalReactions((current) => ({ ...current, [message.id]: emoji }));
    try {
      await reactWaMessage({
        chat_id: selected.id,
        msg_id: message.id,
        emoji,
      });
    } catch (error) {
      setLocalReactions((current) => {
        const next = { ...current };
        delete next[message.id];
        return next;
      });
      setSendError(errorMessage(error, "generic"));
    }
  }

  async function copyMessage(message: WaLiveMessage) {
    if (!message.text || typeof navigator === "undefined") return;
    try {
      await navigator.clipboard.writeText(message.text);
    } catch {
      setSendError("Impossible de copier ce message.");
    }
  }

  async function prepareAttachment(file: File) {
    if (!selected || attachmentUploading) return;
    if (file.size > 100 * 1024 * 1024) {
      setAttachmentError("Fichier trop volumineux (100 Mo maximum).");
      return;
    }

    setAttachmentUploading(true);
    setAttachmentError(null);
    setEmojiOpen(false);
    try {
      const uploaded = await uploadWaAttachment(file);
      setAttachmentFile(file);
      setAttachmentUploaded(uploaded);
      setAttachmentType(inferWaMediaType(file));
      setAttachmentOpen(true);
    } catch (error) {
      setAttachmentError(errorMessage(error, "generic"));
    } finally {
      setAttachmentUploading(false);
    }
  }

  async function handleAttachmentSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    event.currentTarget.value = "";
    if (file) await prepareAttachment(file);
  }

  function prepareConversationAction(request: ConversationActionRequest) {
    setConversationMenuOpen(false);
    setMuteMenuOpen(false);
    setActionRequest(request);
  }

  function closeAttachmentReview() {
    setAttachmentOpen(false);
    setAttachmentFile(null);
    setAttachmentUploaded(null);
    setAttachmentType(null);
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
                <div className="relative">
                  <button
                    type="button"
                    title="Filtrer les conversations"
                    aria-label="Filtres avancés"
                    aria-expanded={advancedFiltersOpen}
                    onClick={() => setAdvancedFiltersOpen((value) => !value)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition hover:bg-white/[0.04]"
                    style={{
                      borderColor: kindFilter === "all" ? BORDER : "rgba(8,200,117,.45)",
                      background: RAISED,
                      color: kindFilter === "all" ? MUTED : GREEN,
                    }}
                  >
                    <SlidersHorizontal size={17} />
                  </button>
                  {advancedFiltersOpen && (
                    <div
                      className="absolute right-0 top-12 z-30 w-44 rounded-xl border p-1.5 shadow-2xl"
                      style={{ borderColor: BORDER, background: "#111f2a" }}
                    >
                      {([
                        ["all", "Toutes"],
                        ["contact", "Contacts"],
                        ["group", "Groupes"],
                      ] as const).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            setKindFilter(value);
                            setAdvancedFiltersOpen(false);
                          }}
                          className="flex h-9 w-full items-center justify-between rounded-lg px-3 text-left text-xs transition hover:bg-white/[0.05]"
                          style={{ color: kindFilter === value ? TEXT : MUTED }}
                        >
                          <span>{label}</span>
                          {kindFilter === value && <Check size={14} color={GREEN} />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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

          <section className={`${selected ? "flex" : "hidden lg:flex"} relative min-h-0 min-w-0 flex-col`} style={{ background: PAGE_BG }}>
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
                    title="Rechercher dans la conversation"
                    aria-label="Rechercher dans la conversation"
                    aria-expanded={threadSearchOpen}
                    onClick={() => {
                      setThreadSearchOpen((value) => !value);
                      setThreadSearchQuery("");
                      setThreadSearchResults([]);
                      setThreadSearchError(null);
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border transition hover:bg-white/[0.04]"
                    style={{
                      borderColor: threadSearchOpen ? "rgba(8,200,117,.45)" : BORDER,
                      background: RAISED,
                      color: threadSearchOpen ? GREEN : MUTED,
                    }}
                  >
                    <Search size={17} />
                  </button>
                  {selected.kind === "contact" && (
                    <button
                      type="button"
                      title="Informations du contact"
                      aria-label="Informations du contact"
                      aria-expanded={contactInfoOpen}
                      onClick={() => {
                        if (contactInfoOpen) setContactInfoOpen(false);
                        else void openContactInfo();
                      }}
                      className="hidden h-10 w-10 items-center justify-center rounded-xl border transition hover:bg-white/[0.04] sm:flex"
                      style={{
                        borderColor: contactInfoOpen ? "rgba(8,200,117,.45)" : BORDER,
                        background: RAISED,
                        color: contactInfoOpen ? GREEN : MUTED,
                      }}
                    >
                      <Info size={17} />
                    </button>
                  )}
                  <div className="relative">
                    <button
                      type="button"
                      title="Plus d’options"
                      aria-label="Plus d’options"
                      aria-expanded={conversationMenuOpen}
                      onClick={() => {
                        setConversationMenuOpen((value) => !value);
                        setMuteMenuOpen(false);
                      }}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border transition hover:bg-white/[0.04]"
                      style={{
                        borderColor: conversationMenuOpen ? "rgba(8,200,117,.45)" : BORDER,
                        background: RAISED,
                        color: conversationMenuOpen ? GREEN : MUTED,
                      }}
                    >
                      <MoreVertical size={17} />
                    </button>

                    {conversationMenuOpen && (
                      <div
                        className="absolute right-0 top-11 z-40 w-56 rounded-xl border p-1.5 shadow-2xl"
                        style={{ borderColor: BORDER, background: "#111f2a" }}
                      >
                        <ConversationMenuItem icon={<Archive size={15} />} label="Archiver" onClick={() => prepareConversationAction({ action: "archive" })} />
                        <ConversationMenuItem icon={<Pin size={15} />} label="Épingler" onClick={() => prepareConversationAction({ action: "pin" })} />

                        <div className="relative">
                          <ConversationMenuItem
                            icon={<BellOff size={15} />}
                            label="Mettre en sourdine"
                            onClick={() => setMuteMenuOpen((value) => !value)}
                          />
                          {muteMenuOpen && (
                            <div
                              className="absolute right-full top-0 mr-1 w-36 rounded-xl border p-1.5 shadow-2xl"
                              style={{ borderColor: BORDER, background: "#111f2a" }}
                            >
                              {([
                                ["8h", "8 heures"],
                                ["1j", "1 jour"],
                                ["7j", "7 jours"],
                                ["always", "Toujours"],
                              ] as const).map(([duration, label]) => (
                                <button
                                  key={duration}
                                  type="button"
                                  onClick={() => prepareConversationAction({ action: "mute", duration })}
                                  className="flex h-9 w-full items-center rounded-lg px-3 text-left text-xs hover:bg-white/[0.05]"
                                  style={{ color: MUTED }}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="my-1 h-px" style={{ background: BORDER }} />
                        <ConversationMenuItem icon={<MailOpen size={15} />} label="Marquer comme lue" onClick={() => prepareConversationAction({ action: "mark_read" })} />
                        <ConversationMenuItem icon={<Mail size={15} />} label="Marquer comme non lue" onClick={() => prepareConversationAction({ action: "mark_unread" })} />

                        <div className="my-1 h-px" style={{ background: BORDER }} />
                        <ConversationMenuItem icon={<Eraser size={15} />} label="Vider la conversation" danger onClick={() => prepareConversationAction({ action: "clear" })} />
                        <ConversationMenuItem icon={<Trash2 size={15} />} label="Supprimer la conversation" danger onClick={() => prepareConversationAction({ action: "delete" })} />
                      </div>
                    )}
                  </div>
                </div>

                {threadSearchOpen && (
                  <div className="border-b px-4 py-2.5 md:px-5" style={{ borderColor: BORDER, background: SURFACE }}>
                    <div className="mx-auto flex max-w-[980px] items-center gap-2">
                      <div className="relative min-w-0 flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2" size={15} color={MUTED} />
                        <input
                          autoFocus
                          value={threadSearchQuery}
                          onChange={(event) => setThreadSearchQuery(event.target.value)}
                          placeholder="Rechercher dans cette conversation…"
                          className="h-10 w-full rounded-xl border bg-transparent pl-9 pr-3 text-xs outline-none focus:border-[#2f8cff]"
                          style={{ borderColor: BORDER, background: RAISED }}
                        />
                      </div>
                      <button
                        type="button"
                        aria-label="Fermer la recherche"
                        onClick={() => {
                          setThreadSearchOpen(false);
                          setThreadSearchQuery("");
                          setThreadSearchResults([]);
                          setThreadSearchError(null);
                        }}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border"
                        style={{ borderColor: BORDER, color: MUTED }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="mx-auto mt-1 max-w-[980px] px-1 text-[10px]" style={{ color: MUTED }}>
                      {threadSearchLoading
                        ? "Recherche…"
                        : threadSearchError
                          ? threadSearchError
                          : threadSearchQuery.trim()
                            ? `${visibleSearchResults.length} résultat${visibleSearchResults.length > 1 ? "s" : ""}`
                            : "Saisissez un mot ou une expression."}
                    </div>
                  </div>
                )}

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

                  {!loadingThread && !threadError && displayedMessages.length === 0 && (
                    <div className="flex min-h-[360px] items-center justify-center text-center">
                      <div>
                        <MessageCircle className="mx-auto" size={26} color={FAINT} />
                        <p className="mt-3 text-sm font-medium">
                          {threadSearchOpen && threadSearchQuery.trim()
                            ? "Aucun résultat"
                            : "Aucun message pour le moment"}
                        </p>
                      </div>
                    </div>
                  )}

                  {!loadingThread && !threadError && displayedMessages.length > 0 && (
                    <div className="mx-auto w-full max-w-[980px]">
                      <ThreadMessages
                        messages={displayedMessages}
                        reactions={localReactions}
                        onReply={startReply}
                        onEdit={startEdit}
                        onReact={(message, emoji) => void reactToMessage(message, emoji)}
                        onCopy={(message) => void copyMessage(message)}
                      />
                    </div>
                  )}
                </div>

                {contactInfoOpen && selected.kind === "contact" && (
                  <div
                    className="absolute right-3 top-[84px] z-30 w-[min(340px,calc(100%-24px))] rounded-2xl border p-4 shadow-2xl md:right-5"
                    style={{ borderColor: BORDER, background: "#0f1d27" }}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar
                        name={contactInfo?.name || displayConversationName(selected)}
                        kind="contact"
                        size="lg"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {contactInfo?.name || displayConversationName(selected)}
                        </p>
                        {contactInfo?.phone && (
                          <p className="mt-0.5 text-xs" style={{ color: MUTED }}>
                            {contactInfo.phone}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        aria-label="Fermer les informations"
                        onClick={() => setContactInfoOpen(false)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg"
                        style={{ color: MUTED }}
                      >
                        <X size={15} />
                      </button>
                    </div>

                    {contactInfoLoading && (
                      <div className="mt-4 h-16 animate-pulse rounded-xl bg-white/[0.035]" />
                    )}
                    {!contactInfoLoading && contactInfoError && (
                      <p className="mt-4 text-xs leading-5 text-red-200">{contactInfoError}</p>
                    )}
                    {!contactInfoLoading && !contactInfoError && contactInfo && (
                      <div className="mt-4 space-y-3 text-xs">
                        {contactInfo.about && (
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: FAINT }}>
                              À propos
                            </p>
                            <p className="mt-1 leading-5" style={{ color: MUTED }}>{contactInfo.about}</p>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {contactInfo.on_whatsapp === true && (
                            <span className="rounded-full px-2.5 py-1" style={{ background: "rgba(8,200,117,.10)", color: GREEN }}>
                              Compte WhatsApp
                            </span>
                          )}
                          {contactInfo.is_business && (
                            <span className="rounded-full px-2.5 py-1" style={{ background: "rgba(47,140,255,.10)", color: "#74afff" }}>
                              Entreprise
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

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
                    </div>
                  </div>
                </div>

                <div className="px-3 pb-3 md:px-5" style={{ background: SURFACE }}>
                  <div className="mx-auto max-w-[980px]">
                    {(replyingTo || editingMessage) && (
                      <div
                        className="mb-2 flex items-start gap-3 rounded-xl border px-3 py-2.5"
                        style={{ borderColor: "rgba(8,200,117,.28)", background: "rgba(8,200,117,.06)" }}
                      >
                        <div className="mt-0.5" style={{ color: GREEN }}>
                          {editingMessage ? <Pencil size={15} /> : <Reply size={15} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-semibold" style={{ color: GREEN }}>
                            {editingMessage
                              ? "Modifier votre message"
                              : correctionTarget
                                ? "Corriger un ancien message"
                                : "Répondre à ce message"}
                          </p>
                          <p className="mt-0.5 truncate text-[11px]" style={{ color: MUTED }}>
                            {(editingMessage || replyingTo)?.text || messageTypeLabel((editingMessage || replyingTo)?.type || "text")}
                          </p>
                          {correctionTarget && (
                            <p className="mt-1 text-[10px] leading-4" style={{ color: FAINT }}>
                              WhatsApp limite l’édition native à 15 minutes. La correction sera envoyée comme réponse liée à l’original, sans prétendre avoir modifié l’ancien message.
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          aria-label="Annuler"
                          onClick={() => {
                            setReplyingTo(null);
                            setEditingMessage(null);
                            setCorrectionTarget(null);
                            setReplyDraft("");
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/[0.05]"
                          style={{ color: MUTED }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}

                    <div
                      className="relative flex items-end gap-2 rounded-[16px] border p-2"
                      style={{
                        borderColor: dragActive
                          ? "rgba(8,200,117,.75)"
                          : sendError
                            ? "rgba(255,107,107,.45)"
                            : BORDER,
                        background: dragActive ? "rgba(8,200,117,.055)" : RAISED,
                      }}
                      onDragEnter={(event) => {
                        event.preventDefault();
                        setDragActive(true);
                      }}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setDragActive(true);
                      }}
                      onDragLeave={(event) => {
                        event.preventDefault();
                        if (event.currentTarget === event.target) setDragActive(false);
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        setDragActive(false);
                        const file = event.dataTransfer.files?.[0];
                        if (file) void prepareAttachment(file);
                      }}
                    >
                      {dragActive && (
                        <div
                          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-[16px] border border-dashed text-[11px] font-semibold"
                          style={{ borderColor: GREEN, background: "rgba(6,17,26,.90)", color: GREEN }}
                        >
                          Déposez le fichier ici
                        </div>
                      )}
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          aria-label="Emoji"
                          title="Ajouter un emoji"
                          aria-expanded={emojiOpen}
                          onClick={() => setEmojiOpen((value) => !value)}
                          className="flex h-10 w-10 items-center justify-center rounded-xl transition hover:bg-white/[0.04]"
                          style={{ color: emojiOpen ? GREEN : MUTED }}
                        >
                          <Smile size={19} />
                        </button>
                        {emojiOpen && (
                          <div
                            className="absolute bottom-12 left-0 z-40 w-[min(350px,calc(100vw-32px))] overflow-hidden rounded-2xl border shadow-2xl"
                            style={{ borderColor: BORDER, background: "#111f2a" }}
                          >
                            <WhatsAppEmojiPicker
                              onPick={(emoji) => {
                                setReplyDraft((current) => (current + emoji).slice(0, 4096));
                              }}
                            />
                          </div>
                        )}
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        aria-label="Sélectionner une pièce jointe"
                        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
                        onChange={(event) => void handleAttachmentSelected(event)}
                      />
                      <button
                        type="button"
                        aria-label="Joindre un fichier"
                        title="Joindre un fichier"
                        disabled={attachmentUploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition hover:bg-white/[0.04] disabled:opacity-45"
                        style={{ color: MUTED }}
                      >
                        {attachmentUploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={19} />}
                      </button>

                      <WhatsAppAudioRecorder
                        disabled={attachmentUploading || sendingMessage}
                        onRecorded={prepareAttachment}
                        onError={(message) => setAttachmentError(message)}
                      />

                      <textarea
                        ref={composerRef}
                        value={replyDraft}
                        onChange={(event) => {
                          setReplyDraft(event.target.value.slice(0, 4096));
                          if (sendError) setSendError(null);
                        }}
                        onPaste={(event) => {
                          const file = event.clipboardData.files?.[0];
                          if (file) {
                            event.preventDefault();
                            void prepareAttachment(file);
                          }
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey && replyDraft.trim() && !sendingMessage) {
                            event.preventDefault();
                            void sendCurrentMessage();
                          }
                        }}
                        placeholder={editingMessage ? "Modifier le message…" : replyingTo ? "Écrire votre réponse…" : "Écrire un message…"}
                        rows={1}
                        className="min-h-10 max-h-32 min-w-0 flex-1 resize-none bg-transparent px-1 py-2.5 text-[13px] leading-5 outline-none"
                      />

                      <button
                        type="button"
                        disabled={!replyDraft.trim() || sendingMessage}
                        onClick={() => void sendCurrentMessage()}
                        aria-label={editingMessage ? "Enregistrer la modification" : "Envoyer le message"}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-[0_8px_28px_rgba(8,200,117,.18)] disabled:cursor-not-allowed disabled:opacity-35"
                        style={{ background: GREEN }}
                      >
                        {sendingMessage ? <Loader2 size={18} className="animate-spin" /> : editingMessage ? <Check size={18} /> : <Send size={18} />}
                      </button>
                    </div>
                    {(attachmentError || sendError) && (
                      <p className="mt-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-[11px] text-red-300">
                        {sendError || attachmentError}
                      </p>
                    )}
                    <div className="mt-1.5 flex items-center justify-end px-1 text-[9px]" style={{ color: FAINT }}>
                      <span>{replyDraft.length}/4096 · Entrée pour envoyer · Maj+Entrée pour une nouvelle ligne</span>
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
        onSent={() => {
          if (selected) window.setTimeout(() => void loadThread(selected), 700);
          void loadConversations(query, filter);
        }}
      />

      <WhatsAppAttachmentModal
        key={attachmentUploaded?.url || "wa-attachment"}
        open={attachmentOpen}
        conversation={selected}
        file={attachmentFile}
        uploaded={attachmentUploaded}
        mediaType={attachmentType}
        onClose={closeAttachmentReview}
        onSent={() => {
          setAttachmentError(null);
          if (selected) window.setTimeout(() => void loadThread(selected), 700);
          void loadConversations(query, filter);
        }}
      />

      <WhatsAppConversationActionModal
        key={actionRequest ? `${selected?.id || "chat"}:${actionRequest.action}:${actionRequest.duration || ""}` : "wa-action"}
        open={Boolean(actionRequest)}
        conversation={selected}
        request={actionRequest}
        onClose={() => setActionRequest(null)}
        onApplied={(action) => {
          void loadConversations(query, filter);
          if (action === "archive" || action === "delete") {
            backToConversationList();
          } else if (selected) {
            window.setTimeout(() => void loadThread(selected), 300);
          }
        }}
      />
    </div>
  );
}

function ConversationMenuItem({
  icon,
  label,
  danger = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-left text-xs transition hover:bg-white/[0.05]"
      style={{ color: danger ? "#ff9d9d" : MUTED }}
    >
      {icon}
      <span>{label}</span>
    </button>
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

function ThreadMessages({
  messages,
  reactions,
  onReply,
  onEdit,
  onReact,
  onCopy,
}: {
  messages: WaLiveMessage[];
  reactions: Record<string, string>;
  onReply: (message: WaLiveMessage) => void;
  onEdit: (message: WaLiveMessage) => void;
  onReact: (message: WaLiveMessage, emoji: string) => void;
  onCopy: (message: WaLiveMessage) => void;
}) {
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
            <MessageBubble
              key={message.id || `${message.timestamp_ms}-${index}`}
              message={message}
              reaction={message.id ? reactions[message.id] : undefined}
              onReply={() => onReply(message)}
              onEdit={() => onEdit(message)}
              onReact={(emoji) => onReact(message, emoji)}
              onCopy={() => onCopy(message)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function MessageBubble({
  message,
  reaction,
  onReply,
  onEdit,
  onReact,
  onCopy,
}: {
  message: WaLiveMessage;
  reaction?: string;
  onReply: () => void;
  onEdit: () => void;
  onReact: (emoji: string) => void;
  onCopy: () => void;
}) {
  const [reactionOpen, setReactionOpen] = useState(false);
  const when = message.timestamp_ms
    ? new Intl.DateTimeFormat("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(message.timestamp_ms))
    : "";
  const hasMedia = message.type !== "text";
  const mediaTitle = message.file_name || messageTypeLabel(message.type);

  return (
    <div
      className={`group flex ${message.from_me ? "justify-end" : "justify-start"}`}
      data-message-id={message.id || undefined}
      data-message-direction={message.from_me ? "outbound" : "inbound"}
    >
      <div className="relative max-w-[88%] sm:max-w-[76%] lg:max-w-[66%]">
        <div
          className="rounded-[14px] px-3.5 py-2.5 shadow-[0_6px_20px_rgba(0,0,0,.10)]"
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

          {message.quoted && (message.quoted.text || message.quoted.id) && (
            <div
              className="mb-2 rounded-lg border-l-2 px-2.5 py-2 text-[10px] leading-4"
              style={{ borderColor: GREEN, background: "rgba(0,0,0,.16)", color: "#c6d1d8" }}
            >
              <p className="truncate font-semibold" style={{ color: GREEN }}>
                {message.quoted.sender && !isTechnicalWhatsAppIdentity(message.quoted.sender)
                  ? message.quoted.sender
                  : "Message cité"}
              </p>
              <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap break-words">
                {message.quoted.text || "Message"}
              </p>
            </div>
          )}

          {hasMedia && (
            <div
              className="mb-2 flex min-w-[190px] items-center gap-3 rounded-xl border px-3 py-2.5"
              style={{ borderColor: "rgba(255,255,255,.07)", background: "rgba(0,0,0,.12)" }}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.05]" style={{ color: GREEN }}>
                <Paperclip size={16} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold">{mediaTitle}</p>
                <p className="mt-0.5 text-[9px]" style={{ color: "#9eacb7" }}>
                  {[message.mime_type, formatDuration(message.duration_seconds)].filter(Boolean).join(" · ") || messageTypeLabel(message.type)}
                </p>
              </div>
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

        {reaction && (
          <span
            className={`absolute -bottom-3 ${message.from_me ? "right-2" : "left-2"} rounded-full border px-1.5 py-0.5 text-[12px] shadow`}
            style={{ borderColor: BORDER, background: "#10202b" }}
          >
            {reaction}
          </span>
        )}

        <div
          className={`mt-1 flex items-center gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 ${message.from_me ? "justify-end" : "justify-start"}`}
        >
          <MessageActionButton label="Répondre" icon={<Reply size={13} />} onClick={onReply} />
          <div className="relative">
            <MessageActionButton
              label="Réagir"
              icon={<SmilePlus size={13} />}
              onClick={() => setReactionOpen((value) => !value)}
            />
            {reactionOpen && (
              <div
                className={`absolute bottom-8 z-30 flex gap-1 rounded-full border p-1.5 shadow-2xl ${message.from_me ? "right-0" : "left-0"}`}
                style={{ borderColor: BORDER, background: "#111f2a" }}
              >
                {["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    aria-label={`Réagir avec ${emoji}`}
                    onClick={() => {
                      onReact(emoji);
                      setReactionOpen(false);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[16px] transition hover:bg-white/[0.08]"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
          {message.text && (
            <MessageActionButton label="Copier" icon={<Copy size={13} />} onClick={onCopy} />
          )}
          {message.from_me && message.type === "text" && message.text && !message.id.startsWith("local-") && (
            <MessageActionButton
              label={isWaNativeEditExpired(message) ? "Corriger" : "Modifier"}
              icon={<Pencil size={13} />}
              onClick={onEdit}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function MessageActionButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-7 items-center gap-1 rounded-lg px-2 text-[9px] transition hover:bg-white/[0.05]"
      style={{ color: MUTED }}
    >
      {icon}
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}

function DeliveryMark({ status }: { status?: string | null }) {
  if (status === "sending") {
    return <Loader2 size={11} className="animate-spin" color="#afbdc7" aria-label="Envoi en cours" />;
  }
  if (status === "failed") {
    return <CircleAlert size={12} color="#ff7d7d" aria-label="Échec" />;
  }
  if (status === "read" || status === "played") {
    return <CheckCheck size={12} color="#53bdeb" aria-label="Lu" />;
  }
  if (status === "delivered") {
    return <CheckCheck size={12} color="#afbdc7" aria-label="Livré" />;
  }
  return <Check size={12} color="#afbdc7" aria-label="Envoyé" />;
}

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return "";
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
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

function isWaNativeEditExpired(message: WaLiveMessage) {
  if (!message.timestamp_ms) return false;
  return Date.now() - message.timestamp_ms >= WHATSAPP_NATIVE_EDIT_WINDOW_MS;
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
