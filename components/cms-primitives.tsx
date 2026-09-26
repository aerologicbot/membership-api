"use client";

// Disalin dari aerologicbot-web-app/components/ui/cms-primitives.tsx supaya
// halaman pendaftaran memakai idiom yang sama persis dengan dashboard: kartu
// rounded-xl/border-border/50/shadow-sm, skala tipografi text-[11px]/[13px],
// dan satu warna aksen yang dicadangkan untuk aksi utama.
//
// Kalau file aslinya berubah, salin ulang dan ganti import `cn`-nya saja.
import { ChevronDown } from "lucide-react";
import { cn } from "cn";

export const ACCENT = "#E16602";

export function SectionCard({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-xl border border-border/50 bg-card p-6 shadow-sm", className)} {...props} />;
}

export function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <h2 className="text-[13px] font-semibold tracking-tight text-foreground">{title}</h2>
      {description && <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{description}</p>}
    </div>
  );
}

export function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[11px] font-medium text-muted-foreground/70">
      {children}
    </label>
  );
}

const fieldClasses =
  "w-full rounded-lg border border-border/50 bg-transparent px-3 py-2 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/40 focus-visible:border-foreground/30 focus-visible:ring-2 focus-visible:ring-foreground/10 disabled:cursor-not-allowed disabled:opacity-50";

export function TextInput({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(fieldClasses, "h-9", className)} {...props} />;
}

export function TextArea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(fieldClasses, "min-h-16 resize-y", className)} {...props} />;
}

export function SelectInput({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select className={cn(fieldClasses, "h-9 appearance-none pr-7", className)} {...props} />
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

type ButtonVariant = "primary" | "outline" | "ghost" | "danger" | "destructive";

const buttonVariantClasses: Record<ButtonVariant, string> = {
  primary: "text-white transition-opacity hover:opacity-90 disabled:opacity-50",
  outline:
    "border border-border/50 text-foreground/80 transition-colors hover:bg-black/5 hover:text-foreground disabled:opacity-50 dark:hover:bg-white/5",
  ghost: "text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground disabled:opacity-50 dark:hover:bg-white/5",
  danger: "text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-600 disabled:opacity-50",
  // Solid red — reserved for confirming an irreversible action, distinct
  // from the brand accent used for constructive/save actions.
  destructive: "bg-red-600 text-white transition-opacity hover:opacity-90 disabled:opacity-50",
};

export function ActionButton({
  variant = "outline",
  className,
  style,
  size = "default",
  ...props
}: React.ComponentProps<"button"> & { variant?: ButtonVariant; size?: "default" | "sm" | "icon" }) {
  const sizeClasses =
    size === "icon" ? "h-7 w-7 shrink-0" : size === "sm" ? "gap-1.5 px-2.5 py-1.5 text-[11px] font-medium" : "gap-1.5 px-3.5 py-2 text-[13px] font-medium";

  return (
    <button
      type="button"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg outline-none [&_svg]:size-3.5",
        sizeClasses,
        buttonVariantClasses[variant],
        className,
      )}
      style={variant === "primary" ? { background: ACCENT, ...style } : style}
      {...props}
    />
  );
}

export function Pill({ tone = "neutral", className, ...props }: React.ComponentProps<"span"> & { tone?: "neutral" | "accent" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide",
        tone === "neutral" && "bg-muted text-muted-foreground",
        className,
      )}
      style={tone === "accent" ? { background: "#FEF3E9", color: "#B85302" } : undefined}
      {...props}
    />
  );
}

export function ListHeadRow({ cols, labels }: { cols: string; labels: string[] }) {
  return (
    <div
      className="grid items-center gap-3 border-b border-border/50 px-5 py-3.5 text-[11px] font-semibold tracking-wider text-muted-foreground/50 uppercase"
      style={{ gridTemplateColumns: cols }}
    >
      {labels.map((l) => (
        <span key={l}>{l}</span>
      ))}
    </div>
  );
}
