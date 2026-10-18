"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { API_BASE } from "@/lib/config";

type Etat = "repos" | "envoi" | "succes" | "erreur";
type Demande = "assistant" | "sponsor" | "partenariat" | "pilote";

const TYPES: { value: Demande; label: string }[] = [
  { value: "assistant", label: "Assistant IA pour mon entreprise" },
  { value: "sponsor", label: "Sponsoring / visibilité" },
  { value: "partenariat", label: "Distribution / partenariat" },
  { value: "pilote", label: "Programme pilote Founding Partners" },
];

export function DemandePartenariat({ programme = "general" }: { programme?: "general" | "fondateurs" }) {
  const estPilote = programme === "fondateurs";
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [secteur, setSecteur] = useState("");
  const [type, setType] = useState<Demande>(estPilote ? "pilote" : "assistant");
  const [indicateur, setIndicateur] = useState("");
  const [volume, setVolume] = useState("");
  const [calendrier, setCalendrier] = useState("");
  const [besoin, setBesoin] = useState("");
  const [siteWeb, setSiteWeb] = useState("");
  const [etat, setEtat] = useState<Etat>("repos");
  const [erreur, setErreur] = useState("");

  async function envoyer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (etat === "envoi") return;
    setEtat("envoi");
    setErreur("");

    const message = [
      estPilote ? "[TOUMAI FOUNDING PARTNERS — candidature pilote]" : "[TOUMAI B2B — prise de contact]",
      "Offre : " + (TYPES.find((item) => item.value === type)?.label ?? type),
      "Organisation : " + organisation.trim(),
      "Secteur : " + secteur.trim(),
      ...(estPilote ? [
        "Indicateur de succès : " + indicateur.trim(),
        "Volume estimé : " + (volume || "à définir"),
        "Calendrier : " + (calendrier || "à définir"),
      ] : []),
      "",
      "Projet / besoin :",
      besoin.trim(),
    ].join("\n");

    if (message.length > 3900) {
      setErreur("Votre description est trop longue. Merci de la raccourcir.");
      setEtat("erreur");
      return;
    }

    try {
      const reponse = await fetch(API_BASE + "/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: nom.trim(),
          email: email.trim(),
          message,
          site_web: siteWeb || null,
        }),
      });
      if (!reponse.ok) {
        const body = await reponse.json().catch(() => null);
        const texte = body?.message ?? body?.detail;
        throw new Error(
          typeof texte === "string"
            ? texte
            : "Impossible d’envoyer la demande. Contactez-nous directement par e-mail.",
        );
      }
      setEtat("succes");
      setNom("");
      setEmail("");
      setOrganisation("");
      setSecteur("");
      setBesoin("");
      setIndicateur("");
      setVolume("");
      setCalendrier("");
      setSiteWeb("");
    } catch (cause) {
      setErreur(
        cause instanceof Error
          ? cause.message
          : "Envoi impossible. Vérifiez votre connexion puis réessayez.",
      );
      setEtat("erreur");
    }
  }

  if (etat === "succes") {
    return (
      <div role="status" className="rounded-2xl border p-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <h3 className="text-xl font-semibold">{estPilote ? "Votre candidature a été transmise." : "Votre demande a été transmise."}</h3>
        <p className="mt-3 text-sm leading-7" style={{ color: "var(--text-secondary)" }}>
          Merci de votre intérêt. Notre équipe pourra vous recontacter à l’adresse indiquée.
          {estPilote ? " La candidature ne garantit pas une sélection au programme." : ""}
          Aucun contrat ni paiement n’est engagé par ce formulaire.
        </p>
        <button type="button" onClick={() => setEtat("repos")} className="mt-6 rounded-full border px-5 py-3 text-sm font-semibold" style={{ borderColor: "var(--border)" }}>
          Envoyer une autre demande
        </button>
      </div>
    );
  }

  const champ = "mt-2 w-full rounded-xl border bg-transparent px-4 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-orange-400";
  const styleChamp = { borderColor: "var(--border)", color: "var(--text-primary)" };

  return (
    <form onSubmit={envoyer} className="space-y-5 rounded-2xl border p-5 sm:p-7" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Votre nom *
          <input className={champ} style={styleChamp} type="text" required minLength={2} maxLength={80}
            autoComplete="name" value={nom} onChange={(event) => setNom(event.target.value)} placeholder="Votre nom" />
        </label>
        <label className="block text-sm font-medium">
          E-mail professionnel *
          <input className={champ} style={styleChamp} type="email" required maxLength={254}
            autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nom@entreprise.com" />
        </label>
        <label className="block text-sm font-medium">
          Organisation *
          <input className={champ} style={styleChamp} type="text" required minLength={2} maxLength={100}
            autoComplete="organization" value={organisation} onChange={(event) => setOrganisation(event.target.value)} placeholder="Nom de l’organisation" />
        </label>
        <label className="block text-sm font-medium">
          Secteur *
          <input className={champ} style={styleChamp} type="text" required minLength={2} maxLength={90}
            value={secteur} onChange={(event) => setSecteur(event.target.value)} placeholder="Éducation, commerce, services..." />
        </label>
      </div>

      {estPilote ? (
        <p className="rounded-xl border px-4 py-3 text-sm font-semibold" style={{ borderColor: "var(--border)" }}>
          Programme : Founding Partners — candidature pilote
        </p>
      ) : (
        <label className="block text-sm font-medium">
          Type de collaboration *
          <select className={champ} style={styleChamp} value={type} onChange={(event) => setType(event.target.value as Demande)}>
            {TYPES.map((option) => <option key={option.value} value={option.value} style={{ background: "var(--surface)" }}>{option.label}</option>)}
          </select>
        </label>
      )}

      <label className="block text-sm font-medium">
        Quel problème souhaitez-vous résoudre ? *
        <textarea className={champ} style={styleChamp} required minLength={5} maxLength={3000} rows={5}
          value={besoin} onChange={(event) => setBesoin(event.target.value)}
          placeholder="Décrivez votre organisation, le besoin, votre public et l’objectif de la collaboration." />
      </label>

      {estPilote && (
        <div className="space-y-5">
          <label className="block text-sm font-medium">
            Comment mesureriez-vous le succès du pilote ? *
            <textarea className={champ} style={styleChamp} required minLength={10} maxLength={240} rows={3}
              value={indicateur} onChange={(event) => setIndicateur(event.target.value)}
              placeholder="Ex. : réduire le délai de réponse aux questions fréquentes." />
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Volume de demandes estimé
              <select className={champ} style={styleChamp} value={volume} onChange={(event) => setVolume(event.target.value)}>
                <option value="">À définir</option>
                <option value="Moins de 100 par mois">Moins de 100 / mois</option>
                <option value="100 à 1 000 par mois">100 à 1 000 / mois</option>
                <option value="Plus de 1 000 par mois">Plus de 1 000 / mois</option>
              </select>
            </label>
            <label className="block text-sm font-medium">
              Disponibilité envisagée
              <select className={champ} style={styleChamp} value={calendrier} onChange={(event) => setCalendrier(event.target.value)}>
                <option value="">À définir</option>
                <option value="Dans le mois">Dans le mois</option>
                <option value="Dans 1 à 3 mois">Dans 1 à 3 mois</option>
                <option value="Plus tard">Plus tard</option>
              </select>
            </label>
          </div>
        </div>
      )}

      {/* Champ honeypot de l’API de contact, invisible pour les visiteurs réels. */}
      <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label>Site web<input type="text" autoComplete="off" tabIndex={-1} value={siteWeb} onChange={(event) => setSiteWeb(event.target.value)} /></label>
      </div>

      <label className="flex items-start gap-3 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
        <input type="checkbox" required className="mt-1 h-4 w-4 shrink-0 accent-orange-600" />
        <span>J’accepte d’être contacté au sujet de cette demande. Je n’envoie pas de conversation privée, de mot de passe ni de données sensibles. Voir la <Link href="/privacy" className="underline underline-offset-4">politique de confidentialité</Link>.</span>
      </label>

      {etat === "erreur" && <p role="alert" className="rounded-lg border p-3 text-sm" style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}>{erreur} Vous pouvez aussi écrire à <a href="mailto:contact@toumaiai.com" className="underline">contact@toumaiai.com</a>.</p>}

      <button type="submit" disabled={etat === "envoi"}
        className="w-full rounded-full px-6 py-3.5 text-sm font-semibold transition-opacity hover:opacity-85 disabled:cursor-wait disabled:opacity-60"
        style={{ background: "var(--primary)", color: "#ffffff" }}>
        {etat === "envoi" ? "Envoi en cours…" : estPilote ? "Envoyer ma candidature" : "Demander un échange"}
      </button>
      <p className="text-xs leading-5" style={{ color: "var(--text-tertiary)" }}>
        {estPilote ? "Candidature gratuite, sans engagement ni garantie de sélection. " : "Demande gratuite, sans engagement. "}Notre équipe vérifie les besoins et la faisabilité avant toute proposition.
      </p>
    </form>
  );
}
