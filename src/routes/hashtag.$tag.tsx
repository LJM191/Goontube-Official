import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { VideoGrid } from "@/components/stream/VideoCard";
import { EmptyState } from "@/components/stream/EmptyState";
import type { VideoCardData } from "@/lib/videos";
import { APP_NAME } from "@/lib/config";

export const Route = createFileRoute("/hashtag/$tag")({
  head: () => ({
    meta: [
      { title: `Hashtag — ${APP_NAME}` },
      { name: "description", content: "Découvrez les vidéos utilisant ce hashtag." },
    ],
  }),
  component: HashtagPage,
});

function HashtagPage() {
  const { tag: rawTag } = Route.useParams();
  const tag = rawTag.replace(/^#/, "").trim().toLowerCase();

  const { data, isLoading, error } = useQuery({
    queryKey: ["hashtag", tag],
    enabled: !!tag,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("videos")
        .select("id,title,thumbnail_path,duration_seconds,view_count,created_at,is_live,visibility,channel:channels!inner(id,handle,name,avatar_path,verified),tags")
        .eq("visibility", "public")
        .contains("tags", [tag])
        .order("created_at", { ascending: false })
        .limit(48);
      if (error) throw error;
      return (data ?? []) as unknown as VideoCardData[];
    },
  });

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-faint">Hashtag</p>
          <h1 className="text-3xl font-semibold">#{tag}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLoading ? "Recherche des vidéos…" : `${data?.length ?? 0} vidéo${(data?.length ?? 0) > 1 ? "s" : ""}`}
          </p>
        </div>
        <Link to="/search" search={{ q: `#${tag}` }} className="rounded-full bg-panel px-4 py-2 text-sm ring-1 ring-edge/40 hover:bg-frost">
          Rechercher ce hashtag
        </Link>
      </div>
      {error ? (
        <EmptyState title="Impossible de charger le hashtag" text={error instanceof Error ? error.message : "Une erreur est survenue."} />
      ) : (
        <VideoGrid videos={data} loading={isLoading} empty={<EmptyState title="Aucune vidéo" text={`Aucune vidéo publique n'utilise encore #${tag}.`} />} />
      )}
    </div>
  );
}
