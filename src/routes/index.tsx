import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { fetchCategories, fetchFeed } from "@/lib/videos";
import { VideoGrid } from "@/components/stream/VideoCard";
import { EmptyState } from "@/components/stream/EmptyState";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/config";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${APP_NAME} — Recommandé pour vous` },
      { name: "description", content: "Découvrez les dernières vidéos publiées par les créateurs de la communauté." },
      { property: "og:title", content: `${APP_NAME} — Recommandé pour vous` },
      { property: "og:description", content: "Découvrez les dernières vidéos publiées par les créateurs de la communauté." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const [cat, setCat] = useState<number | null>(null);
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories, staleTime: Infinity });
  const { data: videos, isLoading } = useQuery({
    queryKey: ["feed", cat],
    queryFn: () => fetchFeed({ categoryId: cat }),
  });

  return (
    <>
      <div className="sticky top-20 z-20 -mx-4 mb-8 flex gap-3 overflow-x-auto bg-background/95 px-4 py-3 pb-3 backdrop-blur sm:-mx-6 sm:px-6">
        <Button variant="ghost"
          onClick={() => setCat(null)}
          className={cat === null ? "h-10 shrink-0 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90" : "h-10 shrink-0 rounded-xl bg-panel/90 px-5 text-sm font-medium text-muted-foreground ring-1 ring-edge/50 hover:bg-frost"}
        >
          Tout
        </Button>
        {categories?.map((c) => (
          <Button variant="ghost"
            key={c.id}
            onClick={() => setCat(c.id)}
            className={cat === c.id ? "chip bg-primary font-medium text-primary-foreground hover:bg-primary/90" : "chip bg-panel/80 text-muted-foreground ring-1 ring-edge/40 hover:bg-frost"}
          >
            {c.name}
          </Button>
        ))}
      </div>

      <h2 className="mb-6 text-xl font-normal">Recommandé pour vous</h2>
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
