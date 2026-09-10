"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Ban,
  Bolt,
  Check,
  ContactRound,
  Eye,
  FileText,
  Folder,
  Image as ImageLucide,
  List,
  MessageSquareText,
  Mic,
  Minus,
  Paperclip,
  Pencil,
  Phone,
  RefreshCw,
  Search,
  Settings,
  UserRound,
  UsersRound,
  Video,
  X,
} from "lucide-react";
import {
  getWaCapacites,
  getWaSettings,
  updateWaSettings,
  type WaCapacites,
  type WaSettings,
} from "@/lib/connectors-api";
import { WhatsAppIcon } from "./BrandIcons";
import { cxScopeClass, cxScopeStyle, cxDisplayStyle } from "./cx-fonts";
import { Segmented } from "./Rows";

type BoolKey = Exclude<keyof WaSettings, "status_audience">;

interface PermDef {
  key: BoolKey;
  label: string;
  desc: string;
  icon: React.ReactNode;
  /** LA CAPACITE QUI REND CETTE PERMISSION REELLE.
   *
   * Une permission accordee a un connecteur qui ne sait pas l'exercer est un
   * interrupteur qui ne commande rien : on l'active, et l'action echoue quand
   * meme. Quand la capacite manque, l'interrupteur est desactive et la raison
   * s'affiche a la place de la description.
   *
   * Les envois et les lectures n'en portent pas : toutes les versions de la
   * passerelle les ont toujours servis. */
  capacite?: string;
}

const GROUPS: { title: string; items: PermDef[] }[] = [
  {
    title: "Envoi",
    items: [
      { key: "send_text", label: "Messages texte", desc: "Envoyer des messages écrits à vos contacts et groupes.", icon: <ChatIcon /> },
      { key: "send_voice", label: "Messages vocaux", desc: "Envoyer des notes vocales et de l'audio.", icon: <MicIcon /> },
      { key: "send_image", label: "Images", desc: "Envoyer des photos et images générées.", icon: <ImageIcon /> },
      { key: "send_video", label: "Vidéos", desc: "Envoyer des vidéos.", icon: <VideoIcon /> },
      { key: "send_document", label: "Documents", desc: "Envoyer des PDF, Word, Excel…", icon: <DocIcon /> },
      { key: "send_file", label: "Autres fichiers", desc: "Stickers, sondages, positions géographiques.", icon: <ClipIcon /> },
      { key: "post_status", label: "Statuts (stories)", desc: "Publier des statuts texte ou image en votre nom.", icon: <StatusIcon /> },
    ],
  },
  {
    title: "Lecture & analyse",
    items: [
      { key: "read_messages", label: "Lire les messages", desc: "Consulter vos conversations, non-lus et statuts reçus.", icon: <EyeIcon /> },
      { key: "summaries", label: "Résumés", desc: "Résumer vos conversations et groupes.", icon: <SummaryIcon /> },
      { key: "search", label: "Recherche", desc: "Rechercher un mot-clé dans vos messages.", icon: <SearchIcon /> },
      { key: "analyze", label: "Analyse", desc: "Sentiment, export PDF, mémoire de conversation.", icon: <ChartIcon /> },
    ],
  },
  {
    title: "Gestion & confidentialité",
    items: [
      { key: "manage_messages", label: "Gérer les messages", desc: "Réagir, transférer, modifier, marquer comme lu.", icon: <ManageIcon /> },
      { key: "sync_contacts", label: "Synchroniser les contacts", desc: "Resynchroniser votre carnet d'adresses.", icon: <SyncIcon />, capacite: "contacts.lister" },
      { key: "save_contacts", label: "Fiches contact", desc: "Enregistrer et partager des fiches contact.", icon: <ContactIcon />, capacite: "contacts.enregistrer" },
      { key: "advanced", label: "Fonctions avancées", desc: "Mode furtif, présence, messages éphémères…", icon: <BoltIcon /> },
    ],
  },
  {
    title: "Compte WhatsApp",
    items: [
      { key: "manage_account", label: "Profil & confidentialité", desc: "Changer votre nom affiché, votre « à propos », votre photo, vos réglages de confidentialité.", icon: <AccountIcon />, capacite: "profil.nom" },
      { key: "manage_contacts", label: "Contacts", desc: "Bloquer ou débloquer, enregistrer, renommer, retirer un contact.", icon: <BlockIcon />, capacite: "contacts.bloquer" },
      { key: "manage_groups", label: "Groupes", desc: "Créer un groupe, ajouter ou retirer des membres, nommer des admins, quitter.", icon: <GroupIcon />, capacite: "groupes.membres" },
      { key: "manage_chats", label: "Conversations", desc: "Archiver, épingler, mettre en sourdine, vider ou supprimer une conversation.", icon: <FolderIcon />, capacite: "conversations.organiser" },
      { key: "calls", label: "Appels", desc: "Consulter le journal des appels reçus et rejeter un appel en cours.", icon: <PhoneIcon />, capacite: "appels.rejeter" },
    ],
  },
];

