import type { MetadataRoute } from "next";
import { LOCALE_ALTERNATES, PUBLIC_SEO_ROUTES, SITE_URL } from "./seo";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const today = new Date();
  return PUBLIC_SEO_ROUTES.map((route) => ({
    url: route.path === "/" ? `${SITE_URL}/` : `${SITE_URL}${route.path}/`,
    lastModified: today,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
    alternates: route.path === "/" ? { languages: LOCALE_ALTERNATES } : undefined,
  }));
}
