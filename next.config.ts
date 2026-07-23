import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
