import { createFileRoute } from "@tanstack/react-router";
import { APP_NAME } from "@/lib/config";

export const Route = createFileRoute("/confidentialite")({
  head: () => ({
    meta: [
      { title: `Confidentialité — ${APP_NAME}` },
      { name: "description", content: `Politique de confidentialité de ${APP_NAME}.` },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <article className="mx-auto w-full max-w-4xl py-6 sm:py-10">
      <div className="rounded-2xl bg-panel/60 p-6 ring-1 ring-edge/50 sm:p-10">
        <p className="text-sm font-medium text-glow">Vie privée</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Confidentialité</h1>

        <div className="mt-8 space-y-7 text-sm leading-7 text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">Données utilisées</h2>
            <p className="mt-2">
              Le service utilise uniquement les données nécessaires à son
              fonctionnement, notamment les informations liées au compte, aux
              chaînes, aux vidéos, aux commentaires et aux interactions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Utilisation</h2>
            <p className="mt-2">
              Ces données servent à fournir les fonctionnalités de la
              plateforme, sécuriser les comptes, afficher les contenus et
              améliorer le fonctionnement du service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Conservation</h2>
            <p className="mt-2">
              Les données sont conservées pendant la durée nécessaire au
              fonctionnement du compte et du service, sous réserve des
              obligations légales applicables.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Vos droits</h2>
            <p className="mt-2">
              Selon la réglementation applicable, vous pouvez demander l’accès,
              la rectification ou la suppression de vos données ainsi que la
              limitation de certains traitements.
            </p>
          </section>
        </div>
      </div>
    </article>
  );
}
