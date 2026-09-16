/**
 * Données du laboratoire de widgets — FORME réelle des projections serveur
 * (`sayibiai_backend/services/ui_widgets.py`, `routers/chat.py`), valeurs
 * fictives. Ne sert qu'en développement : aucune de ces données n'atteint un
 * utilisateur.
 */

import type { ResponseBlock } from "@/lib/chat-response";
import type { ToolConfirmation } from "@/lib/chat-stream";

const inMinutes = (m: number) => new Date(Date.now() + m * 60_000).toISOString();
const agoMinutes = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

export interface LabCase {
  id: string;
  group: string;
  title: string;
  note?: string;
  blocks?: ResponseBlock[];
  confirmation?: ToolConfirmation;
  whatsapp?: { scenario: WaScenario; intent: "status" | "connect" | "pairing_code" | "capabilities" | "number" };
}

export type WaScenario = "connected" | "qr" | "pairing" | "expired" | "unreachable" | "disconnected" | "loading_error";

export const LAB_CASES: LabCase[] = [
  // ── Automatisations ───────────────────────────────────────────────────────
  {
    id: "automation-scheduled", group: "Automatisations", title: "Programmée (une fois)",
    blocks: [{ type: "widget", widget: { type: "automation", title: "Automatisation programmée", version: 1, data: {
      id: "lab-auto-once", name: "Bonjour à Tech", status: "active", next_run_at: inMinutes(185),
      trigger: { kind: "exact_time", at: inMinutes(185), timezone: "Africa/Ndjamena" }, media_type: "text",
      recipient: "Tech", connector: "whatsapp",
    } } }],
  },
  {
    id: "automation-recurring", group: "Automatisations", title: "Récurrente, avec dernière exécution",
    blocks: [{ type: "widget", widget: { type: "automation", version: 1, data: {
      id: "lab-auto-recurring", name: "Rapport du matin au groupe Famille", status: "active", next_run_at: inMinutes(60 * 14),
      trigger: { kind: "recurrence", cron: "0 7 * * *", timezone: "Africa/Ndjamena" }, media_type: "image", source_kind: "generated_image",
      recipient: "120363041234567890@g.us", connector: "whatsapp",
    } } }],
  },
  {
    id: "automation-failed", group: "Automatisations", title: "Échec de la dernière exécution",
    note: "Le détail vient de la relecture (simulée) de l'automatisation.",
    blocks: [{ type: "widget", widget: { type: "automation", version: 1, data: {
      id: "lab-auto-failed", name: "Relance facture", status: "active", next_run_at: inMinutes(-5),
      trigger: { kind: "exact_time", at: inMinutes(-5) }, recipient: "+235 66 12 34 78", connector: "whatsapp",
    } } }],
  },
  {
    id: "automation-paused", group: "Automatisations", title: "En pause, données minimales",
    blocks: [{ type: "widget", widget: { type: "automation", version: 1, data: { id: "lab-auto-paused", status: "paused", trigger: { kind: "manual" } } } }],
  },
  {
    id: "automation-noid", group: "Automatisations", title: "Sans identifiant (aucune action proposée)",
    blocks: [{ type: "widget", widget: { type: "automation", version: 1, data: { status: "active", schedule: inMinutes(30) } } }],
  },
  {
    id: "scheduled-task", group: "Automatisations", title: "Message programmé (ancien format)",
    blocks: [{ type: "widget", widget: { type: "scheduled_task", title: "Message programmé", version: 1, data: { name: "Message WhatsApp", status: "active", schedule: inMinutes(24 * 60), id: "wa-task-1" } } }],
  },
  {
    id: "scheduled-list", group: "Automatisations", title: "Liste de messages programmés (table)",
    blocks: [{ type: "widget", widget: { type: "table", title: "Messages programmés", version: 1, data: [
      { id: "1", to: "Tech", message: "Bonjour", send_at: inMinutes(120), status: "pending" },
      { id: "2", to: "23566123478@s.whatsapp.net", message: "Rappel : réunion demain à 9h à la Chambre de commerce, prévoir les documents signés et le rapport trimestriel.", send_at: agoMinutes(30), status: "sent" },
      { id: "3", to: "Famille", message: "Anniversaire !", send_at: agoMinutes(90), status: "failed", last_error: "Le contact n’est pas sur WhatsApp." },
      { id: "4", to: "Ali", message: "À demain", send_at: inMinutes(600), status: "pending" },
      { id: "5", to: "Bureau", message: "Point hebdo", send_at: inMinutes(900), status: "cancelled" },
    ] } }],
  },

  // ── Actions et confirmations ─────────────────────────────────────────────
  {
    id: "confirm-send", group: "Actions", title: "Confirmation : envoi WhatsApp",
    note: "Confirmer → succès simulé. Pas de pending_id : aucune relecture serveur.",
    confirmation: { tool: "send_whatsapp", args: { to_name: "Tech", message: "Bonjour, la réunion est déplacée à 15h." } },
  },
  {
    id: "confirm-destructive", group: "Actions", title: "Confirmation : action destructive",
    note: "Confirmer → échec simulé.",
    confirmation: { tool: "whatsapp_group_manage", args: { action: "leave", group_name: "Voisins Moursal" } },
  },
  {
    id: "confirm-batch", group: "Actions", title: "Lot : créer un groupe et ajouter des membres",
    note: "Confirmer → succès partiel simulé.",
    confirmation: { tool: "__toumai_batch__", args: { actions: [
      { tool: "whatsapp_group_manage", capability: "whatsapp.group.create", args: { action: "create", value: "Projet Sahel", participants: ["+23566123478", "+23599887766"] } },
      { tool: "whatsapp_group_manage", capability: "whatsapp.group.participant.add", args: { action: "add", participants: ["+23577001122"] } },
    ] } },
  },
  {
    id: "steps-partial", group: "Actions", title: "Résultat : succès partiel",
    blocks: [{ type: "actions", steps: [
      { capability: "whatsapp.group.create", label: "Créer le groupe", state: "success", detail: "Groupe « Projet Sahel » créé (3 membres)", verified: true },
      { capability: "whatsapp.group.participant.add", label: "Ajouter", state: "success", detail: "+23566123478" },
      { capability: "whatsapp.group.participant.add", label: "Ajouter", state: "failed", detail: "+23577001122 : numéro absent de WhatsApp" },
    ] }],
  },
  {
    id: "steps-bulk", group: "Actions", title: "Opération en masse : 100 envois",
    blocks: [{ type: "actions", steps: Array.from({ length: 100 }, (_, i) => ({
      capability: "whatsapp.message.send", label: "Envoyer", state: i % 33 === 5 ? "failed" : "success",
      detail: i % 33 === 5 ? `Destinataire ${i + 1} : délai dépassé` : `Destinataire ${i + 1}`,
    })) }],
  },
  {
    id: "steps-running", group: "Actions", title: "En cours",
    blocks: [{ type: "actions", steps: [
      { capability: "whatsapp.group.create", label: "Créer le groupe", state: "success" },
      { capability: "whatsapp.group.participant.add", label: "Ajouter", state: "running" },
      { capability: "whatsapp.message.send", label: "Envoyer", state: "queued" },
    ] }],
  },
  {
    id: "steps-single-success", group: "Actions", title: "Une action réussie (compacte)",
    blocks: [{ type: "actions", steps: [{ capability: "whatsapp.message.send", label: "Envoyer", state: "success", detail: "Envoyé à Tech", verified: true }] }],
  },

  // ── WhatsApp ─────────────────────────────────────────────────────────────
  { id: "wa-connected", group: "WhatsApp", title: "Connecté (statut)", whatsapp: { scenario: "connected", intent: "status" } },
  { id: "wa-qr", group: "WhatsApp", title: "QR à scanner", whatsapp: { scenario: "qr", intent: "status" } },
  { id: "wa-pairing", group: "WhatsApp", title: "Code de couplage", whatsapp: { scenario: "pairing", intent: "pairing_code" } },
  { id: "wa-expired", group: "WhatsApp", title: "Session expirée", whatsapp: { scenario: "expired", intent: "status" } },
  { id: "wa-unreachable", group: "WhatsApp", title: "Service injoignable", whatsapp: { scenario: "unreachable", intent: "status" } },
  { id: "wa-error", group: "WhatsApp", title: "Lecture impossible", whatsapp: { scenario: "loading_error", intent: "status" } },
  { id: "wa-capabilities", group: "WhatsApp", title: "Capacités (widget serveur)",
    blocks: [{ type: "widget", widget: { type: "capabilities", title: "Capacités du connecteur", version: 1, data: { provider: "WhatsApp", capabilities: [
      { capability: "whatsapp.message.send", available_now: true, supported: true },
      { capability: "whatsapp.media.image.send", available_now: true, supported: true },
      { capability: "whatsapp.group.create", available_now: false, supported: true },
      { capability: "whatsapp.group.participant.add", available_now: true, supported: true },
      { capability: "whatsapp.call.start", available_now: false, supported: false },
    ] } } }],
  },

  // ── Connecteurs et quotas ────────────────────────────────────────────────
  { id: "auth-calendar", group: "Connecteurs", title: "Connexion requise (Google Agenda)",
    blocks: [{ type: "widget", widget: { type: "auth_required", version: 1, data: { provider: "Google Agenda", message: "Google Calendar non connecté (allez dans Connecteurs)." } } }] },
  { id: "auth-xss", group: "Connecteurs", title: "URL d'action piégée (javascript:) : ignorée",
    blocks: [{ type: "widget", widget: { type: "auth_required", version: 1, data: { provider: "E-mail", action_url: "javascript:alert(1)" } } }] },
  { id: "quota-near", group: "Connecteurs", title: "Quota presque atteint",
    blocks: [{ type: "widget", widget: { type: "quota", version: 1, data: { label: "Messages sur cinq heures", used: 11, limit: 12, remaining: 1, reset_at: inMinutes(130) } } }] },
  { id: "quota-excluded", group: "Connecteurs", title: "Non inclus dans la formule",
    blocks: [{ type: "widget", widget: { type: "quota", version: 1, data: { label: "Messages WhatsApp", used: 0, limit: 0, included: false, message: "Les envois WhatsApp ne sont pas inclus dans l’offre Découverte." } } }] },

  // ── Web et sources ───────────────────────────────────────────────────────
  { id: "search-running", group: "Web", title: "Recherche en cours",
    blocks: [{ type: "activity", activity: "deep_web_search" }, { type: "widget", widget: { type: "search_activity", title: "Recherche approfondie", version: 3, data: { status: "running", phase: "reading", summary: "Recherche, lecture et vérification croisée des sources en cours…" } } }] },
  { id: "search-done", group: "Web", title: "Recherche terminée + sources (une seule carte)",
    blocks: [
      { type: "widget", widget: { type: "search_activity", title: "Recherche approfondie", version: 3, data: { status: "done", phase: "complete", summary: "4 pages consultées · 6 faits vérifiés", visited_count: 4 } } },
      { type: "sources", sources: [
        { url: "https://www.presidence.td/actualites", title: "Présidence de la République du Tchad : actualités", snippet: "Communiqué du Conseil des ministres du 15 septembre 2026.", retrieved: true } as never,
        { url: "https://fr.wikipedia.org/wiki/N%27Djamena", title: "N'Djamena, Wikipédia", snippet: "N'Djamena est la capitale et la plus grande ville du Tchad.", retrieved: true } as never,
        { url: "https://www.alwihdainfo.com/", title: "Alwihda Info", snippet: "Actualités du Tchad et d'Afrique centrale." },
        { url: "javascript:alert(1)", title: "Lien piégé : jamais affiché" },
        { url: "https://www.aljazeera.net/", title: "الجزيرة نت: أخبار تشاد", snippet: "آخر الأخبار من نجامينا." },
      ] },
    ] },

  // ── Données ──────────────────────────────────────────────────────────────
  { id: "weather", group: "Données", title: "Météo complète",
    blocks: [{ type: "widget", widget: { type: "weather", title: "Météo", version: 1, data: {
      city: "N'Djamena", country: "Tchad", description: "Partiellement nuageux", temperature: 36, feels_like: 39, humidity: 41, wind_speed: 14, uv_index: 9.5,
      sunrise: "05:42", sunset: "17:58",
      hourly: Array.from({ length: 8 }, (_, i) => ({ time: `${String(13 + i).padStart(2, "0")}:00`, temp: 36 - Math.abs(3 - i) })),
      forecast: ["Mer", "Jeu", "Ven", "Sam", "Dim", "Lun", "Mar"].map((day, i) => ({ date: `2026-09-${16 + i}`, day, min: 25 + (i % 2), max: 37 - (i % 3), desc: i === 2 ? "Averses" : "Ensoleillé" })),
    } } }],
  },
  { id: "weather-minimal", group: "Données", title: "Météo : champs manquants",
    blocks: [{ type: "widget", widget: { type: "weather", version: 1, data: { city: "Abéché", temperature: 33 } } }] },
  { id: "values", group: "Données", title: "Calcul, heure, devise, unités",
    blocks: [
      { type: "widget", widget: { type: "calculator", version: 1, data: { expression: "17 × 23", result: 391 } } },
      { type: "widget", widget: { type: "local_time", version: 1, data: { location: "N'Djamena", time: "15:12", date: "mardi 16 septembre 2026", utc_offset: "UTC+1" } } },
      { type: "widget", widget: { type: "currency_conversion", version: 1, data: { from: "EUR", to: "XAF", amount: 100, converted: 65595.7, rate: 655.957 } } },
      { type: "widget", widget: { type: "unit_conversion", version: 1, data: { input: 42, input_unit: "km", result: 26.1, output_unit: "miles" } } },
    ] },
  { id: "aqi", group: "Données", title: "Qualité de l'air",
    blocks: [{ type: "widget", widget: { type: "air_quality", version: 1, data: { location: "N'Djamena", aqi: 132, category: "Mauvaise pour les personnes sensibles", pm25: 48.2, pm10: 131 } } }] },
  { id: "table-generic", group: "Données", title: "Tableau large, 100 lignes",
    blocks: [{ type: "widget", widget: { type: "table", title: "Production agricole par région", version: 1, data: Array.from({ length: 100 }, (_, i) => ({
      id: `row-${i}`, region: ["Logone Occidental", "Mayo-Kebbi Est", "Ouaddaï", "Kanem"][i % 4], culture: ["Sorgho", "Coton", "Arachide", "Mil"][i % 4],
      tonnes: 1200 + i * 37, prix_fcfa: 15_000_000 + i * 250_000, irrigue: i % 3 === 0, commentaire: i === 0 ? "Récolte exceptionnelle malgré une saison des pluies courte et des inondations localisées en août." : "",
    })) } }],
  },

  // ── Agenda et e-mail ─────────────────────────────────────────────────────
  { id: "calendar", group: "Agenda et e-mail", title: "Agenda sur plusieurs jours",
    blocks: [{ type: "widget", widget: { type: "calendar", title: "Agenda", version: 1, data: { count: 4, days: 7, events: [
      { summary: "Réunion Moov Africa", start: inMinutes(90), end: inMinutes(150), location: "Avenue Charles de Gaulle, N'Djamena" },
      { summary: "Appel avec l'équipe produit", start: inMinutes(300), end: inMinutes(330) },
      { summary: "Fête de l'indépendance", start: new Date(Date.now() + 2 * 86400_000).toISOString().slice(0, 10) },
      { summary: "Revue du corpus arabe tchadien", start: new Date(Date.now() + 3 * 86400_000).toISOString(), location: "" },
    ] } } }],
  },
  { id: "calendar-empty", group: "Agenda et e-mail", title: "Agenda vide",
    blocks: [{ type: "widget", widget: { type: "calendar", version: 1, data: { events: [], count: 0 } } }] },
  { id: "inbox", group: "Agenda et e-mail", title: "Boîte de réception (table serveur)",
    blocks: [{ type: "widget", widget: { type: "table", title: "Boîte de réception", version: 1, data: [
      { from: "Airtel Tchad <noreply@airtel.td>", subject: "Votre facture de septembre", date: "Tue, 16 Sep 2026 09:12:00 +0100", preview: "Montant dû : 12 500 FCFA. Date limite : 30 septembre." },
      { from: "\"Mahamat Nassour\" <m.nassour@moov.td>", subject: "Partenariat : prochaines étapes", date: "Mon, 15 Sep 2026 17:40:00 +0100", preview: "Bonjour Faycal, suite à notre échange je vous propose une réunion jeudi." },
      { from: "طلب شراكة <info@example.td>", subject: "مرحبا، نود التعاون معكم", date: "date illisible", preview: "" },
      { from: "", subject: "", date: "" },
      { from: "GitHub <noreply@github.com>", subject: "[toumai-web] Deployment succeeded", date: "Sun, 14 Sep 2026 08:01:00 +0000", preview: "Your site is live." },
    ] } }],
  },

  // ── Fichiers ─────────────────────────────────────────────────────────────
  { id: "file-pdf", group: "Fichiers", title: "PDF généré",
    blocks: [{ type: "file", file: { name: "Rapport-trimestriel-T3-2026.pdf", mime_type: "application/pdf", size_bytes: 482_113, pages: 12, url: "https://example.com/rapport.pdf" } }] },
  { id: "file-processing", group: "Fichiers", title: "Tableur en cours d'analyse",
    blocks: [{ type: "widget", widget: { type: "file_analysis", version: 1, data: { name: "ventes_2026.xlsx", status: "processing", size_bytes: 1_204_331 } } }] },
  { id: "file-error", group: "Fichiers", title: "Fichier inaccessible",
    blocks: [{ type: "file", file: { name: "contrat-final-version-definitive-signee-par-toutes-les-parties.docx", status: "error", error: "Le lien de téléchargement a expiré." } }] },
  { id: "file-unknown", group: "Fichiers", title: "Type inconnu, sans URL",
    blocks: [{ type: "widget", widget: { type: "file_analysis", version: 1, data: { name: "donnees.bin" } } }] },

  // ── Repli ────────────────────────────────────────────────────────────────
  { id: "generic", group: "Repli", title: "Type inconnu du client",
    blocks: [{ type: "widget", widget: { type: "payment.result", title: "Paiement Mobile Money", version: 1, data: {
      summary: "Demande envoyée au payeur : validation par code PIN en attente.", amount: 5000, currency: "XAF", operator: "Airtel", transaction_id: "tx_123", user_jid: "23566@s.whatsapp.net", raw: { secret: "ne jamais afficher" },
    } } }],
  },
];

export const LAB_GROUPS = Array.from(new Set(LAB_CASES.map((c) => c.group)));
