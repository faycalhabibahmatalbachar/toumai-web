"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowDown,
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
  Star,
  Download,
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
import { WhatsAppAttachmentMenu, type WhatsAppAttachmentChoice } from "@/components/whatsapp/WhatsAppAttachmentMenu";
import { WhatsAppAttachmentModal } from "@/components/whatsapp/WhatsAppAttachmentModal";
import { WhatsAppAudioRecorder } from "@/components/whatsapp/WhatsAppAudioRecorder";
import { WhatsAppPendingVoiceList, type PendingWhatsAppVoice } from "@/components/whatsapp/WhatsAppPendingVoiceList";
import { WhatsAppComposeModal } from "@/components/whatsapp/WhatsAppComposeModal";
import { WhatsAppConversationActionModal, type ConversationActionRequest } from "@/components/whatsapp/WhatsAppConversationActionModal";
import { WhatsAppContactShareModal } from "@/components/whatsapp/WhatsAppContactShareModal";
import { WhatsAppEmojiPicker } from "@/components/whatsapp/WhatsAppEmojiPicker";
import { WhatsAppMessageInfoModal } from "@/components/whatsapp/WhatsAppMessageInfoModal";
import { WhatsAppMessageContextMenu, type MessageContextAction, type MessageMenuAnchor } from "@/components/whatsapp/WhatsAppMessageContextMenu";
import { WhatsAppForwardMessageModal, canForwardWhatsAppMessage } from "@/components/whatsapp/WhatsAppForwardMessageModal";
import { WhatsAppMediaEditResearchModal } from "@/components/whatsapp/WhatsAppMediaEditResearchModal";
import { WhatsAppPollModal } from "@/components/whatsapp/WhatsAppPollModal";
import { WhatsAppMessageMedia } from "@/components/whatsapp/WhatsAppMessageMedia";
import { WhatsAppProfileAvatar } from "@/components/whatsapp/WhatsAppProfileAvatar";
import { useExigerCompte } from "@/hooks/useExigerCompte";
import { useWhatsAppRealtimeInvalidation } from "@/hooks/useWhatsAppRealtime";
import { useAuth } from "@/lib/auth-context";
import { getWaContactNameBook, getWaGroupNameBook, getWaResolvedPrivateNames, getWaProfilePictures, type WaContact } from "@/lib/connectors-api";
import { applyVerifiedContactName, applyVerifiedGroupName, reconcileWhatsAppConversation } from "@/lib/whatsapp-identity";

import { whatsappUiError } from "@/lib/whatsapp-ui-copy";
import { cacheSeed, cacheSessionOwner, cacheWrite, useCacheSeed } from "@/lib/swr-cache";
import { WA_CACHE } from "@/lib/whatsapp-cache";
import {
  applyWaConversationAction,
  editWaMessage,
  getWaContactInfo,
  getWaConversationMessages,
  getWaLiveConversations,
  getWaMessageStatus,
  getWaMessageMediaBlob,
  deleteWaOwnMessage,
  inferWaMediaType,
  reactWaMessage,
  searchWaConversation,
  sendWaManualMessage,
  sendWaMedia,
  sendWaReply,
  uploadWaAttachment,
  type WaContactInfo,
  type WaConversationMessages,
  type WaConversationSearchResult,
  type WaLiveConversation,
  type WaLiveConversations,
  type WaLiveMessage,
  type WaMediaType,
  type WaMessageStatus,
  type WaUploadedFile,
} from "@/lib/whatsapp-enterprise-api";
import { displayWhatsAppIdentity, displayWhatsAppSecondary, isTechnicalWhatsAppIdentity, safeWhatsAppVisibleText } from "@/lib/whatsapp-display";

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

