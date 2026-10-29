import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { VIDEO_SELECT, type VideoCardData } from "@/lib/videos";
import { VideoGrid } from "@/components/stream/VideoCard";
import { EmptyState } from "@/components/stream/EmptyState";
import { QueryErrorState } from "@/components/stream/QueryErrorState";
import { APP_NAME } from "@/lib/config";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: `Historique — ${APP_NAME}` },
      { name: "description", content: "Les vidéos que vous avez regardées." },
      { property: "og:title", content: `Historique — ${APP_NAME}` },
      { property: "og:description", content: "Les vidéos que vous avez regardées." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: History,
});

function History() {
  const { user } = Route.useRouteContext();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["history", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("watch_history")
        .select(`watched_at, video:videos!inner(${VIDEO_SELECT})`)
        .eq("user_id", user.id)
        .order("watched_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return (data ?? []).map((r) => r.video) as unknown as VideoCardData[];
    },
  });
  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Historique</h1>
      {isError ? <QueryErrorState title="Impossible de charger l’historique" onRetry={() => void refetch()} /> : <VideoGrid videos={data} loading={isLoading} empty={<EmptyState title="Historique vide" text="Les vidéos regardées apparaîtront ici." />} />}
    </>
  );
}
