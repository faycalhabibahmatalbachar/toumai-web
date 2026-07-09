import { Logo } from "@/components/Logo";

export function MaintenancePage() {
  return (
    <div
      className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-24 text-center"
      style={{ background: "var(--landing-bg)", color: "var(--landing-ink)" }}
    >
      {/* Halo dégradé en dérive lente derrière le contenu */}
      <div
        className="maintenance-halo pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] rounded-full opacity-30 blur-3xl"
        style={{
          background:
            "conic-gradient(from 0deg, var(--landing-terra), var(--landing-gold), var(--landing-terra))",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col items-center">
        <div
          className="maintenance-orb mb-8 flex h-24 w-24 items-center justify-center rounded-full"
          style={{
            background:
              "radial-gradient(circle at 35% 30%, #e8b48a, var(--landing-terra) 55%, #8c3a1e)",
            boxShadow: "0 18px 44px -14px color-mix(in srgb, var(--landing-terra) 55%, transparent)",
          }}
        >
          <Logo size={48} />
        </div>

        <h1 className="landing-serif max-w-xl text-4xl font-medium leading-[1.1] tracking-tight sm:text-6xl">
          Toumaï AI arrive{" "}
          <em className="not-italic" style={{ color: "var(--landing-terra)", fontStyle: "italic" }}>
            très bientôt.
          </em>
        </h1>

        <p className="mx-auto mt-6 max-w-md text-lg leading-relaxed" style={{ color: "var(--landing-muted)" }}>
          On peaufine les derniers détails pour vous offrir la meilleure
          expérience. Revenez très vite.
        </p>

        <div className="mt-9 flex items-center gap-2" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="maintenance-dot h-2.5 w-2.5 rounded-full"
              style={{ background: "var(--landing-terra)", animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <p className="sr-only">Préparation en cours</p>

        <div className="mt-14 flex flex-col items-center gap-3 text-sm" style={{ color: "var(--landing-faint)" }}>
          <p>Une question, une envie de collaborer ?</p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <a
              href="https://wa.me/23591912191"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium transition hover:opacity-70"
              style={{ color: "var(--landing-ink)" }}
            >
              WhatsApp
            </a>
            <a
              href="mailto:contact@toumaiai.com"
              className="font-medium transition hover:opacity-70"
              style={{ color: "var(--landing-ink)" }}
            >
              contact@toumaiai.com
            </a>
            <a
              href="https://www.facebook.com/profile.php?id=61591724459792"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium transition hover:opacity-70"
              style={{ color: "var(--landing-ink)" }}
            >
              Facebook
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
