"use client";

/**
 * Données structurées : météo, heure, calcul, conversions, qualité de l'air,
 * lieux. Règle commune : un champ absent disparaît, il n'est jamais remplacé
 * par un tiret qui laisserait croire à une mesure.
 */

import {
  Calculator,
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Clock3,
  ExternalLink,
  MapPin,
  RefreshCw,
  Sun,
  Thermometer,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { useMemo } from "react";
import {
  aqiTone,
  displayText,
  num,
  pick,
  pickNum,
  records,
  safeHttpUrl,
  weatherIcon,
  type Rec,
  type WeatherIcon,
} from "@/lib/widgets/core";
import { useWidgetText } from "@/lib/widgets/i18n";
import { CollapsibleList, Disclosure, EmptyState, Metric, WidgetButton, WidgetCard, WidgetHeader, ActionBar } from "../primitives";

const WEATHER_ICONS: Record<WeatherIcon, LucideIcon> = {
  sun: Sun, "cloud-sun": CloudSun, cloud: Cloud, rain: CloudRain, storm: CloudLightning,
  snow: CloudSnow, fog: CloudFog, wind: Wind, unknown: Thermometer,
};

function fmt(value: number | null, locale: string, digits = 0) {
  return value === null ? "" : value.toLocaleString(locale, { maximumFractionDigits: digits });
}

export function WeatherWidget({ data }: { data: Rec }) {
  const { t, locale } = useWidgetText();
  const city = pick(data, "city", "location", "name");
  const country = pick(data, "country");
  const description = pick(data, "description", "condition");
  const temperature = pickNum(data, "temperature", "temp");
  const feels = pickNum(data, "feels_like", "feelsLike", "apparent_temperature");
  const humidity = pickNum(data, "humidity");
  const wind = pickNum(data, "wind_speed", "wind");
  const uv = pickNum(data, "uv_index", "uv");
  const rain = pickNum(data, "precipitation_probability", "rain_probability");
  const sunrise = pick(data, "sunrise");
  const sunset = pick(data, "sunset");
  const hourly = records(data.hourly).slice(0, 12);
  const daily = records(data.forecast ?? data.daily).slice(0, 7);
  const Icon = WEATHER_ICONS[weatherIcon(data.weather_code ?? data.code, description)];

  const metrics = [
    humidity !== null ? { label: t.weather.humidity, value: `${fmt(humidity, locale)} %` } : null,
    wind !== null ? { label: t.weather.wind, value: `${fmt(wind, locale)} km/h` } : null,
    uv !== null ? { label: t.weather.uv, value: fmt(uv, locale, 1) } : null,
    rain !== null ? { label: t.weather.rain, value: `${fmt(rain, locale)} %` } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const place = [city, country].filter(Boolean).join(", ");
  return (
    <WidgetCard label={place ? `Météo ${place}` : "Météo"} testId="weather">
      <div className="flex items-start gap-3 px-3.5 pb-2 pt-3.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{place || "Météo"}</p>
          {description ? <p className="mt-0.5 text-[12px] text-[var(--text-tertiary)]">{description}</p> : null}
          <p className="mt-2 text-[40px] font-semibold leading-none tracking-[-0.04em] tabular-nums text-[var(--text-primary)]">
            {temperature !== null ? `${Math.round(temperature)}°` : ""}
          </p>
          {feels !== null ? <p className="mt-1 text-[12px] text-[var(--text-secondary)]">{t.weather.feels} {Math.round(feels)}°</p> : null}
        </div>
        <Icon className="mt-1 h-10 w-10 shrink-0 text-[var(--accent)]" strokeWidth={1.5} aria-hidden="true" />
      </div>
      {metrics.length ? (
        <div className={`grid gap-2 px-3.5 pb-3 ${metrics.length >= 4 ? "grid-cols-2 sm:grid-cols-4" : metrics.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
          {metrics.map((m) => <Metric key={m.label} label={m.label} value={m.value} />)}
        </div>
      ) : null}
      {sunrise || sunset ? (
        <p className="px-3.5 pb-3 text-[11.5px] text-[var(--text-tertiary)]">
          {[sunrise ? `${t.weather.sunrise} ${sunrise}` : "", sunset ? `${t.weather.sunset} ${sunset}` : ""].filter(Boolean).join(" · ")}
        </p>
      ) : null}
      {hourly.length ? (
        <div className="border-t border-[var(--border)]">
          <p className="px-3.5 pt-2.5 text-[11px] font-medium text-[var(--text-tertiary)]">{t.weather.hourly}</p>
          <div className="overflow-x-auto overscroll-x-contain px-2 pb-2" tabIndex={0} aria-label={t.weather.hourly}>
            <ol className="flex min-w-max gap-1 pt-1">
              {hourly.map((hour, index) => {
                const temp = pickNum(hour, "temp", "temperature");
                return (
                  <li key={`${pick(hour, "time", "hour")}-${index}`} className="w-14 rounded-lg px-1 py-1.5 text-center">
                    <p className="text-[11px] tabular-nums text-[var(--text-tertiary)]">{pick(hour, "time", "hour")}</p>
                    <p className="mt-0.5 text-[13px] font-semibold tabular-nums text-[var(--text-primary)]">{temp !== null ? `${temp}°` : ""}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      ) : null}
      {daily.length ? (
        <Disclosure summary={t.weather.daily} count={daily.length}>
          <ul className="px-3.5 pb-2">
            {daily.map((day, index) => {
              const max = pickNum(day, "max", "temp_max");
              const min = pickNum(day, "min", "temp_min");
              const DayIcon = WEATHER_ICONS[weatherIcon(day.weather_code ?? day.code, pick(day, "desc", "description"))];
              return (
                <li key={`${pick(day, "date")}-${index}`} className="flex min-h-8 items-center gap-3 text-[12.5px]">
                  <span className="w-12 shrink-0 text-[var(--text-secondary)]">{pick(day, "day", "date")}</span>
                  <DayIcon className="h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-[11.5px] text-[var(--text-tertiary)]">{pick(day, "desc", "description")}</span>
                  <span className="shrink-0 tabular-nums text-[var(--text-primary)]">{max !== null ? `${max}°` : ""}</span>
                  <span className="w-8 shrink-0 text-end tabular-nums text-[var(--text-tertiary)]">{min !== null ? `${min}°` : ""}</span>
                </li>
              );
            })}
          </ul>
        </Disclosure>
      ) : null}
    </WidgetCard>
  );
}

/** Gabarit commun des résultats « une valeur » : calcul, heure, conversions. */
function ValueCard({ icon, title, subtitle, primary, secondary, testId }: { icon: LucideIcon; title: string; subtitle?: string; primary: string; secondary?: string; testId: string }) {
  return (
    <WidgetCard label={title} testId={testId} className="!max-w-[26rem]">
      <WidgetHeader icon={icon} title={title} subtitle={subtitle} />
      <div className="px-3.5 pb-3.5">
        <p className="break-all text-[28px] font-semibold leading-tight tracking-[-0.02em] tabular-nums text-[var(--text-primary)]">{primary}</p>
        {secondary ? <p className="mt-1 text-[12px] text-[var(--text-tertiary)]">{secondary}</p> : null}
      </div>
    </WidgetCard>
  );
}

export function TimeWidget({ data }: { data: Rec }) {
  const place = pick(data, "location", "city", "timezone");
  const time = pick(data, "time", "local_time");
  if (!time) return null;
  return <ValueCard icon={Clock3} testId="local_time" title={place || "Heure locale"} subtitle={pick(data, "utc_offset", "offset")} primary={time} secondary={pick(data, "date", "local_date")} />;
}

export function CalculatorWidget({ data }: { data: Rec }) {
  const { locale } = useWidgetText();
  const expression = pick(data, "expression", "input");
  const raw = data.result ?? data.value;
  const value = num(raw);
  const primary = value !== null ? value.toLocaleString(locale, { maximumFractionDigits: 10 }) : pick(data, "result", "value");
  if (!primary) return null;
  return <ValueCard icon={Calculator} testId="calculator" title={expression || "Calcul"} primary={`= ${primary}`} />;
}

export function CurrencyWidget({ data }: { data: Rec }) {
  const { locale } = useWidgetText();
  const from = pick(data, "from", "base_currency", "base");
  const to = pick(data, "to", "quote_currency", "quote");
  const amount = pickNum(data, "amount", "base_amount");
  const converted = pickNum(data, "converted", "result", "quote_amount");
  const rate = pickNum(data, "rate");
  if (converted === null) return null;
  return (
    <ValueCard
      icon={RefreshCw}
      testId="currency_conversion"
      title={amount !== null ? `${fmt(amount, locale, 2)} ${from}` : from || "Conversion"}
      subtitle={pick(data, "updated_at", "timestamp", "as_of")}
      primary={`${fmt(converted, locale, 4)} ${to}`}
      secondary={rate !== null ? `1 ${from} = ${fmt(rate, locale, 6)} ${to}` : undefined}
    />
  );
}

export function UnitWidget({ data }: { data: Rec }) {
  const input = pick(data, "input", "amount", "value");
  const result = pick(data, "result", "converted");
  if (!result) return null;
  return (
    <ValueCard
      icon={RefreshCw}
      testId="unit_conversion"
      title={`${input} ${pick(data, "input_unit", "from_unit", "from")}`.trim() || "Conversion"}
      primary={`${result} ${pick(data, "output_unit", "to_unit", "to")}`.trim()}
    />
  );
}

export function AirQualityWidget({ data }: { data: Rec }) {
  const { locale } = useWidgetText();
  const place = pick(data, "location", "city");
  const aqi = pickNum(data, "aqi", "index");
  const category = pick(data, "category", "quality", "label");
  const pm25 = pickNum(data, "pm25", "pm2_5");
  const pm10 = pickNum(data, "pm10");
  const tone = aqiTone(aqi);
  return (
    <WidgetCard label={place || "Qualité de l’air"} testId="air_quality" className="!max-w-[26rem]">
      <WidgetHeader icon={Wind} title={place || "Qualité de l’air"} subtitle={category || undefined} />
      <div className="flex items-end gap-3 px-3.5 pb-3">
        <p className="text-[34px] font-semibold leading-none tabular-nums text-[var(--text-primary)]">{aqi !== null ? fmt(aqi, locale) : ""}</p>
        {aqi !== null ? <span className={`tmw-tone-${tone} tmw-badge mb-1 rounded-full px-2 py-0.5 text-[11px] font-medium`}>AQI</span> : null}
      </div>
      {pm25 !== null || pm10 !== null ? (
        <div className="grid grid-cols-2 gap-2 px-3.5 pb-3.5">
          {pm25 !== null ? <Metric label="PM2.5" value={`${fmt(pm25, locale, 1)} µg/m³`} /> : null}
          {pm10 !== null ? <Metric label="PM10" value={`${fmt(pm10, locale, 1)} µg/m³`} /> : null}
        </div>
      ) : null}
    </WidgetCard>
  );
}

export function MapWidget({ data }: { data: Rec }) {
  const { t } = useWidgetText();
  const points = useMemo(() => records(data.points ?? data.places ?? data.locations).slice(0, 50), [data]);
  const title = pick(data, "title", "name") || "Lieux";
  const mapUrl = safeHttpUrl(data.map_url ?? data.url);
  return (
    <WidgetCard label={title} testId="map">
      <WidgetHeader icon={MapPin} title={title} subtitle={displayText(pick(data, "answer", "summary"), 160) || undefined} />
      {points.length ? (
        <CollapsibleList
          label={title}
          items={points}
          initial={5}
          className="border-t border-[var(--border)]"
          render={(point, index) => {
            const name = displayText(pick(point, "name", "title", "address"), 80) || `${index + 1}`;
            const address = displayText(pick(point, "address", "subtitle"), 120);
            const link = safeHttpUrl(point.url ?? point.map_url);
            return (
              <div className="flex min-h-11 items-start gap-3 px-3.5 py-2.5">
                <span className="tmw-inset mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums text-[var(--text-secondary)]">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-[12.5px] font-medium text-[var(--text-primary)]">{name}</p>
                  {address && address !== name ? <p className="mt-0.5 break-words text-[11.5px] text-[var(--text-tertiary)]">{address}</p> : null}
                </div>
                {link ? <a href={link} target="_blank" rel="noopener noreferrer" aria-label={`${t.common.open} ${name}`} className="shrink-0 rounded-md p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"><ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></a> : null}
              </div>
            );
          }}
        />
      ) : <EmptyState icon={MapPin} title={t.table.empty} />}
      {mapUrl ? <ActionBar><WidgetButton href={mapUrl} external icon={ExternalLink}>{t.common.open}</WidgetButton></ActionBar> : null}
    </WidgetCard>
  );
}
