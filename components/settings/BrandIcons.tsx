import { FaWhatsapp } from "react-icons/fa6";

/**
 * Icônes de marque des connecteurs.
 *
 * Les anciennes cartes demandaient des tailles adaptées à de petits glyphes.
 * Une icône d'application a besoin d'une empreinte optique légèrement plus
 * grande pour paraître équilibrée dans une tuile SaaS de 50–56 px.
 */
function opticalSize(size: number) {
  return Math.round(size * 1.28);
}

export function GoogleCalendarIcon({ size = 30 }: { size?: number }) {
  const s = opticalSize(size);
  return (
    <svg
      data-brand="google-calendar"
      width={s}
      height={s}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <path d="M6 3h14l6 6v17a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z" fill="#fff" />
      <path d="M3 10h23v6H3z" fill="#4285F4" />
      <path d="M3 6a3 3 0 0 1 3-3h5v7H3V6Z" fill="#34A853" />
      <path d="M20 3v7h6V9l-6-6Z" fill="#EA4335" />
      <path d="M3 22h8v7H6a3 3 0 0 1-3-3v-4Z" fill="#FBBC04" />
      <path d="M11 22h15v4a3 3 0 0 1-3 3H11v-7Z" fill="#34A853" />
      <rect x="8" y="13" width="16" height="12" rx="1.7" fill="#fff" />
      <path d="M11.2 16.1h5.2v1.7h-1.7v5.1h-1.9v-5.1h-1.6v-1.7Zm6.3 0h3.8v6.8h-1.9v-5.1h-1.9v-1.7Z" fill="#4285F4" />
    </svg>
  );
}

export function GmailIcon({ size = 30 }: { size?: number }) {
  const s = opticalSize(size);
  return (
    <svg
      data-brand="gmail"
      width={s}
      height={s}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <path d="M4.8 6.4h22.4A2.8 2.8 0 0 1 30 9.2v15.6a2.8 2.8 0 0 1-2.8 2.8H4.8A2.8 2.8 0 0 1 2 24.8V9.2a2.8 2.8 0 0 1 2.8-2.8Z" fill="#fff" />
      <path d="M2 10.1 7.3 14v13.6H4.8A2.8 2.8 0 0 1 2 24.8V10.1Z" fill="#4285F4" />
      <path d="M30 10.1 24.7 14v13.6h2.5a2.8 2.8 0 0 0 2.8-2.8V10.1Z" fill="#34A853" />
      <path d="M2.8 7.8a2.8 2.8 0 0 1 3.8-.7L16 14l9.4-6.9a2.8 2.8 0 0 1 3.8.7L16 17.5 2.8 7.8Z" fill="#EA4335" />
      <path d="m24.7 14 5.3-3.9V9.2c0-.5-.1-1-.4-1.4L24.7 11.4V14Z" fill="#FBBC04" />
      <path d="M2 10.1 7.3 14v-2.6L2.4 7.8C2.1 8.2 2 8.7 2 9.2v.9Z" fill="#C5221F" />
    </svg>
  );
}

export function WhatsAppIcon({ size = 30 }: { size?: number }) {
  const glyph = opticalSize(size);
  const tile = Math.round(glyph * 1.22);
  const radius = Math.max(8, Math.round(tile * 0.25));
  return (
    <span
      data-brand="whatsapp"
      className="inline-flex shrink-0 items-center justify-center"
      style={{
        width: tile,
        height: tile,
        borderRadius: radius,
        background: "linear-gradient(145deg, #2DDA72, #18B957)",
        boxShadow: "0 2px 6px rgba(37,211,102,0.24)",
      }}
      aria-hidden="true"
    >
      <FaWhatsapp size={glyph} color="#fff" aria-hidden="true" />
    </span>
  );
}

export function MeteoIcon({ size = 30 }: { size?: number }) {
  const s = opticalSize(size);
  return (
    <svg
      data-brand="weather"
      width={s}
      height={s}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="20.5" cy="10.5" r="5.1" fill="#FDB813" />
      <g stroke="#FDB813" strokeWidth="1.7" strokeLinecap="round">
        <path d="M20.5 2.5v2.2M20.5 16.3v2.2M12.5 10.5h2.2M26.3 10.5h2.2M14.9 4.9l1.6 1.6M24.5 14.5l1.6 1.6M26.1 4.9l-1.6 1.6" />
      </g>
      <path
        d="M23.8 25.7H9.2a6.2 6.2 0 0 1-.3-12.4 8 8 0 0 1 14.9 2.4 5 5 0 0 1 0 10Z"
        fill="#F7FAFF"
      />
      <path
        d="M10 23.7h13.8a3 3 0 0 0 0-6 3.6 3.6 0 0 0-1 .1 6 6 0 0 0-11.7-1.4A4.2 4.2 0 0 0 10 23.7Z"
        fill="#D9E7FF"
      />
    </svg>
  );
}
