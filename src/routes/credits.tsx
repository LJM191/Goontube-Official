import { createFileRoute } from "@tanstack/react-router";
import { APP_NAME } from "@/lib/config";

export const Route = createFileRoute("/credits")({
  head: () => ({
    meta: [
      { title: `Crédits — ${APP_NAME}` },
      { name: "description", content: `Crédits et technologies utilisées par ${APP_NAME}.` },
    ],
  }),
  component: CreditsPage,
});

function CreditsPage() {
  return (
    <article className="mx-auto w-full max-w-4xl py-6 sm:py-10">
      <div className="rounded-2xl bg-panel/60 p-6 ring-1 ring-edge/50 sm:p-10">
        <p className="text-sm font-medium text-glow">À propos du projet</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Crédits</h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          {APP_NAME} est un projet indépendant de partage de vidéos. Les marques et services cités ci-dessous restent la propriété de leurs détenteurs respectifs ; leur mention ne signifie pas qu’ils sponsorisent ou approuvent le projet.
        </p>
        <div className="mt-8 space-y-6 text-sm leading-7 text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">Technologies</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>React et TypeScript — interface de l’application.</li>
              <li>TanStack Router et TanStack Query — navigation et gestion des données.</li>
              <li>Supabase — authentification, base de données et stockage.</li>
              <li>Netlify — hébergement et déploiement du site.</li>
              <li>Lucide — icônes de l’interface.</li>
            </ul>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">Contenus</h2>
            <p className="mt-2">
              Les vidéos, images, avatars, noms et autres contenus publiés par les utilisateurs restent soumis aux droits de leurs auteurs ou titulaires. Si vous pensez qu’un contenu porte atteinte à vos droits, signalez-le via les moyens de contact indiqués dans les mentions légales.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">Licences</h2>
            <p className="mt-2">
              Les bibliothèques tierces sont distribuées selon leurs propres licences. Les notices de licence correspondantes doivent être consultées dans les paquets et dépôts officiels des projets concernés.
            </p>
          </section>
        </div>
      </div>
    </article>
  );
}
