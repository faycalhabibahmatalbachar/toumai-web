"use client";

/** Exécution de code côté client — deux voies complémentaires :
 *
 * 1) Python DANS LE NAVIGATEUR via Pyodide + micropip : installe et utilise de
 *    vraies bibliothèques (numpy, pandas, requests, sympy…) à la volée, sans
 *    serveur. C'est ce qui donne « l'IA peut installer des dépendances et
 *    utiliser des bibliothèques » de façon tangible et instantanée.
 *
 * 2) Tous les autres langages via le backend (/code/execute, moteur Wandbox
 *    sandboxé) : C, C++, Java, Go, Rust, Ruby, PHP, JS, TS, C#, Swift… avec
 *    les bibliothèques standard et courantes préinstallées.
 */

import { API_BASE } from "./config";
import { authHeaders } from "./api";

export interface RunResult {
  ok: boolean;
  output: string;
  stderr?: string;
  exitCode?: number | null;
  language?: string;
  version?: string;
  error?: string;
}

/** Langages exécutés en direct dans le navigateur (Python via Pyodide). */
export function isBrowserPython(language: string): boolean {
  return ["python", "py", "python3"].includes((language || "").toLowerCase());
}

/** Langages rendus visuellement (aperçu iframe), pas « exécutés » en console. */
export function isWebPreview(language: string, code: string): boolean {
  const l = (language || "").toLowerCase();
  if (l === "html") return true;
  if (l === "svg") return true;
  if (l === "xml") return /<(!doctype|html|body|svg)/i.test(code);
  return false;
}

/** Exécutable en console (backend) — tout langage compilé/interprété courant. */
const CONSOLE_LANGS = new Set([
  "javascript", "js", "typescript", "ts", "c", "c++", "cpp", "java", "go",
  "rust", "rs", "ruby", "rb", "php", "csharp", "cs", "c#", "bash", "sh",
  "swift", "lua", "r", "haskell", "scala", "elixir", "perl", "sql", "kotlin",
  "nim", "crystal", "ocaml", "pascal", "julia", "zig", "d",
]);

/** UN APPEL D'OUTIL N'EST PAS DU CODE À EXÉCUTER.
 *
 * Observé en production : le modèle, privé d'outils, a écrit dans sa réponse
 * `use_skill(skill_name="whatsapp_etat")`. L'interface y a vu du Python, a
 * proposé « Exécuter », et la personne a récolté une trace Pyodide à la place
 * de ses messages.
 *
 * La cause est traitée côté serveur — le prompt ne montre plus de syntaxe
 * d'appel. Ceci est la seconde barrière, celle qui tient quand la première
 * cède : un modèle peut toujours halluciner une ligne de ce genre, et rien ne
 * justifie de proposer d'exécuter ce qui n'a jamais été du code de personne.
 *
 * On ne masque QUE le bouton. Le bloc reste affiché tel quel : cacher la ligne
 * empêcherait de comprendre ce qui s'est passé, et c'est précisément ce qu'il
 * faut voir pour le signaler.
 */
