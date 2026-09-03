"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { getPreferences, updatePreferences, type Preferences } from "@/lib/preferences-api";
import {
  corrigerSouvenir,
  listerSouvenirs,
  nommerCategorie,
  oublierSouvenir,
  resumeMemoire,
  toutOublier,
  type MemoireResume,
  type Souvenir,
} from "@/lib/memory-api";
import { CxSwitch, Panel, Row } from "./Rows";

/**
 * Ce que Toumaï AI a retenu de vous.
 *
 * POURQUOI CETTE PAGE MANQUAIT, ET CE QUE ÇA COÛTAIT
 * ---------------------------------------------------
 * L'assistant retenait des faits — votre ville, votre métier, vos projets —
 * depuis le début, et personne ne pouvait ni les lire, ni les corriger, ni
 * dire non. Une mémoire qu'on ne peut pas consulter n'est pas une commodité :
 * c'est une collecte.
 *
 * DEUX LECTURES, PARCE QU'ELLES RÉPONDENT À DEUX QUESTIONS
 * ---------------------------------------------------------
 * Le RÉSUMÉ répond à « qu'est-ce qu'il sait de moi ? » — en dix secondes, et
 * c'est cette lecture-là qui fait repérer ce qu'on ne veut pas voir retenu.
 * La LISTE répond à « comment je corrige ça ? » — fait par fait. L'une sans
 * l'autre serait soit illisible, soit inutilisable.
 */
