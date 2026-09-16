import type { NextConfig } from "next";

// Pages de développement (`*.lab.tsx`, ex. /dev/widgets) : jamais publiées en
// production, sauf construction de recette avec NEXT_PUBLIC_WIDGET_LAB=1.
const withLab = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_WIDGET_LAB === "1";

const nextConfig: NextConfig = {
  pageExtensions: withLab ? ["lab.tsx", "tsx", "ts", "jsx", "js"] : ["tsx", "ts", "jsx", "js"],
  // Export statique — hébergé sur GitHub Pages (pas de serveur Node).
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  // Évite la détection erronée d'un autre lockfile présent dans un dossier parent.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
