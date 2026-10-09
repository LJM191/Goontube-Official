import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, ChevronRight, CircleHelp, Globe, Keyboard, Languages, Monitor, ShieldCheck, Smartphone, Settings as SettingsIcon } from "lucide-react";
import { APP_NAME } from "@/lib/config";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: `Paramètres — ${APP_NAME}` }, { name: "description", content: "Personnalisez votre expérience GoonTube." }] }),
  component: SettingsPage,
});

const PREFS_KEY = "goontube-preferences-v1";
type Preferences = { language: string; country: string; restrictedMode: boolean; theme: string };
const defaults: Preferences = { language: "Français", country: "France", restrictedMode: false, theme: "Sombre" };

function SettingsPage() {
  const [prefs, setPrefs] = useState<Preferences>(defaults);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (raw) setPrefs({ ...defaults, ...JSON.parse(raw) });
    } catch { /* Use defaults if local preferences are unavailable. */ }
  }, []);

  function update<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    setPrefs((current) => {
      const next = { ...current, [key]: value };
      try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch { /* Preferences remain usable for this session. */ }
      return next;
    });
    setSaved(true);
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 pb-8">
      <header className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-full bg-panel"><SettingsIcon className="size-5" /></div>
        <div><h1 className="text-2xl font-semibold sm:text-3xl">Paramètres</h1><p className="mt-1 text-sm text-muted-foreground">Personnalise ton expérience sur {APP_NAME}.</p></div>
      </header>

      {saved && <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-300"><Check className="size-4" /> Préférences enregistrées sur cet appareil.</p>}

      <section className="overflow-hidden rounded-2xl border border-edge/50 bg-panel/50">
        <div className="flex items-center gap-3 border-b border-edge/50 p-4 sm:p-5"><Globe className="size-5 text-glow" /><div><h2 className="font-semibold">Préférences générales</h2><p className="text-sm text-muted-foreground">Langue et région d'affichage.</p></div></div>
        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
          <label className="block text-sm"><span className="mb-2 flex items-center gap-2 font-medium"><Languages className="size-4" /> Langue</span><select value={prefs.language} onChange={(e) => update("language", e.target.value)} className="h-11 w-full rounded-xl border border-edge bg-background px-3 text-foreground"><option>Français</option><option>English</option><option>Español</option></select></label>
          <label className="block text-sm"><span className="mb-2 flex items-center gap-2 font-medium"><Globe className="size-4" /> Pays / région</span><select value={prefs.country} onChange={(e) => update("country", e.target.value)} className="h-11 w-full rounded-xl border border-edge bg-background px-3 text-foreground"><option>France</option><option>Belgique</option><option>Suisse</option><option>Canada</option><option>Colombie</option><option>Autre</option></select></label>
        </div>
        <p className="px-4 pb-4 text-xs leading-5 text-muted-foreground sm:px-5">La langue et le pays sont enregistrés comme préférences sur cet appareil. La traduction complète de l'interface et l'adaptation du catalogue ne sont pas encore activées.</p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-edge/50 bg-panel/50">
        <div className="flex items-center gap-3 border-b border-edge/50 p-4 sm:p-5"><Monitor className="size-5 text-glow" /><div><h2 className="font-semibold">Apparence</h2><p className="text-sm text-muted-foreground">Thème de l'application.</p></div></div>
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"><div><p className="text-sm font-medium">Thème</p><p className="mt-1 text-sm text-muted-foreground">GoonTube utilise actuellement une interface sombre.</p></div><select value={prefs.theme} onChange={(e) => update("theme", e.target.value)} className="h-11 w-full rounded-xl border border-edge bg-background px-3 text-foreground sm:w-56"><option>Sombre</option><option>Thème de l'appareil</option></select></div>
        {prefs.theme === "Thème de l'appareil" && <p className="px-4 pb-4 text-xs text-muted-foreground sm:px-5">Le choix est enregistré, mais l'interface claire n'est pas encore disponible. Le site reste sombre pour le moment.</p>}
      </section>

      <section className="overflow-hidden rounded-2xl border border-edge/50 bg-panel/50">
        <div className="flex items-center gap-3 border-b border-edge/50 p-4 sm:p-5"><ShieldCheck className="size-5 text-glow" /><div><h2 className="font-semibold">Mode restreint</h2><p className="text-sm text-muted-foreground">Préférence enregistrée sur cet appareil.</p></div></div>
        <label className="flex cursor-pointer items-start gap-3 p-4 sm:p-5"><input type="checkbox" checked={prefs.restrictedMode} onChange={(e) => update("restrictedMode", e.target.checked)} className="mt-1 size-4 accent-current" /><span><span className="block text-sm font-medium">Activer le mode restreint</span><span className="mt-1 block text-sm text-muted-foreground">Ce réglage mémorise ton choix. Le filtrage automatique des vidéos n'est pas encore implémenté.</span></span></label>
      </section>

      <section className="overflow-hidden rounded-2xl border border-edge/50 bg-panel/50">
        <div className="flex items-center gap-3 border-b border-edge/50 p-4 sm:p-5"><Smartphone className="size-5 text-glow" /><div><h2 className="font-semibold">Appareils</h2><p className="text-sm text-muted-foreground">Sessions et connexion.</p></div></div>
        <div className="flex items-center justify-between gap-3 p-4 sm:p-5"><div><p className="text-sm font-medium">Appareil actuel</p><p className="mt-1 text-sm text-muted-foreground">Gestion des autres appareils à venir.</p></div><span className="rounded-full bg-frost px-3 py-1 text-xs">Connecté</span></div>
      </section>

      <section id="shortcuts" className="overflow-hidden rounded-2xl border border-edge/50 bg-panel/50">
        <div className="flex items-center gap-3 border-b border-edge/50 p-4 sm:p-5"><Keyboard className="size-5 text-glow" /><div><h2 className="font-semibold">Raccourcis clavier</h2><p className="text-sm text-muted-foreground">Quelques raccourcis utiles.</p></div></div>
        <div className="space-y-3 p-4 text-sm sm:p-5"><div className="flex items-center justify-between gap-3"><span>Rechercher</span><kbd className="rounded-md border border-edge px-2 py-1 text-xs">/</kbd></div><div className="flex items-center justify-between gap-3"><span>Lire / mettre en pause une vidéo</span><kbd className="rounded-md border border-edge px-2 py-1 text-xs">Espace</kbd></div><p className="text-xs text-muted-foreground">Ces raccourcis sont indicatifs : ils ne sont pas tous actifs sur chaque page.</p></div>
      </section>

      <section id="help" className="overflow-hidden rounded-2xl border border-edge/50 bg-panel/50">
        <div className="flex items-center gap-3 border-b border-edge/50 p-4 sm:p-5"><CircleHelp className="size-5 text-glow" /><div><h2 className="font-semibold">Aide et confidentialité</h2><p className="text-sm text-muted-foreground">Informations utiles sur le service.</p></div></div>
        <div className="divide-y divide-edge/40">
          <Link to="/confidentialite" className="flex items-center justify-between gap-3 p-4 text-sm hover:bg-frost sm:px-5">Confidentialité et données <ChevronRight className="size-4 shrink-0" /></Link>
          <Link to="/mentions-legales" className="flex items-center justify-between gap-3 p-4 text-sm hover:bg-frost sm:px-5">Mentions légales <ChevronRight className="size-4 shrink-0" /></Link>
          <Link to="/feedback" className="flex items-center justify-between gap-3 p-4 text-sm hover:bg-frost sm:px-5">Envoyer des commentaires <ChevronRight className="size-4 shrink-0" /></Link>
        </div>
      </section>
    </div>
  );
}
