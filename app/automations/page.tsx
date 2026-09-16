"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Archive,
  CalendarDays,
  ChevronLeft,
  CircleAlert,
  Clock3,
  Copy,
  FlaskConical,
  History,
  LayoutTemplate,
  LoaderCircle,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useExigerCompte } from "@/hooks/useExigerCompte";
import {
  activateAutomation,
  archiveAutomation,
  automationStatus,
  cancelAutomation,
  duplicateAutomation,
  errorMessage,
  getAutomation,
  newRequestId,
  pauseAutomation,
  runAutomationNow,
  scheduleLabel,
  type Automation,
  type Filter,
  type Tone,
} from "@/lib/automations-api";
import {
  getAutomationCalendar,
  getAutomationInbox,
  getAutomationPreview,
  getAutomationTemplates,
  getAutomationVersions,
  rollbackAutomation,
  streamAutomationInbox,
  type AutomationInbox,
  type AutomationPreview,
  type AutomationTemplate,
  type AutomationVersion,
} from "@/lib/automation-ux-api";
import { ThemeToggle } from "@/components/ThemeToggle";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "attention", label: "Action requise" },
  { value: "upcoming", label: "À venir" },
  { value: "paused", label: "En pause" },
  { value: "failed", label: "Échecs" },
  { value: "done", label: "Terminées" },
  { value: "all", label: "Toutes" },
];

const TONES: Record<Tone, string> = {
  neutral: "bg-neutral-500/10 text-neutral-600 dark:text-neutral-300",
  active: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  attention: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  error: "bg-red-500/10 text-red-700 dark:text-red-300",
};

type View = "inbox" | "calendar" | "templates";

function monthWindow() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

