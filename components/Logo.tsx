import Image from "next/image";

/** Logo Toumaï AI — utilisé partout où l'icône "T" générique était placée. */
export function Logo({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="Toumaï AI"
      width={size}
      height={size}
      className={className}
      priority
    />
  );
}
