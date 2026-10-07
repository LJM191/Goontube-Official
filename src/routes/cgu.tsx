import { createFileRoute } from "@tanstack/react-router";
import { APP_NAME } from "@/lib/config";

export const Route = createFileRoute("/cgu")({
  head: () => ({
    meta: [
      { title: `CGU — ${APP_NAME}` },
      { name: "description", content: `Conditions générales d'utilisation de ${APP_NAME}.` },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <article className="mx-auto w-full max-w-4xl py-6 sm:py-10">
      <div className="rounded-2xl bg-panel/60 p-6 ring-1 ring-edge/50 sm:p-10">
        <p className="text-sm font-medium text-glow">Règles du service</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Conditions générales d’utilisation</h1>

        <div className="mt-8 space-y-7 text-sm leading-7 text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">Utilisation du service</h2>
            <p className="mt-2">
              L’utilisation de {APP_NAME} implique le respect des présentes
              conditions, des lois applicables et des droits des autres
              utilisateurs.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Comptes</h2>
            <p className="mt-2">
              Chaque utilisateur est responsable de son compte, de la sécurité
              de ses identifiants et des actions réalisées depuis celui-ci.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Contenus</h2>
            <p className="mt-2">
              Il est interdit de publier des contenus illégaux, frauduleux,
              trompeurs, portant atteinte aux droits d’autrui ou contraires aux
              règles de la plateforme.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Modération</h2>
            <p className="mt-2">
              Les contenus peuvent être signalés, modérés ou retirés lorsqu’ils
              ne respectent pas les présentes conditions ou les règles
              applicables.
            </p>
          </section>
        </div>
      </div>
    </article>
  );
}
