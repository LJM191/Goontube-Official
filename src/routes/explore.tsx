import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchFeed } from "@/lib/videos";
import { VideoGrid } from "@/components/stream/VideoCard";
import { EmptyState } from "@/components/stream/EmptyState";
import { APP_NAME } from "@/lib/config";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: `Explorer — ${APP_NAME}` },
      { name: "description", content: "Les vidéos les plus regardées du moment." },
      { property: "og:title", content: `Explorer — ${APP_NAME}` },
      { property: "og:description", content: "Les vidéos les plus regardées du moment." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Explore,
});

function Explore() {
  const { data, isLoading } = useQuery({ queryKey: ["feed", "popular"], queryFn: () => fetchFeed({ order: "popular" }) });
  return (
    <>
      <h1 className="mb-1 text-2xl font-semibold">Explorer</h1>
      <p className="mb-6 text-sm text-muted-foreground">Les vidéos les plus regardées.</p>
      <VideoGrid videos={data} loading={isLoading} empty={<EmptyState title="Rien à explorer pour l'instant" />} />
    </>
  );
}
