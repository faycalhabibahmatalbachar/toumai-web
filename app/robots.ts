import type { MetadataRoute } from "next";
import { SITE_URL } from "./seo";

// Le site est déployé en export statique ; ce fichier devient robots.txt au
// build et ne dépend d'aucune donnée de requête.
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/settings", "/login", "/register", "/reset-password", "/forgot", "/delete-account", "/admin"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
