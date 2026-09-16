"use client";

/**
 * LABORATOIRE DE WIDGETS — développement uniquement.
 *
 * Rend chaque widget dans ses états réels, à travers le VRAI chemin de rendu
 * (`RichResponseBlocks`, `ActionExecutionCard`, `WhatsAppConnectorCard`), avec
 * un contexte d'exécution simulé : aucune route serveur n'est appelée, aucun
 * compte n'est touché. La route est refusée en production (voir la page).
 */

import { useEffect, useMemo, useState } from "react";
import type { Automation, AutomationRun } from "@/lib/automations-api";
import type { WaEtat, WhatsAppState } from "@/lib/connectors-api";
import { setWidgetLangOverride, type WidgetLang } from "@/lib/widgets/i18n";
import { RichResponseBlocks } from "../../RichResponseBlocks";
import { WhatsAppConnectorCard } from "../../WhatsAppConnectorCard";
import { ActionExecutionCard } from "../ActionExecutionCard";
import { WidgetRuntimeProvider, liveRuntime, type HttpResult, type WidgetRuntime } from "../runtime";
import { LAB_CASES, LAB_GROUPS, type LabCase, type WaScenario } from "./fixtures";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Une image de QR factice (SVG en data URI) : on ne génère pas de vrai QR.
const FAKE_QR = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 29 29"><rect width="29" height="29" fill="#fff"/><path d="M1 1h7v7H1zM21 1h7v7h-7zM1 21h7v7H1zM11 3h2v2h-2zM14 6h3v2h-3zM10 11h4v3h-4zM17 12h5v2h-5zM12 17h2v6h-2zM18 18h4v4h-4zM23 23h3v3h-3z" fill="#111"/></svg>')}`;

function fakeAutomationStore() {
  const base = (id: string): Automation => ({
    id, name: "", status: "active", enabled: true, trigger: {}, next_run_at: null,
  });
  const store = new Map<string, Automation>();
  store.set("lab-auto-once", { ...base("lab-auto-once"), name: "Bonjour à Tech", next_run_at: new Date(Date.now() + 185 * 60_000).toISOString(), trigger: { kind: "exact_time", timezone: "Africa/Ndjamena" }, recipient: "Tech", media_type: "text", definition: { steps: [{ id: "send", skill: "send_whatsapp", args: { message: "Bonjour Tech, voici le compte rendu de la réunion d’hier." } }] } });
  store.set("lab-auto-recurring", { ...base("lab-auto-recurring"), name: "Rapport du matin au groupe Famille", next_run_at: new Date(Date.now() + 14 * 3600_000).toISOString(), trigger: { kind: "recurrence", cron: "0 7 * * *", timezone: "Africa/Ndjamena" }, recipient: "Famille", media_type: "image", source_kind: "generated_image", last_run: { status: "succeeded", finished_at: new Date(Date.now() - 10 * 3600_000).toISOString() }, definition: { steps: [{ id: "send", skill: "whatsapp_send_media", args: { caption: "Bonjour à tous ☀️" } }] } });
  store.set("lab-auto-failed", { ...base("lab-auto-failed"), name: "Relance facture", next_run_at: null, trigger: { kind: "exact_time" }, recipient: "+235 66 12 34 78", last_run: { status: "failed", error: "Le contact n’est pas joignable sur WhatsApp.", error_category: "connector", finished_at: new Date(Date.now() - 5 * 60_000).toISOString() }, definition: { steps: [{ id: "send", skill: "send_whatsapp", args: { message: "Rappel : facture n° 2026-0901 en attente." } }] } });
  store.set("lab-auto-paused", { ...base("lab-auto-paused"), status: "paused", trigger: { kind: "manual" } });
  return store;
}

