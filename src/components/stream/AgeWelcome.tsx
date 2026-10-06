import { useState } from "react";
import { X } from "lucide-react";
import goontubeLogo from "@/assets/goontube-logo.png";

const AGES = [
  "Moins de 2 ans",
  "2 à 4 ans",
  "5 à 9 ans",
  "10 à 13 ans",
  "14 à 17 ans",
  "18 à 25 ans",
  "26 à 49 ans",
  "50 à 127 ans",
];

export function AgeWelcome() {
  const [open, setOpen] = useState(true);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/75 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-3xl bg-panel p-6 shadow-2xl ring-1 ring-edge/70 sm:p-8">
        <button
          onClick={() => setOpen(false)}
          aria-label="Fermer"
          className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-frost text-faint hover:text-foreground"
        >
          <X className="size-4" />
        </button>

        <div className="mx-auto flex justify-center">
          <img src={goontubeLogo} alt="Goontube" className="h-auto w-56 sm:w-64" />
        </div>

        <h2/ className="mt-6 text-center text-3xl font-black">Êtes-vous majeur ?</h2>
        <p className="mx-auto mt-2 max-w-md text-center text-sm leading-6 text-muted-foreground">
          Bienvenue sur Goontube. Choisissez simplement votre tranche d'âge.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {AGES.map((age) => (
            <button
              key={age}
              onClick={() => setOpen(false)}
              className="rounded-2xl bg-frost/70 px-3 py-3 text-sm font-medium ring-1 ring-edge/40 transition hover:bg-glow/15 hover:ring-glow/50"
            >
              {age}
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}
