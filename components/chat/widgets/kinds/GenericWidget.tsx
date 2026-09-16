"use client";

import { Sparkles } from "lucide-react";
import type { ResponseWidget } from "@/lib/chat-response";
import { cellText, displayText, humanizeKey, isDisplayableKey, pick, rec, records } from "@/lib/widgets/core";
import { useWidgetText } from "@/lib/widgets/i18n";
import { MetaList, WidgetCard, WidgetHeader } from "../primitives";
import { TableWidget } from "./ListWidgets";

/**
 * Repli sûr pour un type de widget que ce client ne connaît pas encore.
 *
 * Il montre les champs SIMPLES (texte, nombre, booléen) avec des libellés
 * lisibles, et rien d'autre : ni JSON brut, ni identifiants, ni HTML. Une
 * nouvelle capacité serveur est donc lisible dès le premier jour, avant même
 * d'avoir son widget dédié.
 */
export function GenericWidget({ widget }: { widget: ResponseWidget }) {
  const { t } = useWidgetText();
  if (Array.isArray(widget.data)) return <TableWidget data={widget.data} title={widget.title} />;
  const data = rec(widget.data);
  const nested = Object.values(data).find((value) => records(value).length > 0);
  const summary = displayText(pick(data, "summary", "message", "description"), 220);
  const fields = Object.entries(data)
    .filter(([key, value]) => isDisplayableKey(key) && !["summary", "message", "description", "title"].includes(key) && ["string", "number", "boolean"].includes(typeof value))
    .slice(0, 8)
    .map(([key, value]) => ({ label: humanizeKey(key), value: cellText(value) }))
    .filter((item) => item.value);
  const title = widget.title || humanizeKey(widget.type) || t.generic.fallback;

  return (
    <>
      <WidgetCard label={title} testId={`generic:${widget.type}`}>
        <WidgetHeader icon={Sparkles} title={title} subtitle={summary || undefined} />
        <MetaList items={fields} />
      </WidgetCard>
      {nested ? <TableWidget data={nested} /> : null}
    </>
  );
}
