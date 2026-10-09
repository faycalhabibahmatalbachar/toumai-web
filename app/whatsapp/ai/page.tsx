"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  MessageSquareText,
  Pause,
  Save,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { WhatsAppIcon } from "@/components/settings/BrandIcons";
import { cxDisplayStyle, cxScopeClass, cxScopeStyle } from "@/components/settings/cx-fonts";
import { useExigerCompte } from "@/hooks/useExigerCompte";
import { useAuth } from "@/lib/auth-context";
import { cacheSeed, useCacheSeed } from "@/lib/swr-cache";
import { whatsappUiError } from "@/lib/whatsapp-ui-copy";
import { WA_CACHE } from "@/lib/whatsapp-cache";
import {
  getWaAutopilot,
  getWaAutopilotAnalytics,
  updateWaAutopilot,
  type WaAutopilotAnalytics,
  type WaAutopilotMode,
  type WaAutopilotSettings,
} from "@/lib/whatsapp-enterprise-api";

const MODES: Array<{ value: WaAutopilotMode; label: string; description: string }> = [
  { value: "auto", label: "Automatique", description: "Toumaï AI répond directement selon vos règles." },
  { value: "suggest", label: "Suggestion", description: "Toumaï prépare la réponse et laisse la validation à l’humain." },
  { value: "off", label: "En pause", description: "Aucune réponse automatique n’est envoyée." },
];