function enrichWithVerifiedContact(
  conversation: WaLiveConversation, contact: WaContact | undefined,
): WaLiveConversation {
  return applyVerifiedContactName(conversation, contact);
}


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
type Mark = { pinned?: boolean; starred?: boolean; hidden?: boolean };
type ContextTarget = { kind: "message"; message: WaLiveMessage; anchor: MessageMenuAnchor } | { kind: "pending"; id: string; anchor: MessageMenuAnchor };
const EMPTY_MARKS: Record<string, Mark> = {};
function marksStorageKey(owner: string, chatId: string) {
  return `toumai:wa:message-marks:v1:${encodeURIComponent(owner)}:${encodeURIComponent(chatId)}`;
}
function getStoredMarks(key: string): Record<string, Mark> {
  if (typeof window === "undefined" || !key) return {};
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return value as Record<string, Mark>;
  } catch { return {}; }
}


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
  // Voice files are kept only in memory. The composer is never tied to upload/conversion latency.
  const [pendingVoices, setPendingVoices] = useState<PendingWhatsAppVoice[]>([]);
  const [voiceOwner, setVoiceOwner] = useState(session?.user_id || "");
  const voiceSequenceRef = useRef(0);
  const voiceRequestsRef = useRef(new Set<string>());
  const voiceUrlsRef = useRef(new Map<string, string>());
  const voiceSessionRef = useRef(session?.user_id || "");
  const currentVoiceOwner = session?.user_id || "";
  // Account identity is part of the state, not a post-render cleanup effect.
  if (voiceOwner !== currentVoiceOwner) {
    setVoiceOwner(currentVoiceOwner);
    setPendingVoices([]);
  }
  useEffect(() => {
    voiceSessionRef.current = currentVoiceOwner;
  }, [currentVoiceOwner]);
  useEffect(() => {
    const activeIds = new Set(pendingVoices.map((item) => item.id));
    for (const [id, url] of voiceUrlsRef.current) {
      if (!activeIds.has(id)) {
        URL.revokeObjectURL(url);
        voiceUrlsRef.current.delete(id);
      }
    }
  }, [pendingVoices]);
  useEffect(() => {
    const urls = voiceUrlsRef.current;
    return () => {
      for (const url of urls.values()) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);
  const [sendError, setSendError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<WaLiveMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<WaLiveMessage | null>(null);
  const [correctionTarget, setCorrectionTarget] = useState<WaLiveMessage | null>(null);
  const [mediaCorrectionTarget, setMediaCorrectionTarget] = useState<WaLiveMessage | null>(null);
  const [messageInfoTarget, setMessageInfoTarget] = useState<WaLiveMessage | null>(null);
  const [messageInfo, setMessageInfo] = useState<WaMessageStatus | null>(null);
  const [messageInfoLoading, setMessageInfoLoading] = useState(false);
  const [messageInfoError, setMessageInfoError] = useState<string | null>(null);
  const [localReactions, setLocalReactions] = useState<Record<string, string>>({});
  const [contextTarget, setContextTarget] = useState<ContextTarget | null>(null);
  const [forwardTarget, setForwardTarget] = useState<WaLiveMessage | null>(null);
  const [emojiMessageTarget, setEmojiMessageTarget] = useState<WaLiveMessage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WaLiveMessage | null>(null);
  const [deletingMessage, setDeletingMessage] = useState(false);
  const [deleteMessageError, setDeleteMessageError] = useState("");
  const [markSnapshot, setMarkSnapshot] = useState<{ key: string; values: Record<string, Mark> }>({ key: "", values: {} });
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const listSearchInputRef = useRef<HTMLInputElement>(null);
  const threadScrollRef = useRef<HTMLDivElement>(null);
  const initialScrollChatRef = useRef<string | null>(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const threadSearchInputRef = useRef<HTMLInputElement>(null);
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
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);
  const [contactShareOpen, setContactShareOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const stickerInputRef = useRef<HTMLInputElement>(null);
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
  const [researchEnabled, setResearchEnabled] = useState(false);
  const [researchTarget, setResearchTarget] = useState<WaLiveMessage | null>(null);
  const conversationsRef = useRef<WaLiveConversation[]>([]);
  const messagesRef = useRef<WaLiveMessage[]>([]);
  const listCacheKeyRef = useRef("");
  const threadCacheKeyRef = useRef("");
  // A late response must never replace the currently selected list or chat.
  const listRequestIdRef = useRef(0);
  const threadRequestIdRef = useRef(0);
  const activeChatIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeChatIdRef.current = selected?.id ?? null;
  }, [selected?.id]);

  useCacheSeed<WaLiveConversations>(
    conversationListCacheKey("", "all", "all"),
    (cached) => {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if ((params.get("q") || "").trim()) return;
      }
      listCacheKeyRef.current = conversationListCacheKey("", "all", "all");
      conversationsRef.current = cached.conversations;
      setConversations(cached.conversations);
      setHasMore(cached.has_more);
      setNextOffset(cached.next_offset);
      setLoadingList(false);
      setListError(null);
      if (
        cached.conversations.length &&
        typeof window !== "undefined" &&
        window.innerWidth >= 1024 &&
        !new URLSearchParams(window.location.search).get("chat")
      ) {
        setSelected((current) => current || cached.conversations[0]);
      }
    },
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      setResearchEnabled(process.env.NODE_ENV === "development" && params.get("research") === "media-edit-v1");
      const initialQuery = (params.get("q") || "").trim().slice(0, 160);
      if (initialQuery) setQuery(initialQuery);
      if (params.get("focus") === "search") {
        window.requestAnimationFrame(() => listSearchInputRef.current?.focus());
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const activeMarkKey = session?.user_id && selected?.id ? marksStorageKey(session.user_id, selected.id) : "";
  const marks = markSnapshot.key === activeMarkKey ? markSnapshot.values : EMPTY_MARKS;
  useEffect(() => {
    const timer = window.setTimeout(() => setMarkSnapshot({ key: activeMarkKey, values: getStoredMarks(activeMarkKey) }), 0);
    return () => window.clearTimeout(timer);
  }, [activeMarkKey]);

  const visibleMessages = useMemo(
    () =>
      messages
        .map((message) => ({ ...message, text: safeWhatsAppVisibleText(message.text) || "" }))
        .filter((message) => (Boolean(message.text) || message.type !== "text") && !marks[message.id]?.hidden),
    [messages, marks],
  );

  const visibleSearchResults = useMemo(
    () =>
      threadSearchResults
        .map((message) => ({ ...message, text: safeWhatsAppVisibleText(message.text) || "" }))
        .filter((message) => (Boolean(message.text) || message.type !== "text") && !marks[message.id]?.hidden),
    [threadSearchResults, marks],
  );

  const displayedMessages =
    threadSearchOpen && threadSearchQuery.trim()
      ? visibleSearchResults
      : visibleMessages;
  const visiblePendingVoices = pendingVoices.filter((voice) => voice.chatId === selected?.id);

  const unreadCount = useMemo(
    () => conversations.filter((conversation) => conversation.unread_count > 0).length,
    [conversations],
  );
  const pendingCount = useMemo(
    () => conversations.filter((conversation) => conversation.pending).length,
    [conversations],
  );

  const enrichConversationPictures = useCallback(async (
    items: WaLiveConversation[],
  ) => {
    const jids = Array.from(new Set(items.map((item) => item.id).filter(Boolean)));
    if (!jids.length) return;
    const requestOwner = cacheSessionOwner();
    // Names and avatars hydrate independently; neither blocks the initial
    // list, and results from an old authenticated account are discarded.
    void getWaContactNameBook().then((book) => {
      if (requestOwner !== cacheSessionOwner()) return;
      const byJid = new Map(book.contacts.map((contact) => [contact.jid, contact]));
      setConversations((current) => {
        const enhanced = current.map((conversation) =>
          enrichWithVerifiedContact(conversation, byJid.get(conversation.id)),
        );
        conversationsRef.current = enhanced;
        return enhanced;
      });
      setSelected((current) =>
        current ? enrichWithVerifiedContact(current, byJid.get(current.id)) : current,
      );
    }).catch(() => {
      // Keep the last truthful identity visible if the carnet is offline.
    });
    if (items.some((item) => item.kind === "group")) {
      void getWaGroupNameBook().then((book) => {
        if (requestOwner !== cacheSessionOwner()) return;
        const byJid = new Map(book.identities.map((group) => [group.id, group]));
        setConversations((current) => {
          const enhanced = current.map((conversation) =>
            applyVerifiedGroupName(conversation, byJid.get(conversation.id)),
          );
          conversationsRef.current = enhanced;
          return enhanced;
        });
        setSelected((current) => current
          ? applyVerifiedGroupName(current, byJid.get(current.id))
          : current);
      }).catch(() => {
        // Optional group metadata is unavailable on some backend revisions.
      });
    }
    const unnamedPrivate = items.filter((item) =>
      item.kind === "contact" && item.id.endsWith("@lid"),
    ).map((item) => item.id);
    if (unnamedPrivate.length) {
      void getWaResolvedPrivateNames(unnamedPrivate).then((book) => {
        if (requestOwner !== cacheSessionOwner()) return;
        const byJid = new Map(book.identities.map((item) =>
          [item.id, { jid: item.id, number: null, name: item.name, name_source: item.name_source }],
        ));
        setConversations((current) => {
          const enhanced = current.map((conversation) =>
            enrichWithVerifiedContact(conversation, byJid.get(conversation.id)),
          );
          conversationsRef.current = enhanced;
          return enhanced;
        });
        setSelected((current) => current
          ? enrichWithVerifiedContact(current, byJid.get(current.id))
          : current);
      }).catch(() => {
        // Live UI and saved names stay usable during an offline reconnect.
      });
    }
    try {
      const pictures = await getWaProfilePictures(jids);
      if (requestOwner !== cacheSessionOwner()) return;
      setConversations((current) =>
        current.map((item) => {
          const next = pictures[item.id];
          return next && next !== item.picture_url ? { ...item, picture_url: next } : item;
        }),
      );
      setSelected((current) => {
        if (!current) return current;
        const next = pictures[current.id];
        return next && next !== current.picture_url ? { ...current, picture_url: next } : current;
      });
    } catch {
      // Une photo est décorative : son échec ne doit jamais bloquer les chats.
    }
  }, []);

  const enrichMessagePictures = useCallback(async (
    items: WaLiveMessage[],
  ) => {
    const jids = Array.from(
      new Set(items.map((item) => (item.sender_jid || "").trim()).filter(Boolean)),
    );
    if (!jids.length) return;
    try {
      const pictures = await getWaProfilePictures(jids);
      setMessages((current) =>
        current.map((item) => {
          const jid = (item.sender_jid || "").trim();
          const next = jid ? pictures[jid] : null;
          return next && next !== item.sender_picture_url
            ? { ...item, sender_picture_url: next }
            : item;
        }),
      );
    } catch {
      // Même règle : le fil reste utilisable avec avatar fallback.
    }
  }, []);

  const loadConversations = useCallback(async (
    search: string,
    selectedFilter: Filter,
    options: { append?: boolean; offset?: number } = {},
  ) => {
    const requestId = ++listRequestIdRef.current;
    const append = Boolean(options.append);
    const offset = options.offset ?? 0;
    const cacheKey = conversationListCacheKey(search, selectedFilter, kindFilter);
    const keyChanged = listCacheKeyRef.current !== cacheKey;
    const cached = append ? null : cacheSeed<WaLiveConversations>(cacheKey);

    if (append) {
      setLoadingMore(true);
    } else if (keyChanged) {
      // Cancel any visual pagination spinner superseded by a full refresh.
      setLoadingMore(false);
      listCacheKeyRef.current = cacheKey;
      if (cached) {
        conversationsRef.current = cached.conversations;
        setConversations(cached.conversations);
        setHasMore(cached.has_more);
        setNextOffset(cached.next_offset);
        setLoadingList(false);
        void enrichConversationPictures(cached.conversations);
      } else {
        conversationsRef.current = [];
        setConversations([]);
        setHasMore(false);
        setNextOffset(null);
        setLoadingList(true);
      }
    } else {
      // A background refresh can supersede a pending "load more" operation.
      setLoadingMore(false);
      // Revalidation du même jeu de données : jamais de skeleton si une
      // valeur visible (mémoire ou localStorage) existe déjà.
      setLoadingList(!(cached || conversationsRef.current.length > 0));
    }
    setListError(null);

    try {
      const data = await withUiDeadline(
        getWaLiveConversations(
          {
            search: search.trim() || undefined,
            pending: selectedFilter === "pending",
            unread: selectedFilter === "unread",
            kind: kindFilter === "all" ? undefined : kindFilter,
            offset,
            limit: 80,
          },
          { revalidate: true },
        ),
        12_000,
        "La liste WhatsApp met trop de temps à répondre. Réessayez.",
      );

      if (requestId !== listRequestIdRef.current) return;

      // Keep an authenticated, exact-JID enriched name across gateway polling.
      const previous = new Map(conversationsRef.current.map((item) => [item.id, item]));
      const incoming = append
        ? Array.from(new Map(
            [...conversationsRef.current, ...data.conversations].map((item) => [item.id, item]),
          ).values())
        : data.conversations;
      const nextConversations = incoming.map((item) =>
        reconcileWhatsAppConversation(previous.get(item.id), item),
      );

      conversationsRef.current = nextConversations;
      setConversations(nextConversations);
      setHasMore(data.has_more);
      setNextOffset(data.next_offset);
      cacheWrite<WaLiveConversations>(cacheKey, {
        ...data,
        conversations: nextConversations,
        offset: 0,
        limit: Math.max(data.limit || 0, nextConversations.length),
      });
      void enrichConversationPictures(nextConversations);

      const requested =
        typeof window === "undefined"
          ? ""
          : new URLSearchParams(window.location.search).get("chat") || "";
      if (requested) {
        const exact = nextConversations.find((item) => item.id === requested);
        if (exact) setSelected((current) => reconcileWhatsAppConversation(current || undefined, exact));
      } else if (
        nextConversations.length &&
        typeof window !== "undefined" &&
        window.innerWidth >= 1024
      ) {
        setSelected((current) => current || nextConversations[0]);
      }
    } catch (error) {
      if (requestId !== listRequestIdRef.current) return;
      if (!append) {
        const fallback = cacheSeed<WaLiveConversations>(cacheKey);
        if (conversationsRef.current.length > 0 && !keyChanged) {
          // La mémoire visible peut contenir des actions plus récentes que le
          // cache (lu/non-lu, envoi optimiste). Ne jamais revenir en arrière.
          setListError(null);
        } else if (fallback) {
          conversationsRef.current = fallback.conversations;
          setConversations(fallback.conversations);
          setHasMore(fallback.has_more);
          setNextOffset(fallback.next_offset);
          setListError(null);
          void enrichConversationPictures(fallback.conversations);
        } else {
          setListError(whatsappUiError(error, "history"));
        }
      }
    } finally {
      if (requestId === listRequestIdRef.current) {
        if (append) setLoadingMore(false);
        else setLoadingList(false);
      }
    }
  }, [enrichConversationPictures, kindFilter]);

  const loadThread = useCallback(async (
    conversation: WaLiveConversation,
    options: { silent?: boolean } = {},
  ) => {
    if (activeChatIdRef.current !== conversation.id) return;
    const requestId = ++threadRequestIdRef.current;
    const silent = Boolean(options.silent);
    const cacheKey = conversationThreadCacheKey(conversation.id);
    const cached = cacheSeed<WaConversationMessages>(cacheKey);
    const chatChanged = threadCacheKeyRef.current !== cacheKey;

    if (chatChanged) {
      threadCacheKeyRef.current = cacheKey;
      if (cached) {
        messagesRef.current = cached.messages;
        setMessages(cached.messages);
        setLoadingThread(false);
        setThreadError(null);
        void enrichMessagePictures(cached.messages);
      } else {
        // Never show messages from the previous chat, even during a silent refresh.
        messagesRef.current = [];
        setMessages([]);
        if (!silent) {
          setLoadingThread(true);
          setThreadError(null);
        }
      }
    } else if (!silent) {
      setLoadingThread(!(cached || messagesRef.current.length > 0));
      setThreadError(null);
    }

    try {
      const data = await withUiDeadline(
        getWaConversationMessages(conversation.id, 120, 0, { revalidate: true }),
        12_000,
        "Impossible d’actualiser les messages pour le moment. Réessayez.",
      );
      if (requestId !== threadRequestIdRef.current || activeChatIdRef.current !== conversation.id) return;
      messagesRef.current = data.messages;
      setMessages(data.messages);
      // Replace local optimistic voices only when the authoritative thread
      // actually contains their provider message IDs; no false delivery claim.
      const serverIds = new Set(data.messages.map((message) => message.id));
      setPendingVoices((current) => current.filter((voice) =>
        voice.chatId !== conversation.id || !voice.msgId || !serverIds.has(voice.msgId),
      ));
      cacheWrite<WaConversationMessages>(cacheKey, data);
      void enrichMessagePictures(data.messages);
      if (!silent) setThreadError(null);
    } catch (error) {
      if (requestId !== threadRequestIdRef.current || activeChatIdRef.current !== conversation.id) return;
      const fallback = cacheSeed<WaConversationMessages>(cacheKey);
      if (messagesRef.current.length > 0 && !chatChanged) {
        // Même règle que pour la liste : ne jamais écraser un fil visible
        // potentiellement plus récent par un cache plus ancien.
        if (!silent) setThreadError(null);
      } else if (fallback) {
        messagesRef.current = fallback.messages;
        setMessages(fallback.messages);
        if (!silent) setThreadError(null);
        void enrichMessagePictures(fallback.messages);
      } else if (!silent) {
        setThreadError(whatsappUiError(error, "history"));
      }
    } finally {
      // Even a silent refresh must settle the spinner if it superseded the
      // initial foreground request for this conversation.
      if (requestId === threadRequestIdRef.current && activeChatIdRef.current === conversation.id) {
        setLoadingThread(false);
      }
    }
  }, [enrichMessagePictures]);

  const refreshRealtimeConversations = useCallback(async () => {
    await loadConversations(query, filter);
    if (selected && activeChatIdRef.current === selected.id) {
      await loadThread(selected, { silent: true });
    }
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
    const searchKey = WA_CACHE.conversationSearch(selected.id, threadSearchQuery.trim(), 60);
    const cachedSearch = cacheSeed<WaConversationSearchResult>(searchKey);
    if (cachedSearch) {
      setThreadSearchResults(cachedSearch.messages);
      setThreadSearchLoading(false);
    } else {
      setThreadSearchLoading(true);
    }
    setThreadSearchError(null);
    try {
      const data = await searchWaConversation(
        selected.id,
        threadSearchQuery.trim(),
        60,
        { revalidate: true },
      );
      setThreadSearchResults(data.messages);
    } catch (error) {
      // Preserve a cached search result during transient gateway failures.
      if (!cachedSearch) {
        setThreadSearchResults([]);
        setThreadSearchError(whatsappUiError(error, "history"));
      }
    } finally {
      setThreadSearchLoading(false);
    }
  }, [selected, threadSearchQuery]);

  const openContactInfo = useCallback(async () => {
    if (!selected || selected.kind !== "contact") return;
    setContactInfoOpen(true);
    const cachedInfo = cacheSeed<WaContactInfo>(WA_CACHE.contactInfo(selected.id));
    if (cachedInfo) {
      setContactInfo(cachedInfo);
      setContactInfoLoading(false);
    } else {
      setContactInfoLoading(true);
    }
    setContactInfoError(null);
    try {
      const data = await getWaContactInfo(selected.id, { revalidate: true });
      setContactInfo(data);
    } catch (error) {
      // Contact details already on screen remain readable while offline.
      if (!cachedInfo) {
        setContactInfo(null);
        setContactInfoError(whatsappUiError(error, "history"));
      }
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
          name: requested.endsWith("@g.us")
            ? "Groupe WhatsApp"
            : waNumberFromId(requested)
              ? `+${waNumberFromId(requested)}`
              : "",
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
    if (!selected || !session || selected.unread_count <= 0) return;

    const chatId = selected.id;
    const timer = window.setTimeout(() => {
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === chatId
            ? { ...conversation, unread_count: 0 }
            : conversation,
        ),
      );
      setSelected((current) =>
        current?.id === chatId ? { ...current, unread_count: 0 } : current,
      );

      void applyWaConversationAction({
        chat_id: chatId,
        action: "mark_read",
        confirmed: true,
      })
        .then(() => loadConversations(query, filter))
        .catch(() => loadConversations(query, filter));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [selected, session, loadConversations, query, filter]);

  useEffect(() => {
    if (!selected) {
      initialScrollChatRef.current = null;
      return;
    }
    if (loadingThread || messages.length === 0) return;

    const frame = window.requestAnimationFrame(() => {
      const node = threadScrollRef.current;
      if (!node) return;

      const firstPaintForChat = initialScrollChatRef.current !== selected.id;
      const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
      if (firstPaintForChat || distanceFromBottom <= 260) {
        node.scrollTo({
          top: node.scrollHeight,
          behavior: firstPaintForChat ? "auto" : "smooth",
        });
        initialScrollChatRef.current = selected.id;
        setShowJumpToLatest(false);
      } else {
        setShowJumpToLatest(true);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [selected, loadingThread, messages.length, visiblePendingVoices.length]);

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
    setContextTarget(null);
    setForwardTarget(null);
    setDeleteTarget(null);
    ++threadRequestIdRef.current;
    activeChatIdRef.current = conversation.id;
    threadCacheKeyRef.current = "";
    messagesRef.current = [];
    setReplyDraft("");
    setMessages([]);
    setThreadSearchOpen(false);
    setThreadSearchQuery("");
    setThreadSearchResults([]);
    setContactInfoOpen(false);
    setContactInfo(null);
    setEmojiOpen(false);
    setAttachmentMenuOpen(false);
    setPollOpen(false);
    setContactShareOpen(false);
    setConversationMenuOpen(false);
    setMuteMenuOpen(false);
    setActionRequest(null);
    setResearchTarget(null);
    setAttachmentError(null);
    setSendError(null);
    setReplyingTo(null);
    setEditingMessage(null);
    setCorrectionTarget(null);
    setMediaCorrectionTarget(null);
    setLocalReactions({});
    closeAttachmentReview();
    initialScrollChatRef.current = null;
    setShowJumpToLatest(false);
    setSelected({ ...conversation, unread_count: 0 });
    if (conversation.unread_count > 0) {
      setConversations((current) =>
        current.map((item) =>
          item.id === conversation.id ? { ...item, unread_count: 0 } : item,
        ),
      );
      void applyWaConversationAction({
        chat_id: conversation.id,
        action: "mark_read",
        confirmed: true,
      })
        .then(() => loadConversations(query, filter))
        .catch(() => loadConversations(query, filter));
    }
    if (typeof window !== "undefined") {
      const next = new URL(window.location.href);
      next.searchParams.set("chat", conversation.id);
      window.history.replaceState(null, "", next);
    }
  }

  function backToConversationList() {
    setContextTarget(null);
    setForwardTarget(null);
    setDeleteTarget(null);
    ++threadRequestIdRef.current;
    activeChatIdRef.current = null;
    threadCacheKeyRef.current = "";
    messagesRef.current = [];
    setSelected(null);
    setMessages([]);
    setThreadSearchOpen(false);
    setThreadSearchQuery("");
    setThreadSearchResults([]);
    setContactInfoOpen(false);
    setContactInfo(null);
    setEmojiOpen(false);
    setAttachmentMenuOpen(false);
    setPollOpen(false);
    setContactShareOpen(false);
    setConversationMenuOpen(false);
    setMuteMenuOpen(false);
    setActionRequest(null);
    setResearchTarget(null);
    setAttachmentError(null);
    setSendError(null);
    setReplyingTo(null);
    setEditingMessage(null);
    setCorrectionTarget(null);
    setMediaCorrectionTarget(null);
    setLocalReactions({});
    closeAttachmentReview();
    initialScrollChatRef.current = null;
    setShowJumpToLatest(false);
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
        setMediaCorrectionTarget(null);
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
          setSendError(whatsappUiError(error, "generic"));
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
      setMediaCorrectionTarget(null);
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
      setSendError(whatsappUiError(error, "generic"));
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
      setSendError(whatsappUiError(error, "generic"));
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

  function toggleMessageMark(message: WaLiveMessage, field: "pinned" | "starred") {
    if (!activeMarkKey || message.id.startsWith("local-")) return;
    const before = getStoredMarks(activeMarkKey);
    const next: Record<string, Mark> = {
      ...before,
      [message.id]: { ...before[message.id], [field]: !before[message.id]?.[field] },
    };
    try {
      window.localStorage.setItem(activeMarkKey, JSON.stringify(next));
      setMarkSnapshot({ key: activeMarkKey, values: next });
    } catch {
      setSendError("Impossible d’enregistrer ce repère sur cet appareil.");
    }
  }

  function hideMessageLocally(message: WaLiveMessage) {
    if (!activeMarkKey) return;
    const before = getStoredMarks(activeMarkKey);
    const next = { ...before, [message.id]: { ...before[message.id], hidden: true } };
    try {
      window.localStorage.setItem(activeMarkKey, JSON.stringify(next));
      setMarkSnapshot({ key: activeMarkKey, values: next });
    } catch {
      setDeleteMessageError("Impossible de masquer ce message sur cet appareil.");
      return;
    }
    setDeleteTarget(null);
  }

  async function downloadMessage(message: WaLiveMessage) {
    setSendError(null);
    try {
      const blob = await getWaMessageMediaBlob(message.id);
      const fallback = (message.type === "voice" || message.type === "voix") ? "vocal.ogg" : "media";
      const filename = (message.file_name || fallback).split(/[\\/]/).pop()?.replace(/[\x00-\x1f]/g, "") || fallback;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (error) {
      setSendError(whatsappUiError(error, "generic"));
    }
  }

  function downloadPendingVoice(voice: PendingWhatsAppVoice) {
    const link = document.createElement("a");
    link.href = voice.localUrl;
    link.download = voice.file.name || "vocal.webm";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function confirmMessageDeletion() {
    if (!deleteTarget || deletingMessage) return;
    const target = deleteTarget;
    if (!target.from_me) {
      hideMessageLocally(target);
      return;
    }
    if (target.id.startsWith("local-")) return;
    setDeletingMessage(true);
    setDeleteMessageError("");
    try {
      // Sensitive action: server truth only, never a stale message-status cache.
      const current = await getWaMessageStatus(target.id, target.chat_id);
      if (!current.known || current.failed) {
        setDeleteMessageError("Impossible de vérifier ce message. Aucun changement effectué.");
        return;
      }
      const deletion = await deleteWaOwnMessage({
        chat_id: target.chat_id,
        msg_id: target.id,
        confirmed: true,
      });
      if (!deletion.delete_submitted || !deletion.accepted_by_gateway) {
        setDeleteMessageError("La suppression n’a pas abouti. Réessayez.");
        return;
      }
      setDeleteTarget(null);
      void loadConversations(query, filter);
      if (selected?.id === target.chat_id) {
        window.setTimeout(() => void loadThread(selected, { silent: true }), 500);
      }
    } catch (error) {
      setDeleteMessageError(whatsappUiError(error, "generic"));
    } finally {
      setDeletingMessage(false);
    }
  }

  function chooseContextAction(action: MessageContextAction) {
    const target = contextTarget;
    setContextTarget(null);
    if (!target) return;
    if (target.kind === "pending") {
      const voice = pendingVoices.find((item) => item.id === target.id);
      if (!voice) return;
      if (action === "download") downloadPendingVoice(voice);
      if (action === "retry" && voice.phase === "upload_failed") retryPendingVoice(voice.id);
      if (action === "dismiss" && !["uploading", "sending"].includes(voice.phase)) {
        setPendingVoices((current) => current.filter((item) => item.id !== voice.id));
      }
      return;
    }
    const message = target.message;
    if (action === "info") void openMessageInfo(message);
    if (action === "reply") startReply(message);
    if (action === "react") setEmojiMessageTarget(message);
    if (action === "download") void downloadMessage(message);
    if (action === "forward" && canForwardWhatsAppMessage(message)) setForwardTarget(message);
    if (action === "copy") void copyMessage(message);
    if (action === "pin") toggleMessageMark(message, "pinned");
    if (action === "star") toggleMessageMark(message, "starred");
    if (action === "edit") startEdit(message);
    if (action === "delete") { setDeleteMessageError(""); setDeleteTarget(message); }
  }

    async function openMessageInfo(message: WaLiveMessage) {
    if (!message.from_me || !message.id || message.id.startsWith("local-")) return;
    setMessageInfoTarget(message);
    setMessageInfo(null);
    setMessageInfoError(null);
    setMessageInfoLoading(true);
    try {
      const status = await getWaMessageStatus(message.id, message.chat_id);
      setMessageInfo(status);
    } catch (error) {
      setMessageInfoError(whatsappUiError(error, "history"));
    } finally {
      setMessageInfoLoading(false);
    }
  }

  function closeMessageInfo() {
    setMessageInfoTarget(null);
    setMessageInfo(null);
    setMessageInfoError(null);
    setMessageInfoLoading(false);
  }

  async function prepareAttachment(file: File, forcedType?: WaMediaType) {
    if (!selected || attachmentUploading) return;
    if (file.size > 100 * 1024 * 1024) {
      setAttachmentError("Fichier trop volumineux (100 Mo maximum).");
      return;
    }

    setAttachmentUploading(true);
    setAttachmentError(null);
    setEmojiOpen(false);
    setAttachmentMenuOpen(false);
    try {
      const browserMime = (file.type || "").toLowerCase();
      const semanticHint: WaMediaType | undefined =
        forcedType ||
        (browserMime.startsWith("audio/") || browserMime === "application/ogg"
          ? "audio"
          : undefined);
      const uploaded = await uploadWaAttachment(file, {
        requestedType: semanticHint,
      });
      const detectedType =
        uploaded.media_family && ["image", "video", "gif", "audio", "document"].includes(uploaded.media_family)
          ? uploaded.media_family
          : inferWaMediaType(file);
      setAttachmentFile(file);
      setAttachmentUploaded(uploaded);
      setAttachmentType(semanticHint || detectedType);
      setAttachmentOpen(true);
    } catch (error) {
      setAttachmentError(whatsappUiError(error, "generic"));
    } finally {
      setAttachmentUploading(false);
    }
  }

  async function handleAttachmentSelected(
    event: ChangeEvent<HTMLInputElement>,
    forcedType?: WaMediaType,
  ) {
    const file = event.target.files?.[0] || null;
    event.currentTarget.value = "";
    if (file) await prepareAttachment(file, forcedType);
  }

  async function handleStickerSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    event.currentTarget.value = "";
    if (!file) return;
    await prepareAttachment(file, "sticker");
  }

  function chooseAttachment(choice: WhatsAppAttachmentChoice) {
    setAttachmentMenuOpen(false);
    setEmojiOpen(false);
    if (choice === "document") documentInputRef.current?.click();
    else if (choice === "media") fileInputRef.current?.click();
    else if (choice === "camera") cameraInputRef.current?.click();
    else if (choice === "audio") audioFileInputRef.current?.click();
    else if (choice === "sticker") stickerInputRef.current?.click();
    else if (choice === "contact") setContactShareOpen(true);
    else if (choice === "poll") setPollOpen(true);
  }

  async function transferVoice(voice: PendingWhatsAppVoice, account: string) {
    if (voiceRequestsRef.current.has(voice.id)) return;
    voiceRequestsRef.current.add(voice.id);
    const update = (patch: Partial<PendingWhatsAppVoice>) => {
      if (voiceSessionRef.current !== account) return;
      setPendingVoices((current) => current.map((item) =>
        item.id === voice.id ? { ...item, ...patch } : item,
      ));
    };
    try {
      // Audio conversion can be slow; it runs after the recorder has already
      // returned to its ready state and the voice is visible in the thread.
      let uploaded;
      try {
        uploaded = await withUiDeadline(
          uploadWaAttachment(voice.file, { requestedType: "voice" }),
          60_000,
          "Préparation du vocal trop longue. Vous pouvez réessayer.",
        );
      } catch (error) {
        update({ phase: "upload_failed", detail: whatsappUiError(error, "generic") });
        return; // No WhatsApp send was attempted: safe to retry upload.
      }
      if (voiceSessionRef.current !== account) return; // Account switched.
      update({ phase: "sending", detail: undefined });
      try {
        const result = await withUiDeadline(sendWaMedia({
          to: voice.chatId,
          type: "voice",
          url: uploaded.url,
          filename: uploaded.file_name || voice.file.name,
          mimetype: uploaded.content_type || voice.file.type || undefined,
          reply_to_msg_id: voice.replyTo?.id || undefined,
          reply_to_text: voice.replyTo?.text || undefined,
          reply_to_type: voice.replyTo?.type || undefined,
          reply_to_sender: voice.replyTo?.senderJid || undefined,
          confirmed: true,
        }), 45_000, "Envoi en attente de confirmation.");
        if (voiceSessionRef.current !== account) return;
        update({
          phase: result.accepted_by_gateway && result.status === "accepted" ? "accepted" : "unconfirmed",
          msgId: result.msg_id,
          detail: undefined,
        });
        void loadConversations(query, filter);
        if (selected?.id === voice.chatId) {
          window.setTimeout(() => void loadThread(selected, { silent: true }), 650);
        }
      } catch (error) {
        // Network timeout after a send request is ambiguous. NEVER retry
        // automatically: the gateway may have sent the voice already.
        update({ phase: "unconfirmed", detail: whatsappUiError(error, "generic") });
      }
    } finally {
      voiceRequestsRef.current.delete(voice.id);
    }
  }

  function sendRecordedVoice(file: File) {
    if (!selected || !session || attachmentUploading || sendingMessage) return;
    const account = session.user_id || "";
    const localId = `local-voice-${Date.now()}-${++voiceSequenceRef.current}`;
    const localUrl = URL.createObjectURL(file);
    voiceUrlsRef.current.set(localId, localUrl);
    const voice: PendingWhatsAppVoice = {
      id: localId,
      chatId: selected.id,
      file,
      localUrl,
      createdAt: Date.now(),
      phase: "uploading",
      replyTo: replyingTo ? {
        id: replyingTo.id,
        text: replyingTo.text,
        type: replyingTo.type,
        senderJid: replyingTo.sender_jid || "",
      } : null,
    };
    setPendingVoices((current) => [...current, voice]);
    setAttachmentError(null);
    setSendError(null);
    setReplyingTo(null);
    setCorrectionTarget(null);
    setMediaCorrectionTarget(null);
    // Intentionally not awaited: the user can immediately record/write again.
    void transferVoice(voice, account);
  }

  function retryPendingVoice(id: string) {
    const voice = pendingVoices.find((item) => item.id === id && item.phase === "upload_failed");
    if (!voice || voiceRequestsRef.current.has(id)) return;
    setPendingVoices((current) => current.map((item) =>
      item.id === id ? { ...item, phase: "uploading", detail: undefined } : item,
    ));
    void transferVoice(voice, voiceSessionRef.current);
  }

  function scrollThreadToBottom(behavior: ScrollBehavior = "smooth") {
    const node = threadScrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior });
    setShowJumpToLatest(false);
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
        className="fixed inset-y-0 left-0 z-50 hidden w-[76px] border-r lg:block"
        style={{ background: SIDEBAR_BG, borderColor: BORDER }}
      >
        <SidebarContent compact />
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

      <div className="lg:pl-[76px]">
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
                    ref={listSearchInputRef}
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
                <div
                  key={index}
                  data-testid="conversation-list-skeleton"
                  className="mx-3 my-2 h-[72px] animate-pulse rounded-xl bg-white/[0.025]"
                />
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

                  <Avatar
                    name={displayConversationName(selected)}
                    kind={selected.kind}
                    pictureUrl={selected.picture_url}
                    size="lg"
                  />
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
                        {selected.kind === "contact" && (
                          <ConversationMenuItem
                            icon={<Info size={15} />}
                            label="Informations du contact"
                            onClick={() => {
                              setConversationMenuOpen(false);
                              void openContactInfo();
                            }}
                          />
                        )}
                        <ConversationMenuItem
                          icon={<Search size={15} />}
                          label="Rechercher"
                          onClick={() => {
                            setConversationMenuOpen(false);
                            setThreadSearchOpen(true);
                            window.setTimeout(() => threadSearchInputRef.current?.focus(), 0);
                          }}
                        />
                        <div className="my-1 h-px" style={{ background: BORDER }} />
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
                          ref={threadSearchInputRef}
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
                  ref={threadScrollRef}
                  onScroll={(event) => {
                    const node = event.currentTarget;
                    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
                    setShowJumpToLatest(distanceFromBottom > 180);
                  }}
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
                        <div
                          key={index}
                          data-testid="conversation-thread-skeleton"
                          className="h-16 animate-pulse rounded-2xl bg-white/[0.025]"
                        />
                      ))}
                    </div>
                  )}

                  {!loadingThread && threadError && (
                    <div className="mx-auto max-w-[920px] rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200">
                      {threadError}
                    </div>
                  )}

                  {!loadingThread && !threadError && displayedMessages.length === 0 && visiblePendingVoices.length === 0 && (
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
                      {displayedMessages.some((message) => marks[message.id]?.pinned) && (
                        <div data-testid="whatsapp-local-pins" className="mb-3 flex flex-wrap gap-2">
                          {displayedMessages.filter((message) => marks[message.id]?.pinned).map((message) => (
                            <button type="button" key={message.id} className="flex max-w-[280px] items-center gap-1.5 rounded-lg border border-amber-300/20 bg-amber-300/5 px-2.5 py-1.5 text-[11px] text-[#e9ce8f]" onClick={() => {
                              const node = Array.from(document.querySelectorAll("[data-message-id]")).find((entry) => (entry as HTMLElement).dataset.messageId === message.id);
                              node?.scrollIntoView({ behavior: "smooth", block: "center" });
                            }}>
                              <Pin size={12} /> <span className="truncate">{message.text || messageTypeLabel(message.type)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      <ThreadMessages
                        messages={displayedMessages}
                        reactions={localReactions}
                        marks={marks}
                        onMenu={(message, x, y) => setContextTarget({ kind: "message", message, anchor: { x, y } })}
                        onReply={startReply}
                        onEdit={startEdit}
                        onReact={(message, emoji) => void reactToMessage(message, emoji)}
                        onCopy={(message) => void copyMessage(message)}
                        onInfo={(message) => void openMessageInfo(message)}
                        researchEnabled={researchEnabled}
                        onResearch={(message) => setResearchTarget(message)}
                      />
                    </div>
                  )}
                  <WhatsAppPendingVoiceList
                    voices={visiblePendingVoices}
                    onMenu={(id, x, y) => setContextTarget({ kind: "pending", id, anchor: { x, y } })}
                    onRetry={retryPendingVoice}
                    onDismiss={(id) => setPendingVoices((current) => current.filter((item) => item.id !== id))}
                  />
                </div>

                {showJumpToLatest && !threadSearchOpen && (
                  <button
                    type="button"
                    aria-label="Aller au dernier message"
                    title="Aller au dernier message"
                    onClick={() => scrollThreadToBottom("smooth")}
                    className="absolute bottom-[106px] right-5 z-20 flex h-11 w-11 items-center justify-center rounded-full border shadow-[0_8px_24px_rgba(0,0,0,.30)] transition hover:-translate-y-0.5 md:right-7"
                    style={{ borderColor: BORDER, background: "#1f2c34", color: "#dce7eb" }}
                  >
                    <ArrowDown size={19} />
                  </button>
                )}

                {contactInfoOpen && selected.kind === "contact" && (
                  <div
                    className="absolute right-3 top-[84px] z-30 w-[min(340px,calc(100%-24px))] rounded-2xl border p-4 shadow-2xl md:right-5"
                    style={{ borderColor: BORDER, background: "#0f1d27" }}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar
                        name={contactInfo?.name || displayConversationName(selected)}
                        kind="contact"
                        pictureUrl={contactInfo?.picture_url || selected.picture_url}
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

                <div className="border-t px-3 pb-3 pt-2.5 md:px-5" style={{ borderColor: BORDER, background: SURFACE }}>
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
                              : mediaCorrectionTarget
                                ? "Envoyer une correction média"
                                : correctionTarget
                                  ? "Corriger un ancien message"
                                  : "Répondre à ce message"}
                          </p>
                          <p className="mt-0.5 truncate text-[11px]" style={{ color: MUTED }}>
                            {(editingMessage || replyingTo)?.text || messageTypeLabel((editingMessage || replyingTo)?.type || "text")}
                          </p>
                          {correctionTarget && (
                            <p className="mt-1 text-[10px] leading-4" style={{ color: FAINT }}>
                              {mediaCorrectionTarget
                                ? "WhatsApp ne remplace pas le contenu binaire d’un média déjà envoyé. Joignez le nouveau fichier : Toumaï l’enverra comme nouveau message de correction, puis vous pourrez choisir séparément de supprimer l’ancien après confirmation WhatsApp."
                                : "WhatsApp limite l’édition native à 15 minutes. La correction sera envoyée comme réponse liée à l’original, sans prétendre avoir modifié l’ancien message."}
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
                            setMediaCorrectionTarget(null);
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
                      className="relative flex items-end gap-1 rounded-[26px] border px-2 py-1.5"
                      style={{
                        borderColor: dragActive
                          ? "rgba(8,200,117,.75)"
                          : sendError
                            ? "rgba(255,107,107,.45)"
                            : BORDER,
                        background: dragActive ? "rgba(8,200,117,.055)" : "#17242d",
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
                          className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-white/[0.06]"
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
                        accept="image/*,video/*"
                        onChange={(event) => void handleAttachmentSelected(event)}
                      />
                      <input
                        ref={documentInputRef}
                        type="file"
                        className="hidden"
                        aria-label="Sélectionner un document"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,application/pdf,text/*"
                        onChange={(event) => void handleAttachmentSelected(event, "document")}
                      />
                      <input
                        ref={cameraInputRef}
                        type="file"
                        className="hidden"
                        aria-label="Prendre une photo"
                        accept="image/*"
                        capture="environment"
                        onChange={(event) => void handleAttachmentSelected(event, "image")}
                      />
                      <input
                        ref={audioFileInputRef}
                        type="file"
                        className="hidden"
                        aria-label="Sélectionner un audio"
                        accept="audio/*"
                        onChange={(event) => void handleAttachmentSelected(event, "audio")}
                      />
                      <input
                        ref={stickerInputRef}
                        type="file"
                        className="hidden"
                        aria-label="Créer un sticker depuis une image"
                        accept="image/*"
                        onChange={(event) => void handleStickerSelected(event)}
                      />

                      <div className="relative shrink-0">
                        <button
                          type="button"
                          aria-label="Joindre"
                          title="Joindre"
                          aria-expanded={attachmentMenuOpen}
                          disabled={attachmentUploading}
                          onClick={() => {
                            setAttachmentMenuOpen((value) => !value);
                            setEmojiOpen(false);
                          }}
                          className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-white/[0.06] disabled:opacity-45"
                          style={{ color: attachmentMenuOpen ? GREEN : MUTED }}
                        >
                          {attachmentUploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={19} />}
                        </button>
                        <WhatsAppAttachmentMenu
                          open={attachmentMenuOpen}
                          onChoose={chooseAttachment}
                        />
                      </div>

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
                        placeholder={
                          editingMessage
                            ? "Modifier le message…"
                            : mediaCorrectionTarget
                              ? "Joindre le média corrigé ou écrire une précision…"
                              : replyingTo
                                ? "Écrire votre réponse…"
                                : "Écrire un message…"
                        }
                        rows={1}
                        className="min-h-10 max-h-32 min-w-0 flex-1 resize-none bg-transparent px-2 py-2.5 text-[14px] leading-5 outline-none placeholder:text-[#8796a1]"
                      />

                      {!replyDraft.trim() && !editingMessage && (
                        <WhatsAppAudioRecorder
                          key={selected.id}
                          disabled={attachmentUploading || sendingMessage}
                          onRecorded={sendRecordedVoice}
                          onError={(message) => setAttachmentError(message)}
                        />
                      )}

                      {(replyDraft.trim() || editingMessage) && (
                        <button
                          type="button"
                          disabled={!replyDraft.trim() || sendingMessage}
                          onClick={() => void sendCurrentMessage()}
                          aria-label={editingMessage ? "Enregistrer la modification" : "Envoyer le message"}
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white shadow-[0_8px_28px_rgba(8,200,117,.18)] disabled:cursor-not-allowed disabled:opacity-35"
                          style={{ background: GREEN }}
                        >
                          {sendingMessage ? <Loader2 size={18} className="animate-spin" /> : editingMessage ? <Check size={18} /> : <Send size={18} />}
                        </button>
                      )}
                    </div>
                    {attachmentUploading && (
                      <div
                        role="status"
                        className="mt-2 flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px]"
                        style={{ borderColor: "rgba(8,200,117,.20)", background: "rgba(8,200,117,.045)", color: MUTED }}
                      >
                        <Loader2 size={13} className="animate-spin" color={GREEN} />
                        Préparation du média pour WhatsApp… détection et conversion si nécessaire.
                      </div>
                    )}
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

      {contextTarget && (
        <WhatsAppMessageContextMenu
          anchor={contextTarget.anchor}
          options={contextTarget.kind === "pending"
            ? (() => {
                const voice = pendingVoices.find((item) => item.id === contextTarget.id);
                return {
                  pending: true,
                  media: true,
                  retryable: voice?.phase === "upload_failed",
                  removable: Boolean(voice && !["uploading", "sending"].includes(voice.phase)),
                };
              })()
            : {
                own: contextTarget.message.from_me,
                media: isMediaMessageType(contextTarget.message.type) && !["contact", "poll"].includes(contextTarget.message.type),
                text: Boolean(contextTarget.message.text?.trim()),
                canEdit: contextTarget.message.from_me && !contextTarget.message.id.startsWith("local-") &&
                  (isTextMessageType(contextTarget.message.type) || ["image", "video", "gif", "document"].includes(contextTarget.message.type)),
                pinned: Boolean(marks[contextTarget.message.id]?.pinned),
                starred: Boolean(marks[contextTarget.message.id]?.starred),
              }}
          onClose={() => setContextTarget(null)}
          onAction={chooseContextAction}
          onReact={(emoji) => {
            if (contextTarget.kind === "message") void reactToMessage(contextTarget.message, emoji);
            setContextTarget(null);
          }}
        />
      )}

      {emojiMessageTarget && (
        <div className="fixed inset-0 z-[126] flex items-center justify-center px-4">
          <button type="button" className="absolute inset-0 bg-black/50" aria-label="Fermer les réactions" onClick={() => setEmojiMessageTarget(null)} />
          <div className="relative z-10 w-full max-w-[370px] overflow-hidden rounded-2xl border border-[#2d3940] bg-[#111f2a] p-3">
            <div className="mb-2 flex items-center justify-between text-sm font-semibold">
              <span>Réagir au message</span>
              <button type="button" onClick={() => setEmojiMessageTarget(null)} aria-label="Fermer les réactions"><X size={18} /></button>
            </div>
            <WhatsAppEmojiPicker onPick={(emoji) => {
              void reactToMessage(emojiMessageTarget, emoji);
              setEmojiMessageTarget(null);
            }} />
          </div>
        </div>
      )}

      <WhatsAppForwardMessageModal key={forwardTarget?.id || "closed"} message={forwardTarget} onClose={() => setForwardTarget(null)} />

      {deleteTarget && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center px-4">
          <button type="button" aria-label="Annuler la suppression" className="absolute inset-0 bg-black/75" onClick={() => { if (!deletingMessage) setDeleteTarget(null); }} />
          <section role="dialog" aria-modal="true" aria-labelledby="wa-delete-msg-title" className="relative z-10 w-full max-w-[410px] rounded-2xl border border-[#354049] bg-[#101e28] p-5 text-[#eff4f6] shadow-2xl">
            <h2 id="wa-delete-msg-title" className="text-base font-semibold">{deleteTarget.from_me ? "Supprimer ce message pour tous ?" : "Masquer ce message dans Toumaï ?"}</h2>
            <p className="mt-2 text-[12px] leading-5 text-[#afbfc7]">
              {deleteTarget.from_me
                ? "La suppression sera demandée pour tous. Certains destinataires peuvent encore conserver une copie."
                : "Ce message sera seulement masqué dans ce navigateur. Il restera présent sur WhatsApp et chez les autres participants."}
            </p>
            {deleteMessageError && <p role="alert" className="mt-3 text-xs text-[#ffb3b3]">{deleteMessageError}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" disabled={deletingMessage} onClick={() => setDeleteTarget(null)} className="rounded-lg border border-white/15 px-4 py-2 text-xs">Annuler</button>
              <button type="button" disabled={deletingMessage} onClick={() => void confirmMessageDeletion()} className="flex items-center gap-2 rounded-lg bg-[#9e3030] px-4 py-2 text-xs font-semibold">
                {deletingMessage && <Loader2 size={14} className="animate-spin" />} Confirmer
              </button>
            </div>
          </section>
        </div>
      )}

      <WhatsAppMessageInfoModal
        message={messageInfoTarget}
        status={messageInfo}
        loading={messageInfoLoading}
        error={messageInfoError}
        onClose={closeMessageInfo}
      />

      <WhatsAppMediaEditResearchModal
        open={researchEnabled && Boolean(researchTarget)}
        chatId={selected?.id || researchTarget?.chat_id || ""}
        message={researchTarget}
        onClose={() => setResearchTarget(null)}
      />

      <WhatsAppComposeModal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        onSent={() => {
          if (selected) window.setTimeout(() => void loadThread(selected), 700);
          void loadConversations(query, filter);
        }}
      />

      <WhatsAppPollModal
        open={pollOpen}
        conversation={selected}
        onClose={() => setPollOpen(false)}
        onSent={() => {
          if (selected) window.setTimeout(() => void loadThread(selected, { silent: true }), 450);
          void loadConversations(query, filter);
        }}
      />

      <WhatsAppContactShareModal
        open={contactShareOpen}
        conversation={selected}
        onClose={() => setContactShareOpen(false)}
        onSent={() => {
          if (selected) window.setTimeout(() => void loadThread(selected, { silent: true }), 450);
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
        correctionTarget={mediaCorrectionTarget}
        onClose={closeAttachmentReview}
        onSent={() => {
          setAttachmentError(null);
          setReplyingTo(null);
          setCorrectionTarget(null);
          setMediaCorrectionTarget(null);
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

function SidebarContent({ compact = false }: { compact?: boolean }) {
  const itemClass = compact
    ? "group relative flex h-11 items-center justify-center rounded-xl transition hover:bg-white/[0.05]"
    : "flex h-11 items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition hover:bg-white/[0.035]";

  const tooltip = (label: string) =>
    compact ? (
      <span
        className="pointer-events-none absolute left-full z-[80] ml-3 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-[11px] font-medium opacity-0 shadow-xl transition group-hover:opacity-100"
        style={{ borderColor: BORDER, background: "#17242d", color: TEXT }}
      >
        {label}
      </span>
    ) : null;

  return (
    <div className={`flex h-full flex-col ${compact ? "px-3 py-4" : "p-4"}`}>
      <Link
        href="/chat"
        title={compact ? "Toumaï AI" : undefined}
        className={compact ? "group relative flex h-12 items-center justify-center" : "flex h-12 items-center gap-3 px-3"}
        aria-label="Toumaï AI"
      >
        <Image
          src="/logo.png"
          alt=""
          width={38}
          height={38}
          priority
          className="h-[38px] w-[38px] shrink-0 object-contain"
        />
        {!compact && <span className="text-[23px] font-bold tracking-[-0.03em]">Toumaï AI</span>}
        {tooltip("Toumaï AI")}
      </Link>

      <nav className={`${compact ? "mt-7" : "mt-8"} space-y-1`}>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-label={label}
            title={compact ? label : undefined}
            className={itemClass}
            style={{ color: MUTED }}
          >
            <Icon size={20} />
            {compact ? tooltip(label) : <span>{label}</span>}
          </Link>
        ))}

        <Link
          href="/whatsapp/conversations"
          aria-label="WhatsApp — Conversations"
          title={compact ? "WhatsApp — Conversations" : undefined}
          className={
            compact
              ? "group relative mt-2 flex h-11 items-center justify-center rounded-xl border"
              : "mt-2 flex h-11 items-center gap-3 rounded-xl border px-3 text-[13px] font-semibold"
          }
          style={{
            color: "#ffb35a",
            borderColor: "rgba(255,149,24,.25)",
            background: "rgba(255,149,24,.08)",
          }}
        >
          <WhatsAppIcon size={20} />
          {compact ? tooltip("WhatsApp — Conversations") : <span>WhatsApp</span>}
        </Link>

        {!compact && (
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
        )}
      </nav>

      <div className="mt-auto space-y-1">
        {LOWER_NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-label={label}
            title={compact ? label : undefined}
            className={itemClass}
            style={{ color: MUTED }}
          >
            <Icon size={20} />
            {compact ? tooltip(label) : <span>{label}</span>}
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
      data-conversation-id={conversation.id}
      data-unread-count={conversation.unread_count}
      className="relative flex w-full items-center gap-3 border-b px-4 py-3 text-left transition hover:bg-white/[0.03]"
      style={{
        borderColor: BORDER,
        background: active
          ? "linear-gradient(90deg, rgba(8,200,117,.13), rgba(8,200,117,.055))"
          : "transparent",
      }}
    >
      {active && <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full" style={{ background: GREEN }} />}
      <Avatar name={name} kind={conversation.kind} pictureUrl={conversation.picture_url} />
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
  pictureUrl,
  size = "md",
}: {
  name: string;
  kind: "contact" | "group";
  pictureUrl?: string | null;
  size?: "md" | "lg";
}) {
  return (
    <WhatsAppProfileAvatar
      name={name}
      kind={kind}
      pictureUrl={pictureUrl}
      size={size === "lg" ? 40 : 36}
      eager={size === "lg"}
    />
  );
}

function ThreadMessages({
  messages,
  reactions,
  marks,
  onMenu,
  onReply,
  onEdit,
  onReact,
  onCopy,
  onInfo,
  researchEnabled,
  onResearch,
}: {
  messages: WaLiveMessage[];
  reactions: Record<string, string>;
  marks: Record<string, Mark>;
  onMenu: (message: WaLiveMessage, x: number, y: number) => void;
  onReply: (message: WaLiveMessage) => void;
  onEdit: (message: WaLiveMessage) => void;
  onReact: (message: WaLiveMessage, emoji: string) => void;
  onCopy: (message: WaLiveMessage) => void;
  onInfo: (message: WaLiveMessage) => void;
  researchEnabled: boolean;
  onResearch: (message: WaLiveMessage) => void;
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
              mark={marks[message.id]}
              onMenu={(x, y) => onMenu(message, x, y)}
              onReply={() => onReply(message)}
              onEdit={() => onEdit(message)}
              onReact={(emoji) => onReact(message, emoji)}
              onCopy={() => onCopy(message)}
              onInfo={() => onInfo(message)}
              researchEnabled={researchEnabled}
              onResearch={() => onResearch(message)}
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
  mark,
  onMenu,
  onReply,
  onEdit,
  onReact,
  onCopy,
  onInfo,
  researchEnabled,
  onResearch,
}: {
  message: WaLiveMessage;
  reaction?: string;
  mark?: Mark;
  onMenu: (x: number, y: number) => void;
  onReply: () => void;
  onEdit: () => void;
  onReact: (emoji: string) => void;
  onCopy: () => void;
  onInfo: () => void;
  researchEnabled: boolean;
  onResearch: () => void;
}) {
  const [reactionOpen, setReactionOpen] = useState(false);
  const when = message.timestamp_ms
    ? new Intl.DateTimeFormat("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(message.timestamp_ms))
    : "";
  const hasMedia = isMediaMessageType(message.type);
  const isVoice = message.type === "voice" || message.type === "voix";

  return (
    <div
      className={`group flex ${message.from_me ? "justify-end" : "justify-start"}`}
      data-message-id={message.id || undefined}
      data-message-direction={message.from_me ? "outbound" : "inbound"}
      onContextMenu={(event) => {
        event.preventDefault();
        onMenu(event.clientX, event.clientY);
      }}
    >
      <div className="relative max-w-[88%] sm:max-w-[76%] lg:max-w-[66%]">
        <div
          data-voice-bubble={isVoice ? "true" : undefined}
          className={
            isVoice
              ? "relative rounded-[9px] px-[14px] py-[8px] shadow-[0_2px_6px_rgba(0,0,0,.12)]"
              : "rounded-[14px] px-3.5 py-2.5 shadow-[0_6px_20px_rgba(0,0,0,.10)]"
          }
          style={{
            background: isVoice
              ? message.from_me
                ? "#144d37"
                : "#202c33"
              : message.from_me
                ? "linear-gradient(145deg,#0b6447,#0a533d)"
                : "linear-gradient(145deg,#182631,#14212b)",
            border: isVoice
              ? "none"
              : `1px solid ${message.from_me ? "rgba(8,200,117,.18)" : "rgba(255,255,255,.05)"}`,
          }}
        >
          {isVoice && (
            <span
              aria-hidden="true"
              className={`absolute top-0 h-[13px] w-[9px] ${message.from_me ? "-right-[7px]" : "-left-[7px]"}`}
              style={{
                background: message.from_me ? "#144d37" : "#202c33",
                clipPath: message.from_me
                  ? "polygon(0 0, 100% 0, 0 100%)"
                  : "polygon(0 0, 100% 0, 100% 100%)",
              }}
            />
          )}
          {!message.from_me &&
            message.chat_id.endsWith("@g.us") &&
            message.sender &&
            !isTechnicalWhatsAppIdentity(message.sender) && (
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

          {hasMedia && <WhatsAppMessageMedia message={message} />}
          {(mark?.starred || mark?.pinned) && (
            <div className="mb-1 flex items-center gap-1.5" data-testid="whatsapp-message-marks">
              {mark.pinned && <Pin size={12} color="#ecce76" aria-label="Épinglé dans Toumaï" />}
              {mark.starred && <Star size={12} color="#ecce76" fill="#ecce76" aria-label="Favori Toumaï" />}
            </div>
          )}

          {message.text && (
            <p className="whitespace-pre-wrap break-words text-[12px] leading-[1.65]">
              {message.text}
            </p>
          )}

          <div
            className={
              isVoice
                ? "absolute bottom-[10px] right-[16px] z-10 flex items-center justify-end gap-1"
                : "mt-1 flex items-center justify-end gap-1.5"
            }
          >
            <span
              className={isVoice ? "text-[11px] leading-none" : "text-[8px]"}
              style={{ color: isVoice ? "#aebac1" : "#9eacb7" }}
            >
              {when}
            </span>
            {message.from_me && <DeliveryMark status={message.status} type={message.type} />}
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
          <MessageActionButton label="Actions" icon={<MoreVertical size={13} />} onClick={() => {
            const node = document.querySelector(`[data-message-id="${CSS.escape(message.id)}"]`);
            const rect = node?.getBoundingClientRect();
            onMenu(rect?.right || window.innerWidth / 2, rect?.bottom || window.innerHeight / 2);
          }} />
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
          {message.from_me && !message.id.startsWith("local-") && (
            <MessageActionButton label="Infos" icon={<Info size={13} />} onClick={onInfo} />
          )}
          {message.from_me && isTextMessageType(message.type) && message.text && !message.id.startsWith("local-") && (
            <MessageActionButton
              label={isWaNativeEditExpired(message) ? "Corriger" : "Modifier"}
              icon={<Pencil size={13} />}
              onClick={onEdit}
            />
          )}
          {message.from_me &&
            isMediaMessageType(message.type) &&
            !["voice", "voix", "audio"].includes(message.type) &&
            !message.id.startsWith("local-") && (
              <MessageActionButton
                label="Corriger"
                icon={<Pencil size={13} />}
                onClick={onEdit}
              />
            )}
          {researchEnabled &&
            message.from_me &&
            !message.id.startsWith("local-") &&
            !isWaNativeEditExpired(message) &&
            (isTextMessageType(message.type) || ["image", "video", "gif", "document"].includes(message.type)) && (
              <MessageActionButton
                label="Lab"
                icon={<Sparkles size={13} />}
                onClick={onResearch}
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

function DeliveryMark({
  status,
  type,
}: {
  status?: string | null;
  type?: string | null;
}) {
  if (status === "sending") {
    return <Loader2 size={11} className="animate-spin" color="#afbdc7" aria-label="Envoi en cours" />;
  }
  if (status === "failed") {
    return <CircleAlert size={12} color="#ff7d7d" aria-label="Échec" />;
  }
  const isVoice = type === "voice" || type === "voix";
  const markSize = isVoice ? 15 : 12;
  if (status === "played") {
    return <CheckCheck size={markSize} color="#53bdeb" aria-label={isVoice ? "Écouté" : "Lu"} />;
  }
  if (status === "read") {
    return <CheckCheck size={markSize} color="#53bdeb" aria-label="Lu" />;
  }
  if (status === "delivered") {
    return <CheckCheck size={markSize} color="#afbdc7" aria-label="Livré" />;
  }
  return <Check size={markSize} color="#afbdc7" aria-label="Envoyé" />;
}

function displayConversationName(conversation: WaLiveConversation) {
  return displayWhatsAppIdentity(conversation);
}

function displayConversationSecondary(conversation: WaLiveConversation) {
  return displayWhatsAppSecondary(conversation);
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

function isTextMessageType(type: string) {
  return type === "text" || type === "texte";
}

function isMediaMessageType(type: string) {
  return ["image", "video", "gif", "audio", "voice", "voix", "sticker", "document", "poll", "contact"].includes(type);
}

function isWaNativeEditExpired(message: WaLiveMessage) {
  if (!message.timestamp_ms) return false;
  return Date.now() - message.timestamp_ms >= WHATSAPP_NATIVE_EDIT_WINDOW_MS;
}

function messageTypeLabel(type: string) {
  const labels: Record<string, string> = {
    poll: "Sondage",
    contact: "Contact",
    image: "Image",
    video: "Vidéo",
    audio: "Audio",
    voice: "Message vocal",
    voix: "Message vocal",
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

function conversationListCacheKey(
  search: string,
  filter: Filter,
  kind: KindFilter,
): string {
  const normalizedSearch = search.trim().toLowerCase().slice(0, 160);
  return `wa:conversations:list:v3:${filter}:${kind}:${encodeURIComponent(normalizedSearch || "_")}`;
}

function conversationThreadCacheKey(chatId: string): string {
  return `wa:conversations:thread:v1:${encodeURIComponent(chatId)}`;
}

async function withUiDeadline<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
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
