import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aujourd’hui",
  robots: { index: false, follow: false },
};

export default function TodayLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
