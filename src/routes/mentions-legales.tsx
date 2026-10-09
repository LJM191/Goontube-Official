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
        <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm leading-6 text-muted-foreground">
          Cette page doit être complétée par le responsable du site avant une mise à disposition publique définitive. Les champs entre crochets sont des informations à renseigner avec des coordonnées réelles ; ils ne doivent pas rester tels quels.
        </p>

        <div className="mt-8 space-y-7 text-sm leading-7 text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">Éditeur du site</h2>
            <p className="mt-2">
              Nom du site : {APP_NAME}.<br />
              Responsable de publication : [nom et prénom ou raison sociale à renseigner].<br />
              Statut juridique : [à renseigner selon la situation réelle de l’éditeur].<br />
              Adresse de contact : [adresse postale à renseigner selon les obligations applicables].<br />
              Contact : [adresse e-mail de contact à renseigner].
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Hébergement et prestataires techniques</h2>
            <p className="mt-2">
              Hébergement et déploiement du site : Netlify. Authentification, base de données et stockage applicatif : Supabase. Ces prestataires peuvent traiter les données nécessaires au fonctionnement technique du service, conformément à leurs conditions et aux paramètres configurés pour le projet.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Propriété intellectuelle</h2>
            <p className="mt-2">
              Le nom, le logo, l’interface et les éléments propres à {APP_NAME} peuvent être protégés par les droits applicables. Les contenus publiés par les utilisateurs restent soumis aux droits de leurs auteurs et titulaires. Toute réutilisation doit respecter ces droits et les licences applicables.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Contenus et signalements</h2>
            <p className="mt-2">
              Les utilisateurs doivent disposer des droits nécessaires sur les contenus qu’ils publient et respecter la loi. Pour signaler un contenu illicite ou une atteinte à des droits, contactez le responsable à l’adresse qui doit être renseignée ci-dessus, en indiquant l’URL concernée et les éléments utiles à l’examen du signalement.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Responsabilité</h2>
            <p className="mt-2">
              Le service est fourni dans les limites prévues par la loi. Les informations de cette page doivent être adaptées à la situation réelle de l’éditeur et aux obligations applicables au service.
            </p>
          </section>
        </div>
      </div>
    </article>
  );
}
