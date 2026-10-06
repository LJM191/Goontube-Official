import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { VIDEO_SELECT, type VideoCardData } from "@/lib/videos";
import { VideoGrid } from "@/components/stream/VideoCard";
import { EmptyState } from "@/components/stream/EmptyState";
import { APP_NAME } from "@/lib/config";

export const Route = createFileRoute("/search")({
  validateSearch: z.object({ q: z.string().catch("") }),
  head: () => ({
    meta: [
      { title: `Recherche — ${APP_NAME}` },
      { name: "description", content: "Recherchez des vidéos et des chaînes." },
      { property: "og:title", content: `Recherche — ${APP_NAME}` },
      { property: "og:description", content: "Recherchez des vidéos et des chaînes." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const { data, isLoading } = useQuery({
    queryKey: ["search", q],
    enabled: !!q,
    queryFn: async () => {
      const term = q.replace(/[%,()]/g, " ");
      const { data, error } = await supabase
        .from("videos")
        .select(VIDEO_SELECT)
        .eq("visibility", "public")
        .or(`title.ilike.%${term}%,description.ilike.%${term}%`)
        .order("view_count", { ascending: false })
        .limit(48);
      if (error) throw error;
      return data as unknown as VideoCardData[];
    },
  });
  return (
    <>
      <h1 className="mb-6 text-xl font-semibold">Résultats pour « {q} »</h1>
      <VideoGrid videos={data} loading={isLoading && !!q} empty={<EmptyState title="Aucun résultat" text="Essayez avec d'autres mots-clés." />} />
    </>
  );
}
