import type { ReactNode } from "react";

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl bg-panel/60 px-6 py-14 text-center ring-1 ring-edge/40">
      <span className="mb-5 size-12 rounded-2xl bg-brand shadow-glow" />
      <h2 className="text-lg font-semibold">{title}</h2>
      {text && <p className="mt-2 text-sm text-muted-foreground">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
