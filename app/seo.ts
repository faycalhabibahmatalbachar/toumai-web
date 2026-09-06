export const SITE_URL = "https://toumaiai.com";

/** Pages publiques stables uniquement : jamais de chat, compte, réglages ou
 * résultats de recherche. Cette liste alimente sitemap, navigation éditoriale
 * et tests de régression SEO. */
export const PUBLIC_SEO_ROUTES = [
  { path: "/", changeFrequency: "weekly" as const, priority: 1 },
  { path: "/en", changeFrequency: "monthly" as const, priority: 0.9 },
  { path: "/ar", changeFrequency: "monthly" as const, priority: 0.9 },
  { path: "/intelligence-artificielle-tchad", changeFrequency: "monthly" as const, priority: 0.9 },
  { path: "/assistant-ia", changeFrequency: "monthly" as const, priority: 0.85 },
  { path: "/a-propos", changeFrequency: "monthly" as const, priority: 0.7 },
  { path: "/en/about", changeFrequency: "monthly" as const, priority: 0.7 },
  { path: "/ar/about", changeFrequency: "monthly" as const, priority: 0.7 },
  { path: "/contact", changeFrequency: "monthly" as const, priority: 0.6 },
  { path: "/press", changeFrequency: "monthly" as const, priority: 0.6 },
  { path: "/security", changeFrequency: "monthly" as const, priority: 0.6 },
  { path: "/models", changeFrequency: "monthly" as const, priority: 0.7 },
  { path: "/library", changeFrequency: "weekly" as const, priority: 0.65 },
  { path: "/privacy", changeFrequency: "yearly" as const, priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly" as const, priority: 0.3 },
] as const;

export const LOCALE_ALTERNATES = {
  fr: `${SITE_URL}/`,
  en: `${SITE_URL}/en/`,
  ar: `${SITE_URL}/ar/`,
  "x-default": `${SITE_URL}/`,
};
