/** Icônes de marque des connecteurs — SVG fidèles aux logos officiels,
 * rendus localement (aucune requête externe, aucun tracking). */

export function GoogleCalendarIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <rect x="6" y="8" width="36" height="34" rx="4" fill="#fff" />
      <path d="M34 14H14v20h20V14z" fill="#fff" />
      <path d="M6 16v22a4 4 0 004 4h6V32H6v-16z" fill="#1967d2" opacity="0" />
      <path d="M34 42H14a4 4 0 01-4-4V14h28v24a4 4 0 01-4 4z" fill="#fff" stroke="#e0e0e0" />
      <path d="M10 14h28v6H10z" fill="#1a73e8" />
      <path d="M14 6h4v8h-4zM30 6h4v8h-4z" fill="#1a73e8" />
      <text
        x="24"
        y="35"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontWeight="bold"
        fontSize="15"
        fill="#1a73e8"
      >
        31
      </text>
    </svg>
  );
}

export function GmailIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path d="M6 13v22a3 3 0 003 3h4V19.5L24 28l11-8.5V38h4a3 3 0 003-3V13l-18 13L6 13z" fill="#ea4335" opacity="0" />
      <path d="M39 38h4a3 3 0 003-3V13.5L35 22.3V38h4z" fill="#34a853" opacity="0" />
      <rect x="6" y="10" width="36" height="28" rx="3" fill="#fff" stroke="#e0e0e0" />
      <path d="M6 13.8V35a3 3 0 003 3h4V20.6L6 13.8z" fill="#4285f4" />
      <path d="M35 38h4a3 3 0 003-3V13.8l-7 6.8V38z" fill="#34a853" />
      <path d="M13 20.6L24 29l11-8.4v-4.8L24 24 13 15.8v4.8z" fill="#ea4335" />
      <path d="M6 13.8l7 6.8v-4.8l-4.6-3.5A3 3 0 006 13.8z" fill="#c5221f" />
      <path d="M42 13.8a3 3 0 00-2.4-1.5L35 15.8v4.8l7-6.8z" fill="#fbbc04" />
    </svg>
  );
}

export function WhatsAppIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="20" fill="#25D366" />
      <path
        d="M24 11.5c-6.9 0-12.5 5.6-12.5 12.5 0 2.2.6 4.3 1.6 6.2l-1.7 6.3 6.5-1.7c1.8 1 3.9 1.5 6.1 1.5 6.9 0 12.5-5.6 12.5-12.5S30.9 11.5 24 11.5z"
        fill="#fff"
      />
      <path
        d="M19.6 17.8c-.3-.7-.6-.7-.9-.7h-.8c-.3 0-.7.1-1.1.5s-1.5 1.4-1.5 3.5 1.5 4.1 1.7 4.3c.2.3 3 4.7 7.3 6.4 3.6 1.4 4.3 1.1 5.1 1.1.8-.1 2.5-1 2.8-2s.4-1.8.3-2c-.1-.2-.4-.3-.8-.5s-2.5-1.2-2.9-1.4c-.4-.1-.7-.2-.9.2-.3.4-1 1.4-1.3 1.6-.2.3-.5.3-.9.1-.4-.2-1.8-.7-3.4-2.1-1.3-1.1-2.1-2.5-2.4-2.9-.2-.4 0-.7.2-.9.2-.2.4-.5.6-.7.2-.2.3-.4.4-.7.1-.3.1-.5 0-.7-.1-.2-.9-2.3-1.3-3.1z"
        fill="#25D366"
      />
    </svg>
  );
}

export function MeteoIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="19" cy="18" r="9" fill="#fbbc04" />
      <path
        d="M14 38a8 8 0 011.2-15.9A10 10 0 0134 24.6 7 7 0 0133 38H14z"
        fill="#fff"
        stroke="#dadce0"
        strokeWidth="1"
      />
    </svg>
  );
}
