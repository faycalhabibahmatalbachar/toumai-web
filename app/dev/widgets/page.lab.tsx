import type { Metadata } from "next";
import { WidgetLab } from "@/components/chat/widgets/lab/WidgetLab";

export const metadata: Metadata = {
  title: { absolute: "Laboratoire de widgets" },
  robots: { index: false, follow: false },
};

/**
 * Laboratoire de widgets, DÉVELOPPEMENT UNIQUEMENT.
 *
 * Extension `.lab.tsx` : Next ne la reconnaît comme page qu'en `next dev` ou
 * avec `NEXT_PUBLIC_WIDGET_LAB=1` (voir `next.config.ts`). Au `next build` de
 * production, la route n'existe pas et rien du laboratoire n'est publié.
 */
export default function WidgetLabPage() {
  return <WidgetLab />;
}
