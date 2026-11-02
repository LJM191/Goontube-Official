import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

function OrientationIcon({ type }: { type: string }) {
  if (type === "Hétéro") return <span aria-hidden="true" className="text-lg leading-none">⚥</span>;
  if (type === "Bi") return <span aria-hidden="true" className="text-lg leading-none">⚤</span>;
  if (type === "Gay") return <span aria-hidden="true" className="text-lg leading-none">⚣</span>;
  if (type === "S'identifie comme un cheval") return <span aria-hidden="true" className="text-lg leading-none">🐴</span>;
  return <span aria-hidden="true" className="text-lg leading-none">🐧</span>;
}

const ORIENTATION_OPTIONS = [
  { label: "Hétéro", slug: "orientation-hetero" },
  { label: "Bi", slug: "orientation-bi" },
  { label: "Gay", slug: "orientation-gay" },
  { label: "S'identifie comme un cheval", slug: "orientation-cheval" },
  { label: "S'identifie comme un pingouin", slug: "orientation-pingouin" },
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
    window.location.href = `/explore?category=${encodeURIComponent(option.slug)}`;
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
              <OrientationIcon type={option.label} /><span>{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

