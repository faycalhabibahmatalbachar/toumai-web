"use client";

import { useEffect, useState } from "react";
import { getPreferences, updatePreferences, type Preferences } from "@/lib/preferences-api";
import { useTheme } from "@/lib/theme-context";
import { cacheSeed, cacheWrite } from "@/lib/swr-cache";
import { applyChatFontSize } from "@/lib/ui-prefs";
import { Panel, Row, Segmented } from "./Rows";

const FONT_SIZES: { value: Preferences["font_size"]; label: string }[] = [
  { value: "small", label: "Petite" },
  { value: "medium", label: "Moyenne" },
  { value: "large", label: "Grande" },
];

export function AppearanceSection() {
  const { theme, set } = useTheme();
  const [prefs, setPrefs] = useState<Preferences | null>(() => cacheSeed<Preferences>("user:prefs"));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPreferences()
      .then((p) => {
        setPrefs(p);
        cacheWrite("user:prefs", p);
      })
      .catch((err) =>
        setPrefs((c) => {
          if (!c) setError(err instanceof Error ? err.message : "Chargement impossible");
          return c;
        }),
      );
  }, []);

  async function save(patch: Partial<Preferences>) {
    if (!prefs) return;
    const prev = prefs;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    setError(null);
    try {
      await updatePreferences(patch);
      cacheWrite("user:prefs", next);
    } catch (err) {
      setPrefs(prev);
      setError(err instanceof Error ? err.message : "Échec de l'enregistrement");
    }
  }

  return (
    <div>
      <Panel title="Thème">
        <Row label="Apparence" description="S'applique immédiatement à tout le site.">
          <Segmented
            options={[
              { value: "light", label: "Clair" },
              { value: "dark", label: "Sombre" },
            ]}
            value={theme}
            onChange={set}
          />
        </Row>
      </Panel>

      <Panel title="Texte">
        <Row label="Taille du texte" description="Taille des messages dans le chat.">
          <Segmented
            options={FONT_SIZES}
            value={prefs?.font_size ?? "medium"}
            onChange={(v) => {
              applyChatFontSize(v); // effet immédiat, sans attendre le serveur
              save({ font_size: v });
            }}
            disabled={!prefs}
          />
        </Row>
      </Panel>

      {error && <p className="text-sm text-[var(--error)]">{error}</p>}
    </div>
  );
}