function waScenario(scenario: WaScenario): { etat: WaEtat | null; raw: WhatsAppState | null } {
  const expire = Date.now() + 118_000;
  switch (scenario) {
    case "connected":
      return {
        etat: { code: "connecte", pret: true, lecture_possible: true, libelle: "Connecté", numero: "23566123478", nom_profil: "Faycal", connecte_depuis_ms: Date.now() - 3 * 3600_000, derniere_activite_ms: Date.now() - 40_000, contacts: 812, plateforme: "android",
          protection: { available: true, shared: true, source: "redis", mode: "normal", prudence: { active: false, reste_s: 0 }, classes: { sensible: { derniere_minute: 0, derniere_heure: 1, dernier_jour: 2, plafond_jour: 10, echecs_consecutifs: 0, en_repos: false }, ecriture: { derniere_minute: 1, derniere_heure: 6, dernier_jour: 31, plafond_jour: 300, echecs_consecutifs: 0, en_repos: false } }, policies: { anti_duplicate: true, burst_control: true, verified_execution: true } } },
        raw: { status: "connected", number: "23566123478" },
      };
    case "qr":
      return { etat: { code: "qr", pret: false, lecture_possible: false, libelle: "QR à scanner", progression: { rang: 2, total: 4, libelle_courant: "Scan", termine: false, etapes: [
        { cle: "session", libelle: "Session préparée", etat: "termine" }, { cle: "qr", libelle: "QR affiché", etat: "termine" },
        { cle: "scan", libelle: "Scan depuis le téléphone", etat: "en_cours" }, { cle: "sync", libelle: "Synchronisation", etat: "en_attente" },
      ] } }, raw: { status: "qr", qr: FAKE_QR } };
    case "pairing":
      return { etat: { code: "jumelage", pret: false, lecture_possible: false, libelle: "Jumelage", code_jumelage: "WJQQ-QGYF", code_expire_le: expire }, raw: { status: "pairing", pairingCode: "WJQQ-QGYF", codeExpiresAt: new Date(expire).toISOString() } };
    case "expired":
      return { etat: { code: "session_expiree", pret: false, lecture_possible: false, libelle: "Session expirée" }, raw: { status: "session_expiree" } };
    case "unreachable":
      return { etat: { code: "injoignable", pret: false, lecture_possible: false, libelle: "Injoignable" }, raw: { status: "injoignable" } };
    case "disconnected":
      return { etat: { code: "deconnecte", pret: false, lecture_possible: false, libelle: "Déconnecté" }, raw: { status: "disconnected" } };
    default:
      return { etat: null, raw: null };
  }
}

function labRuntime(scenario: WaScenario = "connected", confirmOutcome: "success" | "failed" | "partial" = "success"): WidgetRuntime {
  const store = fakeAutomationStore();
  let wa = waScenario(scenario);
  const get = async (id: string) => {
    await wait(250);
    const found = store.get(id);
    if (!found) throw new Error("Automatisation introuvable.");
    return { ...found };
  };
  const update = async (id: string, patch: Partial<Automation>) => {
    await wait(600);
    const next = { ...(await get(id)), ...patch };
    store.set(id, next);
    return next;
  };
  const confirmResult = (): HttpResult => {
    if (confirmOutcome === "failed") return { ok: true, status: 200, body: { success: false, message: "Le groupe n’existe plus ou vous n’en êtes plus membre." } };
    if (confirmOutcome === "partial") return { ok: true, status: 200, body: { success: true, message: "Groupe créé, un ajout impossible.", data: { _action: { status: "partial_success", verified: true }, action_steps: [
      { capability: "whatsapp.group.create", state: "success", detail: "Groupe « Projet Sahel » créé (3 membres)" },
      { capability: "whatsapp.group.participant.add", state: "failed", detail: "+23577001122 : numéro absent de WhatsApp" },
    ] } } };
    return { ok: true, status: 200, body: { success: true, message: "Message accepté par WhatsApp.", data: { _action: { status: "success", verified: true } } } };
  };
  return {
    ...liveRuntime,
    automations: {
      get,
      pause: (id) => update(id, { status: "paused" }),
      activate: (id) => update(id, { status: "active" }),
      cancel: (id) => update(id, { status: "cancelled", next_run_at: null }),
      duplicate: async (id) => { await wait(500); return { ...(await get(id)), id: `${id}-copy` }; },
      runNow: async (id): Promise<AutomationRun> => {
        await wait(700);
        const current = await get(id);
        store.set(id, { ...current, last_run: { status: "running" } });
        setTimeout(() => store.set(id, { ...current, last_run: { status: "succeeded", finished_at: new Date().toISOString() } }), 2500);
        return { id: `run-${id}`, status: "queued" };
      },
      refreshMs: 3000,
    },
    tools: {
      pendingStatus: async () => ({ ok: false, status: 404, body: {} }),
      confirm: async () => { await wait(1400); return confirmResult(); },
      cancel: async () => { await wait(200); },
    },
    whatsapp: {
      getEtat: async () => { await wait(300); if (!wa.etat) throw new Error("indisponible"); return wa.etat; },
      getStatus: async () => { await wait(300); if (!wa.raw) throw new Error("indisponible"); return wa.raw; },
      linkQr: async () => { await wait(900); wa = waScenario("qr"); setTimeout(() => { wa = waScenario("connected"); }, 6000); return wa.raw!; },
      refreshCode: async () => { await wait(700); wa = waScenario("pairing"); return { pairingCode: "K7PD-2MXA", codeExpiresAt: new Date(Date.now() + 120_000).toISOString() }; },
      disconnect: async () => { await wait(800); wa = waScenario("disconnected"); return { status: "disconnected" }; },
    },
    links: { automation: (id) => `#automation-${id}`, connectors: "#connectors", plans: "#plans" },
  };
}

