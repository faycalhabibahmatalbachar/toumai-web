import { CloudSun } from "lucide-react";

/**
 * Vrais assets de marque pour les connecteurs SaaS.
 *
 * Gmail et Google Calendar utilisent les logos Google Workspace 2020 visibles
 * dans la maquette validée. WhatsApp utilise le logo officiel sans wordmark.
 * Les fichiers sont servis par Wikimedia Commons à partir des assets de marque
 * Google/WhatsApp et ne sont plus redessinés en JSX dans Toumaï AI.
 */
const BRAND_ASSETS = {
  whatsapp:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/WhatsApp.svg/250px-WhatsApp.svg.png",
  gmail:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Gmail_icon_%282020%29.svg/330px-Gmail_icon_%282020%29.svg.png",
  googleCalendar:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Google_Calendar_icon_%282020%29.svg/250px-Google_Calendar_icon_%282020%29.svg.png",
} as const;

function BrandAsset({
  src,
  size,
  backgroundSize = "contain",
  label,
}: {
  src: string;
  size: number;
  backgroundSize?: string;
  label: string;
}) {
  const optical = Math.round(size * 1.45);
  return (
    <span
      data-brand={label}
      role="img"
      aria-label={label}
      className="inline-block shrink-0"
      style={{
        width: optical,
        height: optical,
        backgroundImage: `url(${src})`,
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundSize,
      }}
    />
  );
}

export function GoogleCalendarIcon({ size = 30 }: { size?: number }) {
  return (
    <BrandAsset
      src={BRAND_ASSETS.googleCalendar}
      size={size}
      backgroundSize="contain"
      label="Google Calendar"
    />
  );
}

export function GmailIcon({ size = 30 }: { size?: number }) {
  return (
    <BrandAsset
      src={BRAND_ASSETS.gmail}
      size={size}
      backgroundSize="contain"
      label="Gmail"
    />
  );
}

export function WhatsAppIcon({ size = 30 }: { size?: number }) {
  return (
    <BrandAsset
      src={BRAND_ASSETS.whatsapp}
      size={size}
      backgroundSize="contain"
      label="WhatsApp"
    />
  );
}

export function MeteoIcon({ size = 30 }: { size?: number }) {
  const optical = Math.round(size * 1.25);
  return <CloudSun size={optical} color="#FDB813" strokeWidth={1.9} aria-hidden="true" />;
}
