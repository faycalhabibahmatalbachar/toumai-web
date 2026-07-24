"use client";

/** Analyse d'un projet MULTI-FICHIERS produit par l'IA + assemblage d'un
 * aperçu unifié. L'IA renvoie chaque fichier dans un bloc fenced dont l'info
 * porte le chemin, ex :
 *
 *   ```html title="index.html"
 *   ```css title="css/style.css"
 *   ```js title="js/app.js"
 *
 * On reconstitue l'arborescence, puis on FUSIONNE le tout dans un unique
 * document HTML (CSS + JS inline) pour un rendu visuel professionnel. */

export interface ProjectFile {
  path: string;
  lang: string;
  content: string;
}

const FILE_META = /(?:title|path|file|name)\s*[=:]\s*["'`]?([^"'`\n]+)["'`]?/i;

/** Extrait les fichiers d'un message. Retourne [] si ce n'est pas un projet
 * multi-fichiers (moins de 2 fichiers nommés). */
export function parseProject(content: string): ProjectFile[] {
  const files: ProjectFile[] = [];
  // Bloc fenced : ``` + langage + méta sur la 1re ligne, puis le code.
  const re = /```([^\n`]*)\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    const info = m[1].trim();
    const code = m[2].replace(/\n$/, "");
    const metaMatch = info.match(FILE_META);
    if (!metaMatch) continue; // pas de chemin → bloc ordinaire, ignoré ici
    const path = metaMatch[1].trim().replace(/^\.?\//, "");
    const lang = info.split(/\s+/)[0] || extFromPath(path);
    if (path) files.push({ path, lang, content: code });
  }
  // Dédoublonnage par chemin (garde la dernière version).
  const byPath = new Map<string, ProjectFile>();
  for (const f of files) byPath.set(f.path, f);
  return [...byPath.values()];
}

function extFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  return (
    { html: "html", css: "css", js: "javascript", mjs: "javascript", ts: "typescript", json: "json", svg: "xml", md: "markdown" }[
      ext
    ] || "text"
  );
}

/** Trouve le point d'entrée HTML (index.html en priorité). */
export function entryHtml(files: ProjectFile[]): ProjectFile | null {
  return (
    files.find((f) => /(^|\/)index\.html$/i.test(f.path)) ||
    files.find((f) => f.path.toLowerCase().endsWith(".html")) ||
    null
  );
}

/* ── Édition par patch SEARCH/REPLACE (façon Aider/Cursor) ─────────────────
 * L'IA renvoie SEULEMENT les portions modifiées ; on les applique au code
 * existant. Résultat : impossible de « recréer le site de zéro » — seules les
 * portions ciblées changent, le reste est garanti identique. */

export interface Patch {
  search: string;
  replace: string;
}

const SR_BLOCK =
  /<{3,}\s*SEARCH\s*\n([\s\S]*?)\n={3,}\s*\n([\s\S]*?)\n>{3,}\s*REPLACE/gi;

/** Extrait les blocs SEARCH/REPLACE d'une réponse. */
export function parseSearchReplace(text: string): Patch[] {
  const patches: Patch[] = [];
  let m: RegExpExecArray | null;
  SR_BLOCK.lastIndex = 0;
  while ((m = SR_BLOCK.exec(text))) {
    patches.push({ search: m[1], replace: m[2] });
  }
  return patches;
}

/** Applique les patches au HTML de base. Tolérant : essaie une correspondance
 * exacte, puis en ignorant les espaces de bord de ligne. Retourne le nouveau
 * HTML et le nombre de patches appliqués. */
export function applyPatches(baseHtml: string, patches: Patch[]): { html: string; applied: number } {
  let html = baseHtml;
  let applied = 0;
  for (const p of patches) {
    if (!p.search.trim()) {
      // SEARCH vide = insertion : on ne devine pas → ignore prudemment.
      continue;
    }
    if (html.includes(p.search)) {
      html = html.replace(p.search, p.replace);
      applied++;
      continue;
    }
    // Tolérance : compare en normalisant les espaces de fin de ligne.
    const norm = (s: string) => s.replace(/[ \t]+$/gm, "");
    const nHtml = norm(html);
    const nSearch = norm(p.search);
    const idx = nHtml.indexOf(nSearch);
    if (idx >= 0) {
      // Retrouve la portion originale correspondante par longueur approx.
      const before = html.slice(0, idx);
      const after = html.slice(idx + p.search.length);
      html = before + p.replace + after;
      applied++;
    }
  }
  return { html, applied };
}

/** Vrai si le texte contient au moins un bloc SEARCH/REPLACE. */
export function hasPatches(text: string): boolean {
  SR_BLOCK.lastIndex = 0;
  return SR_BLOCK.test(text);
}

/** Liste des pages HTML navigables d'un projet (pour les sous-pages). */
export function htmlPages(files: ProjectFile[]): ProjectFile[] {
  return files.filter((f) => f.path.toLowerCase().endsWith(".html"));
}

