"use client";

import { API_BASE } from "./config";

/**
 * Ce que vaut la liaison, pendant qu'on parle.
 *
 * POURQUOI MESURER PLUTÔT QUE CROIRE `navigator.onLine`
 * ------------------------------------------------------
 * Le navigateur dit s'il a une interface réseau active — pas si les paquets
 * arrivent. Au Tchad, une barre pleine peut cacher un aller-retour à deux
 * secondes ; et une conversation vocale, elle, ne dépend que de cet
 * aller-retour. On mesure donc le trajet RÉEL jusqu'au serveur qui porte la
 * conversation. C'est la seule mesure qui corresponde à ce qu'on ressent.
 *
 * Porté depuis `sayibi-ai/lib/core/services/qualite_reseau.dart`, seuils
 * compris : ils ont été calibrés sur la liaison N'Djamena → Northflank, et
 * refaire ce réglage sur un réseau de bureau réintroduirait le défaut qu'il a
 * coûté cher de corriger.
 */
export type QualiteReseau = "inconnue" | "bonne" | "moyenne" | "faible" | "rompue";

/** Ce qu'on affiche. RIEN pour une bonne connexion : un indicateur qui parle
 * tout le temps ne veut plus rien dire — son apparition EST l'information. */
export function libelleQualite(q: QualiteReseau): string | null {
  switch (q) {
    case "moyenne":
      return "Connexion moyenne";
    case "faible":
      return "Connexion faible";
    case "rompue":
      return "Connexion perdue";
    default:
      return null;
  }
}

export function meriteAlerte(q: QualiteReseau): boolean {
  return q === "faible" || q === "rompue";
}

/** Seuils, calibrés sur la liaison réelle N'Djamena → Northflank.
 *
 * Ce qui compte n'est pas la latence dans l'absolu, c'est le moment où la
 * CONVERSATION en souffre. Un aller-retour de 400 ms depuis N'Djamena est la
 * normale, pas une dégradation : des seuils européens (150/400 ms) affichaient
 * une panne à chaque phrase sur une conversation qui fonctionnait. */
const SEUIL_BONNE_MS = 600;
const SEUIL_MOYENNE_MS = 1200;

/** Ce que vaut un aller-retour donné. Pure et exportée : c'est LA décision de
 * tout ce fichier, et une fonction qu'on peut interroger avec « et à 400 ms, tu
 * dis quoi ? » est une fonction dont on peut prouver le réglage. */
export function classerLatence(ms: number): QualiteReseau {
  if (ms < SEUIL_BONNE_MS) return "bonne";
  if (ms < SEUIL_MOYENNE_MS) return "moyenne";
  return "faible";
}

const FENETRE = 5;
/** Avec une seule mesure, la « médiane » est cette mesure — et la première de
 * la session est la pire : elle tombe pendant l'établissement de la connexion.
 * C'est elle qui affichait « connexion faible » à chaque ouverture. */
const MINIMUM_MESURES = 3;
/** Une dégradation doit se confirmer avant d'être annoncée. Sans ce délai,
 * l'étiquette suit chaque soubresaut du réseau et devient un clignotant. */
const CONFIRMATIONS_REQUISES = 2;
const PERIODE_MS = 4000;
/** Trois pings sans réponse — douze secondes de silence — et la liaison est
 * tenue pour rompue. */
const SANS_REPONSE_MAX = 3;

const URL_PING = `${API_BASE.replace(/\/api\/v1\/?$/, "")}/health`;

export class MoniteurReseau {
  private timer: ReturnType<typeof setInterval> | null = null;
  private mesures: number[] = [];
  private qualite: QualiteReseau = "inconnue";
  private candidat: QualiteReseau | null = null;
  private confirmations = 0;
  private sansReponse = 0;
  private enVol = false;
  /** De la voix descend-elle pendant ce ping ? La mesure serait alors celle de
   * notre propre file d'attente, pas celle du réseau — on la jette. */
  private voixPendantLePing = false;
  private arrete = true;

  constructor(private readonly onChange: (q: QualiteReseau, ms: number | null) => void) {}

  /** À appeler quand de l'audio joue : la mesure en cours devient inexploitable. */
  signalerVoixEntrante() {
    this.voixPendantLePing = true;
  }

  /** La liaison est tombée — on le SAIT, on ne le déduit pas. Le navigateur
   * nous le dit par l'événement `offline`, et c'est un fait certain. */
  signalerRupture() {
    this.publier("rompue", true);
  }

  demarrer() {
    this.arreter();
    this.arrete = false;
    this.mesures = [];
    this.candidat = null;
    this.confirmations = 0;
    this.sansReponse = 0;
    this.timer = setInterval(() => void this.battre(), PERIODE_MS);
    void this.battre();
  }

  arreter() {
    this.arrete = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.enVol = false;
    this.sansReponse = 0;
  }

  private async battre() {
    if (this.arrete) return;
    // Un ping resté sans réponse est un signal en soi : on ne l'oublie pas, on
    // le compte.
    if (this.enVol) {
      this.sansReponse++;
      if (this.sansReponse >= SANS_REPONSE_MAX) this.publier("rompue", true);
      return;
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      this.publier("rompue", true);
      return;
    }
    this.enVol = true;
    this.voixPendantLePing = false;
    const envoyeA = performance.now();
    try {
      // `cache: no-store` : un ping servi par le cache mesurerait la vitesse du
      // disque, pas celle du réseau. `AbortSignal` borne l'attente pour que le
      // battement suivant ne s'empile pas derrière une requête morte.
      await fetch(URL_PING, {
        cache: "no-store",
        signal: AbortSignal.timeout(PERIODE_MS * SANS_REPONSE_MAX),
      });
      if (this.arrete) return;
      const ms = Math.round(performance.now() - envoyeA);
      this.enVol = false;
      // La réponse prouve que la liaison vit, même si la mesure n'est pas
      // exploitable : le compteur de silences se remet à zéro dans tous les cas.
      this.sansReponse = 0;
      if (this.voixPendantLePing) return;
      this.mesures.push(ms);
      if (this.mesures.length > FENETRE) this.mesures.shift();
      if (this.mesures.length < MINIMUM_MESURES) return;
      this.publier(classerLatence(this.median()));
    } catch {
      if (this.arrete) return;
      this.enVol = false;
      this.sansReponse++;
      if (this.sansReponse >= SANS_REPONSE_MAX) this.publier("rompue", true);
    }
  }

  /** Médiane sur une petite fenêtre : un pic isolé — changement de cellule,
   * ramasse-miettes — ne doit pas afficher « connexion faible » à quelqu'un
   * dont la liaison va bien. */
  private median(): number {
    const tri = [...this.mesures].sort((a, b) => a - b);
    return tri[Math.floor(tri.length / 2)];
  }

  /** Publie — après confirmation, sauf pour ce qui est certain. `immediat` sert
   * aux faits constatés : réseau coupé, requête impossible. Les faire attendre
   * une confirmation reviendrait à taire une rupture qu'on vient d'observer. */
  private publier(q: QualiteReseau, immediat = false) {
    if (q === this.qualite) {
      this.candidat = null;
      this.confirmations = 0;
      return;
    }
    if (!immediat) {
      if (this.candidat !== q) {
        this.candidat = q;
        this.confirmations = 1;
        return;
      }
      this.confirmations++;
      if (this.confirmations < CONFIRMATIONS_REQUISES) return;
    }
    this.candidat = null;
    this.confirmations = 0;
    this.qualite = q;
    this.onChange(q, this.mesures.length ? this.median() : null);
  }
}
