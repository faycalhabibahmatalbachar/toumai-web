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

/** Assemble le projet en UN document autonome : les <link rel=stylesheet> et
 * <script src> pointant vers des fichiers du projet sont remplacés par le
 * contenu inline. Résultat = rendu visuel complet et fusionné. */
export function assembleForPreview(files: ProjectFile[]): string {
  const entry = entryHtml(files);
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

  // Remplace <script src="..."></script> par le JS inline.
  html = html.replace(
    /<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>\s*<\/script>/gi,
    (full, src) => {
      const js = find(src);
      if (js) return `<script>\n${js.content.replace(/<\/script>/gi, "<\\/script>")}\n</script>`;
      return full;
    },
  );

  return html;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] || c);
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