function Pill({ label, tone }: { label: string; tone: Tone }) {
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${TONES[tone]}`}>{label}</span>;
}

export default function AutomationsPage() {
  const { session, loading } = useAuth();
  useExigerCompte();
  const [inbox, setInbox] = useState<AutomationInbox | null>(null);
  const [filter, setFilter] = useState<Filter>("attention");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("inbox");
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [calendar, setCalendar] = useState<Automation[]>([]);
  const [templates, setTemplates] = useState<AutomationTemplate[]>([]);

  // Preserve the current widget deep-link contract: a chat AutomationWidget can
  // open this page directly on the durable Automation OS object.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (id && /^[\w-]{6,64}$/.test(id)) void Promise.resolve().then(() => setSelectedId(id));
  }, []);

  const load = useCallback(async (quiet = false) => {
    if (!session) return;
    if (!quiet) setBusy(true);
    try {
      const data = await getAutomationInbox();
      setInbox(data);
      setError("");
      if (filter === "attention" && data.counts.attention === 0 && data.counts.upcoming > 0) setFilter("upcoming");
    } catch {
      setError("Impossible de synchroniser vos automatisations.");
    } finally {
      if (!quiet) setBusy(false);
    }
  }, [session, filter]);

  useEffect(() => { if (!loading && session) void load(); }, [loading, session, load]);

  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    void streamAutomationInbox(
      (snapshot) => { setInbox(snapshot); setError(""); setBusy(false); },
      (message) => setError(message),
      controller.signal,
    ).catch(() => setError("Temps réel indisponible — actualisation de secours active."));
    const fallback = window.setInterval(() => { if (document.visibilityState === "visible") void load(true); }, 30_000);
    return () => { controller.abort(); window.clearInterval(fallback); };
  }, [session, load]);

  useEffect(() => {
    if (!session || view !== "calendar") return;
    const w = monthWindow();
    void getAutomationCalendar(w.start, w.end).then((r) => setCalendar(r.events ?? [])).catch(() => setError("Calendrier temporairement indisponible."));
  }, [session, view]);

  useEffect(() => {
    if (!session || view !== "templates" || templates.length) return;
    void getAutomationTemplates("fr-TD").then((r) => setTemplates(r.templates ?? [])).catch(() => setError("Recettes temporairement indisponibles."));
  }, [session, view, templates.length]);

  const items = inbox?.items ?? [];
  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("fr");
    return items.filter((a) => {
      const section = String((a as Automation & { inbox_section?: string }).inbox_section ?? "");
      if (filter !== "all" && section !== filter) return false;
      if (!q) return true;
      return [a.name, a.recipient, a.original_request].filter(Boolean).some((v) => String(v).toLocaleLowerCase("fr").includes(q));
    });
  }, [items, filter, query]);

  if (loading || (busy && !inbox)) return <div className="flex min-h-dvh items-center justify-center"><LoaderCircle className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-black/10 bg-[var(--background)]/90 px-4 py-3 backdrop-blur dark:border-white/10 md:px-8">
        <div className="flex items-center gap-2 text-sm text-neutral-500"><Link href="/chat" className="rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/5"><ChevronLeft className="h-4 w-4" /></Link><span>Toumaï AI</span><span>/</span><strong className="font-medium text-[var(--foreground)]">Automatisations</strong></div>
        <ThemeToggle />
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div><h1 className="text-3xl font-semibold tracking-tight">Automatisations</h1><p className="mt-2 max-w-2xl text-sm text-neutral-500">Inbox, calendrier, simulation, historique et recettes — synchronisés avec l’application mobile.</p></div>
          <Link href="/chat?automation=whatsapp" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-black px-4 text-sm font-semibold text-white dark:bg-white dark:text-black"><Zap className="h-4 w-4" />Créer dans le chat</Link>
        </div>

        <div className="mt-7 flex flex-wrap gap-2">
          <button onClick={() => setView("inbox")} className={`rounded-xl px-4 py-2 text-sm font-medium ${view === "inbox" ? "bg-black text-white dark:bg-white dark:text-black" : "bg-black/5 dark:bg-white/5"}`}><CircleAlert className="mr-2 inline h-4 w-4" />Inbox</button>
          <button onClick={() => setView("calendar")} className={`rounded-xl px-4 py-2 text-sm font-medium ${view === "calendar" ? "bg-black text-white dark:bg-white dark:text-black" : "bg-black/5 dark:bg-white/5"}`}><CalendarDays className="mr-2 inline h-4 w-4" />Calendrier</button>
          <button onClick={() => setView("templates")} className={`rounded-xl px-4 py-2 text-sm font-medium ${view === "templates" ? "bg-black text-white dark:bg-white dark:text-black" : "bg-black/5 dark:bg-white/5"}`}><LayoutTemplate className="mr-2 inline h-4 w-4" />Recettes</button>
        </div>

        {error && <div role="alert" className="mt-5 flex items-center justify-between rounded-xl border border-amber-300/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200"><span>{error}</span><button onClick={() => void load()} className="font-semibold">Réessayer</button></div>}

        {view === "inbox" && (
          <section className="mt-5 overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
            <div className="flex flex-col gap-3 border-b border-black/10 p-4 dark:border-white/10 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-1 overflow-x-auto">{FILTERS.map((f) => <button key={f.value} onClick={() => setFilter(f.value)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold ${filter === f.value ? "bg-black/10 dark:bg-white/10" : "text-neutral-500"}`}>{f.label}{f.value !== "all" ? ` · ${inbox?.counts[f.value as keyof AutomationInbox["counts"]] ?? 0}` : ""}</button>)}</div>
              <div className="flex gap-2"><label className="flex h-10 items-center gap-2 rounded-xl border border-black/10 px-3 dark:border-white/10"><Search className="h-4 w-4 text-neutral-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher…" className="w-48 bg-transparent text-sm outline-none" /></label><button onClick={() => void load()} className="h-10 w-10 rounded-xl border border-black/10 dark:border-white/10"><RefreshCw className={`mx-auto h-4 w-4 ${busy ? "animate-spin" : ""}`} /></button></div>
            </div>
            <div className="divide-y divide-black/10 dark:divide-white/10">
              {visible.length === 0 ? <div className="p-10 text-center text-sm text-neutral-500">Aucune automatisation dans cette vue.</div> : visible.map((a) => {
                const status = automationStatus(a);
                const last = a.last_run;
                return <button key={a.id} onClick={() => setSelectedId(a.id)} className="grid w-full grid-cols-[1fr_auto] gap-4 p-4 text-left hover:bg-black/[.025] dark:hover:bg-white/[.03] md:p-5"><span className="min-w-0"><strong className="block truncate text-sm">{a.name}</strong><span className="mt-1 block truncate text-sm text-neutral-500">{[a.recipient, scheduleLabel(a)].filter(Boolean).join(" · ")}</span>{last && ["failed", "timed_out", "ambiguous"].includes(last.status) && <span className="mt-1.5 block text-xs text-red-600">{errorMessage(last.error, last.error_category, last.status)}</span>}</span><Pill {...status} /></button>;
              })}
            </div>
          </section>
        )}

        {view === "calendar" && <section className="mt-5 grid gap-3 md:grid-cols-2">{calendar.length === 0 ? <div className="col-span-full rounded-2xl border border-black/10 p-10 text-center text-sm text-neutral-500 dark:border-white/10">Aucune prochaine exécution ce mois-ci.</div> : calendar.map((a) => <button key={a.id} onClick={() => setSelectedId(a.id)} className="rounded-2xl border border-black/10 p-5 text-left dark:border-white/10"><Clock3 className="h-5 w-5 text-neutral-400" /><strong className="mt-3 block">{a.name}</strong><span className="mt-1 block text-sm text-neutral-500">{scheduleLabel(a)}</span></button>)}</section>}

        {view === "templates" && <section className="mt-5 grid gap-3 md:grid-cols-2">{templates.map((t) => <Link key={t.id} href={`/chat?automation=1&recipe=${encodeURIComponent(t.id)}`} className="rounded-2xl border border-black/10 p-5 transition hover:bg-black/[.025] dark:border-white/10 dark:hover:bg-white/[.03]"><LayoutTemplate className="h-5 w-5 text-neutral-400" /><strong className="mt-3 block">{t.name}</strong><p className="mt-1 text-sm text-neutral-500">{t.description}</p><p className="mt-3 text-xs text-neutral-400">Exemple : {t.example}</p></Link>)}</section>}
      </main>

      {selectedId && <Detail id={selectedId} onClose={() => setSelectedId("")} onChanged={() => void load(true)} />}
    </div>
  );
}