export function MemorySection() {
  const { session } = useAuth();
  const invite = !session || session.is_guest;

  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [resume, setResume] = useState<MemoireResume | null>(null);
  const [faits, setFaits] = useState<Souvenir[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enEdition, setEnEdition] = useState<string | null>(null);
  const [brouillon, setBrouillon] = useState("");
  const [occupe, setOccupe] = useState<string | null>(null);
  const [confirmerTout, setConfirmerTout] = useState(false);

  const active = prefs?.memory_enabled !== false;

  const charger = useCallback(() => {
    if (invite) return;
    getPreferences().then(setPrefs).catch(() => {});
    listerSouvenirs()
      .then((m) => setFaits(m.facts ?? []))
      .catch((e) => {
        setFaits([]);
        setErreur(e instanceof Error ? e.message : "Chargement impossible");
      });
  }, [invite]);

  useEffect(charger, [charger]);

  // LE RÉSUMÉ COÛTE UN APPEL DE MODÈLE : on ne le demande QUE s'il y a des
  // faits à résumer, et jamais quand la mémoire est éteinte.
  useEffect(() => {
    if (invite || !active || !faits || faits.length === 0) {
      setResume(null);
      return;
    }
    let vivant = true;
    resumeMemoire()
      .then((r) => {
        if (vivant) setResume(r);
      })
      .catch(() => {
        if (vivant) setResume(null);
      });
    return () => {
      vivant = false;
    };
  }, [invite, active, faits]);

  async function basculer(v: boolean) {
    const avant = prefs;
    setPrefs((p) => (p ? { ...p, memory_enabled: v } : p));
    try {
      await updatePreferences({ memory_enabled: v });
    } catch (e) {
      // On remet l'état précédent : afficher « désactivée » alors que le
      // serveur n'a rien enregistré serait le mensonge le plus grave que
      // cette page puisse faire.
      setPrefs(avant);
      setErreur(e instanceof Error ? e.message : "Enregistrement impossible");
    }
  }

  async function oublier(f: Souvenir) {
    setOccupe(f.id);
    try {
      await oublierSouvenir(f.id);
      setFaits((l) => (l ?? []).filter((x) => x.id !== f.id));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Suppression impossible");
    } finally {
      setOccupe(null);
    }
  }

  async function corriger(f: Souvenir) {
    const v = brouillon.trim();
    setEnEdition(null);
    if (!v || v === f.value) return;
    setOccupe(f.id);
    try {
      await corrigerSouvenir(f.id, v);
      setFaits((l) => (l ?? []).map((x) => (x.id === f.id ? { ...x, value: v } : x)));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Correction impossible");
    } finally {
      setOccupe(null);
    }
  }

  async function effacerTout() {
    setConfirmerTout(false);
    setOccupe("*");
    try {
      await toutOublier();
      setFaits([]);
      setResume(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Suppression impossible");
    } finally {
      setOccupe(null);
    }
  }

  if (invite) {
    return (
      <Panel title="Mémoire">
        <Row
          label="Réservée aux comptes"
          description="Une session invitée ne retient rien d'une conversation à l'autre : il n'y a pas de mémoire à consulter."
        >
          <Link
            href="/register"
            className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition"
            style={{ background: "var(--primary)" }}
          >
            Créer un compte
          </Link>
        </Row>
      </Panel>
    );
  }

  const parCategorie = (faits ?? []).reduce<Record<string, Souvenir[]>>((acc, f) => {
    const c = nommerCategorie(f.category);
    (acc[c] ||= []).push(f);
    return acc;
  }, {});

  return (
    <>
      {erreur && (
        <p className="mb-4 rounded-xl border border-[var(--error)] px-3 py-2 text-sm text-[var(--error)]">
          {erreur}
        </p>
      )}

      <Panel title="Mémoire">
        <Row
          label="Activer la mémoire"
          description="Toumaï AI retient ce que vous lui apprenez — votre ville, votre travail, vos habitudes — pour ne pas vous le redemander à chaque conversation."
        >
          <CxSwitch
            checked={active}
            label="Mémoire"
            disabled={prefs === null}
            onChange={basculer}
          />
        </Row>
        {!active && (
          // ÉTEINTE VEUT DIRE ÉTEINTE, ET ON LE DIT.
          // Une phrase vague laisserait croire que les souvenirs continuent
          // d'agir en sourdine. Ils sont conservés mais inertes — et la ligne
          // « Tout effacer » plus bas reste là pour qui veut aller au bout.
          <Row
            label="Elle est éteinte"
            description="Rien n'est plus retenu, et ce qui l'a été n'est plus utilisé dans les réponses. Vos souvenirs restent conservés jusqu'à ce que vous les effaciez vous-même."
          />
        )}
      </Panel>

      {active && faits !== null && faits.length > 0 && (
        <Panel title="Résumé">
          {resume === null ? (
            <Row label="Rédaction du résumé…" />
          ) : resume.generated ? (
            <div className="px-4 py-3.5">
              {/* Le résumé arrive en paragraphes : on les respecte. Tout
                  aplatir en un bloc annulerait le seul avantage qu'il a sur
                  la liste — être lisible. */}
              {resume.summary.split(/\n{2,}/).map((par, i) => (
                <p
                  key={i}
                  className="mb-2.5 text-sm leading-relaxed text-[var(--text-secondary)] last:mb-0"
                >
                  {par}
                </p>
              ))}
            </div>
          ) : (
            <Row
              label="Résumé indisponible"
              description="Le service n'a pas pu le rédiger à l'instant. La liste complète, elle, reste ci-dessous — c'est elle qui fait foi."
            />
          )}
        </Panel>
      )}

      <Panel title={`Ce qui est retenu${faits ? ` (${faits.length})` : ""}`}>
        {faits === null ? (
          <Row label="Chargement…" />
        ) : faits.length === 0 ? (
          <Row
            label="Rien pour l'instant"
            description={
              active
                ? "Toumaï AI n'a encore rien retenu de vous. Cela vient au fil des conversations."
                : "La mémoire est éteinte, et rien n'a été retenu."
            }
          />
        ) : (
          Object.entries(parCategorie).map(([cat, items]) => (
            <div key={cat}>
              <p className="border-b border-[var(--cx-border-subtle)] px-4 pb-1.5 pt-3 text-[11px] font-bold uppercase tracking-[0.09em] text-[var(--cx-text-label)]">
                {cat}
              </p>
              {items.map((f) => (
                <Row
                  key={f.id}
                  label={f.key_name}
                  description={enEdition === f.id ? undefined : f.value}
                  stacked={enEdition === f.id}
                >
                  {enEdition === f.id ? (
                    <div className="flex w-full items-center gap-2">
                      <input
                        autoFocus
                        value={brouillon}
                        onChange={(e) => setBrouillon(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") corriger(f);
                          else if (e.key === "Escape") setEnEdition(null);
                        }}
                        className="min-w-0 flex-1 rounded-lg border border-[var(--primary)] bg-[var(--card)] px-3 py-2 text-sm outline-none"
                      />
                      <button
                        onClick={() => setEnEdition(null)}
                        className="rounded-lg px-2.5 py-2 text-xs text-[var(--text-secondary)] transition hover:bg-[var(--hover)]"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={() => corriger(f)}
                        className="rounded-lg px-3 py-2 text-xs font-medium text-white transition"
                        style={{ background: "var(--primary)" }}
                      >
                        Enregistrer
                      </button>
                    </div>
                  ) : (
                    <div className="flex shrink-0 items-center gap-1">
                      {/* CORRIGER AVANT SUPPRIMER.
                          Un souvenir faux — un ancien employeur, une ville
                          qu'on a quittée — se corrige plus souvent qu'il ne
                          s'efface. Mettre la suppression en premier pousse à
                          détruire ce qu'il suffisait de mettre à jour. */}
                      <button
                        onClick={() => {
                          setEnEdition(f.id);
                          setBrouillon(f.value);
                        }}
                        disabled={occupe !== null}
                        className="rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-secondary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)] disabled:opacity-40"
                      >
                        Corriger
                      </button>
                      <button
                        onClick={() => oublier(f)}
                        disabled={occupe !== null}
                        className="rounded-lg px-2.5 py-1.5 text-xs text-[var(--error)] transition hover:bg-[var(--hover)] disabled:opacity-40"
                      >
                        {occupe === f.id ? "…" : "Oublier"}
                      </button>
                    </div>
                  )}
                </Row>
              ))}
            </div>
          ))
        )}
      </Panel>

      {faits !== null && faits.length > 0 && (
        <Panel title="Tout effacer">
          <Row
            label={`Oublier les ${faits.length} souvenirs`}
            description="Définitif. Toumaï AI repartira de zéro à votre sujet — vos conversations, elles, ne sont pas touchées."
          >
            {confirmerTout ? (
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  onClick={() => setConfirmerTout(false)}
                  className="rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-secondary)] transition hover:bg-[var(--hover)]"
                >
                  Annuler
                </button>
                <button
                  onClick={effacerTout}
                  disabled={occupe !== null}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-white transition disabled:opacity-40"
                  style={{ background: "var(--error)" }}
                >
                  {occupe === "*" ? "…" : "Tout oublier"}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmerTout(true)}
                className="shrink-0 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--error)] transition hover:bg-[var(--hover)]"
              >
                Tout effacer
              </button>
            )}
          </Row>
        </Panel>
      )}
    </>
  );
}