/** Assemble UNE page du projet en document autonome : CSS/JS du projet inlinés,
 * et liens vers les AUTRES pages .html interceptés pour naviguer dans l'aperçu.
 * `entryPath` cible la page à afficher (défaut : index.html). */
export function assembleForPreview(files: ProjectFile[], entryPath?: string): string {
  const entry =
    (entryPath && files.find((f) => f.path === entryPath)) || entryHtml(files);
  if (!entry) {
    // Pas de HTML : si un seul CSS/JS/SVG, on l'enveloppe pour l'afficher.
    const svg = files.find((f) => f.path.endsWith(".svg"));
    if (svg) return `<!DOCTYPE html><html><body style="margin:0;display:grid;place-items:center;min-height:100vh">${svg.content}</body></html>`;
    return `<!DOCTYPE html><html><body><pre>${escapeHtml(files.map((f) => f.path).join("\n"))}</pre></body></html>`;
  }
  const find = (target: string): ProjectFile | undefined => {
    const norm = target.replace(/^\.?\//, "").split(/[?#]/)[0];
    return files.find((f) => f.path === norm || f.path.endsWith("/" + norm) || f.path.split("/").pop() === norm);
  };

  let html = entry.content;

  // Remplace <link rel="stylesheet" href="..."> par le CSS inline.
  html = html.replace(
    /<link\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi,
    (full, href) => {
      if (/rel\s*=\s*["']?stylesheet/i.test(full) || href.endsWith(".css")) {
        const css = find(href);
        if (css) return `<style>\n${css.content}\n</style>`;
      }
      return full; // liens externes (Google Fonts…) conservés
    },
  );

  // Remplace <script src="..."></script> par le JS inline, chacun dans un bloc
  // isolé pour qu'un fichier cassé n'empêche pas les autres de tourner.
  html = html.replace(
    /<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>\s*<\/script>/gi,
    (full, src) => {
      const js = find(src);
      if (js) return `<script>\n${js.content.replace(/<\/script>/gi, "<\\/script>")}\n</script>`;
      return full;
    },
  );

  // Navigation entre sous-pages : intercepte les clics vers d'autres .html du
  // projet et demande au parent d'afficher cette page (l'aperçu réassemble).
  const NAV = `
<script>
(function(){
  document.addEventListener('click', function(e){
    var a = e.target && e.target.closest && e.target.closest('a[href]');
    if(!a) return;
    var href = a.getAttribute('href')||'';
    if(/^(https?:|mailto:|tel:|#)/i.test(href)) return;
    if(/\\.html?($|[?#])/i.test(href)){
      e.preventDefault();
      try{ parent.postMessage({__toumaiNav: href.replace(/^\\.?\\//,'')}, '*'); }catch(_){}
    }
  }, true);
})();
</script>`;
  return injectSafetyNet(html) + NAV;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] || c);
}

/** FILET DE SÉCURITÉ injecté dans tout aperçu/publication. Problème réel : les
 * sites utilisent des animations (AOS, Animate.css) qui masquent le contenu
 * (opacity:0) EN ATTENDANT le JavaScript. Si le JS est absent, cassé ou tronqué
 * (génération coupée), le contenu reste invisible à jamais → page vide. Ce
 * script, dans SON PROPRE bloc <script> (donc immunisé contre une erreur de
 * syntaxe du JS du site), révèle tout contenu resté caché si l'animation n'a
 * pas fonctionné — les animations restent actives quand elles marchent. */
const SAFETY_NET = `
<script>
(function(){
  function revealAll(){
    try{
      document.querySelectorAll('[data-aos]').forEach(function(el){
        el.style.opacity='1'; el.style.transform='none'; el.style.visibility='visible';
      });
      document.querySelectorAll('.animate__animated, .wow, .reveal, .fade-in, .hidden').forEach(function(el){
        var o=parseFloat(getComputedStyle(el).opacity);
        if(isNaN(o)||o<0.15){ el.style.opacity='1'; el.style.transform='none'; el.style.visibility='visible'; }
      });
    }catch(e){}
  }
  function check(){
    // Si AOS a réellement animé quelque chose, on le laisse faire ; sinon on révèle.
    var working = (window.AOS && document.querySelector('.aos-animate'));
    if(!working) revealAll();
  }
  if(document.readyState!=='loading'){ setTimeout(check,2200); }
  else document.addEventListener('DOMContentLoaded', function(){ setTimeout(check,2200); });
  // Dernier recours absolu, quoi qu'il arrive.
  setTimeout(revealAll, 4000);
})();
</script>`;

/** Domaines d'images notoirement instables : lents, 502 fréquents, ou morts.
 * Une image cassée dans un aperçu donne l'impression que le site est raté. */
const UNRELIABLE_IMAGE_HOSTS = /(loremflickr\.com|source\.unsplash\.com|placeimg\.com|lorempixel\.com)/i;

/** Remplace les sources d'images non fiables par un service stable et
 * déterministe (picsum + seed), en conservant les dimensions demandées. */
