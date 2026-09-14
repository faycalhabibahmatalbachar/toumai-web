"use client";

import {
  AlertTriangle,
  CalendarDays,
  Calculator,
  Check,
  Clock3,
  CloudSun,
  ExternalLink,
  FileText,
  Globe2,
  KeyRound,
  Mail,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Wind,
  Zap,
} from "lucide-react";
import type { ResponseWidget } from "@/lib/chat-response";

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function string(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function arrayOfRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
}

function safeHttpUrl(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function WidgetShell({
  title,
  subtitle,
  icon,
  children,
  label,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <section className="mt-3 w-full max-w-[560px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]" aria-label={label || title}>
      <div className="flex items-start gap-3 px-4 py-3.5">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--background)]/55 text-[var(--text-secondary)]">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{title}</p>
          {subtitle ? <p className="mt-0.5 text-[11px] leading-4 text-[var(--text-tertiary)]">{subtitle}</p> : null}
        </div>
      </div>
      <div className="border-t border-[var(--border)]">{children}</div>
    </section>
  );
}

function WeatherWidget({ data }: { data: Record<string, unknown> }) {
  const city = string(data.city || data.location || data.name);
  const country = string(data.country);
  const description = string(data.description || data.condition);
  const temperature = number(data.temperature ?? data.temp);
  const feelsLike = number(data.feels_like ?? data.feelsLike);
  const humidity = number(data.humidity);
  const wind = number(data.wind_speed ?? data.wind);
  const uv = number(data.uv_index ?? data.uv);
  const sunrise = string(data.sunrise);
  const sunset = string(data.sunset);
  const forecast = arrayOfRecords(data.forecast).slice(0, 7);
  const hourly = arrayOfRecords(data.hourly).slice(0, 8);

  return (
    <WidgetShell
      title={[city, country].filter(Boolean).join(", ") || "Météo"}
      subtitle={description || undefined}
      icon={<CloudSun className="h-4.5 w-4.5" aria-hidden="true" />}
      label={`Météo ${city}`}
    >
      <div className="px-4 py-3.5">
        <div className="flex items-end justify-between gap-3">
          <p className="text-4xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
            {temperature !== null ? `${Math.round(temperature)}°` : "—"}
          </p>
          <div className="text-right text-[11px] leading-5 text-[var(--text-tertiary)]">
            {feelsLike !== null ? <p>Ressenti {Math.round(feelsLike)}°</p> : null}
            {sunrise || sunset ? <p>{sunrise ? `Lever ${sunrise}` : ""}{sunrise && sunset ? " · " : ""}{sunset ? `Coucher ${sunset}` : ""}</p> : null}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Metric label="Humidité" value={humidity !== null ? `${humidity}%` : "—"} />
          <Metric label="Vent" value={wind !== null ? `${wind} km/h` : "—"} />
          <Metric label="UV" value={uv !== null ? String(uv) : "—"} />
        </div>
      </div>
      {hourly.length ? (
        <div className="overflow-x-auto border-t border-[var(--border)] px-2 py-2" aria-label="Prévisions horaires">
          <div className="flex min-w-max gap-1">
            {hourly.map((hour, index) => (
              <div key={string(hour.time) || index} className="w-[4.6rem] rounded-xl px-2 py-2 text-center">
                <p className="text-[10px] text-[var(--text-tertiary)]">{string(hour.time || hour.hour)}</p>
                <p className="mt-1 text-[12px] font-semibold text-[var(--text-primary)]">{number(hour.temp ?? hour.temperature) !== null ? `${number(hour.temp ?? hour.temperature)}°` : "—"}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {forecast.length ? (
        <div className="overflow-x-auto border-t border-[var(--border)] px-2 py-2" aria-label="Prévisions sur plusieurs jours">
          <div className="flex min-w-max gap-1">
            {forecast.map((day, index) => {
              const max = number(day.max ?? day.temp_max);
              const min = number(day.min ?? day.temp_min);
              return (
                <div key={string(day.date) || index} className="w-[5.25rem] rounded-xl px-2 py-2 text-center">
                  <p className="truncate text-[10px] text-[var(--text-tertiary)]">{string(day.day || day.date)}</p>
                  <p className="mt-1 text-[12px] font-medium text-[var(--text-primary)]">{max !== null ? `${max}°` : "—"} <span className="text-[var(--text-tertiary)]">{min !== null ? `${min}°` : ""}</span></p>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </WidgetShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--background)]/45 px-2.5 py-2">
      <p className="text-[10px] text-[var(--text-tertiary)]">{label}</p>
      <p className="mt-0.5 truncate text-[12px] font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

function TimeWidget({ data }: { data: Record<string, unknown> }) {
  const location = string(data.location || data.city || data.timezone);
  const time = string(data.time || data.local_time);
  const date = string(data.date || data.local_date);
  const offset = string(data.utc_offset || data.offset);
  return (
    <WidgetShell title={location || "Heure locale"} subtitle={offset || undefined} icon={<Clock3 className="h-4.5 w-4.5" />}>
      <div className="px-4 py-4">
        <p className="text-4xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">{time || "—"}</p>
        {date ? <p className="mt-1 text-[12px] text-[var(--text-secondary)]">{date}</p> : null}
      </div>
    </WidgetShell>
  );
}

function CalculatorWidget({ data }: { data: Record<string, unknown> }) {
  const expression = string(data.expression || data.input);
  const result = data.result ?? data.value;
  return (
    <WidgetShell title="Calcul" subtitle={expression || undefined} icon={<Calculator className="h-4.5 w-4.5" />}>
      <div className="px-4 py-4">
        <p className="break-all text-3xl font-semibold tracking-tight text-[var(--text-primary)]">{result === undefined || result === null ? "—" : String(result)}</p>
      </div>
    </WidgetShell>
  );
}

function CurrencyWidget({ data }: { data: Record<string, unknown> }) {
  const from = string(data.from || data.base_currency || data.base);
  const to = string(data.to || data.quote_currency || data.quote);
  const amount = number(data.amount ?? data.base_amount);
  const converted = number(data.converted ?? data.result ?? data.quote_amount);
  const rate = number(data.rate);
  const updated = string(data.updated_at || data.timestamp || data.as_of);
  return (
    <WidgetShell title="Conversion de devise" subtitle={updated ? `Taux · ${updated}` : undefined} icon={<RefreshCw className="h-4.5 w-4.5" />}>
      <div className="px-4 py-4">
        <p className="text-[12px] text-[var(--text-tertiary)]">{amount !== null ? amount.toLocaleString("fr-FR") : "—"} {from}</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">{converted !== null ? converted.toLocaleString("fr-FR", { maximumFractionDigits: 4 }) : "—"} {to}</p>
        {rate !== null ? <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">1 {from} = {rate.toLocaleString("fr-FR", { maximumFractionDigits: 6 })} {to}</p> : null}
      </div>
    </WidgetShell>
  );
}

function UnitWidget({ data }: { data: Record<string, unknown> }) {
  const input = data.input ?? data.amount;
  const inputUnit = string(data.input_unit || data.from_unit || data.from);
  const result = data.result ?? data.converted;
  const outputUnit = string(data.output_unit || data.to_unit || data.to);
  return (
    <WidgetShell title="Conversion" icon={<RefreshCw className="h-4.5 w-4.5" />}>
      <div className="px-4 py-4">
        <p className="text-[12px] text-[var(--text-tertiary)]">{input === undefined ? "—" : String(input)} {inputUnit}</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">{result === undefined ? "—" : String(result)} {outputUnit}</p>
      </div>
    </WidgetShell>
  );
}

function AirQualityWidget({ data }: { data: Record<string, unknown> }) {
  const location = string(data.location || data.city);
  const aqi = number(data.aqi ?? data.index);
  const category = string(data.category || data.quality || data.label);
  const pm25 = number(data.pm25 ?? data.pm2_5);
  const pm10 = number(data.pm10);
  return (
    <WidgetShell title={location || "Qualité de l’air"} subtitle={category || undefined} icon={<Wind className="h-4.5 w-4.5" />}>
      <div className="px-4 py-4">
        <div className="flex items-end justify-between gap-3">
          <div><p className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">Indice AQI</p><p className="mt-1 text-4xl font-semibold tracking-tight text-[var(--text-primary)]">{aqi ?? "—"}</p></div>
          {category ? <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)]">{category}</span> : null}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2"><Metric label="PM2.5" value={pm25 !== null ? `${pm25} µg/m³` : "—"} /><Metric label="PM10" value={pm10 !== null ? `${pm10} µg/m³` : "—"} /></div>
      </div>
    </WidgetShell>
  );
}

function MapWidget({ data }: { data: Record<string, unknown> }) {
  const points = arrayOfRecords(data.points || data.places || data.locations).slice(0, 25);
  const title = string(data.title || data.name) || "Lieux";
  const answer = string(data.answer || data.summary);
  const mapUrl = safeHttpUrl(data.map_url || data.url);
  return (
    <WidgetShell title={title} subtitle={answer || undefined} icon={<MapPin className="h-4.5 w-4.5" />}>
      <div className="divide-y divide-[var(--border)]">
        {points.length ? points.map((point, index) => {
          const name = string(point.name || point.title || point.address) || `Lieu ${index + 1}`;
          const address = string(point.address || point.subtitle);
          return <div key={`${name}-${index}`} className="flex items-start gap-3 px-4 py-3"><span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--background)] text-[10px] font-semibold text-[var(--text-secondary)]">{index + 1}</span><div className="min-w-0"><p className="text-[12px] font-medium text-[var(--text-primary)]">{name}</p>{address && address !== name ? <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">{address}</p> : null}</div></div>;
        }) : <p className="px-4 py-3 text-[12px] text-[var(--text-tertiary)]">Aucun lieu à afficher.</p>}
      </div>
      {mapUrl ? <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-between border-t border-[var(--border)] px-4 text-[12px] font-medium text-[var(--primary)]">Ouvrir la carte <ExternalLink className="h-3.5 w-3.5" /></a> : null}
    </WidgetShell>
  );
}

function SearchActivityWidget({ data }: { data: Record<string, unknown> }) {
  const query = string(data.query);
  const count = number(data.sources_count ?? data.count);
  const status = string(data.status);
  return (
    <WidgetShell title={status === "done" ? "Recherche terminée" : "Recherche Web"} subtitle={query || undefined} icon={status === "done" ? <Check className="h-4.5 w-4.5" /> : <Search className="h-4.5 w-4.5" />}>
      <div className="px-4 py-3"><p className="text-[12px] text-[var(--text-secondary)]">{count !== null ? `${count} source${count > 1 ? "s" : ""} consultée${count > 1 ? "s" : ""}` : "Consultation des sources…"}</p></div>
    </WidgetShell>
  );
}

function FileAnalysisWidget({ data }: { data: Record<string, unknown> }) {
  const name = string(data.name || data.filename) || "Document";
  const status = string(data.status) || "ready";
  const pages = number(data.pages ?? data.page_count);
  const rows = number(data.rows ?? data.row_count);
  const sheets = number(data.sheets ?? data.sheet_count);
  const duration = string(data.duration);
  const detail = [pages !== null ? `${pages} page${pages > 1 ? "s" : ""}` : "", sheets !== null ? `${sheets} feuille${sheets > 1 ? "s" : ""}` : "", rows !== null ? `${rows.toLocaleString("fr-FR")} lignes` : "", duration].filter(Boolean).join(" · ");
  return (
    <WidgetShell title={name} subtitle={status === "processing" ? "Analyse en cours…" : detail || "Fichier analysé"} icon={<FileText className="h-4.5 w-4.5" />}>
      <div className="flex items-center gap-2 px-4 py-3 text-[12px] text-[var(--text-secondary)]">{status === "processing" ? <><span className="h-2 w-2 animate-pulse rounded-full bg-[var(--primary)]" /> Analyse du contenu…</> : <><Check className="h-3.5 w-3.5 text-emerald-600" /> Prêt pour vos questions</>}</div>
    </WidgetShell>
  );
}

function MailWidget({ data }: { data: Record<string, unknown> }) {
  const from = string(data.from || data.sender);
  const to = string(data.to || data.recipient);
  const subject = string(data.subject || data.title) || "E-mail";
  const snippet = string(data.snippet || data.preview || data.body);
  const status = string(data.status);
  return (
    <WidgetShell title={subject} subtitle={[from ? `De ${from}` : "", to ? `À ${to}` : ""].filter(Boolean).join(" · ") || undefined} icon={<Mail className="h-4.5 w-4.5" />}>
      <div className="px-4 py-3">{snippet ? <p className="line-clamp-4 text-[12px] leading-5 text-[var(--text-secondary)]">{snippet}</p> : null}{status ? <p className="mt-2 text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">{status}</p> : null}</div>
    </WidgetShell>
  );
}

function CalendarWidget({ data }: { data: Record<string, unknown> }) {
  const events = arrayOfRecords(data.events || data.items).slice(0, 12);
  const title = string(data.title) || "Agenda";
  return (
    <WidgetShell title={title} subtitle={events.length ? `${events.length} événement${events.length > 1 ? "s" : ""}` : undefined} icon={<CalendarDays className="h-4.5 w-4.5" />}>
      <div className="divide-y divide-[var(--border)]">{events.length ? events.map((event, index) => <div key={string(event.id) || index} className="px-4 py-3"><div className="flex items-start justify-between gap-3"><p className="min-w-0 truncate text-[12px] font-medium text-[var(--text-primary)]">{string(event.title || event.summary) || "Événement"}</p><span className="shrink-0 text-[10px] text-[var(--text-tertiary)]">{string(event.time || event.start)}</span></div>{string(event.location) ? <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">{string(event.location)}</p> : null}</div>) : <p className="px-4 py-3 text-[12px] text-[var(--text-tertiary)]">Aucun événement.</p>}</div>
    </WidgetShell>
  );
}

function AutomationWidget({ data }: { data: Record<string, unknown> }) {
  const name = string(data.name || data.title) || "Automatisation";
  const status = string(data.status || data.state);
  const schedule = string(data.schedule || data.when || data.next_run);
  const enabled = typeof data.enabled === "boolean" ? data.enabled : null;
  return (
    <WidgetShell title={name} subtitle={schedule || undefined} icon={<Zap className="h-4.5 w-4.5" />}>
      <div className="flex items-center justify-between gap-3 px-4 py-3"><p className="text-[12px] text-[var(--text-secondary)]">{status || (enabled === false ? "Désactivée" : "Active")}</p>{enabled !== null ? <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${enabled ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-[var(--background)] text-[var(--text-tertiary)]"}`}>{enabled ? "Active" : "Inactive"}</span> : null}</div>
    </WidgetShell>
  );
}

function AuthRequiredWidget({ data }: { data: Record<string, unknown> }) {
  const provider = string(data.provider || data.service) || "ce service";
  const actionUrl = safeHttpUrl(data.action_url || data.url);
  return (
    <WidgetShell title={`Connexion requise · ${provider}`} subtitle={string(data.message) || "Connectez votre compte pour continuer."} icon={<KeyRound className="h-4.5 w-4.5" />}>
      <div className="px-4 py-3">{actionUrl ? <a href={actionUrl} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-[12px] font-semibold text-white" target="_blank" rel="noopener noreferrer">Connecter le compte <ExternalLink className="h-3.5 w-3.5" /></a> : <p className="text-[12px] text-[var(--text-secondary)]">Ouvrez les connecteurs Toumaï AI pour autoriser l’accès.</p>}</div>
    </WidgetShell>
  );
}

function QuotaWidget({ data }: { data: Record<string, unknown> }) {
  const used = number(data.used ?? data.consumed);
  const limit = number(data.limit ?? data.total);
  const remaining = number(data.remaining);
  const reset = string(data.reset_at || data.renews_at);
  const label = string(data.label || data.resource) || "Limite d’utilisation";
  const ratio = used !== null && limit !== null && limit > 0 ? Math.min(100, Math.max(0, (used / limit) * 100)) : null;
  return (
    <WidgetShell title={label} subtitle={reset ? `Renouvellement · ${reset}` : undefined} icon={<ShieldCheck className="h-4.5 w-4.5" />}>
      <div className="px-4 py-3">{used !== null && limit !== null ? <><div className="flex justify-between gap-3 text-[11px] text-[var(--text-secondary)]"><span>{used.toLocaleString("fr-FR")} / {limit.toLocaleString("fr-FR")}</span><span>{remaining !== null ? `${remaining.toLocaleString("fr-FR")} restant${remaining > 1 ? "s" : ""}` : ""}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--background)]"><div className="h-full rounded-full bg-[var(--primary)] transition-all" style={{ width: `${ratio ?? 0}%` }} /></div></> : <p className="text-[12px] text-[var(--text-secondary)]">La limite n’est pas disponible actuellement.</p>}</div>
    </WidgetShell>
  );
}

function TableWidget({ data, title }: { data: unknown; title?: string }) {
  const rows = arrayOfRecords(data).slice(0, 100);
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row)))).slice(0, 8);
  if (!rows.length || !columns.length) return null;
  return (
    <WidgetShell title={title || "Tableau"} icon={<Sparkles className="h-4.5 w-4.5" />}>
      <div className="overflow-x-auto"><table className="min-w-full text-left text-xs"><thead className="bg-[var(--background)]/55 text-[var(--text-secondary)]"><tr>{columns.map((column) => <th key={column} className="whitespace-nowrap px-3 py-2 font-medium">{column}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index} className="border-t border-[var(--border)]">{columns.map((column) => <td key={column} className="max-w-[18rem] px-3 py-2 align-top text-[var(--text-primary)]">{String(row[column] ?? "")}</td>)}</tr>)}</tbody></table></div>
    </WidgetShell>
  );
}

function GenericWidget({ widget }: { widget: ResponseWidget }) {
  const data = record(widget.data);
  const summary = string(data.summary || data.message || data.description);
  return (
    <WidgetShell title={widget.title || widget.type.replace(/[_-]+/g, " ")} subtitle={summary || undefined} icon={<Globe2 className="h-4.5 w-4.5" />}>
      <div className="px-4 py-3"><p className="text-[11px] text-[var(--text-tertiary)]">Les données de ce widget ne sont pas encore présentées dans un format spécialisé.</p></div>
    </WidgetShell>
  );
}

export function WidgetRenderer({ widget }: { widget: ResponseWidget }) {
  const data = record(widget.data);
  switch (widget.type) {
    case "weather": return <WeatherWidget data={data} />;
    case "time":
    case "local_time": return <TimeWidget data={data} />;
    case "calculator":
    case "calculation": return <CalculatorWidget data={data} />;
    case "currency":
    case "currency_conversion": return <CurrencyWidget data={data} />;
    case "unit_conversion":
    case "conversion": return <UnitWidget data={data} />;
    case "air_quality":
    case "aqi": return <AirQualityWidget data={data} />;
    case "map":
    case "places":
    case "location": return <MapWidget data={data} />;
    case "search_activity":
    case "web_search": return <SearchActivityWidget data={data} />;
    case "file_analysis":
    case "document": return <FileAnalysisWidget data={data} />;
    case "email":
    case "mail": return <MailWidget data={data} />;
    case "calendar":
    case "events": return <CalendarWidget data={data} />;
    case "automation":
    case "scheduled_task": return <AutomationWidget data={data} />;
    case "auth_required":
    case "connector_auth": return <AuthRequiredWidget data={data} />;
    case "quota":
    case "usage": return <QuotaWidget data={data} />;
    case "table": return <TableWidget data={widget.data} title={widget.title} />;
    default: return <GenericWidget widget={widget} />;
  }
}
