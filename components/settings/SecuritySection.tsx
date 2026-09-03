"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  getMfaEtat,
  mfaDesactiver,
  mfaEnroler,
  mfaNouveauxCodes,
  mfaVerifier,
  type MfaEnrolement,
  type MfaEtat,
} from "@/lib/user-api";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Panel, Row } from "./Rows";

/**
 * Double authentification du compte.
 *
 * POURQUOI ELLE MANQUAIT ICI ALORS QUE LA CONSOLE L'AVAIT
 * --------------------------------------------------------
 * Un compte utilisateur ne tenait qu'à un mot de passe — alors que ce sont
 * les comptes utilisateurs qui portent les conversations, les souvenirs, et
 * les connecteurs WhatsApp et Mail. Une adresse compromise ouvrait tout cela
 * d'un coup, y compris la capacité d'écrire à des tiers au nom de quelqu'un.
 */
export function SecuritySection() {
  const { session } = useAuth();
  /** Une session invitée n'a pas de mot de passe — donc rien à protéger par
   *  un second facteur. Lui proposer d'activer la 2FA la ferait échouer sur
   *  une erreur serveur au lieu de dire la vérité en une phrase. */
  const invite = !session || session.is_guest;
  const [etat, setEtat] = useState<MfaEtat | null>(null);
  const [enrolement, setEnrolement] = useState<MfaEnrolement | null>(null);
  const [code, setCode] = useState("");
  const [codesDeSecours, setCodesDeSecours] = useState<string[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [desactivation, setDesactivation] = useState(false);
  /** Le QR, encodé DANS le navigateur.
   *
   * La première version passait par un service d'image tiers — ce qui
   * revenait à envoyer le secret TOTP en clair, dans une URL, à un serveur
   * qui n'a rien à voir avec ce produit. Un second facteur dont le secret
   * transite par un inconnu n'est plus un second facteur. */
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    if (!enrolement) {
      setQr(null);
      return;
    }
    let vivant = true;
    QRCode.toDataURL(enrolement.otpauth_uri, { margin: 1, width: 360 })
      .then((url) => {
        if (vivant) setQr(url);
      })
      .catch(() => {
        // Sans QR, la saisie manuelle de la clé reste possible — c'est
        // pourquoi elle est affichée juste dessous, et non cachée derrière
        // un « impossible de scanner ? ».
        if (vivant) setQr(null);
      });
    return () => {
      vivant = false;
    };
  }, [enrolement]);

  useEffect(() => {
    if (invite) return;
    getMfaEtat()
      .then(setEtat)
      .catch((e) => {
        // ON SORT DE « CHARGEMENT… », TOUJOURS.
        //
        // Sans cela, une erreur laissait le panneau sur « Chargement… »
        // indéfiniment pendant que le message rouge s'affichait ailleurs :
        // deux états contradictoires à l'écran, dont l'un ment.
        setEtat(null);
        setErreur(e instanceof Error ? e.message : "État indisponible");
      });
  }, [invite]);

  async function commencer() {
    setErreur(null);
    setOccupe(true);
    try {
      setEnrolement(await mfaEnroler());
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Activation impossible");
    } finally {
      setOccupe(false);
    }
  }

  async function confirmer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setOccupe(true);
    try {
      const codes = await mfaVerifier(code);
      setCodesDeSecours(codes);
      setEnrolement(null);
      setCode("");
      setEtat(await getMfaEtat());
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Code invalide");
      setCode("");
    } finally {
      setOccupe(false);
    }
  }

  async function regenerer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setOccupe(true);
    try {
      setCodesDeSecours(await mfaNouveauxCodes(code));
      setCode("");
      setEtat(await getMfaEtat());
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Code invalide");
    } finally {
      setOccupe(false);
    }
  }

  async function retirer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setOccupe(true);
    try {
      await mfaDesactiver(code);
      setCode("");
      setDesactivation(false);
      setCodesDeSecours(null);
      setEtat(await getMfaEtat());
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Code invalide");
    } finally {
      setOccupe(false);
    }
  }

  const champCode = (
    <input
      required
      autoFocus
      inputMode="text"
      autoComplete="one-time-code"
      placeholder="123456"
      value={code}
      onChange={(e) => setCode(e.target.value)}
      className="w-36 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-center tracking-[0.18em] outline-none focus:border-[var(--primary)]"
    />
  );

  if (invite) {
    return (
      <Panel title="Double authentification">
        <Row
          label="Réservée aux comptes"
          description="Une session invitée n'a pas de mot de passe : il n'y a pas de second facteur à lui ajouter. Créez un compte pour protéger vos conversations, vos souvenirs et vos connecteurs."
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

  return (
    <>
      {erreur && (
        <p className="mb-4 rounded-xl border border-[var(--error)] px-3 py-2 text-sm text-[var(--error)]">
          {erreur}
        </p>
      )}

      {/* LES CODES DE SECOURS, MONTRÉS UNE SEULE FOIS.
          Ils sont hachés côté serveur : ni nous ni personne ne pouvons les
          relire. Le bandeau reste tant que l'utilisateur ne l'a pas fermé —
          disparaître tout seul serait perdre l'unique occasion de les noter. */}
      {codesDeSecours && (
        <div className="mb-6 rounded-[14px] border border-[var(--primary)] bg-[var(--cx-surface)] p-4">
          <p className="mb-1 text-sm font-semibold">Vos codes de secours</p>
          <p className="mb-3 text-xs text-[var(--text-secondary)]">
            Notez-les maintenant et rangez-les hors de votre téléphone. Ils ne
            seront plus jamais affichés — ils sont chiffrés sur nos serveurs, et
            nous ne pouvons pas les relire. Sans eux, un téléphone perdu ferait
            un compte perdu.
          </p>
          <ul className="mb-3 grid grid-cols-2 gap-1.5 font-mono text-sm">
            {codesDeSecours.map((c) => (
              <li key={c} className="rounded-md bg-[var(--hover)] px-2 py-1 text-center">
                {c}
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <button
              onClick={() => navigator.clipboard.writeText(codesDeSecours.join("\n"))}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs transition hover:bg-[var(--hover)]"
            >
              Copier
            </button>
            <button
              onClick={() => setCodesDeSecours(null)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-white transition"
              style={{ background: "var(--primary)" }}
            >
              Je les ai notés
            </button>
          </div>
        </div>
      )}

      <Panel title="Double authentification">
        {etat === null ? (
          <Row
            label={erreur ? "État indisponible" : "Chargement…"}
            description={
              erreur
                ? "Impossible de lire l'état de la double authentification. Rechargez la page dans un instant."
                : undefined
            }
          />
        ) : etat.enabled ? (
          <>
            <Row
              label="Active"
              description={`Une application d'authentification est exigée à chaque connexion. Il vous reste ${etat.recovery_codes_left} code${etat.recovery_codes_left > 1 ? "s" : ""} de secours.`}
            >
              <span className="shrink-0 rounded-full bg-[var(--hover)] px-2.5 py-1 text-xs text-[var(--primary)]">
                Activée
              </span>
            </Row>
            {etat.recovery_codes_left <= 2 && (
              <Row
                label="Renouveler vos codes de secours"
                description="Il vous en reste peu. En générer de nouveaux annule les anciens."
                stacked
              >
                <form onSubmit={regenerer} className="flex items-center gap-2">
                  {champCode}
                  <button
                    type="submit"
                    disabled={occupe || !code.trim()}
                    className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs transition hover:bg-[var(--hover)] disabled:opacity-40"
                  >
                    Générer
                  </button>
                </form>
              </Row>
            )}
            <Row
              label="Désactiver"
              description="Votre compte ne tiendra plus qu'à son mot de passe."
              stacked={desactivation}
            >
              {desactivation ? (
                <form onSubmit={retirer} className="flex items-center gap-2">
                  {champCode}
                  <button
                    type="button"
                    onClick={() => {
                      setDesactivation(false);
                      setCode("");
                    }}
                    className="rounded-lg px-3 py-2 text-xs text-[var(--text-secondary)] transition hover:bg-[var(--hover)]"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={occupe || !code.trim()}
                    className="rounded-lg px-3 py-2 text-xs font-medium text-white transition disabled:opacity-40"
                    style={{ background: "var(--error)" }}
                  >
                    Désactiver
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setDesactivation(true)}
                  className="shrink-0 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--error)] transition hover:bg-[var(--hover)]"
                >
                  Désactiver
                </button>
              )}
            </Row>
          </>
        ) : enrolement ? (
          <Row
            label="Scannez ce QR dans votre application"
            description="Google Authenticator, Aegis, 1Password, Bitwarden… puis saisissez le code affiché pour confirmer. Rien n'est activé tant que ce code n'est pas vérifié."
            stacked
          >
            <div className="flex flex-col gap-3">
              {/* Encodé sur place. Le secret ne quitte jamais le navigateur
                  autrement que vers notre propre serveur, qui le lui a
                  donné. */}
              {qr && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qr}
                  alt="QR code de configuration de la double authentification"
                  width={180}
                  height={180}
                  className="rounded-lg bg-white p-2"
                />
              )}
              <p className="text-xs text-[var(--text-secondary)]">
                Impossible de scanner ? Saisissez cette clé à la main :{" "}
                <span className="font-mono text-[var(--text-primary)]">
                  {enrolement.secret}
                </span>
              </p>
              <form onSubmit={confirmer} className="flex items-center gap-2">
                {champCode}
                <button
                  type="submit"
                  disabled={occupe || !code.trim()}
                  className="rounded-lg px-3 py-2 text-xs font-medium text-white transition disabled:opacity-40"
                  style={{ background: "var(--primary)" }}
                >
                  {occupe ? "…" : "Confirmer"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEnrolement(null);
                    setCode("");
                  }}
                  className="rounded-lg px-3 py-2 text-xs text-[var(--text-secondary)] transition hover:bg-[var(--hover)]"
                >
                  Annuler
                </button>
              </form>
            </div>
          </Row>
        ) : (
          <Row
            label="Inactive"
            description="Votre compte ne tient qu'à son mot de passe. Or c'est lui qui porte vos conversations, vos souvenirs, et vos connecteurs WhatsApp et Mail — une adresse compromise les ouvre tous d'un coup."
          >
            <button
              onClick={commencer}
              disabled={occupe}
              className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition disabled:opacity-40"
              style={{ background: "var(--primary)" }}
            >
              {occupe ? "…" : "Activer"}
            </button>
          </Row>
        )}
      </Panel>

      <Panel title="Ce que la double authentification change">
        <Row
          label="À chaque connexion, un code en plus"
          description="Le mot de passe seul ne suffit plus : il faut aussi le code à six chiffres de votre téléphone, qui change toutes les trente secondes."
        />
        <Row
          label="Vos sessions déjà ouvertes ne sont pas coupées"
          description="Activer la protection ne vous déconnecte pas de cet appareil. Elle s'applique aux connexions suivantes."
        />
        <Row
          label="Perdre son téléphone n'est pas perdre son compte"
          description="C'est le rôle des codes de secours : chacun vaut une connexion, une seule fois. Notez-les ailleurs que sur le téléphone qu'ils sont censés remplacer."
        />
      </Panel>
    </>
  );
}
