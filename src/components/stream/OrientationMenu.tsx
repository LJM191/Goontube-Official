import { useEffect, useState } from "react";
import { ChevronDown, Heart } from "lucide-react";

function OrientationIcon({ type }: { type: string }) {
  if (type === "Hétéro") return <span aria-hidden="true" className="text-lg leading-none">⚥</span>;
  if (type === "Bi") return <span aria-hidden="true" className="text-lg leading-none">⚤</span>;
  if (type === "Gay") return <span aria-hidden="true" className="text-lg leading-none">⚣</span>;
  if (type === "S'identifie comme un cheval") return <span aria-hidden="true" className="text-lg leading-none">🐴</span>;
  if (type === "Pigeon curieux") return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className="size-6 shrink-0" fill="none">
      <path d="M7 24c-2-5-1-12 4-16 4-3 11-2 14 2 3 4 2 10-1 14-4 5-13 5-17 0Z" fill="#AEB8C5" stroke="#64748B" strokeWidth="1.4"/>
      <path d="M8 18c-2-2-4-2-6-1 1 3 3 5 7 5" fill="#64748B"/>
      <path d="M23 13c2-2 4-2 6-1l-4 4" fill="#F59E0B" stroke="#B45309" strokeWidth="1"/>
      <circle cx="14" cy="13" r="3.1" fill="white"/><circle cx="14.8" cy="13.2" r="1.5" fill="#172033"/>
      <circle cx="22" cy="13" r="3.1" fill="white"/><circle cx="22.8" cy="13.2" r="1.5" fill="#172033"/>
      <path d="M15 21c2 1.8 4.5 1.8 6.5 0" stroke="#475569" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="m11 7 1-3m5 2 1-3" stroke="#64748B" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
  return <span aria-hidden="true" className="text-lg leading-none">🐧</span>;
}

const ORIENTATION_OPTIONS = [
  { label: "Hétéro", slug: "orientation-hetero" },
  { label: "Bi", slug: "orientation-bi" },
  { label: "Gay", slug: "orientation-gay" },
  { label: "S'identifie comme un cheval", slug: "orientation-cheval" },
  { label: "S'identifie comme un pingouin", slug: "orientation-pingouin" },
  { label: "Pigeon curieux", slug: "orientation-pigeon-curieux" },
] as const;

export function OrientationMenu() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<(typeof ORIENTATION_OPTIONS)[number]["label"]>("Hétéro");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("goontube-orientation");
      if (saved && ORIENTATION_OPTIONS.some((option) => option.label === saved)) {
        setSelected(saved as (typeof ORIENTATION_OPTIONS)[number]["label"]);
      }
    } catch { /* The category menu remains usable when browser storage is blocked. */ }
  }, []);

  const choose = (option: (typeof ORIENTATION_OPTIONS)[number]) => {
    setSelected(option.label);
    try { localStorage.setItem("goontube-orientation", option.label); } catch { /* Selection still works without storage. */ }
    setOpen(false);
  };

  return (
    <div className="relative w-full">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}
        aria-label={`Catégorie ${selected}`} title={selected}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-panel/70 hover:text-foreground">
        <OrientationIcon type={selected} />
        <span className="flex-1 truncate text-left">{selected}</span>
        <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 max-w-[calc(100vw-2rem)] rounded-xl bg-panel p-1.5 shadow-xl ring-1 ring-edge/60">
          {ORIENTATION_OPTIONS.map((option) => (
            <button key={option.slug} type="button" onClick={() => choose(option)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-muted-foreground hover:bg-frost hover:text-foreground">
              <OrientationIcon type={option.label} />
              <span className="flex-1">{option.label}</span>
              {option.label === "Gay" && <Heart aria-label="Cœur" className="size-4 shrink-0 fill-rose-500 text-rose-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
