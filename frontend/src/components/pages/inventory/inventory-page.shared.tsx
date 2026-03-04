export function SummaryPill({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "bad" | "warn";
}) {
  const toneClass =
    tone === "good"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : tone === "bad"
        ? "border-rose-200 bg-rose-50 text-rose-900"
        : tone === "warn"
          ? "border-amber-200 bg-amber-50 text-amber-900"
          : "border-slate-200 bg-white text-slate-900";

  return (
    <div className={`rounded-xl border p-3 shadow-sm ${toneClass}`}>
      <p className="text-[10px] uppercase tracking-widest opacity-70">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-bold leading-none">{value}</p>
    </div>
  );
}

export function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background p-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

export function EmptyMini({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed bg-muted/20 p-4 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
