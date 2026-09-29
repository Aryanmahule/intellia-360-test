"use client";

export function Card({ children, className = "", ...rest }) {
  const hasBg = className.split(" ").some((c) => c.startsWith("bg-"));
  return (
    <div
      className={`${hasBg ? "" : "bg-white"} hover-card rounded-2xl border border-black/[0.06] shadow-[0_1px_2px_rgba(18,19,28,0.04)] ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ eyebrow, title, action }) {
  return (
    <div className="flex items-center justify-between px-5 pt-4.5 pt-5 pb-1">
      <div>
        {eyebrow && <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-violet mb-0.5">{eyebrow}</p>}
        <h3 className="font-display font-semibold text-[16px]">{title}</h3>
      </div>
      {action}
    </div>
  );
}

const TINTS = {
  violet: "bg-violet-tint text-violet-deep",
  amber: "bg-amber-tint text-amber",
  jade: "bg-jade-tint text-jade",
  coral: "bg-coral-tint text-coral",
  sky: "bg-sky-tint text-sky",
  ink: "bg-ink/5 text-ink/60",
};

export function Pill({ tone = "ink", children, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[11.5px] font-semibold px-2 py-1 rounded-full ${TINTS[tone]} ${className}`}>
      {children}
    </span>
  );
}

const STATUS_TONE = {
  Completed: "jade",
  "In Progress": "amber",
  "Not Started": "violet",
  Overdue: "coral",
  Draft: "ink",
  Published: "jade",
  present: "jade",
  absent: "coral",
  late: "amber",
};

export function StatusPill({ status }) {
  return <Pill tone={STATUS_TONE[status] || "ink"}>{status}</Pill>;
}

export function Avatar({ name, initials, color = "#5B3DF5", size = 36 }) {
  return (
    <div
      className="rounded-full grid place-items-center text-white font-bold shrink-0"
      style={{ background: color, width: size, height: size, fontSize: size * 0.36 }}
      title={name}
    >
      {initials}
    </div>
  );
}

export function ProgressRing({ value, size = 56, stroke = 6, color = "var(--color-violet)", label }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(value, 100) / 100) * c;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#EEEDF7" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <span className="absolute font-mono font-bold" style={{ fontSize: size * 0.24 }}>
        {label ?? `${value}%`}
      </span>
    </div>
  );
}

export function Stamp({ children, tone = "jade" }) {
  const border = { jade: "border-jade text-jade", amber: "border-amber text-amber", violet: "border-violet text-violet" }[tone];
  return (
    <div className={`stamp inline-flex items-center gap-1.5 border-2 ${border} rounded-lg px-2.5 py-1 font-display font-bold text-[11px] uppercase tracking-wide bg-white/70`}>
      {children}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <div className="flex flex-col items-center text-center py-14 px-6">
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-violet-tint text-violet grid place-items-center mb-3">
          <Icon size={22} />
        </div>
      )}
      <p className="font-display font-semibold text-[15px]">{title}</p>
      {body && <p className="text-[13px] text-ink/50 mt-1 max-w-xs">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Button({ children, variant = "primary", size = "md", className = "", ...rest }) {
  const variants = {
    primary: "bg-violet text-white hover:bg-violet-deep shadow-[0_4px_12px_rgba(91,61,245,0.25)]",
    secondary: "bg-white text-ink border border-black/10 hover:bg-black/[0.03]",
    ghost: "text-ink/60 hover:bg-black/5",
    danger: "bg-coral text-white hover:opacity-90",
    success: "bg-jade text-white hover:opacity-90",
  };
  const sizes = { sm: "text-[12px] px-3 py-1.5", md: "text-[13.5px] px-4 py-2.5", lg: "text-[14.5px] px-5 py-3" };
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Input({ className = "", ...rest }) {
  return (
    <input
      className={`w-full bg-canvas border border-black/10 rounded-xl px-3.5 py-2.5 text-[13.5px] outline-none focus:border-violet focus:ring-2 focus:ring-violet/15 transition ${className}`}
      {...rest}
    />
  );
}

export function Select({ className = "", children, ...rest }) {
  return (
    <select
      className={`w-full bg-canvas border border-black/10 rounded-xl px-3.5 py-2.5 text-[13.5px] outline-none focus:border-violet focus:ring-2 focus:ring-violet/15 transition ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
}

export function Label({ children }) {
  return <label className="block text-[12px] font-semibold text-ink/60 mb-1.5">{children}</label>;
}
