import { useEffect, useState } from "react";
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

const ADULT_AGES = new Set(["18 à 25 ans", "26 à 49 ans", "50 à 127 ans"]);

export function AgeWelcome() {
  const [open, setOpen] = useState(false);
  const [ageError, setAgeError] = useState(false);

  useEffect(() => {
    try {
      setOpen(sessionStorage.getItem("goontube-age-welcome-dismissed") !== "1");
    } catch {
      setOpen(true);
    }
  }, []);

  const confirmAge = (age: string) => {
    if (!ADULT_AGES.has(age)) {
      setAgeError(true);
      return;
    }

    try {
      sessionStorage.setItem("goontube-age-welcome-dismissed", "1");
    } catch {
      // The welcome dialog still closes for this page when storage is unavailable.
    }
    setAgeError(false);
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/75 p-4 backdrop-blur-md">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="age-welcome-title"
        className="relative w-full max-w-lg rounded-3xl bg-panel p-6 shadow-2xl ring-1 ring-edge/70 sm:p-8"
      >
        <div className="mx-auto flex justify-center">
          <img src={goontubeLogo} alt="Goontube" className="h-auto w-56 sm:w-64" />
        </div>

        <h2 id="age-welcome-title" className="mt-6 text-center text-3xl font-black">
          Êtes-vous majeur ?
        </h2>
        <p className="mx-auto mt-2 max-w-md text-center text-sm leading-6 text-muted-foreground">
          Bienvenue sur Goontube. Choisissez votre tranche d'âge pour continuer.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {AGES.map((age) => (
            <button
              key={age}
              type="button"
              onClick={() => confirmAge(age)}
              className="rounded-2xl bg-frost/70 px-3 py-3 text-sm font-medium ring-1 ring-edge/40 transition hover:bg-glow/15 hover:ring-glow/50"
            >
              {age}
            </button>
          ))}
        </div>

        {ageError && (
          <p role="alert" className="mt-4 text-center text-sm font-medium text-red-400">
            L'accès à Goontube est réservé aux personnes majeures (18 ans et plus).
          </p>
        )}
      </div>
    </div>
  );
}
