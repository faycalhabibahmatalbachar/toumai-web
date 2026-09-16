"use client";

/**
 * Primitives du système de widgets.
 *
 * Chaque widget du chat se construit avec ces pièces, et seulement elles :
 * même conteneur, même en-tête, même badge d'état, mêmes boutons, même menu.
 * Un widget qui a besoin d'un nouveau style d'élément doit l'ajouter ici, pas
 * le recréer dans son coin — c'est ce qui garde 30 cartes différentes lisibles
 * comme un seul produit.
 */

import {
  AlertTriangle,
  Check,
  ChevronDown,
  Circle,
  CircleX,
  Clock3,
  LoaderCircle,
  MoreHorizontal,
  PauseCircle,
  type LucideIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { toneOf, type StatusKey, type StatusTone } from "@/lib/widgets/core";
import { useWidgetText } from "@/lib/widgets/i18n";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

// ── Conteneur ────────────────────────────────────────────────────────────────

export function WidgetCard({
  children,
  label,
  tone,
  accent = false,
  className,
  live = false,
  alert = false,
  testId,
}: {
  children: ReactNode;
  label: string;
  tone?: StatusTone;
  /** Filet d'état discret. Réservé aux résultats d'action, pas aux données. */
  accent?: boolean;
  className?: string;
  /** Annonce les changements d'état aux lecteurs d'écran. */
  live?: boolean;
  /** Réservé à un échec réel : une alerte interrompt la lecture. */
  alert?: boolean;
  testId?: string;
}) {
  const { dir } = useWidgetText();
  return (
    <section
      dir={dir}
      aria-label={label}
      aria-live={live ? "polite" : undefined}
      role={alert ? "alert" : undefined}
      data-widget={testId}
      data-accent={accent && tone ? "true" : undefined}
      className={cx("tmw-card tmw-enter mt-2.5", tone && `tmw-tone-${tone}`, className)}
    >
      {children}
    </section>
  );
}

// ── Icônes et états ─────────────────────────────────────────────────────────

export function StatusIcon({ status, className = "h-4 w-4" }: { status: StatusKey; className?: string }) {
  const tone = toneOf(status);
  if (tone === "progress") return <LoaderCircle className={cx(className, "animate-spin motion-reduce:animate-none")} aria-hidden="true" />;
  if (tone === "success") return <Check className={className} aria-hidden="true" />;
  if (tone === "error") return <CircleX className={className} aria-hidden="true" />;
  if (tone === "warning" || tone === "attention") return <AlertTriangle className={className} aria-hidden="true" />;
  if (tone === "active") return <Clock3 className={className} aria-hidden="true" />;
  if (status === "paused") return <PauseCircle className={className} aria-hidden="true" />;
  return <Circle className={cx(className, "scale-75")} aria-hidden="true" />;
}

/** Tuile d'icône : la fonction (outil, connecteur), jamais l'état seul. */
export function ToolIcon({ icon: Icon, tone }: { icon: LucideIcon; tone?: StatusTone }) {
  return (
    <span
      className={cx(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]",
        tone ? `tmw-tone-${tone} tmw-icon-soft` : "tmw-inset border border-[var(--border)] text-[var(--text-secondary)]",
      )}
      aria-hidden="true"
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}

export function StatusBadge({ status, label }: { status: StatusKey; label?: string }) {
  const { t } = useWidgetText();
  const tone = toneOf(status);
  return (
    <span className={cx("tmw-badge inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-[11px] font-medium", `tmw-tone-${tone}`)}>
      <StatusIcon status={status} className="h-3 w-3" />
      {label || t.status[status]}
    </span>
  );
}

// ── En-tête ─────────────────────────────────────────────────────────────────

export function WidgetHeader({
  icon,
  title,
  subtitle,
  status,
  statusLabel,
  trailing,
  tone,
}: {
  icon?: LucideIcon;
  title: ReactNode;
  subtitle?: ReactNode;
  status?: StatusKey;
  statusLabel?: string;
  trailing?: ReactNode;
  tone?: StatusTone;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 px-3.5 py-3">
      {icon ? <ToolIcon icon={icon} tone={tone} /> : null}
      <div className="min-w-0 flex-1 pt-px">
        <p dir="auto" className="break-words text-start text-[13.5px] font-semibold leading-5 text-[var(--text-primary)]">{title}</p>
        {subtitle ? <p className="mt-0.5 break-words text-[12px] leading-[18px] text-[var(--text-tertiary)]">{subtitle}</p> : null}
      </div>
      {status || trailing ? (
        <div className="flex shrink-0 items-center gap-1">
          {status ? <StatusBadge status={status} label={statusLabel} /> : null}
          {trailing}
        </div>
      ) : null}
    </div>
  );
}

// ── Contenu ─────────────────────────────────────────────────────────────────

export interface MetaItem {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  /** Occupe toute la largeur (texte long). */
  wide?: boolean;
}

export function MetaList({ items }: { items: MetaItem[] }) {
  const visible = items.filter((item) => item.value !== "" && item.value !== null && item.value !== undefined);
  if (!visible.length) return null;
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 px-3.5 pb-3">
      {visible.map((item) => (
        <div key={item.label} className={cx("min-w-0", item.wide && "col-span-2")}>
          <dt className="flex items-center gap-1.5 text-[11px] text-[var(--text-tertiary)]">
            {item.icon ? <item.icon className="h-3 w-3" aria-hidden="true" /> : null}
            {item.label}
          </dt>
          <dd dir="auto" className="mt-0.5 text-start break-words text-[12.5px] leading-[18px] text-[var(--text-primary)]">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="tmw-inset min-w-0 rounded-xl px-2.5 py-2">
      <p className="truncate text-[11px] text-[var(--text-tertiary)]">{label}</p>
      <p className="mt-0.5 truncate text-[13px] font-semibold tabular-nums text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

/** Aperçu de contenu (message, e-mail) : cité, borné, jamais du HTML. */
export function ContentPreview({ children, lines = 3 }: { children: ReactNode; lines?: 2 | 3 | 4 }) {
  const clamp = lines === 2 ? "line-clamp-2" : lines === 4 ? "line-clamp-4" : "line-clamp-3";
  return (
    <div className="px-3.5 pb-3">
      <p dir="auto" className={cx("tmw-inset text-start whitespace-pre-line break-words rounded-xl px-3 py-2 text-[12.5px] leading-[19px] text-[var(--text-secondary)]", clamp)}>
        {children}
      </p>
    </div>
  );
}

export function EntityAvatar({ name, size = 28 }: { name?: string; size?: number }) {
  const clean = (name || "").replace(/[^\p{L}\p{N} ]/gu, " ").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  const initials = parts.length ? (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase() : "?";
  return (
    <span
      className="tmw-inset inline-flex shrink-0 items-center justify-center rounded-full border border-[var(--border)] font-semibold text-[var(--text-secondary)]"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

// ── Actions ─────────────────────────────────────────────────────────────────

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function WidgetButton({
  children,
  onClick,
  href,
  variant = "secondary",
  icon: Icon,
  loading = false,
  disabled = false,
  external = false,
  ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: ButtonVariant;
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  external?: boolean;
  ariaLabel?: string;
}) {
  const classes = cx(
    "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-[10px] px-3 text-[12.5px] font-medium outline-none transition-colors",
    "focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--card)]",
    "disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none",
    variant === "primary" && "tmw-btn-primary",
    variant === "secondary" && "border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--hover)]",
    variant === "ghost" && "text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text-primary)]",
    variant === "danger" && "tmw-btn-danger",
  );
  const content = (
    <>
      {loading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : Icon ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
      {children}
    </>
  );
  if (href && !disabled) {
    return (
      <a
        href={href}
        className={classes}
        aria-label={ariaLabel}
        {...(external ? { target: "_blank", rel: "noopener noreferrer", referrerPolicy: "no-referrer" as const } : {})}
      >
        {content}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled || loading} aria-busy={loading || undefined} aria-label={ariaLabel} className={classes}>
      {content}
    </button>
  );
}

export function ActionBar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("flex flex-wrap items-center gap-2 border-t border-[var(--border)] px-3.5 py-2.5", className)}>{children}</div>;
}

export interface MenuItem {
  label: string;
  onSelect: () => void;
  icon?: LucideIcon;
  danger?: boolean;
  disabled?: boolean;
}

/**
 * Menu contextuel accessible : flèches, Début/Fin, Échap, clic extérieur,
 * retour du focus au bouton. S'ouvre vers le haut s'il n'a pas la place en
 * bas, et reste dans la largeur de l'écran.
 */
export function OverflowMenu({ items, label }: { items: MenuItem[]; label?: string }) {
  const { t } = useWidgetText();
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<"down" | "up">("down");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const enabled = items.filter((item) => !item.disabled);

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  }, []);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const estimated = items.length * 40 + 16;
    setPlacement(window.innerHeight - rect.bottom < estimated && rect.top > estimated ? "up" : "down");
  }, [open, items.length]);

  useEffect(() => {
    if (!open) return;
    const first = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])');
    first?.focus();
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) close(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open, close]);

  if (!enabled.length) return null;

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const nodes = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? []);
    const index = nodes.indexOf(document.activeElement as HTMLElement);
    if (event.key === "Escape") { event.preventDefault(); close(); }
    else if (event.key === "ArrowDown") { event.preventDefault(); nodes[(index + 1) % nodes.length]?.focus(); }
    else if (event.key === "ArrowUp") { event.preventDefault(); nodes[(index - 1 + nodes.length) % nodes.length]?.focus(); }
    else if (event.key === "Home") { event.preventDefault(); nodes[0]?.focus(); }
    else if (event.key === "End") { event.preventDefault(); nodes[nodes.length - 1]?.focus(); }
    else if (event.key === "Tab") close(false);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label || t.common.more}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => { if (event.key === "ArrowDown" && !open) { event.preventDefault(); setOpen(true); } }}
        className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] text-[var(--text-secondary)] outline-none transition-colors hover:bg-[var(--hover)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </button>
      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label || t.common.more}
          onKeyDown={onKeyDown}
          className={cx(
            "absolute end-0 z-30 w-max min-w-[11rem] max-w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.45)] tmw-enter",
            placement === "up" ? "bottom-10" : "top-10",
          )}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => { close(); item.onSelect(); }}
              className={cx(
                "flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 text-start text-[12.5px] outline-none transition-colors disabled:opacity-40",
                "hover:bg-[var(--hover)] focus-visible:bg-[var(--hover)]",
                item.danger ? "text-[var(--tmw-error)]" : "text-[var(--text-primary)]",
              )}
            >
              {item.icon ? <item.icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ── Dépliage ────────────────────────────────────────────────────────────────

export function Disclosure({
  summary,
  children,
  defaultOpen = false,
  count,
}: {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  count?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className="border-t border-[var(--border)]">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-10 w-full items-center gap-2 px-3.5 text-start text-[12px] font-medium text-[var(--text-secondary)] outline-none transition-colors hover:bg-[var(--hover)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--primary)]"
      >
        <span className="min-w-0 flex-1 truncate">{summary}</span>
        {typeof count === "number" ? <span className="text-[11px] tabular-nums text-[var(--text-tertiary)]">{count}</span> : null}
        <ChevronDown className={cx("h-3.5 w-3.5 shrink-0 transition-transform motion-reduce:transition-none", open && "rotate-180")} aria-hidden="true" />
      </button>
      <div id={id} hidden={!open}>{open ? children : null}</div>
    </div>
  );
}

