import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { VIDEO_SELECT, type VideoCardData } from "@/lib/videos";
import { VideoGrid } from "@/components/stream/VideoCard";
import { EmptyState } from "@/components/stream/EmptyState";
import { QueryErrorState } from "@/components/stream/QueryErrorState";
import { APP_NAME } from "@/lib/config";

export const Route = createFileRoute("/search")({
  validateSearch: z.object({ q: z.string().catch("") }),
  head: () => ({
    meta: [
      { title: `Recherche — ${APP_NAME}` },
      { name: "description", content: "Recherchez des vidéos et des chaînes." },
      { property: "og:title", content: `Recherche — ${APP_NAME}` },
      { property: "og:description", content: "Recherchez des vidéos et des chaînes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SearchPage,
});

function escapePostgrestFilterValue(value: string) {
  // Keep user-supplied search text inside a single quoted PostgREST filter value.
  return '"' + value.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

function SearchPage() {
  const { q } = Route.useSearch();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["search", q],
    enabled: q.trim().length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("videos")
        .select(VIDEO_SELECT)
        .eq("visibility", "public")
        .or("title.ilike." + escapePostgrestFilterValue("%" + q.trim() + "%") + ",description.ilike." + escapePostgrestFilterValue("%" + q.trim() + "%"))
        .order("view_count", { ascending: false })
        .limit(48);
      if (error) throw error;
      return data as unknown as VideoCardData[];
    },
  });
  return (
    <>
      <h1 className="mb-6 text-xl font-semibold">{q.trim() ? `Résultats pour « ${q} »` : "Rechercher une vidéo"}</h1>
      {!q.trim() ? <EmptyState title="Saisissez un mot-clé" text="Utilisez la barre de recherche pour trouver des vidéos publiques." /> : isError ? <QueryErrorState title="La recherche a échoué" onRetry={() => void refetch()} /> : <VideoGrid videos={data} loading={isLoading} empty={<EmptyState title="Aucun résultat" text="Essayez avec d'autres mots-clés." />} />}
    </>
  );
}
