"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { publishSite } from "@/lib/sites-api";
import { injectSafetyNet } from "@/lib/project-parser";

/** Extrait le contenu d'un unique bloc ```html d'un message terminé. */
export function extractHtml(content: string): string | null {
  const m = content.match(/```html[^\n]*\n([\s\S]*?)```/i);
  if (!m) return null;
  const code = m[1].trim();
  return code.length > 40 ? code : null;
}

/** Carte de construction animée — affichée pendant que Toumaï AI génère un
 * site (bloc ```html en cours de streaming). Donne un feedback vivant façon
 * « atelier » plutôt que du code brut qui défile : phases qui s'enchaînent,
 * barre de progression, lignes de code déjà écrites. */

const PHASES = [
  "Analyse de la demande",
  "Structure de la page (HTML)",
  "Styles & mise en page (CSS)",
  "Interactions & scripts (JS)",
  "Finalisation et vérification",
];

export function SiteBuildingCard({ code }: { code: string }) {
  const codeLength = code.length;
  const [phase, setPhase] = useState(0);
  const scrollRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const target = Math.min(PHASES.length - 1, Math.floor(codeLength / 900));
    if (target > phase) {
      const t = setTimeout(() => setPhase((p) => Math.min(target, p + 1)), 200);
      return () => clearTimeout(t);
    }
  }, [codeLength, phase]);

  // Défilement auto vers le bas du code écrit (effet « frappe live »).
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [code]);

  const pct = Math.min(96, Math.round(((phase + 1) / PHASES.length) * 100));
  const lines = code ? code.split("\n").length : 0;
  // Dernières lignes écrites — vue « éditeur en direct ».
  const tail = code.split("\n").slice(-14).join("\n");

  return (
    <div className="my-2 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center gap-3 px-4 py-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
          style={{ background: "linear-gradient(135deg, var(--primary), var(--thinking))" }}
          aria-hidden="true"
        >
          <BuildIcon />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Toumaï AI construit votre site…</p>
          <p className="truncate text-xs text-[var(--text-tertiary)]">
            <span className="font-mono">index.html</span> · {PHASES[phase]} · {lines} lignes
          </p>
        </div>
        <span className="shrink-0 text-sm font-semibold tabular-nums" style={{ color: "var(--primary)" }}>
          {pct}%
        </span>
      </div>

      <div className="h-1 w-full bg-[var(--card)]">
        <div
          className="h-full rounded-r-full transition-all duration-500"
          style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--primary), var(--thinking))" }}
        />
      </div>

      {/* Vue « éditeur » — le code qui s'écrit en direct, façon IDE. */}
      <pre
        ref={scrollRef}
        className="max-h-40 overflow-hidden whitespace-pre-wrap break-all border-t border-[var(--border)] bg-[#0d0d0f] px-4 py-3 font-mono text-[11.5px] leading-relaxed text-[#c9c6be]"
      >
        {tail}
        <span className="streaming-cursor" style={{ color: "var(--primary)" }}>▋</span>
      </pre>

      <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 px-4 py-3 sm:grid-cols-3">
        {PHASES.map((label, i) => (
          <li key={label} className="flex items-center gap-2 text-[11px]">
            <span
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
              style={{
                background:
                  i < phase ? "var(--success)" : i === phase ? "color-mix(in srgb, var(--primary) 20%, transparent)" : "var(--card)",
                color: i < phase ? "#fff" : "var(--primary)",
              }}
              aria-hidden="true"
            >
              {i < phase ? <CheckMini /> : i === phase ? <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: "var(--primary)" }} /> : null}
            </span>
            <span style={{ color: i <= phase ? "var(--text-secondary)" : "var(--text-tertiary)" }}>{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Suggestions d'amélioration cliquables — proposées sous un site généré.
 * Un clic renvoie la demande dans le chat pour itérer sur le site. */
/** Construit un prompt d'édition 100% FIDÈLE : le code EXACT du site est
 * ré-injecté pour que l'IA reparte de l'existant réel (pas de sa mémoire). */
export function buildEditPrompt(currentHtml: string, instruction: string): string {
  return (
    `Voici le CODE EXACT du site actuel. Modifie-le pour : ${instruction}\n` +
    "Garde tout le reste À L'IDENTIQUE (contenu, sections, structure) et renvoie le SITE COMPLET " +
    "mis à jour dans un seul bloc ```html.\n\n" +
    "```html\n" +
    currentHtml +
    "\n```"
  );
}

/** Script injecté dans l'aperçu pour SÉLECTIONNER un élément : surligne au
 * survol, capture au clic (sélecteur + texte) et l'envoie au parent. */
const ELEMENT_PICKER = `
<script>
(function(){
  var last;
  function sel(el){
    if(el.id) return '#'+el.id;
    var p=el.tagName.toLowerCase();
    if(el.className && typeof el.className==='string'){
      var c=el.className.trim().split(/\\s+/).filter(function(x){return x && x.indexOf('aos')<0;}).slice(0,2).join('.');
      if(c) p+='.'+c;
    }
    return p;
  }
  document.documentElement.style.cursor='crosshair';
  document.addEventListener('mouseover',function(e){
    if(last){ last.style.outline=''; last.style.outlineOffset=''; }
    last=e.target; if(last && last.style){ last.style.outline='2px solid #e8683a'; last.style.outlineOffset='1px'; }
  },true);
  document.addEventListener('click',function(e){
    e.preventDefault(); e.stopPropagation();
    var el=e.target;
    try{ parent.postMessage({__toumaiPick:{selector:sel(el), tag:el.tagName.toLowerCase(), text:((el.innerText||'').trim()).slice(0,60)}},'*'); }catch(_){}
  },true);
})();
</script>`;

export function SiteSuggestions({
  onSuggest,
  html,
}: {
  onSuggest?: (text: string) => void;
  html?: string;
}) {
  if (!onSuggest) return null;
  const ideas = [
    { label: "🎨 Change les couleurs", instr: "adopte une palette de couleurs plus moderne et chaleureuse." },
    { label: "📱 Rends-le responsive", instr: "rends-le parfaitement responsive sur mobile et tablette." },
    { label: "✨ Ajoute des animations", instr: "ajoute des animations fluides et des transitions au survol partout." },
    { label: "🖼️ Ajoute une galerie", instr: "ajoute une belle section galerie d'images (vraies images loremflickr)." },
    { label: "📄 Ajoute des sous-pages", instr: "transforme-le en plusieurs pages (À propos, Contact…) avec navigation par liens entre les pages." },
  ].map((i) => ({
    label: i.label,
    // Si on a le code exact → édition fidèle ; sinon fallback sur l'historique.
    prompt: html
      ? buildEditPrompt(html, i.instr)
      : `Reprends EXACTEMENT le site que tu viens de créer et modifie-le pour : ${i.instr} Renvoie le SITE COMPLET mis à jour dans un seul bloc \`\`\`html.`,
  }));
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      <span className="mr-1 self-center text-xs text-[var(--text-tertiary)]">Améliorer :</span>
      {ideas.map((s) => (
        <button
          key={s.label}
          onClick={() => onSuggest(s.prompt)}
          className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--primary)]/60 hover:text-[var(--text-primary)]"
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

/** Carte « site terminé » — affiche l'APERÇU RENDU du site directement (pas le
 * code brut), avec plein écran, publication et suggestions. C'est ce que
 * l'utilisateur voit dès que l'IA finit : un vrai aperçu, façon artefact. */
export function SiteArtifactCard({
  html,
  onSuggest,
}: {
  html: string;
  onSuggest?: (text: string) => void;
}) {
  const [full, setFull] = useState(false);
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [publishing, setPublishing] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // Sélecteur d'élément : cibler visuellement une partie du site à modifier.
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<{ selector: string; tag: string; text: string } | null>(null);
  const [pickInstr, setPickInstr] = useState("");
  // Filet de sécurité : le contenu reste visible même si le JS du site échoue.
  const safeHtml = useMemo(() => injectSafetyNet(html), [html]);
  // Version avec sélecteur d'élément injecté (surlignage + capture au clic).
  const pickHtml = useMemo(() => safeHtml + ELEMENT_PICKER, [safeHtml]);

  // Reçoit l'élément cliqué dans l'aperçu.
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const p = e.data && (e.data as { __toumaiPick?: typeof picked }).__toumaiPick;
      if (p) {
        setPicked(p);
        setPicking(false);
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  function sendTargetedEdit() {
    if (!picked || !onSuggest) return;
    const target = picked.text
      ? `l'élément « ${picked.text} » (${picked.selector})`
      : `l'élément ${picked.selector}`;
    onSuggest(buildEditPrompt(html, `sur ${target}, ${pickInstr}`));
    setPicked(null);
    setPickInstr("");
    setFull(false);
  }

  async function publish() {
    setPublishing(true);
    try {
      const title = (html.match(/<title>([^<]{1,80})<\/title>/i)?.[1] || "Mon site").trim();
      const res = await publishSite(safeHtml, title);
      setUrl(`${window.location.origin}${res.path}`);
    } catch {
      /* garde le bouton */
    } finally {
      setPublishing(false);
    }
  }
  function download() {
    const blob = new Blob([safeHtml], { type: "text/html" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u;
    a.download = "toumai-site.html";
    a.click();
    URL.revokeObjectURL(u);
  }
  async function copyUrl() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="my-2 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center gap-2.5 px-4 py-2.5">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg text-white"
          style={{ background: "var(--success)" }}
          aria-hidden="true"
        >
          <CheckMini />
        </span>
        <span className="text-sm font-semibold">Votre site est prêt</span>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={() => setFull(true)}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
            style={{ background: "var(--primary)" }}
          >
            Ouvrir en plein écran
          </button>
        </div>
      </div>
      {/* Aperçu live inline — le site rendu, tout de suite. */}
      <div className="relative h-[380px] w-full border-t border-[var(--border)] bg-white">
        <iframe
          title="Aperçu du site"
          sandbox="allow-scripts allow-modals allow-forms allow-popups"
          srcDoc={safeHtml}
          className="h-full w-full border-0"
        />
      </div>
      <div className="flex flex-wrap items-center gap-1.5 border-t border-[var(--border)] px-3 py-2">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold"
            style={{ color: "var(--success)" }}
          >
            🌐 {url.replace(/^https?:\/\//, "")}
          </a>
        ) : (
          <button
            onClick={publish}
            disabled={publishing}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--primary)" }}
          >
            {publishing ? "Publication…" : "🌐 Publier en ligne"}
          </button>
        )}
        {url && (
          <button onClick={copyUrl} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--hover)]">
            {copied ? "Lien copié" : "Copier le lien"}
          </button>
        )}
        <button onClick={download} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--hover)]">
          Télécharger
        </button>
      </div>
      {onSuggest && <div className="px-3 pb-2.5"><SiteSuggestions onSuggest={onSuggest} html={html} /></div>}

      {full && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[var(--background)]">
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
            <button
              onClick={() => setFull(false)}
              aria-label="Fermer"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-tertiary)] transition hover:bg-[var(--hover)] hover:text-[var(--text-primary)]"
            >
              <XIcon />
            </button>
            <span className="text-sm font-semibold">Votre site</span>
            <div className="ml-auto flex items-center gap-1.5">
              <div className="flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--card)] p-0.5">
                {(["preview", "code"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className="rounded-md px-3 py-1 text-xs font-medium transition"
                    style={tab === t ? { background: "var(--surface)", color: "var(--text-primary)" } : { color: "var(--text-tertiary)" }}
                  >
                    {t === "preview" ? "Aperçu" : "Code"}
                  </button>
                ))}
              </div>
              {tab === "preview" && onSuggest && (
                <button
                  onClick={() => { setPicking((p) => !p); setPicked(null); }}
                  className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition"
                  style={
                    picking
                      ? { background: "var(--primary)", color: "#fff", borderColor: "var(--primary)" }
                      : { borderColor: "var(--border)", color: "var(--text-secondary)" }
                  }
                >
                  🎯 {picking ? "Cliquez un élément…" : "Cibler un élément"}
                </button>
              )}
              {!url && (
                <button
                  onClick={publish}
                  disabled={publishing}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                  style={{ background: "var(--primary)" }}
                >
                  {publishing ? "Publication…" : "Publier"}
                </button>
              )}
            </div>
          </div>

          {/* Barre de modification ciblée — après avoir cliqué un élément. */}
          {picked && (
            <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] px-4 py-2">
              <span className="text-xs text-[var(--text-secondary)]">
                🎯 Élément ciblé : <span className="font-mono">{picked.text || picked.selector}</span>
              </span>
              <input
                autoFocus
                value={pickInstr}
                onChange={(e) => setPickInstr(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && pickInstr.trim() && sendTargetedEdit()}
                placeholder="Que changer ici ? (ex : mets ce bouton en vert, agrandis ce titre…)"
                className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm outline-none focus:border-[var(--primary)]"
              />
              <button
                onClick={sendTargetedEdit}
                disabled={!pickInstr.trim()}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                style={{ background: "var(--primary)" }}
              >
                Appliquer
              </button>
              <button onClick={() => setPicked(null)} className="rounded-lg px-2 py-1.5 text-xs text-[var(--text-tertiary)]">
                Annuler
              </button>
            </div>
          )}

          {tab === "preview" ? (
            <iframe
              title="Aperçu plein écran"
              sandbox="allow-scripts allow-modals allow-forms allow-popups"
              srcDoc={picking ? pickHtml : safeHtml}
              className="w-full flex-1 border-0 bg-white"
            />
          ) : (
            <pre className="flex-1 overflow-auto bg-[var(--surface)] p-4 font-mono text-[12.5px] leading-relaxed">
              {html}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function XIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

function BuildIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path d="M3 9l9-6 9 6v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeLinejoin="round" />
      <path d="M9 22V12h6v10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckMini() {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2">
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