const WIDTHS: Array<{ label: string; value: number | null }> = [
  { label: "320", value: 320 }, { label: "375", value: 375 }, { label: "768", value: 768 }, { label: "Fil (46rem)", value: 736 }, { label: "Libre", value: null },
];

function Case({ item }: { item: LabCase }) {
  const outcome = item.id === "confirm-destructive" ? "failed" : item.id === "confirm-batch" ? "partial" : "success";
  const runtime = useMemo(() => labRuntime(item.whatsapp?.scenario ?? "connected", outcome), [item.whatsapp?.scenario, outcome]);
  return (
    <article id={item.id} className="msg-row scroll-mt-24 border-t border-[var(--border)] py-6" data-lab-case={item.id}>
      <header className="mb-2">
        <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">{item.title}</h3>
        {item.note ? <p className="mt-0.5 text-[12px] text-[var(--text-tertiary)]">{item.note}</p> : null}
      </header>
      <WidgetRuntimeProvider value={runtime}>
        {item.whatsapp ? <WhatsAppConnectorCard intent={item.whatsapp.intent} /> : null}
        {item.confirmation ? <ActionExecutionCard confirmation={item.confirmation} /> : null}
        {item.blocks ? <RichResponseBlocks blocks={item.blocks} streaming={item.id === "search-running"} /> : null}
      </WidgetRuntimeProvider>
    </article>
  );
}

export function WidgetLab() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [lang, setLang] = useState<WidgetLang>("fr");
  const [width, setWidth] = useState<number | null>(736);
  const [group, setGroup] = useState<string>("Tous");
  // Les jeux de données dépendent de l'heure courante : rendus avant montage,
  // le HTML serveur et le client différeraient d'une seconde, et React
  // signalerait une erreur d'hydratation propre au laboratoire.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { void Promise.resolve().then(() => setMounted(true)); }, []);

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    if (current === "light" || current === "dark") void Promise.resolve().then(() => setTheme(current));
  }, []);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme;
  }, [theme]);
  useEffect(() => {
    setWidgetLangOverride(lang);
    return () => setWidgetLangOverride(null);
  }, [lang]);

  const cases = group === "Tous" ? LAB_CASES : LAB_CASES.filter((c) => c.group === group);
  const pill = (active: boolean) => `min-h-8 rounded-lg px-2.5 text-[12px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${active ? "bg-[var(--primary)] text-white" : "border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--hover)]"}`;

  return (
    <div className="chat-shell min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <div className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2">
          <p className="me-2 text-[13px] font-semibold">Laboratoire de widgets <span className="font-normal text-[var(--text-tertiary)]">· développement</span></p>
          <div className="flex gap-1" role="group" aria-label="Thème">
            {(["dark", "light"] as const).map((value) => <button key={value} type="button" aria-pressed={theme === value} onClick={() => setTheme(value)} className={pill(theme === value)}>{value === "dark" ? "Sombre" : "Clair"}</button>)}
          </div>
          <div className="flex gap-1" role="group" aria-label="Langue">
            {(["fr", "en", "ar"] as const).map((value) => <button key={value} type="button" aria-pressed={lang === value} onClick={() => setLang(value)} className={pill(lang === value)}>{value.toUpperCase()}</button>)}
          </div>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Largeur">
            {WIDTHS.map((w) => <button key={w.label} type="button" aria-pressed={width === w.value} onClick={() => setWidth(w.value)} className={pill(width === w.value)}>{w.label}</button>)}
          </div>
          <select aria-label="Groupe" value={group} onChange={(event) => setGroup(event.target.value)} className="min-h-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-[12px]">
            {["Tous", ...LAB_GROUPS].map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>
      <main className="mx-auto px-4 pb-24" style={{ maxWidth: width ? `${width}px` : undefined }}>
        {mounted ? cases.map((item) => <Case key={`${item.id}-${lang}`} item={item} />) : null}
      </main>
    </div>
  );
}
