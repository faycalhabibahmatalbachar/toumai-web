"use client";

/**
 * LE REGISTRE DES WIDGETS.
 *
 * Chaîne complète :
 *
 *   résultat d'outil (serveur, `services/ui_widgets.py`)
 *     → widget normalisé `{ type, title, data, version }` dans les blocs SSE
 *     → `resolveWidget(type)` ici
 *     → composant dédié, construit sur `primitives.tsx`
 *
 * Ajouter une capacité demain = une entrée dans `WIDGETS` et un composant
 * assemblé à partir des primitives. Un type inconnu ne casse jamais le fil :
 * il tombe sur `GenericWidget`, qui affiche les champs simples et rien d'autre.
 */

import type { ComponentType } from "react";
import type { ResponseWidget } from "@/lib/chat-response";
import { rec, type Rec } from "@/lib/widgets/core";
import { AutomationWidget, ScheduledTaskWidget } from "./kinds/AutomationWidget";
import { AuthRequiredWidget, CapabilitiesWidget, QuotaWidget } from "./kinds/ConnectorWidgets";
import {
  AirQualityWidget,
  CalculatorWidget,
  CurrencyWidget,
  MapWidget,
  TimeWidget,
  UnitWidget,
  WeatherWidget,
} from "./kinds/DataWidgets";
import { FileWidget } from "./kinds/FileWidget";
import { ReminderWidget } from "./kinds/ReminderWidget";
import { GenericWidget } from "./kinds/GenericWidget";
import { CalendarWidget, MailListWidget, TableWidget } from "./kinds/ListWidgets";
import { SearchActivityWidget } from "./kinds/ResearchWidgets";

type WidgetProps = { data: Rec; title?: string; raw: unknown };
type Entry = { component: ComponentType<WidgetProps>; aliases: string[] };

const adapt = <P extends object>(Component: ComponentType<P>, map: (props: WidgetProps) => P): ComponentType<WidgetProps> => {
  const Adapted = (props: WidgetProps) => <Component {...map(props)} />;
  Adapted.displayName = `Widget(${Component.displayName || Component.name || "anonymous"})`;
  return Adapted;
};

export const WIDGETS: Record<string, Entry> = {
  weather: { component: adapt(WeatherWidget, ({ data }) => ({ data })), aliases: ["weather.current", "weather.forecast"] },
  local_time: { component: adapt(TimeWidget, ({ data }) => ({ data })), aliases: ["time"] },
  calculator: { component: adapt(CalculatorWidget, ({ data }) => ({ data })), aliases: ["calculation"] },
  currency_conversion: { component: adapt(CurrencyWidget, ({ data }) => ({ data })), aliases: ["currency"] },
  unit_conversion: { component: adapt(UnitWidget, ({ data }) => ({ data })), aliases: ["conversion"] },
  air_quality: { component: adapt(AirQualityWidget, ({ data }) => ({ data })), aliases: ["aqi"] },
  map: { component: adapt(MapWidget, ({ data }) => ({ data })), aliases: ["places", "location", "map.location"] },
  search_activity: { component: adapt(SearchActivityWidget, ({ data, title }) => ({ data, title })), aliases: ["web_search", "web.search"] },
  file_analysis: { component: adapt(FileWidget, ({ data }) => ({ data })), aliases: ["document", "file", "file.preview"] },
  email: { component: adapt(MailListWidget, ({ data, title }) => ({ rows: [data], title })), aliases: ["mail", "email.message"] },
  calendar: { component: adapt(CalendarWidget, ({ data, title }) => ({ data, title })), aliases: ["events", "calendar.event"] },
  automation: { component: adapt(AutomationWidget, ({ data, title }) => ({ data, title })), aliases: ["automation.created", "automation.updated"] },
  personal_reminder: { component: adapt(ReminderWidget, ({ data, title }) => ({ data, title })), aliases: ["reminder", "reminder.created", "personal.reminder"] },
  scheduled_task: { component: adapt(ScheduledTaskWidget, ({ data, title }) => ({ data, title })), aliases: ["whatsapp.message.scheduled"] },
  auth_required: { component: adapt(AuthRequiredWidget, ({ data }) => ({ data })), aliases: ["connector_auth"] },
  quota: { component: adapt(QuotaWidget, ({ data }) => ({ data })), aliases: ["usage"] },
  capabilities: { component: adapt(CapabilitiesWidget, ({ data }) => ({ data })), aliases: [] },
  table: { component: adapt(TableWidget, ({ raw, title }) => ({ data: raw, title })), aliases: ["table.result"] },
};

const INDEX: Record<string, Entry> = Object.fromEntries(
  Object.entries(WIDGETS).flatMap(([type, entry]) => [[type, entry], ...entry.aliases.map((alias) => [alias, entry])]),
);

export function resolveWidget(type: string): Entry | null {
  return INDEX[(type || "").trim()] ?? null;
}

export function WidgetRenderer({ widget }: { widget: ResponseWidget }) {
  const entry = resolveWidget(widget.type);
  if (!entry) return <GenericWidget widget={widget} />;
  const Component = entry.component;
  return <Component data={rec(widget.data)} title={widget.title} raw={widget.data} />;
}
