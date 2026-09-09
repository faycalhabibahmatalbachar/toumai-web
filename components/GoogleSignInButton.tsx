"use client";

import { useEffect, useRef, useState } from "react";
import { GOOGLE_CLIENT_ID } from "@/lib/config";

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleIdApi {
  initialize: (config: {
    client_id: string;
    callback: (resp: GoogleCredentialResponse) => void;
  }) => void;
  renderButton: (
    el: HTMLElement,
    options: {
      theme?: string;
      size?: string;
      shape?: string;
      width?: number;
      text?: string;
      locale?: string;
    },
  ) => void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdApi } };
  }
}

const SCRIPT_ID = "google-identity-services";

export function GoogleSignInButton({
  onCredential,
  width = 400,
  locale,
}: {
  onCredential: (idToken: string) => void;
  /** Largeur maximale. Le bouton se réduit automatiquement à la largeur disponible. */
  width?: number;
  locale?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [renderWidth, setRenderWidth] = useState(Math.min(width, 400));

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const syncWidth = () => {
      const available = Math.floor(host.getBoundingClientRect().width);
      if (!available) return;
      setRenderWidth(Math.max(200, Math.min(width, 400, available)));
    };

    syncWidth();
    const observer = new ResizeObserver(syncWidth);
    observer.observe(host);
    return () => observer.disconnect();
  }, [width]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    function init() {
      if (!window.google || !containerRef.current) return;
      containerRef.current.replaceChildren();
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (resp) => onCredential(resp.credential),
      });
      window.google.accounts.id.renderButton(containerRef.current, {
        theme: "filled_black",
        size: "large",
        shape: "rectangular",
        width: renderWidth,
        text: "continue_with",
        locale,
      });
      setReady(true);
    }

    if (window.google) {
      init();
      return;
    }
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", init);
      return () => existing.removeEventListener("load", init);
    }
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = init;
    document.body.appendChild(script);
  }, [locale, onCredential, renderWidth]);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div ref={hostRef} className="flex w-full justify-center">
      <div ref={containerRef} aria-busy={!ready} />
    </div>
  );
}