/** Liste bornée : les N premiers, puis « Afficher tout ». Protège le fil. */
export function CollapsibleList<T>({
  items,
  initial = 5,
  render,
  className,
  label,
}: {
  items: T[];
  initial?: number;
  render: (item: T, index: number) => ReactNode;
  className?: string;
  label: string;
}) {
  const { t } = useWidgetText();
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, initial);
  return (
    <>
      <ul className={cx("tmw-divide", className)} aria-label={label}>
        {visible.map((item, index) => <li key={index}>{render(item, index)}</li>)}
      </ul>
      {items.length > initial ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="flex min-h-10 w-full items-center justify-center border-t border-[var(--border)] text-[12px] font-medium text-[var(--text-secondary)] outline-none transition-colors hover:bg-[var(--hover)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--primary)]"
        >
          {expanded ? t.common.showLess : t.common.showAll(items.length)}
        </button>
      ) : null}
    </>
  );
}

// ── Progression ─────────────────────────────────────────────────────────────

export interface ProgressStep {
  key: string;
  label: string;
  detail?: string;
  status: StatusKey;
}

/** Étapes réellement observées — jamais une barre qui avance toute seule. */
export function ProgressSteps({ steps, label }: { steps: ProgressStep[]; label: string }) {
  const { t } = useWidgetText();
  if (!steps.length) return null;
  return (
    <ol className="space-y-0.5 px-3.5 pb-3" aria-label={label}>
      {steps.map((step) => {
        const tone = toneOf(step.status);
        return (
          <li key={step.key} className={cx("flex min-w-0 items-start gap-2.5 py-1", `tmw-tone-${tone}`)}>
            <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center" style={{ color: "var(--tmw-tone)" }}>
              <StatusIcon status={step.status} className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="break-words text-[12.5px] font-medium leading-[18px] text-[var(--text-primary)]">
                {step.label}
                <span className="sr-only"> · {t.status[step.status]}</span>
              </p>
              {step.detail ? <p className="mt-0.5 break-words text-[11.5px] leading-4 text-[var(--text-tertiary)]">{step.detail}</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function InlineProgress({ label }: { label: string }) {
  return (
    <div className="mt-2 flex max-w-[var(--tmw-max)] items-center gap-2 text-[12.5px] text-[var(--text-tertiary)]" role="status" aria-live="polite">
      <LoaderCircle className="h-3.5 w-3.5 shrink-0 animate-spin text-[var(--primary)] motion-reduce:animate-none" aria-hidden="true" />
      <span className="min-w-0 truncate">{label}</span>
    </div>
  );
}

// ── États vides, erreurs, chargement ────────────────────────────────────────

export function EmptyState({ icon: Icon, title, body, action }: { icon?: LucideIcon; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-3.5 py-3">
      {Icon ? <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden="true" /> : null}
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] text-[var(--text-secondary)]">{title}</p>
        {body ? <p className="mt-0.5 text-[11.5px] leading-4 text-[var(--text-tertiary)]">{body}</p> : null}
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
    </div>
  );
}

export function InlineNotice({ tone, children, onRetry }: { tone: StatusTone; children: ReactNode; onRetry?: () => void }) {
  const { t } = useWidgetText();
  const status: StatusKey = tone === "error" ? "failed" : tone === "success" ? "success" : tone === "warning" || tone === "attention" ? "warning" : "idle";
  return (
    <div className={cx("mx-3.5 mb-3 flex items-start gap-2 rounded-xl px-3 py-2", `tmw-tone-${tone}`, "tmw-badge")} role={tone === "error" ? "alert" : "status"}>
      <StatusIcon status={status} className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <p className="min-w-0 flex-1 break-words text-[12px] leading-[18px]">{children}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="shrink-0 rounded-md px-1.5 text-[12px] font-semibold underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[var(--primary)]">
          {t.common.retry}
        </button>
      ) : null}
    </div>
  );
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
  const { t } = useWidgetText();
  return (
    <div className="space-y-2 px-3.5 py-3" role="status" aria-label={t.status.loading}>
      {Array.from({ length: lines }, (_, index) => (
        <div key={index} className="tmw-skeleton h-3 rounded-md" style={{ width: `${92 - index * 17}%` }} />
      ))}
    </div>
  );
}

// ── Confirmation ────────────────────────────────────────────────────────────

/**
 * Confirmation d'un geste sensible, EN LIGNE dans la carte : on voit ce qui
 * sera perdu à côté de ce qu'on s'apprête à perdre. Pas de grande alerte
 * rouge : le danger se dit par la phrase, le bouton porte la seule couleur.
 */
export function ConfirmationPanel({
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
  busy = false,
  destructive = false,
}: {
  title: string;
  body?: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  destructive?: boolean;
}) {
  const { t } = useWidgetText();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, []);
  return (
    <div
      ref={ref}
      role="group"
      aria-label={title}
      onKeyDown={(event) => { if (event.key === "Escape" && !busy) onCancel(); }}
      className="border-t border-[var(--border)] px-3.5 py-3 tmw-enter"
    >
      <p className="text-[12.5px] font-semibold text-[var(--text-primary)]">{title}</p>
      {body ? <p className="mt-0.5 text-[12px] leading-[18px] text-[var(--text-secondary)]">{body}</p> : null}
      <div className="mt-2.5 flex flex-wrap gap-2">
        <WidgetButton variant="ghost" onClick={onCancel} disabled={busy}>{t.common.keep}</WidgetButton>
        <WidgetButton variant={destructive ? "danger" : "primary"} onClick={onConfirm} loading={busy}>{confirmLabel}</WidgetButton>
      </div>
    </div>
  );
}
