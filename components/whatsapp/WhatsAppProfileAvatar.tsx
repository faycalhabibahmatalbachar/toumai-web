"use client";

import { Users } from "lucide-react";
import { useState } from "react";

export function WhatsAppProfileAvatar({
  name,
  kind = "contact",
  pictureUrl,
  size = 36,
  eager = false,
  className = "",
  fallbackBackground = "#0f4735",
}: {
  name: string;
  kind?: "contact" | "group";
  pictureUrl?: string | null;
  size?: number;
  eager?: boolean;
  className?: string;
  fallbackBackground?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const safeUrl =
    typeof pictureUrl === "string" && /^https?:\/\//i.test(pictureUrl.trim())
      ? pictureUrl.trim()
      : null;
  const showPicture = Boolean(safeUrl && failedUrl !== safeUrl);
  const initials = makeInitials(name);

  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        background: showPicture ? "#dfe5e7" : fallbackBackground,
        color: "#08c875",
      }}
      data-profile-avatar={showPicture ? "photo" : "fallback"}
    >
      {showPicture && safeUrl ? (
        // WhatsApp CDN URLs are ephemeral and external; a native image avoids
        // Next/Image domain configuration and keeps privacy/referrer handling explicit.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={safeUrl}
          alt={name ? `Photo de profil WhatsApp de ${name}` : "Photo de profil WhatsApp"}
          className="h-full w-full object-cover"
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailedUrl(safeUrl)}
          data-testid="whatsapp-profile-picture"
        />
      ) : kind === "group" ? (
        <Users size={Math.max(15, Math.round(size * 0.43))} strokeWidth={1.8} />
      ) : (
        <span
          className="select-none font-bold"
          style={{ fontSize: Math.max(10, Math.round(size * 0.28)) }}
          aria-hidden="true"
        >
          {initials || "WA"}
        </span>
      )}
    </span>
  );
}

function makeInitials(value: string) {
  const parts = (value || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
}