const APPEL_D_OUTIL =
  /^\s*(?:use_skill|use_skill_reference|send_whatsapp|whatsapp_\w+|mon_compte|generate_document|generate_image|web_search|read_mail|send_mail)\s*\(/;

export function estUnAppelDOutil(code: string): boolean {
  const lignes = (code || "").trim().split("\n").filter((l) => l.trim());
  // Un vrai programme qui appellerait `web_search(...)` en ligne 40 reste un
  // programme. Ce qu'on écarte, c'est le bloc qui n'est QUE cet appel.
  return lignes.length > 0 && lignes.length <= 3 && lignes.every((l) => APPEL_D_OUTIL.test(l) || !l.trim());
}

export function isConsoleRunnable(language: string, code = ""): boolean {
  const l = (language || "").toLowerCase();
  // Rien à exécuter : pas de bouton. La seconde barrière contre le bloc vide,
  // au cas où un chemin de rendu laisserait passer ce que ChatMessage écarte.
  if (!code.trim() || code.trim() === "undefined") return false;
  if (estUnAppelDOutil(code)) return false;
  return isBrowserPython(l) || CONSOLE_LANGS.has(l);
}

/** Exécute via le backend (Wandbox/Piston). */
export async function runViaBackend(
  language: string,
  code: string,
  stdin = "",
): Promise<RunResult> {
  try {
    const res = await fetch(`${API_BASE}/code/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ language, code, stdin }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.success === false) {
      return { ok: false, output: "", error: body.message || `Erreur ${res.status}` };
    }
    const d = body.data || {};
    return {
      ok: true,
      output: d.output ?? "",
      stderr: d.stderr,
      exitCode: d.code,
      language: d.language,
      version: d.version,
    };
  } catch (err) {
    return {
      ok: false,
      output: "",
      error: err instanceof Error ? err.message : "Service d'exécution injoignable.",
    };
  }
}

/* ── Python dans le navigateur (Pyodide + micropip) ─────────────────────── */

const PYODIDE_VERSION = "0.26.4";
const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

// Modules fournis par la bibliothèque standard ou par Pyodide lui-même :
// inutile d'essayer de les installer via micropip.
const STDLIB = new Set([
  "sys", "os", "math", "random", "re", "json", "time", "datetime", "itertools",
  "functools", "collections", "typing", "statistics", "decimal", "fractions",
  "string", "io", "heapq", "bisect", "copy", "hashlib", "base64", "textwrap",
  "unicodedata", "pprint", "csv", "enum", "dataclasses", "abc", "contextlib",
  "operator", "array", "queue", "asyncio", "threading", "secrets", "uuid",
  "micropip", "js", "pyodide",
]);

// Correspondance nom d'import → nom de paquet PyPI quand ils diffèrent.
const IMPORT_TO_PACKAGE: Record<string, string> = {
  PIL: "pillow",
  cv2: "opencv-python",
  sklearn: "scikit-learn",
  bs4: "beautifulsoup4",
  yaml: "pyyaml",
  matplotlib: "matplotlib",
};

interface PyodideLike {
  runPythonAsync: (code: string) => Promise<unknown>;
  loadPackagesFromImports?: (code: string) => Promise<void>;
  setStdout: (opts: { batched: (s: string) => void }) => void;
  setStderr: (opts: { batched: (s: string) => void }) => void;
  pyimport: (name: string) => { install: (pkgs: string[]) => Promise<void> };
}

let pyodidePromise: Promise<PyodideLike> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Chargement de Pyodide impossible."));
    document.head.appendChild(s);
  });
}

async function getPyodide(onStatus?: (msg: string) => void): Promise<PyodideLike> {
  if (pyodidePromise) return pyodidePromise;
  pyodidePromise = (async () => {
    onStatus?.("Chargement de l'environnement Python…");
    await loadScript(`${PYODIDE_CDN}pyodide.js`);
    const loader = (window as unknown as { loadPyodide: (o: object) => Promise<PyodideLike> })
      .loadPyodide;
    const py = await loader({ indexURL: PYODIDE_CDN });
    return py;
  })();
  return pyodidePromise;
}

/** Détecte les paquets tiers importés (hors stdlib) pour les installer. */
function detectPackages(code: string): string[] {
  const found = new Set<string>();
  const re = /^\s*(?:import\s+([a-zA-Z0-9_]+)|from\s+([a-zA-Z0-9_]+)\s+import)/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) {
    const mod = m[1] || m[2];
    if (!mod || STDLIB.has(mod)) continue;
    found.add(IMPORT_TO_PACKAGE[mod] ?? mod);
  }
  return [...found];
}

/** Exécute du Python dans le navigateur, installe les bibliothèques importées,
 * et pousse la sortie ligne par ligne via `onLog`. */
export async function runPythonInBrowser(
  code: string,
  onLog: (line: string, stream: "out" | "err" | "status") => void,
): Promise<RunResult> {
  try {
    const py = await getPyodide((m) => onLog(m, "status"));
    py.setStdout({ batched: (s) => onLog(s, "out") });
    py.setStderr({ batched: (s) => onLog(s, "err") });

    // Installation des bibliothèques tierces importées (micropip + wheels
    // précompilés Pyodide pour numpy/pandas/… quand disponibles).
    const pkgs = detectPackages(code);
    if (pkgs.length) {
      onLog(`Installation des bibliothèques : ${pkgs.join(", ")}…`, "status");
      try {
        if (py.loadPackagesFromImports) await py.loadPackagesFromImports(code);
      } catch {
        /* certains paquets ne sont pas des wheels Pyodide → micropip ci-dessous */
      }
      try {
        const micropip = py.pyimport("micropip");
        await micropip.install(pkgs);
      } catch (e) {
        onLog(
          `Certaines bibliothèques n'ont pas pu être installées : ${
            e instanceof Error ? e.message : String(e)
          }`,
          "err",
        );
      }
    }

    await py.runPythonAsync(code);
    return { ok: true, output: "", language: "python", version: `Pyodide ${PYODIDE_VERSION}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    onLog(msg, "err");
    return { ok: false, output: "", error: msg, language: "python" };
  }
}
