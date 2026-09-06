import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const pages = [
  ["index.html", "Toumaï AI — Assistant IA", "https://toumaiai.com/"],
  ["models/index.html", "Modèles IA", "https://toumaiai.com/models/"],
  ["assistant-ia/index.html", "Assistant IA gratuit", "https://toumaiai.com/assistant-ia/"],
  ["en/index.html", "AI Assistant for Africa", "https://toumaiai.com/en/"],
  ["ar/index.html", "توماي — الذكاء الاصطناعي التشادي", "https://toumaiai.com/ar/"],
];

const failures = [];
for (const [file, title, canonical] of pages) {
  const full = resolve("out", file);
  if (!existsSync(full)) { failures.push(`${file}: missing export`); continue; }
  const html = readFileSync(full, "utf8");
  if (!html.includes(`<title>${title}`)) failures.push(`${file}: title missing or incorrect`);
  if (!html.includes(`rel="canonical" href="${canonical}"`)) failures.push(`${file}: canonical missing or incorrect`);
  if (!html.includes('name="description"')) failures.push(`${file}: description missing`);
}

for (const file of ["robots.txt", "sitemap.xml"]) {
  if (!existsSync(resolve("out", file))) failures.push(`${file}: missing export`);
}
const robots = existsSync(resolve("out/robots.txt")) ? readFileSync(resolve("out/robots.txt"), "utf8") : "";
const sitemap = existsSync(resolve("out/sitemap.xml")) ? readFileSync(resolve("out/sitemap.xml"), "utf8") : "";
if (!robots.includes("Sitemap: https://toumaiai.com/sitemap.xml")) failures.push("robots.txt: sitemap declaration missing");
for (const url of ["https://toumaiai.com/assistant-ia/", "https://toumaiai.com/en/", "https://toumaiai.com/ar/"]) {
  if (!sitemap.includes(url)) failures.push(`sitemap.xml: ${url} missing`);
}
if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log(`SEO static checks passed for ${pages.length} public pages.`);
