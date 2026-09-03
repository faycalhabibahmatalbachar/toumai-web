import { http } from "./http";

export interface Preferences {
  user_id?: string;
  /** La mémoire est-elle allumée ? Absente = allumée (défaut serveur).
   *
   * Le bouton coupe RÉELLEMENT les deux portes côté serveur — la lecture (ce
   * qu'on injecte dans le prompt) et l'écriture (ce qu'on extrait des
   * échanges). Un interrupteur qui ne couperait qu'une des deux laisserait la
   * mémoire grossir en silence pendant que la page affiche « désactivée ». */
  memory_enabled?: boolean;
  ai_name: string;
  ai_tone: "friendly" | "professional" | "casual" | "concise";
  ai_language: string;
  ai_persona: string;
  theme: "dark" | "light" | "system";
  accent_color: string;
  font_size: "small" | "medium" | "large";
  notif_wa: boolean;
  notif_calendar: boolean;
  notif_suggestions: boolean;
  timezone: string;
  tts_voice?: string;
  tts_speed?: number;
}

export type PreferencesUpdate = Partial<
  Omit<Preferences, "user_id" | "ai_tone" | "theme" | "font_size">
> & {
  ai_tone?: Preferences["ai_tone"];
  theme?: Preferences["theme"];
  font_size?: Preferences["font_size"];
};

export interface Voice {
  id: string;
  label: string;
  lang: string;
  gender: string;
  quality: string;
  recommended?: boolean;
  desc: string;
  free: boolean;
  sample: string;
}

export function listVoices(lang?: string): Promise<{ voices: Voice[]; count: number }> {
  const q = lang ? `?lang=${encodeURIComponent(lang)}` : "";
  return http.get<{ voices: Voice[]; count: number }>(`/preferences/voices${q}`);
}

export function getPreferences(): Promise<Preferences> {
  return http.get<Preferences>("/preferences");
}

export function updatePreferences(patch: PreferencesUpdate): Promise<Partial<Preferences>> {
  return http.put<Partial<Preferences>>("/preferences", patch);
}
