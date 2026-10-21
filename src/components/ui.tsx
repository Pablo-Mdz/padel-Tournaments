import { ReactNode } from "react";

// Small, dependency-free UI kit in the spirit of iPadOS: line icons, a
// segmented control with a sliding thumb, numbers that pulse when they change.

const ICONS = {
  chevronLeft: <path d="m15 18-6-6 6-6" />,
  chevronRight: <path d="m9 18 6-6-6-6" />,
  chevronUp: <path d="m18 15-6-6-6 6" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  check: <path d="M20 6 9 17l-5-5" />,
  plus: <path d="M5 12h14M12 5v14" />,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  lock: (
    <>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  trophy: (
    <>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16" />
      <path d="M10 14.7V17c0 .6-.5 1-1 1.2C7.9 18.8 7 20.2 7 22M14 14.7V17c0 .6.5 1 1 1.2 1.1.6 2 2 2 3.8" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </>
  ),
  ball: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M5.3 5.3a10 10 0 0 1 0 13.4M18.7 5.3a10 10 0 0 0 0 13.4" />
    </>
  ),
  chart: <path d="M3 3v18h18M8 17v-4M13 17V8M18 17v-7" />,
  sliders: <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />,
  tv: (
    <>
      <rect x="2" y="7" width="20" height="14" rx="2.5" />
      <path d="m17 2-5 5-5-5" />
    </>
  ),
  download: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />,
  upload: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />,
  alert: <path d="m21.7 18-8-14a2 2 0 0 0-3.5 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3ZM12 9v4M12 17h.01" />,
  refresh: (
    <path d="M21 12a9 9 0 0 0-9-9 9.8 9.8 0 0 0-6.7 2.7L3 8M3 3v5h5M3 12a9 9 0 0 0 9 9 9.8 9.8 0 0 0 6.7-2.7L21 16M16 16h5v5" />
  ),
  rotate: <path d="M3 12a9 9 0 1 0 9-9 9.8 9.8 0 0 0-6.7 2.7L3 8M3 3v5h5" />,
  play: <path d="M7 4.5v15l12-7.5-12-7.5Z" fill="currentColor" />,
  pause: <path d="M7 4h3.5v16H7zM13.5 4H17v16h-3.5z" fill="currentColor" stroke="none" />,
  flag: <path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 8 2a6 6 0 0 0 3.6-1.2A1 1 0 0 1 21 3.6V15a1 1 0 0 1-.4.8A6 6 0 0 1 17 17c-3 0-5-2-8-2a6 6 0 0 0-5 2.2" />,
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, className = "h-5 w-5", label }: { name: IconName; className?: string; label?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {ICONS[name]}
    </svg>
  );
}

/** iOS-style segmented control. The white thumb slides to the selected segment. */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  size = "md",
  className = "",
}: {
  options: Array<{ value: T; label: ReactNode }>;
  value: T;
  onChange: (v: T) => void;
  label: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const h = size === "lg" ? "min-h-[44px] text-[16px]" : size === "sm" ? "min-h-[32px] text-[14px]" : "min-h-[38px] text-[15px]";
  return (
    <div
      role="tablist"
      aria-label={label}
      className={`relative grid rounded-[11px] bg-fill/[0.14] p-[3px] ${className}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden
        className="absolute bottom-[3px] left-[3px] top-[3px] rounded-[8px] bg-thumb shadow-[0_3px_8px_rgb(0_0_0/0.12),0_0_0_0.5px_rgb(0_0_0/0.04)] transition-transform duration-300 ease-[cubic-bezier(0.3,1.2,0.5,1)]"
        style={{
          width: `calc((100% - 6px) / ${options.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {options.map((o) => (
        <button
          key={String(o.value)}
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={`relative z-10 flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[8px] px-2 font-semibold transition-colors ${h} ${
            o.value === value ? "text-ink" : "text-ink2 hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A number that briefly pops whenever its value changes. */
export function Num({ value, className = "" }: { value: number | string; className?: string }) {
  return (
    <span className={`num ${className}`}>
      <span key={String(value)} className="anim-pop">
        {value}
      </span>
    </span>
  );
}

export function PageTitle({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        <h1 className="large-title">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[15px] text-ink2">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

/** Inline banner for warnings or confirmations, never a browser dialog. */
export function Notice({
  tone = "warn",
  children,
  actions,
}: {
  tone?: "warn" | "bad" | "good" | "info";
  children: ReactNode;
  actions?: ReactNode;
}) {
  const color = { warn: "text-warn bg-warn/10", bad: "text-bad bg-bad/10", good: "text-good bg-good/10", info: "text-tint bg-tint/[0.07]" }[
    tone
  ];
  return (
    <div className={`anim-rise flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3 ${color}`} role="status">
      <Icon name={tone === "good" ? "check" : "alert"} className="h-5 w-5" />
      <div className="min-w-0 flex-1 text-[15px] font-medium text-ink">{children}</div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** Stagger helper for entrance animations. */
export const stagger = (i: number, step = 45) => ({ animationDelay: `${i * step}ms` });
