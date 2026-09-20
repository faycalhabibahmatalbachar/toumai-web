"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  getMfaEtat,
  mfaDesactiver,
  mfaEnroler,
  mfaNouveauxCodes,
  mfaVerifier,
  testerAlertesSecurite,
  type MfaEnrolement,
  type MfaEtat,
  type SecurityNotificationTestResult,
} from "@/lib/user-api";
import {
  testNotificationChannels,
  type NotificationChannelTestResult,
  type RealtimeNotification,
} from "@/lib/notifications-api";
import { enableWebPush, webPushState } from "@/lib/web-push";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Panel, Row } from "./Rows";

type DiagnosticState = "pending" | "ok" | "warning" | "error" | "unavailable";
type DiagnosticKey =
  | "push_mobile"
  | "web_push"
  | "inbox"
  | "realtime"
  | "voice"
  | "email";

type DiagnosticItem = {
  state: DiagnosticState;
  detail: string;
};

type Diagnostics = Record<DiagnosticKey, DiagnosticItem>;

const DIAGNOSTIC_LABELS: Record<DiagnosticKey, string> = {
  push_mobile: "Push mobile Toumaï",
  web_push: "Notification Web / navigateur",
  inbox: "Inbox Toumaï",
  realtime: "Temps réel dans Toumaï",
  voice: "Voix Toumaï",
  email: "E-mail",
};

const DIAGNOSTIC_ORDER: DiagnosticKey[] = [
  "push_mobile",
  "web_push",
  "inbox",
  "realtime",
  "voice",
  "email",
];

function diagnosticInitial(): Diagnostics {
  return {
    push_mobile: { state: "pending", detail: "Vérification du Push FCM…" },
    web_push: { state: "pending", detail: "Préparation du navigateur…" },
    inbox: { state: "pending", detail: "Création d’une notification durable…" },
    realtime: { state: "pending", detail: "Attente du flux temps réel…" },
    voice: { state: "pending", detail: "Attente de la lecture vocale…" },
    email: { state: "pending", detail: "Vérification de l’envoi e-mail…" },
  };
}

