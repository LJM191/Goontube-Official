import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchFeed } from "@/lib/videos";
import { VideoGrid } from "@/components/stream/VideoCard";
import { EmptyState } from "@/components/stream/EmptyState";
import { APP_NAME } from "@/lib/config";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${APP_NAME} — Vidéos chaudes` },
      { name: "description", content: "Découvrez les dernières vidéos publiées par les créateurs de la communauté." },
      { property: "og:title", content: `${APP_NAME} — Vidéos chaudes` },
      { property: "og:description", content: "Découvrez les dernières vidéos publiées par les créateurs de la communauté." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: videos, isLoading } = useQuery({
    queryKey: ["feed"],
    queryFn: () => fetchFeed(),
    // Reuse the feed briefly when navigating back instead of refetching on every return.
    staleTime: 30_000,
  });

  return (
    <>
      <h2 className="mx-auto mb-6 max-w-[1500px] text-xl font-semibold tracking-tight">Vidéos chaudes</h2>
      <VideoGrid
        videos={videos}
        loading={isLoading}
        empty={
          <EmptyState
            title="Aucune vidéo pour l'instant"
            text="Soyez le premier à publier une vidéo sur la plateforme."
            action={
              <Link to="/upload" className="rounded-full bg-glow px-5 py-2 text-sm font-medium text-primary-foreground">
                Mettre en ligne une vidéo
              </Link>
            }
          />
        }
      />
    </>
  );
}
