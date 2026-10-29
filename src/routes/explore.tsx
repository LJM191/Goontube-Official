import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchFeed } from "@/lib/videos";
import { VideoGrid } from "@/components/stream/VideoCard";
import { EmptyState } from "@/components/stream/EmptyState";
import { APP_NAME } from "@/lib/config";

export const Route = createFileRoute("/explore")({
  validateSearch: (_search: Record<string, unknown>) => ({}),
  head: () => ({
    meta: [
      { title: `Tout explorer — ${APP_NAME}` },
      { name: "description", content: "Retrouvez toutes les vidéos publiques sur Goontube." },
      { property: "og:title", content: `Tout explorer — ${APP_NAME}` },
      { property: "og:description", content: "Retrouvez toutes les vidéos publiques sur Goontube." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Explore,
});

function Explore() {
  const { data, isLoading } = useQuery({
    queryKey: ["feed", "popular", "tout"],
    queryFn: () => fetchFeed({ order: "popular" }),
  });

  return (
    <>
      <h1 className="mb-1 text-2xl font-semibold">Explorer</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Toutes les vidéos publiques, réunies au même endroit.
      </p>
      <VideoGrid videos={data} loading={isLoading} empty={<EmptyState title="Aucune vidéo pour l'instant" text="Les vidéos publiées apparaîtront ici." />} />
    </>
  );
}
