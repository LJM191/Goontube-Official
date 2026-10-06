import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { fetchCategories, fetchFeed } from "@/lib/videos";
import { VideoGrid } from "@/components/stream/VideoCard";
import { EmptyState } from "@/components/stream/EmptyState";
import { APP_NAME } from "@/lib/config";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${APP_NAME} — Recommandé pour vous` },
      { name: "description", content: "Découvrez les dernières vidéos publiées par les créateurs de la communauté." },
      { property: "og:title", content: `${APP_NAME} — Recommandé pour vous` },
      { property: "og:description", content: "Découvrez les dernières vidéos publiées par les créateurs de la communauté." },
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
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setCat(null)}
          className={cat === null ? "chip bg-foreground font-medium text-background" : "chip bg-panel/80 text-muted-foreground ring-1 ring-edge/40 hover:bg-frost"}
        >
          Tout
        </button>
        {categories?.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            className={cat === c.id ? "chip bg-foreground font-medium text-background" : "chip bg-panel/80 text-muted-foreground ring-1 ring-edge/40 hover:bg-frost"}
          >
            {c.name}
          </button>
        ))}
      </div>

      <h2 className="mb-4 text-lg font-semibold">Recommandé pour vous</h2>
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