/** Panneau de contrôle complet des permissions WhatsApp — chaque interrupteur
 * est appliqué immédiatement côté backend (registre d'outils) : ce que vous
 * désactivez ici, l'IA ne peut plus le faire, même si on le lui demande. */
export function WhatsAppPermissionsPanel({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<WaSettings | null>(null);
  const [capacites, setCapacites] = useState<WaCapacites | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState(0);

  useEffect(() => {
    getWaSettings()
      .then(setSettings)
      .catch((err) => setError(err instanceof Error ? err.message : "Chargement impossible"));
    // Les capacites sont un confort : si elles n'arrivent pas, le panneau reste
    // utilisable et se contente de ne rien griser. Une permission grisee a tort
    // serait pire qu'une permission qui echoue une fois.
    getWaCapacites().then(setCapacites).catch(() => {});
  }, []);

  /** `null` quand la permission est exercable ; sinon la raison, a afficher. */
  function indisponible(p: PermDef): string | null {
    if (!p.capacite || !capacites) return null;
    // ON NE GRISE QUE SUR UNE ABSENCE DECLAREE.
    //
    // Tant que la passerelle en service ne repond pas a /capabilities, la
    // source vaut « inconnu ». Griser sur cette base retirerait a
    // l'utilisateur des permissions qui fonctionnent parfaitement, sans
    // qu'aucun ecran ne lui dise pourquoi. C'est exactement ce qui est arrive
    // cote serveur le 05/09/2026, et la lecon vaut ici : le doute laisse
    // passer, et la passerelle tranche au moment de l'action.
    if (capacites.source !== "passerelle") return null;
    if (capacites.capacites?.[p.capacite]) return null;
    const definitif = capacites.impossibles?.[p.capacite];
    if (definitif) return definitif;
    return "La version du connecteur en service ne sait pas encore le faire.";
  }

  async function patch(p: Partial<WaSettings>) {
    if (!settings) return;
    const prev = settings;
    setSettings({ ...settings, ...p });
    setError(null);
    try {
      await updateWaSettings(p);
      setSavedAt(Date.now());
    } catch (err) {
      setSettings(prev);
      setError(err instanceof Error ? err.message : "Échec de l'enregistrement");
    }
  }

  return (
    <div
      className={`${cxScopeClass} fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm`}
      style={cxScopeStyle}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Permissions WhatsApp"
    >
      <div
        className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[18px] border border-[var(--cx-border-default)] bg-[var(--cx-surface)]"
        style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3.5 border-b border-[var(--cx-border-subtle)] px-6 py-4">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
            style={{ background: "#ffffff", boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }}
            aria-hidden="true"
          >
            <WhatsAppIcon size={24} />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              className="text-[19px] font-medium tracking-[-0.01em] text-[var(--cx-text-primary)]"
              style={cxDisplayStyle}
            >
              Permissions WhatsApp
            </h2>
            <p className="text-xs text-[var(--cx-text-muted)]">
              Contrôlez précisément ce que Toumaï AI peut faire sur votre compte.
            </p>
          </div>
          {savedAt > 0 && (
            <span
              className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
              style={{
                color: "var(--cx-success-text)",
                background: "var(--cx-success-bg)",
                borderColor: "var(--cx-success-border)",
              }}
            >
              <CheckMini /> Enregistré
            </span>
          )}
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--cx-text-muted)] transition hover:bg-[var(--cx-hover)] hover:text-[var(--cx-text-primary)]"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {!settings && !error && (
            <div className="space-y-3" aria-hidden="true">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-[14px] bg-[var(--cx-input)]" />
              ))}
            </div>
          )}
          {error && <p className="mb-3 text-sm text-[var(--cx-error-text)]">{error}</p>}

          {settings &&
            GROUPS.map((group) => (
              <section key={group.title} className="mb-6">
                <h3 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--cx-text-label)]">
                  {group.title}
                </h3>
                <div className="overflow-hidden rounded-[14px] border border-[var(--cx-border-subtle)] bg-[var(--cx-surface)]">
                  {group.items.map((p) => {
                    const raison = indisponible(p);
                    const on = settings[p.key] && !raison;
                    return (
                      <div
                        key={p.key}
                        className="flex items-center gap-3.5 border-t border-[var(--cx-border-subtle)] px-4 py-3 transition-colors first:border-t-0 hover:bg-[var(--cx-hover-row)]"
                        style={raison ? { opacity: 0.55 } : undefined}
                      >
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] transition-colors"
                          style={
                            on
                              ? { background: "var(--cx-accent-bg)", color: "var(--cx-accent-text)" }
                              : { background: "var(--cx-hover)", color: "var(--cx-text-faint)" }
                          }
                          aria-hidden="true"
                        >
                          {p.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p
                            className="text-sm font-medium transition-colors"
                            style={{ color: on ? "var(--cx-text-primary)" : "var(--cx-text-muted)" }}
                          >
                            {p.label}
                          </p>
                          <p className="text-xs text-[var(--cx-text-muted)]">
                            {raison || p.desc}
                          </p>
                        </div>
                        <CxSwitch
                          checked={on}
                          label={p.label}
                          disabled={!!raison}
                          onChange={(v) => patch({ [p.key]: v } as Partial<WaSettings>)}
                        />
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}

          {settings && (
            <section className="mb-2">
              <h3 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--cx-text-label)]">
                Audience des statuts publiés par l&apos;IA
              </h3>
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-[14px] border border-[var(--cx-border-subtle)] bg-[var(--cx-surface)] px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-[var(--cx-text-primary)]">Partager avec</p>
                  <p className="text-xs text-[var(--cx-text-muted)]">
                    Qui voit les statuts que Toumaï AI publie pour vous.
                  </p>
                </div>
                <Segmented
                  options={[
                    { value: "all", label: "Tous" },
                    { value: "contacts", label: "Mes contacts" },
                  ]}
                  value={settings.status_audience}
                  onChange={(v) => patch({ status_audience: v })}
                />
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

/** Interrupteur « Pro » — état explicite : libellé Actif/Inactif + rail accent
 * avec coche dans le pouce quand la permission est accordée. */
function CxSwitch({
  checked,
  label,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  label: string;
  onChange: (v: boolean) => void;
  /** Le connecteur ne sait pas exercer cette permission : l'accorder ne
   *  changerait rien, et laisserait croire le contraire. */
  disabled?: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2.5">
      <span
        className="hidden w-[42px] text-right text-[11px] font-semibold sm:block"
        style={{ color: checked ? "var(--cx-success-text)" : "var(--cx-text-faint)" }}
        aria-hidden="true"
      >
        {disabled ? "Indispo." : checked ? "Actif" : "Inactif"}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className="relative h-[26px] w-[46px] rounded-full border transition-colors disabled:cursor-not-allowed"
        style={
          checked
            ? { background: "var(--cx-accent)", borderColor: "var(--cx-accent)" }
            : { background: "var(--cx-input)", borderColor: "var(--cx-border-strong)" }
        }
      >
        <span
          className="absolute top-1/2 flex h-[20px] w-[20px] -translate-y-1/2 items-center justify-center rounded-full bg-white transition-all"
          style={{
            left: checked ? "23px" : "2px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.35)",
            color: checked ? "var(--cx-accent)" : "var(--cx-text-faint)",
          }}
        >
          {checked ? <CheckMini /> : <MinusMini />}
        </span>
      </button>
    </div>
  );
}

/* Les icônes d’interface viennent de Lucide. Les marques conservent leurs
 * logos officiels dédiés dans BrandIcons. */
const iconProps = { size: 16, strokeWidth: 1.8 } as const;
function CloseIcon() { return <X size={16} strokeWidth={2} />; }
function CheckMini() { return <Check size={11} strokeWidth={3.2} />; }
function MinusMini() { return <Minus size={10} strokeWidth={3} />; }
function ChatIcon() { return <MessageSquareText {...iconProps} />; }
function MicIcon() { return <Mic {...iconProps} />; }
function ImageIcon() { return <ImageLucide {...iconProps} />; }
function VideoIcon() { return <Video {...iconProps} />; }
function DocIcon() { return <FileText {...iconProps} />; }
function ClipIcon() { return <Paperclip {...iconProps} />; }
function StatusIcon() { return <Settings {...iconProps} />; }
function EyeIcon() { return <Eye {...iconProps} />; }
function SummaryIcon() { return <List {...iconProps} />; }
function SearchIcon() { return <Search {...iconProps} />; }
function ChartIcon() { return <BarChart3 {...iconProps} />; }
function ManageIcon() { return <Pencil {...iconProps} />; }
function SyncIcon() { return <RefreshCw {...iconProps} />; }
function ContactIcon() { return <ContactRound {...iconProps} />; }
function BoltIcon() { return <Bolt {...iconProps} />; }
function AccountIcon() { return <UserRound {...iconProps} />; }
function BlockIcon() { return <Ban {...iconProps} />; }
function GroupIcon() { return <UsersRound {...iconProps} />; }
function FolderIcon() { return <Folder {...iconProps} />; }
function PhoneIcon() { return <Phone {...iconProps} />; }