function diagnosticBadge(state: DiagnosticState): string {
  if (state === "ok") return "✓ Confirmé";
  if (state === "pending") return "En cours…";
  if (state === "unavailable") return "Indisponible";
  if (state === "warning") return "Non confirmé";
  return "Échec";
}

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
  const invite = !session;
  const [etat, setEtat] = useState<MfaEtat | null>(null);
  const [enrolement, setEnrolement] = useState<MfaEnrolement | null>(null);
  const [code, setCode] = useState("");
  const [codesDeSecours, setCodesDeSecours] = useState<string[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [desactivation, setDesactivation] = useState(false);
  const [testAlertesOccupe, setTestAlertesOccupe] = useState(false);
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const [diagnosticErreur, setDiagnosticErreur] = useState<string | null>(null);
  /** Le QR, encodé DANS le navigateur.
   *
   * La première version passait par un service d'image tiers — ce qui
   * revenait à envoyer le secret TOTP en clair, dans une URL, à un serveur
   * qui n'a rien à voir avec ce produit. Un second facteur dont le secret
   * transite par un inconnu n'est plus un second facteur. */
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    if (!enrolement) {
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

  async function testerLesAlertes() {
    const testId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `test-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    setDiagnosticErreur(null);
    setDiagnostics(diagnosticInitial());
    setTestAlertesOccupe(true);

    const patch = (key: DiagnosticKey, item: DiagnosticItem) => {
      setDiagnostics((current) =>
        current ? { ...current, [key]: item } : current,
      );
    };

    const matches = (notification?: RealtimeNotification | null) =>
      notification?.test_id === testId;

    const onArrival = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          notification?: RealtimeNotification;
          source?: "sse" | "web_push";
        }>
      ).detail;
      if (!matches(detail?.notification)) return;
      if (detail?.source === "sse") {
        patch("realtime", {
          state: "ok",
          detail: "Reçu en direct par le flux SSE authentifié de Toumaï.",
        });
      }
      if (detail?.source === "web_push") {
        patch("web_push", {
          state: "ok",
          detail: "Reçu réellement par le service worker de ce navigateur.",
        });
      }
    };

    const onVoiceComplete = (event: Event) => {
      const notification = (
        event as CustomEvent<RealtimeNotification>
      ).detail;
      if (!matches(notification)) return;
      patch("voice", {
        state: "ok",
        detail: "Zenaba a lu la phrase de test jusqu’à la fin.",
      });
    };

    const onVoiceError = (event: Event) => {
      const notification = (
        event as CustomEvent<RealtimeNotification>
      ).detail;
      if (!matches(notification)) return;
      patch("voice", {
        state: "error",
        detail: "Zenaba n’a pas pu terminer la lecture de la phrase de test.",
      });
    };

    window.addEventListener("toumai:notification-arrival", onArrival);
    window.addEventListener("toumai:notification-voice-complete", onVoiceComplete);
    window.addEventListener("toumai:notification-voice-error", onVoiceError);

    let channelsResult: NotificationChannelTestResult | null = null;

    try {
      const audioSupported = typeof Audio !== "undefined";
      if (!audioSupported) {
        patch("voice", {
          state: "unavailable",
          detail: "Ce navigateur ne peut pas lire l’audio Zenaba.",
        });
      }

      try {
        const current = await webPushState();
        if (!current.supported) {
          patch("web_push", {
            state: "unavailable",
            detail: "Ce navigateur ne prend pas en charge Web Push.",
          });
        } else if (current.permission === "denied") {
          patch("web_push", {
            state: "unavailable",
            detail: "Les notifications sont bloquées dans les réglages du navigateur.",
          });
        } else if (!current.subscribed) {
          const enabled = await enableWebPush();
          if (!enabled.subscribed) {
            patch("web_push", {
              state: "unavailable",
              detail: "L’autorisation Web Push n’a pas été accordée.",
            });
          }
        }
      } catch (error) {
        patch("web_push", {
          state: "error",
          detail:
            error instanceof Error
              ? error.message
              : "Impossible de préparer Web Push.",
        });
      }

      const [channels, security] = await Promise.allSettled([
        testNotificationChannels(testId),
        testerAlertesSecurite(),
      ]);

      if (channels.status === "fulfilled") {
        channelsResult = channels.value;
        patch("inbox", {
          state: channels.value.inbox.ok ? "ok" : "error",
          detail: channels.value.inbox.ok
            ? "Notification durable créée dans votre Inbox Toumaï."
            : "La notification durable n’a pas été créée.",
        });

        const web = channels.value.web_push;
        if (web.sent > 0) {
          setDiagnostics((current) => {
            if (!current || current.web_push.state !== "pending") return current;
            return {
              ...current,
              web_push: {
                state: "pending",
                detail: `Envoyé au service Push (${web.sent}). Attente de la réception dans ce navigateur…`,
              },
            };
          });
        } else if (!web.configured) {
          patch("web_push", {
            state: "error",
            detail: "Le fournisseur Web Push n’est pas configuré.",
          });
        } else if (web.subscriptions === 0) {
          patch("web_push", {
            state: "unavailable",
            detail: "Aucune souscription Web Push active pour ce compte.",
          });
        } else {
          patch("web_push", {
            state: "error",
            detail: `Aucun envoi Web Push confirmé · échecs: ${web.failed}.`,
          });
        }
      } else {
        const message =
          channels.reason instanceof Error
            ? channels.reason.message
            : "Le diagnostic multicanal n’a pas pu démarrer.";
        patch("inbox", { state: "error", detail: message });
        patch("realtime", { state: "error", detail: message });
        if (audioSupported) patch("voice", { state: "error", detail: message });
      }

      if (security.status === "fulfilled") {
        const result: SecurityNotificationTestResult = security.value;
        if (result.push_ok) {
          patch("push_mobile", {
            state: "ok",
            detail: `Accepté par FCM sur ${result.push_successes} appareil${result.push_successes > 1 ? "s" : ""}.`,
          });
        } else if (result.push_failures > 0) {
          patch("push_mobile", {
            state: "error",
            detail: `FCM a signalé ${result.push_failures} échec${result.push_failures > 1 ? "s" : ""}.`,
          });
        } else {
          patch("push_mobile", {
            state: "unavailable",
            detail: "Aucun appareil mobile avec token FCM actif n’est enregistré.",
          });
        }

        patch("email", {
          state: result.email_ok ? "ok" : "warning",
          detail: result.email_ok
            ? "E-mail de test accepté par le service d’envoi."
            : "L’e-mail n’a pas pu être confirmé.",
        });
      } else {
        const message =
          security.reason instanceof Error
            ? security.reason.message
            : "Test Push/e-mail indisponible.";
        patch("push_mobile", { state: "warning", detail: message });
        patch("email", { state: "warning", detail: message });
      }

      await new Promise((resolve) => window.setTimeout(resolve, 10_000));

      setDiagnostics((current) => {
        if (!current) return current;
        const next = { ...current };
        if (next.realtime.state === "pending") {
          next.realtime = {
            state: channelsResult?.realtime.requested ? "warning" : "error",
            detail: "Aucun événement temps réel n’a été observé dans les 10 secondes.",
          };
        }
        if (next.voice.state === "pending") {
          next.voice = {
            state: "warning",
            detail: "La lecture vocale n’a pas été confirmée dans les 10 secondes.",
          };
        }
        if (next.web_push.state === "pending") {
          next.web_push = {
            state: "warning",
            detail: "Envoi accepté, mais réception par ce navigateur non observée dans les 10 secondes.",
          };
        }
        return next;
      });
    } catch (e) {
      setDiagnosticErreur(
        e instanceof Error ? e.message : "Impossible de terminer le diagnostic.",
      );
    } finally {
      window.removeEventListener("toumai:notification-arrival", onArrival);
      window.removeEventListener("toumai:notification-voice-complete", onVoiceComplete);
      window.removeEventListener("toumai:notification-voice-error", onVoiceError);
      setTestAlertesOccupe(false);
    }
  }

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

      <Panel title="Diagnostic des notifications">
        <Row
          label="Tester tous les canaux"
          description="Déclenche de vrais envois sur votre compte : Push mobile, Web Push, Inbox, temps réel, voix Toumaï et e-mail. Le navigateur peut vous demander l’autorisation des notifications."
        >
          <button
            type="button"
            onClick={() => void testerLesAlertes()}
            disabled={testAlertesOccupe}
            className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition disabled:opacity-40"
            style={{ background: "var(--primary)" }}
          >
            {testAlertesOccupe ? "Test en cours…" : "Tester tous les canaux"}
          </button>
        </Row>

        {diagnostics &&
          DIAGNOSTIC_ORDER.map((key) => {
            const item = diagnostics[key];
            return (
              <Row
                key={key}
                label={DIAGNOSTIC_LABELS[key]}
                description={item.detail}
              >
                <span
                  className="shrink-0 rounded-full border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]"
                  aria-live="polite"
                >
                  {diagnosticBadge(item.state)}
                </span>
              </Row>
            );
          })}

        {diagnosticErreur && (
          <Row
            label="Diagnostic interrompu"
            description={diagnosticErreur}
          />
        )}
      </Panel>

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
