"use client";

import type { ResponseBlock, ResponseWidget } from "@/lib/chat-response";
import { MediaMessage, imagesFromUrls } from "./media/MediaMessage";
import type { ChatImage } from "./media/types";

function safeHttpUrl(raw?: string): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

function host(raw: string): string {
  try {
    return new URL(raw).host.replace(/^www\./, "");
  } catch {
    return raw;
  }
}

function SourcesBlock({ block }: { block: Extract<ResponseBlock, { type: "sources" }> }) {
  const sources = block.sources
    .map((source, index) => ({ source, index, url: safeHttpUrl(source.url) }))
    .filter((entry): entry is typeof entry & { url: string } => Boolean(entry.url))
    .slice(0, 8);
  if (!sources.length) return null;

  return (
    <section className="mt-3" aria-label="Sources consultées">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[12px] font-medium text-[var(--text-tertiary)]">
          Sources · {sources.length}
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {sources.map(({ source, index, url }) => (
          <a
            key={url + index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            referrerPolicy="no-referrer"
            aria-label={`Source ${index + 1} : ${source.title || host(url)} — ${host(url)}`}
            className="group min-w-0 rounded-xl border border-[var(--border)] px-3 py-2.5 transition hover:bg-[var(--hover)]"
          >
            <div className="flex items-start gap-2.5">
              <span
                className="mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-[var(--card)] px-1 text-[11px] font-semibold text-[var(--text-secondary)]"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-[var(--text-primary)]">
                  {source.title || host(url)}
                </p>
                <p className="truncate text-[11px] text-[var(--text-tertiary)]">{host(url)}</p>
                {"snippet" in source && typeof source.snippet === "string" && source.snippet ? (
                  <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-[var(--text-secondary)]">
                    {source.snippet}
                  </p>
                ) : null}
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

function WebImagesBlock({ block }: { block: Extract<ResponseBlock, { type: "web_images" }> }) {
  const images = block.images
    .map((img, i): ChatImage | null => {
      const url = safeHttpUrl(img.url);
      if (!url) return null;
      return {
        id: img.url + i,
        url,
        alt: img.title || "Image issue de la recherche Web",
        sourceUrl: safeHttpUrl(img.source_url) || undefined,
      };
    })
    .filter((img): img is ChatImage => Boolean(img));
  if (!images.length) return null;
  return (
    <section className="mt-3" aria-label="Images de la recherche Web">
      <MediaMessage images={images} />
    </section>
  );
}

function WeatherWidget({ data }: { data: Record<string, unknown> }) {
  const city = typeof data.city === "string" ? data.city : "";
  const country = typeof data.country === "string" ? data.country : "";
  const description = typeof data.description === "string" ? data.description : "";
  const temperature = typeof data.temperature === "number" ? data.temperature : null;
  const feelsLike = typeof data.feels_like === "number" ? data.feels_like : null;
  const humidity = typeof data.humidity === "number" ? data.humidity : null;
  const wind = typeof data.wind_speed === "number" ? data.wind_speed : null;
  const uvIndex = typeof data.uv_index === "number" ? data.uv_index : null;
  const sunrise = typeof data.sunrise === "string" ? data.sunrise : "";
  const sunset = typeof data.sunset === "string" ? data.sunset : "";
  const hourly = Array.isArray(data.hourly)
    ? data.hourly.filter(
        (hour): hour is Record<string, unknown> =>
          Boolean(hour) && typeof hour === "object" && !Array.isArray(hour),
      ).slice(0, 8)
    : [];
  const forecast = Array.isArray(data.forecast)
    ? data.forecast.filter(
        (day): day is Record<string, unknown> =>
          Boolean(day) && typeof day === "object" && !Array.isArray(day),
      ).slice(0, 7)
    : [];

  return (
    <section className="mt-3 overflow-hidden rounded-2xl border border-[var(--border)]" aria-label={`Météo ${city}`}>
      <div className="px-4 py-3.5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[var(--text-primary)]">
              {[city, country].filter(Boolean).join(", ") || "Météo"}
            </p>
            {description ? <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{description}</p> : null}
          </div>
          {temperature !== null ? (
            <p className="shrink-0 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
              {temperature}°
            </p>
          ) : null}
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
          <div>
            <dt className="text-[var(--text-tertiary)]">Ressenti</dt>
            <dd className="mt-0.5 font-medium text-[var(--text-primary)]">{feelsLike !== null ? `${feelsLike}°` : "—"}</dd>
          </div>
          <div>
            <dt className="text-[var(--text-tertiary)]">Humidité</dt>
            <dd className="mt-0.5 font-medium text-[var(--text-primary)]">{humidity !== null ? `${humidity}%` : "—"}</dd>
          </div>
          <div>
            <dt className="text-[var(--text-tertiary)]">Vent</dt>
            <dd className="mt-0.5 font-medium text-[var(--text-primary)]">{wind !== null ? `${wind} km/h` : "—"}</dd>
          </div>
          <div>
            <dt className="text-[var(--text-tertiary)]">Indice UV</dt>
            <dd className="mt-0.5 font-medium text-[var(--text-primary)]">{uvIndex !== null ? uvIndex : "—"}</dd>
          </div>
        </dl>
        {(sunrise || sunset) ? (
          <p className="mt-3 text-[11px] text-[var(--text-tertiary)]">
            {sunrise ? `Lever ${sunrise}` : ""}
            {sunrise && sunset ? " · " : ""}
            {sunset ? `Coucher ${sunset}` : ""}
          </p>
        ) : null}
      </div>
      {hourly.length ? (
        <div className="overflow-x-auto border-t border-[var(--border)] px-2 py-2" aria-label="Prévisions horaires">
          <div className="flex min-w-max gap-1">
            {hourly.map((hour, index) => (
              <div key={String(hour.time ?? index)} className="w-[4.7rem] rounded-xl px-2 py-2 text-center">
                <p className="text-[11px] font-medium text-[var(--text-secondary)]">{String(hour.time ?? "")}</p>
                <p className="mt-1 text-xs font-medium text-[var(--text-primary)]">
                  {typeof hour.temp === "number" ? `${hour.temp}°` : "—"}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {forecast.length ? (
        <div className="overflow-x-auto border-t border-[var(--border)] px-2 py-2">
          <div className="flex min-w-max gap-1">
            {forecast.map((day, index) => (
              <div key={String(day.date ?? index)} className="w-[4.7rem] rounded-xl px-2 py-2 text-center">
                <p className="text-[11px] font-medium text-[var(--text-secondary)]">{String(day.day ?? "")}</p>
                <p className="mt-1 text-xs text-[var(--text-primary)]">
                  {typeof day.max === "number" ? `${day.max}°` : "—"}
                  <span className="text-[var(--text-tertiary)]"> / {typeof day.min === "number" ? `${day.min}°` : "—"}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function WidgetBlock({ widget }: { widget: ResponseWidget }) {
  if (widget.type === "weather" && widget.data && typeof widget.data === "object" && !Array.isArray(widget.data)) {
    return <WeatherWidget data={widget.data as Record<string, unknown>} />;
  }

  if (widget.type === "table" && Array.isArray(widget.data)) {
    const rows = widget.data.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object" && !Array.isArray(row));
    const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row)))).slice(0, 8);
    if (!rows.length || !columns.length) return null;
    return (
      <section className="mt-3 overflow-hidden rounded-xl border border-[var(--border)]" aria-label={widget.title || "Tableau"}>
        {widget.title ? <h3 className="px-3 py-2 text-sm font-medium text-[var(--text-primary)]">{widget.title}</h3> : null}
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-[var(--card)] text-[var(--text-secondary)]">
              <tr>{columns.map((c) => <th key={c} scope="col" className="whitespace-nowrap px-3 py-2 font-medium">{c}</th>)}</tr>
            </thead>
            <tbody>
              {rows.slice(0, 100).map((row, i) => (
                <tr key={i} className="border-t border-[var(--border)]">
                  {columns.map((c) => <td key={c} className="max-w-[18rem] px-3 py-2 align-top text-[var(--text-primary)]">{String(row[c] ?? "")}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-3 rounded-xl border border-[var(--border)] px-3 py-2.5" aria-label={widget.title || "Widget"}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">Widget · {widget.type}</p>
      {widget.title ? <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">{widget.title}</p> : null}
    </section>
  );
}

export function RichResponseBlocks({ blocks }: { blocks?: ResponseBlock[] }) {
  if (!blocks?.length) return null;
  return (
    <>
      {blocks.map((block, index) => {
        const key = block.id || `${block.type}-${index}`;
        switch (block.type) {
          case "sources":
            return <SourcesBlock key={key} block={block} />;
          case "web_images":
            return <WebImagesBlock key={key} block={block} />;
          case "generated_images":
            return block.urls.length ? (
              <div key={key} className="mt-3">
                <MediaMessage images={imagesFromUrls(block.urls, { alt: "Image générée par Toumaï AI" })} />
              </div>
            ) : null;
          case "widget":
            return <WidgetBlock key={key} widget={block.widget} />;
          case "file":
            return (
              <div key={key} className="mt-3 rounded-xl border border-[var(--border)] px-3 py-2.5">
                <p className="truncate text-sm font-medium text-[var(--text-primary)]">{block.file.name}</p>
                <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">{block.file.mime_type || "Fichier"}</p>
                {block.file.error ? (
                  <p role="alert" className="mt-1 text-xs text-[var(--error)]">
                    {block.file.error}
                  </p>
                ) : null}
              </div>
            );
          case "activity":
          case "tool_confirmation":
            return null;
        }
      })}
    </>
  );
}