function Detail({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const [item, setItem] = useState<Automation | null>(null);
  const [preview, setPreview] = useState<AutomationPreview | null>(null);
  const [versions, setVersions] = useState<AutomationVersion[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [a, p, v] = await Promise.all([getAutomation(id), getAutomationPreview(id), getAutomationVersions(id)]);
      setItem(a); setPreview(p); setVersions(v); setError("");
    } catch { setError("Impossible de charger le détail."); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  const action = async (name: string) => {
    if (!item) return;
    setBusy(name); setError("");
    try {
      if (name === "pause") await pauseAutomation(id);
      else if (name === "activate") await activateAutomation(id);
      else if (name === "run") await runAutomationNow(id, newRequestId("web"));
      else if (name === "duplicate") await duplicateAutomation(id);
      else if (name === "archive") await archiveAutomation(id);
      else if (name === "cancel") await cancelAutomation(id);
      await load(); onChanged();
    } catch { setError("Action impossible pour le moment."); }
    finally { setBusy(""); }
  };

  const rollback = async (version: number) => {
    if (!window.confirm(`Créer une nouvelle version à partir de la version ${version} ?`)) return;
    setBusy(`rollback-${version}`);
    try { await rollbackAutomation(id, version); await load(); onChanged(); }
    catch { setError("Restauration impossible."); }
    finally { setBusy(""); }
  };

  return <div className="fixed inset-0 z-50 bg-black/40" onMouseDown={onClose}><aside onMouseDown={(e) => e.stopPropagation()} className="ml-auto h-full w-full max-w-xl overflow-y-auto bg-[var(--background)] p-5 shadow-2xl">
    <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Automation OS</p><h2 className="mt-1 text-xl font-semibold">{item?.name ?? "Automatisation"}</h2></div><button onClick={onClose} className="rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/5"><X className="h-5 w-5" /></button></div>
    {error && <div className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-600">{error}</div>}
    {!item ? <LoaderCircle className="mx-auto mt-20 h-6 w-6 animate-spin" /> : <>
      <div className="mt-5 flex flex-wrap gap-2"><Pill {...automationStatus(item)} /><span className="rounded-full bg-black/5 px-2.5 py-1 text-[11px] font-semibold dark:bg-white/5">v{item.version}</span></div>
      <div className="mt-5 rounded-2xl border border-black/10 p-4 text-sm dark:border-white/10"><p className="font-medium">Prochaine exécution</p><p className="mt-1 text-neutral-500">{scheduleLabel(item)}</p></div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {item.status === "active" ? <button onClick={() => void action("pause")} className="rounded-xl border p-3 text-sm"><Pause className="mr-2 inline h-4 w-4" />Pause</button> : <button onClick={() => void action("activate")} className="rounded-xl border p-3 text-sm"><Play className="mr-2 inline h-4 w-4" />Activer</button>}
        <button onClick={() => void action("run")} className="rounded-xl border p-3 text-sm"><Zap className="mr-2 inline h-4 w-4" />Exécuter</button>
        <button onClick={() => void action("duplicate")} className="rounded-xl border p-3 text-sm"><Copy className="mr-2 inline h-4 w-4" />Dupliquer</button>
        <button onClick={() => void action("archive")} className="rounded-xl border p-3 text-sm"><Archive className="mr-2 inline h-4 w-4" />Archiver</button>
      </div>
      <section className="mt-6"><h3 className="flex items-center gap-2 text-sm font-semibold"><FlaskConical className="h-4 w-4" />Simulation sans effet</h3>{preview && <div className="mt-3 rounded-2xl bg-black/[.03] p-4 text-sm dark:bg-white/[.04]"><p className="text-neutral-500">Aucune action n’est exécutée.</p><div className="mt-3 space-y-2">{preview.steps.map((s) => <div key={s.id} className="flex justify-between gap-3"><span>{s.name}</span><span className="text-xs text-neutral-500">{s.risk}{s.requires_confirmation ? " · confirmation" : ""}</span></div>)}</div></div>}</section>
      <section className="mt-6"><h3 className="flex items-center gap-2 text-sm font-semibold"><History className="h-4 w-4" />Versions</h3><div className="mt-3 space-y-2">{versions.map((v, index) => <div key={v.version} className="flex items-center justify-between rounded-xl border border-black/10 p-3 text-sm dark:border-white/10"><div><strong>v{v.version}</strong><span className="ml-2 text-neutral-500">{v.step_count} étape{v.step_count > 1 ? "s" : ""}</span></div>{index > 0 && <button disabled={Boolean(busy)} onClick={() => void rollback(v.version)} className="rounded-lg px-2 py-1 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5"><RotateCcw className="mr-1 inline h-3.5 w-3.5" />Restaurer</button>}</div>)}</div></section>
      <button disabled={Boolean(busy)} onClick={() => void action("cancel")} className="mt-8 w-full rounded-xl border border-red-500/30 p-3 text-sm font-semibold text-red-600"><Trash2 className="mr-2 inline h-4 w-4" />Annuler l’automatisation</button>
    </>}
  </aside></div>;
}