export function rewriteUnreliableImages(html: string): string {
  if (!html) return html;
  return html.replace(
    /(<img\b[^>]*?\bsrc=)(["'])(.*?)\2/gi,
    (match, prefix: string, quote: string, url: string) => {
      if (!UNRELIABLE_IMAGE_HOSTS.test(url)) return match;
      const dims = url.match(/\/(\d{2,4})\/(\d{2,4})/);
      const w = dims?.[1] ?? "1200";
      const h = dims?.[2] ?? "800";
      // Graine stable dérivée de l'URL d'origine : la même image reste la même
      // d'un rendu à l'autre (sinon l'aperçu change à chaque rechargement).
      let seed = 0;
      for (let i = 0; i < url.length; i++) seed = (seed * 31 + url.charCodeAt(i)) >>> 0;
      return `${prefix}${quote}https://picsum.photos/seed/${seed}/${w}/${h}${quote}`;
    },
  );
}

/** Filet de sécurité images : toute image qui échoue est remplacée par un
 * dégradé lisible portant son texte alternatif, au lieu de l'icône « cassée ».
 * Placé ici parce que `injectSafetyNet` est le point de passage UNIQUE de tout
 * aperçu, publication et téléchargement. */
const IMAGE_SAFETY_NET = `
<script>
(function(){
  // La taille voulue doit être lue AVANT que l'image casse : une image brisée
  // s'effondre à la taille de son texte alternatif, ce qui donnerait une boîte
  // de quelques pixels de haut au lieu du bloc attendu.
  function intendedSize(img){
    var w=img.style.width || img.getAttribute('width') || '';
    var h=img.style.height || img.getAttribute('height') || '';
    if(/^\\d+$/.test(w)) w=w+'px';
    if(/^\\d+$/.test(h)) h=h+'px';
    if(!w || !h){
      var cs=getComputedStyle(img);
      if(!w && cs.width && cs.width!=='auto' && parseFloat(cs.width)>40) w=cs.width;
      if(!h && cs.height && cs.height!=='auto' && parseFloat(cs.height)>40) h=cs.height;
    }
    return { w: w||'100%', h: h||'220px', r: getComputedStyle(img).borderRadius||'0' };
  }
  function degrade(img, size){
    if(img.dataset.toumaiFallback) return;
    img.dataset.toumaiFallback='1';
    var s=size||intendedSize(img);
    var label=(img.getAttribute('alt')||'').trim();
    var box=document.createElement('div');
    box.style.cssText='display:flex;align-items:center;justify-content:center;'+
      'background:linear-gradient(135deg,#2a2622,#4a3f36);color:#e8e0d8;'+
      'font:500 14px/1.4 system-ui,sans-serif;text-align:center;padding:12px;'+
      'box-sizing:border-box;overflow:hidden;min-height:120px;';
    box.style.width=s.w;
    box.style.height=s.h;
    box.style.borderRadius=s.r;
    box.textContent=label;
    if(img.parentNode) img.parentNode.replaceChild(box,img);
  }
  function watch(img){
    if(img.dataset.toumaiWatched) return;
    img.dataset.toumaiWatched='1';
    // Mesure immédiate, tant que l'image est encore intacte.
    var size=intendedSize(img);
    if(img.complete && img.naturalWidth===0) return degrade(img,size);
    img.addEventListener('error',function(){ degrade(img,size); },{once:true});
  }
  function scan(){ try{ document.querySelectorAll('img').forEach(function(i){ watch(i); }); }catch(e){} }
  if(document.readyState!=='loading') scan();
  else document.addEventListener('DOMContentLoaded',scan);
  // Les images lentes (502 tardif) ne déclenchent parfois 'error' que plus tard.
  setTimeout(scan,3000);
})();
</script>`;

/** Injecte le filet de sécurité juste avant </body> (ou en fin de document).
 * Réécrit aussi les sources d'images non fiables au passage. */
export function injectSafetyNet(html: string): string {
  if (!html) return html;
  const safe = rewriteUnreliableImages(html);
  const nets = `${SAFETY_NET}${IMAGE_SAFETY_NET}`;
  if (/<\/body>/i.test(safe)) return safe.replace(/<\/body>/i, `${nets}</body>`);
  return safe + nets;
}

/** Construit une arborescence de dossiers/fichiers à partir des chemins plats. */
export interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: TreeNode[];
}

export function buildTree(files: ProjectFile[]): TreeNode[] {
  const root: TreeNode = { name: "", path: "", isDir: true, children: [] };
  for (const f of files) {
    const parts = f.path.split("/");
    let node = root;
    parts.forEach((part, i) => {
      const isLast = i === parts.length - 1;
      const path = parts.slice(0, i + 1).join("/");
      let child = node.children!.find((c) => c.name === part);
      if (!child) {
        child = { name: part, path, isDir: !isLast, children: isLast ? undefined : [] };
        node.children!.push(child);
      }
      node = child;
    });
  }
  // Tri : dossiers d'abord, puis fichiers, alpha.
  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => (a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1));
    nodes.forEach((n) => n.children && sort(n.children));
  };
  sort(root.children!);
  return root.children!;
}
