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
        <p className="text-sm font-medium text-glow">Vie privée et données</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Politique de confidentialité</h1>
        <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm leading-6 text-muted-foreground">
          Le responsable du site doit vérifier cette politique et renseigner une adresse de contact valide avant le lancement public. Les durées exactes de conservation et les paramètres de chaque prestataire doivent être confirmés selon la configuration réellement utilisée.
        </p>

        <div className="mt-8 space-y-7 text-sm leading-7 text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">Responsable du traitement</h2>
            <p className="mt-2">
              Le responsable du traitement est l’éditeur de {APP_NAME}. Pour toute question relative aux données personnelles ou pour exercer vos droits : [adresse e-mail de contact à renseigner].
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">Données traitées</h2>
            <p className="mt-2">
              Selon les fonctionnalités utilisées, le service peut traiter les informations de compte et de connexion, le nom et la photo de profil fournis par Google lors d’une connexion Google, les informations de chaîne, les vidéos et médias publiés, les commentaires, les abonnements, les réactions, les playlists, l’historique de visionnage ainsi que les signalements et données techniques nécessaires à la sécurité.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">Finalités et bases juridiques</h2>
            <p className="mt-2">
              Les données servent à créer et sécuriser les comptes, fournir les fonctions demandées, héberger et afficher les contenus, gérer les interactions, prévenir les abus et répondre aux obligations légales. Le responsable doit documenter la base juridique applicable à chaque traitement et ne collecter que les données nécessaires.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">Prestataires et transferts</h2>
            <p className="mt-2">
              Le service utilise Supabase pour l’authentification, la base de données et le stockage, Netlify pour l’hébergement et le déploiement, ainsi que Google lorsque la connexion Google est choisie. Selon la configuration et les services activés, certains prestataires peuvent traiter des données depuis différents pays. L’éditeur doit vérifier les contrats, les lieux de traitement et les garanties de transfert applicables.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">Durée de conservation</h2>
            <p className="mt-2">
              Les données doivent être conservées uniquement pendant la durée nécessaire à chaque finalité, puis supprimées ou anonymisées, sous réserve des obligations légales et de la gestion des litiges. Les durées précises doivent être définies et documentées par l’éditeur.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">Vos droits</h2>
            <p className="mt-2">
              Dans les conditions prévues par le RGPD, vous pouvez demander l’accès à vos données, leur rectification, leur effacement, la limitation du traitement, vous opposer à certains traitements ou demander la portabilité lorsque ce droit s’applique. Contactez [adresse e-mail à renseigner]. Vous pouvez également déposer une réclamation auprès de la CNIL (cnil.fr).
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">Cookies et stockage local</h2>
            <p className="mt-2">
              Le site peut utiliser des mécanismes techniques nécessaires à la connexion, à la sécurité et au fonctionnement de l’interface. Tout traceur non essentiel, notamment à des fins publicitaires ou de mesure d’audience lorsqu’il nécessite un consentement, doit faire l’objet d’une information et d’un choix préalable appropriés. La liste doit être mise à jour si de tels outils sont ajoutés.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-foreground">Mise à jour</h2>
            <p className="mt-2">
              Cette politique peut être mise à jour lorsque les fonctionnalités ou les traitements changent. L’éditeur doit indiquer la date de dernière mise à jour après vérification.
            </p>
          </section>
        </div>
      </div>
    </article>
  );
}
