import { createFileRoute } from "@tanstack/react-router";
import { APP_NAME } from "@/lib/config";

export const Route = createFileRoute("/mentions-legales")({
  head: () => ({
    meta: [
      { title: `Mentions légales — ${APP_NAME}` },
      { name: "description", content: `Mentions légales de ${APP_NAME}.` },
    ],
  }),
  component: LegalPage,
});

function LegalPage() {
  return (
    <article className="mx-auto w-full max-w-4xl py-6 sm:py-10">
      <div className="rounded-2xl bg-panel/60 p-6 ring-1 ring-edge/50 sm:p-10">
        <p className="text-sm font-medium text-glow">Informations légales</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Mentions légales</h1>

        <div className="mt-8 space-y-7 text-sm leading-7 text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">Éditeur du site</h2>
            <p className="mt-2">
              {APP_NAME} est une plateforme de partage de vidéos et de contenus
              créée pour permettre aux utilisateurs de publier, regarder et
              découvrir des contenus en ligne.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Hébergement</h2>
            <p className="mt-2">
              Le site est hébergé par des prestataires techniques utilisés pour
              assurer le fonctionnement, le stockage et la diffusion du service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Responsabilité</h2>
            <p className="mt-2">
              Les utilisateurs restent responsables des contenus qu’ils
              publient. {APP_NAME} peut retirer tout contenu qui enfreint les
              règles du service ou la législation applicable.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Contact</h2>
            <p className="mt-2">
              Pour toute question concernant le fonctionnement du service ou un
              contenu, utilisez les moyens de contact proposés directement sur
              la plateforme.
            </p>
          </section>
        </div>
      </div>
    </article>
  );
}
