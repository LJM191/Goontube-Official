import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/components/stream/EmptyState";
import { APP_NAME } from "@/lib/config";

export const Route = createFileRoute("/shorts")({
  head: () => ({
    meta: [
      { title: `Shorts — ${APP_NAME}` },
      { name: "description", content: "Vidéos verticales courtes." },
      { property: "og:title", content: `Shorts — ${APP_NAME}` },
      { property: "og:description", content: "Vidéos verticales courtes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <EmptyState title="Les Shorts arrivent bientôt" text="Le flux de vidéos verticales sera disponible dans une prochaine étape." />
  ),
});
