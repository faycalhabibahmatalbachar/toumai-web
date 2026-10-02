import { Suspense, type ReactNode } from "react";

function EnrollmentFallback() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        background: "#f4f6f8",
        color: "#667085",
        fontFamily: "inherit",
      }}
      aria-busy="true"
    >
      <p>Chargement de la vérification sécurisée…</p>
    </main>
  );
}

export default function VerifyWhatsAppLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<EnrollmentFallback />}>{children}</Suspense>;
}
