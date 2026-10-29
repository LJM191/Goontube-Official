import { RefreshCw } from "lucide-react";

export function QueryErrorState({
  title = "Impossible de charger le contenu",
  message = "Une erreur est survenue lors du chargement. Vérifiez votre connexion puis réessayez.",
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry: () => void;
}) {
  return (
    <section role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center sm:p-8">
      <h2 className="font-semibold text-foreground">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{message}</p>
      <button type="button" onClick={onRetry} className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-edge px-4 py-2 text-sm font-semibold transition hover:bg-frost focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow">
        <RefreshCw className="size-4" /> Réessayer
      </button>
    </section>
  );
}
