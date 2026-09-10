import { CloudSun } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa6";
import { SiGmail, SiGooglecalendar } from "react-icons/si";

/** Marques via react-icons ; interface générique via Lucide. L’API de ces
 * wrappers reste stable pour les cartes de connecteurs. */
export function GoogleCalendarIcon({ size = 30 }: { size?: number }) {
  return <SiGooglecalendar size={size} color="#4285F4" aria-hidden="true" />;
}

export function GmailIcon({ size = 30 }: { size?: number }) {
  return <SiGmail size={size} color="#EA4335" aria-hidden="true" />;
}

export function WhatsAppIcon({ size = 30 }: { size?: number }) {
  return <FaWhatsapp size={size} color="#25D366" aria-hidden="true" />;
}

export function MeteoIcon({ size = 30 }: { size?: number }) {
  return <CloudSun size={size} color="#FDB813" strokeWidth={1.8} aria-hidden="true" />;
}
