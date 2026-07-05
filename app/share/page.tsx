"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getSharedConversation, type SharedConversation } from "@/lib/chat-api";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

/** Page publique d'une conversation partagée — lecture seule, sans compte.
 * L'URL porte le token : /share?c=<token>. */
export default function SharePage() {
  const [data, setData] = useState<SharedConversation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("c");
    if (!token) {
      setError("Lien de partage invalide.");
      return;
    }
    getSharedConversation(token)
      .then(setData)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Conversation introuvable."),
      );
  }, []);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex select-none items-center justify-between px-4 py-3">
        <Link href="/" draggable={false} className="flex items-center gap-2.5">
          <Logo size={26} />
          <span className="text-sm font-semibold">Toumaï AI</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/chat"
            className="rounded-full px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ background: "var(--primary)" }}
          >
            Essayer Toumaï AI
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-6">
        {error && (
          <div className="mt-20 text-center">
            <p className="landing-serif text-2xl">Conversation indisponible</p>
            <p className="mt-2 text-sm text-[var(--text-tertiary)]">{error}</p>
            <Link
              href="/chat"
              className="mt-6 inline-block rounded-full px-5 py-2.5 text-sm font-semibold text-white"
              style={{ background: "var(--primary)" }}
            >
              Démarrer ma propre conversation
            </Link>
          </div>
        )}

        {!error && !data && (
          <div className="mt-10 space-y-4" aria-hidden="true">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-[var(--card)]" />
            ))}
          </div>
        )}

        {data && (
          <>
            <h1 className="landing-serif text-3xl tracking-tight">{data.title}</h1>
            <p className="mb-8 mt-2 text-xs text-[var(--text-tertiary)]">
              Conversation partagée
              {data.owner_name ? ` par ${data.owner_name}` : ""} · Toumaï AI
              {data.created_at
                ? ` · ${new Date(data.created_at).toLocaleDateString("fr-FR")}`
                : ""}
            </p>

            <div className="flex flex-col gap-5">
              {data.messages.map((m, i) =>
                m.role === "user" ? (
                  <div key={i} className="flex justify-end">
                    <div
                      className="max-w-[85%] whitespace-pre-wrap rounded-3xl px-4 py-2.5 text-[15px] leading-relaxed sm:max-w-[70%]"
                      style={{ background: "var(--card)" }}
                    >
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <div key={i} className="max-w-[80ch] text-[15px] leading-relaxed">
                    <div className="prose-toumai">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                    </div>
                    {m.image_urls && m.image_urls.length > 0 && (
                      <div className="mt-2 grid max-w-[420px] grid-cols-2 gap-2">
                        {m.image_urls.map((url, j) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={url + j}
                            src={url}
                            alt="Image générée par Toumaï AI"
                            className="block w-full rounded-2xl border border-[var(--border)]"
                            loading="lazy"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ),
              )}
            </div>

            <div className="mt-12 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
              <p className="landing-serif text-xl">Continuez la discussion avec Toumaï AI</p>
              <p className="mt-1.5 text-sm text-[var(--text-tertiary)]">
                Assistant IA gratuit — chat, images, WhatsApp, agenda et plus.
              </p>
              <Link
                href="/chat"
                className="mt-4 inline-block rounded-full px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ background: "var(--primary)" }}
              >
                Commencer gratuitement
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