export default function WhatsAppAiAgentPage() {
  const { session } = useAuth();
  useExigerCompte();

  const [settings, setSettings] = useState<WaAutopilotSettings | null>(null);
  const [draft, setDraft] = useState<WaAutopilotSettings | null>(null);
  const [analytics, setAnalytics] = useState<WaAutopilotAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useCacheSeed<WaAutopilotSettings>(WA_CACHE.autopilot, (cached) => {
    setSettings(cached);
    setDraft(cached);
    setLoading(false);
  });
  useCacheSeed<WaAutopilotAnalytics>(WA_CACHE.autopilotAnalytics(7), (cached) => {
    setAnalytics(cached);
  });

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(settings === null && cacheSeed<WaAutopilotSettings>(WA_CACHE.autopilot) === null);
    setError(null);
    try {
      const [nextSettings, nextAnalytics] = await Promise.all([
        getWaAutopilot(),
        getWaAutopilotAnalytics(7).catch(() => null),
      ]);
      setSettings(nextSettings);
      setDraft(nextSettings);
      if (nextAnalytics) setAnalytics(nextAnalytics);
    } catch (exc) {
      if (!settings) setError(whatsappUiError(exc, "history"));
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const dirty = useMemo(() => JSON.stringify(settings) !== JSON.stringify(draft), [settings, draft]);

  async function save() {
    if (!draft || !dirty) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateWaAutopilot({
        enabled: draft.mode !== "off" && draft.enabled,
        mode: draft.mode,
        allow_groups: !!draft.allow_groups,
        persona: draft.persona ?? "",
        signature: draft.signature ?? "",
        reply_language: draft.reply_language ?? "",
      });
      const fresh = await getWaAutopilot();
      setSettings(fresh);
      setDraft(fresh);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (exc) {
      setError(whatsappUiError(exc, "settings"));
    } finally {
      setSaving(false);
    }
  }

  function setMode(mode: WaAutopilotMode) {
    setDraft((current) => current ? { ...current, mode, enabled: mode !== "off" } : current);
  }

  return (
    <div className={`${cxScopeClass} min-h-dvh bg-[var(--background)] text-[var(--cx-text-primary)]`} style={cxScopeStyle}>
      <header className="sticky top-0 z-30 border-b border-[var(--cx-border-subtle)] bg-[var(--background)]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-[1380px] items-center justify-between px-4 md:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/whatsapp" aria-label="Retour à WhatsApp" className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--cx-text-muted)] transition hover:bg-[var(--cx-hover)]">
              <ArrowLeft size={18} />
            </Link>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm"><WhatsAppIcon size={22} /></div>
            <div><p className="text-sm font-semibold">AI Agent</p><p className="text-xs text-[var(--cx-text-faint)]">WhatsApp · Toumaï AI</p></div>
          </div>
          <div className="flex items-center gap-2">
            {draft && <span className="hidden rounded-full border border-[var(--cx-border-subtle)] px-3 py-1.5 text-xs text-[var(--cx-text-muted)] sm:inline-flex">{draft.mode === "auto" ? "Automatique" : draft.mode === "suggest" ? "Suggestion" : "En pause"}</span>}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main aria-busy={loading && !draft} className="mx-auto w-full max-w-[1380px] px-4 pb-24 pt-10 md:px-7 md:pt-14">
        <div className="grid gap-12 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-16">
          <div className="min-w-0">
            <div className="max-w-3xl">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--cx-accent-text)]">Toumaï sur WhatsApp</p>
              <h1 className="text-[36px] font-medium leading-[1.04] tracking-[-0.035em] sm:text-[48px]" style={cxDisplayStyle}>Contrôlez la manière dont l’IA répond.</h1>
              <p className="mt-5 max-w-2xl text-[15px] leading-7 text-[var(--cx-text-muted)] sm:text-base">Personnalisez vos réponses automatiques, vos préférences et les autorisations de votre agent WhatsApp.</p>
            </div>

            {error && <div className="mt-7 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400"><CircleAlert size={17} />{error}</div>}

            {!draft ? (
              <div className="mt-10 space-y-3" aria-hidden="true">{[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-[var(--cx-surface)]" />)}</div>
            ) : (
              <>
                <section className="mt-10 overflow-hidden rounded-2xl border border-[var(--cx-border-subtle)] bg-[var(--cx-surface)]">
                  <div className="flex flex-col gap-5 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--cx-accent-bg)] text-[var(--cx-accent-text)]"><Bot size={21} /></div>
                      <div><p className="font-semibold">Agent WhatsApp</p><p className="mt-1 text-sm leading-6 text-[var(--cx-text-muted)]">{draft.persona || "Toumaï AI"}</p></div>
                    </div>
                    <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${draft.mode === "off" ? "bg-[var(--cx-hover)] text-[var(--cx-text-muted)]" : "bg-emerald-500/10 text-emerald-500"}`}><span className={`h-1.5 w-1.5 rounded-full ${draft.mode === "off" ? "bg-[var(--cx-text-faint)]" : "bg-emerald-500"}`} />{draft.mode === "off" ? "En pause" : "Actif"}</span>
                  </div>

                  <div className="border-t border-[var(--cx-border-subtle)] px-5 py-6 sm:px-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--cx-text-faint)]">Mode de réponse</p>
                    <div className="mt-4 grid gap-2 md:grid-cols-3">
                      {MODES.map((mode) => {
                        const active = draft.mode === mode.value;
                        return <button key={mode.value} type="button" onClick={() => setMode(mode.value)} className={`rounded-xl border p-4 text-left transition ${active ? "border-[var(--cx-accent-border)] bg-[var(--cx-accent-bg)]" : "border-[var(--cx-border-subtle)] hover:bg-[var(--cx-hover)]"}`}>
                          <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold">{mode.label}</span>{active && <Check size={16} className="text-[var(--cx-accent-text)]" />}</div>
                          <p className="mt-2 text-xs leading-5 text-[var(--cx-text-muted)]">{mode.description}</p>
                        </button>;
                      })}
                    </div>
                  </div>
                </section>

                <section className="mt-5 divide-y divide-[var(--cx-border-subtle)] rounded-2xl border border-[var(--cx-border-subtle)] bg-[var(--cx-surface)]">
                  <FieldRow label="Persona" description="Nom ou rôle utilisé pour guider le comportement de l’agent."><input value={draft.persona ?? ""} onChange={(e) => setDraft({ ...draft, persona: e.target.value })} className="w-full rounded-xl border border-[var(--cx-border-default)] bg-[var(--cx-input)] px-3 py-2 text-sm outline-none focus:border-[var(--cx-accent-border)] sm:w-[320px]" placeholder="Support clients" /></FieldRow>
                  <FieldRow label="Langue de réponse" description="Langue préférée pour les réponses de l’agent."><input value={draft.reply_language ?? ""} onChange={(e) => setDraft({ ...draft, reply_language: e.target.value })} className="w-full rounded-xl border border-[var(--cx-border-default)] bg-[var(--cx-input)] px-3 py-2 text-sm outline-none focus:border-[var(--cx-accent-border)] sm:w-[320px]" placeholder="auto" /></FieldRow>
                  <FieldRow label="Signature" description="Ajoutée aux réponses lorsque votre configuration l’utilise."><input value={draft.signature ?? ""} onChange={(e) => setDraft({ ...draft, signature: e.target.value })} className="w-full rounded-xl border border-[var(--cx-border-default)] bg-[var(--cx-input)] px-3 py-2 text-sm outline-none focus:border-[var(--cx-accent-border)] sm:w-[320px]" placeholder="" /></FieldRow>
                  <FieldRow label="Répondre dans les groupes" description="Autorise l’auto-pilote à intervenir dans les groupes WhatsApp."><button type="button" role="switch" aria-checked={!!draft.allow_groups} onClick={() => setDraft({ ...draft, allow_groups: !draft.allow_groups })} className={`relative h-7 w-12 rounded-full transition ${draft.allow_groups ? "bg-emerald-500" : "bg-[var(--cx-input)]"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${draft.allow_groups ? "left-6" : "left-1"}`} /></button></FieldRow>
                </section>

                <div className="mt-5 flex items-center justify-between gap-4">
                  <p className="text-xs text-[var(--cx-text-faint)]">Les changements ne sont appliqués qu’après enregistrement.</p>
                  <button type="button" disabled={!dirty || saving} onClick={() => void save()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--cx-text-primary)] px-4 text-sm font-semibold text-[var(--background)] transition disabled:cursor-not-allowed disabled:opacity-40">
                    {saved ? <Check size={16} /> : <Save size={16} />}{saving ? "Enregistrement…" : saved ? "Enregistré" : "Enregistrer"}
                  </button>
                </div>
              </>
            )}
          </div>

          <aside className="space-y-4 xl:pt-20">
            <SideCard icon={<Sparkles size={18} />} title="Activité · 7 jours">
              <Metric label="Réponses" value={analytics ? String(analytics.responses_total) : "—"} icon={<MessageSquareText size={15} />} />
              <Metric label="Conversations" value={analytics ? String(analytics.active_conversations) : "—"} icon={<UsersRound size={15} />} />
              <Metric label="Temps moyen" value={analytics?.avg_response_time_ms == null ? "—" : formatMs(analytics.avg_response_time_ms)} icon={<Clock3 size={15} />} />
              <Metric label="Escalades" value={analytics?.kpis?.escalations?.value == null ? "—" : String(analytics.kpis.escalations.value)} icon={<ShieldCheck size={15} />} />
            </SideCard>

            <SideCard icon={<ShieldCheck size={18} />} title="Contrôles avancés">
              <Link href="/whatsapp" className="flex items-center justify-between rounded-xl px-2 py-2.5 text-sm text-[var(--cx-text-secondary)] transition hover:bg-[var(--cx-hover)]">Permissions de l’IA<ChevronRight size={16} /></Link>
              <Link href="/automations" className="flex items-center justify-between rounded-xl px-2 py-2.5 text-sm text-[var(--cx-text-secondary)] transition hover:bg-[var(--cx-hover)]">Automatisations<ChevronRight size={16} /></Link>
              <p className="mt-3 border-t border-[var(--cx-border-subtle)] pt-4 text-xs leading-5 text-[var(--cx-text-faint)]">Les règles détaillées, la traçabilité de décision et l’escalade seront ajoutées sur cette même fondation.</p>
            </SideCard>
          </aside>
        </div>
      </main>
    </div>
  );
}

function FieldRow({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div className="max-w-lg"><p className="text-sm font-medium">{label}</p><p className="mt-1 text-xs leading-5 text-[var(--cx-text-faint)]">{description}</p></div><div className="shrink-0">{children}</div></div>;
}

function SideCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-[var(--cx-border-subtle)] bg-[var(--cx-surface)] p-4"><div className="flex items-center gap-2 text-sm font-semibold">{icon}{title}</div><div className="mt-4 space-y-1">{children}</div></section>;
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-4 rounded-xl px-2 py-2.5"><span className="flex items-center gap-2 text-xs text-[var(--cx-text-muted)]">{icon}{label}</span><span className="text-sm font-semibold tabular-nums">{value}</span></div>;
}

function formatMs(ms: number) {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(ms < 10000 ? 1 : 0)} s`;
}
