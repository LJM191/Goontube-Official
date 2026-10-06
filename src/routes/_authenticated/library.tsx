import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { VIDEO_SELECT, type VideoCardData } from "@/lib/videos";
import { VideoGrid } from "@/components/stream/VideoCard";
import { EmptyState } from "@/components/stream/EmptyState";
import { APP_NAME } from "@/lib/config";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({
    meta: [
      { title: `Bibliothèque — ${APP_NAME}` },
      { name: "description", content: "Vos vidéos aimées." },
      { property: "og:title", content: `Bibliothèque — ${APP_NAME}` },
      { property: "og:description", content: "Vos vidéos aimées." },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const { user } = Route.useRouteContext();
  const { data, isLoading } = useQuery({
    queryKey: ["liked", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("video_reactions")
        .select(`created_at, video:videos!inner(${VIDEO_SELECT})`)
        .eq("user_id", user.id)
        .eq("value", 1)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => r.video) as unknown as VideoCardData[];
    },
  });
  return (
    <>
      <h1 className="mb-1 text-2xl font-semibold">Bibliothèque</h1>
      <p className="mb-6 text-sm text-muted-foreground">Vidéos que vous avez aimées.</p>
      <VideoGrid videos={data} loading={isLoading} empty={<EmptyState title="Aucune vidéo aimée" />} />
    </>
  );
}
