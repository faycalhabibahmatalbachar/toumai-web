import fs from "node:fs";
import path from "node:path";

const ROOTS = ["app", "components", "hooks", "lib"];
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

const FORBIDDEN = [
  { name: "Supabase JS anonymous sign-in", re: /\bsignInAnonymously\s*\(/ },
  { name: "Supabase/Python-style anonymous sign-in", re: /\bsign_in_anonymously\s*\(/ },
  { name: "legacy guest login helper", re: /\bloginAsGuest\s*\(/ },
  { name: "forced guest session flag", re: /(?:\bis_guest\b|["']is_guest["'])\s*:\s*true\b/ },
  { name: "guest/anonymous auth endpoint", re: /["'`]\/auth\/(?:guest|anonymous)(?:[\/?#"'\`]|$)/ },
];

function filesUnder(root) {
  if (!fs.existsSync(root)) return [];
  const out = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...filesUnder(full));
    else if (EXTENSIONS.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

// This deliberately removes block comments first because the repository keeps
// documentation of the OLD loginAsGuest flow in useExigerCompte.ts. The guard
// must reject executable regressions without rejecting that historical note.
function withoutComments(source) {
  const noBlocks = source.replace(/\/\*[\s\S]*?\*\//g, "");
  return noBlocks
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("//"))
    .join("\n");
}

const violations = [];

for (const root of ROOTS) {
  for (const file of filesUnder(root)) {
    const source = withoutComments(fs.readFileSync(file, "utf8"));
    for (const rule of FORBIDDEN) {
      const match = rule.re.exec(source);
      if (!match) continue;

      const before = source.slice(0, match.index);
      const line = before.split("\n").length;
      violations.push(`${file}:${line}: ${rule.name}`);
    }
  }
}

if (violations.length) {
  console.error("Anonymous-auth regression detected:");
  for (const violation of violations) console.error(` - ${violation}`);
  process.exit(1);
}

console.log("Anonymous-auth guard OK: no executable guest/anonymous login path found.");
