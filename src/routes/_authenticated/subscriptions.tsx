import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { VIDEO_SELECT, type VideoCardData } from "@/lib/videos";
import { VideoGrid } from "@/components/stream/VideoCard";
import { EmptyState } from "@/components/stream/EmptyState";
import { APP_NAME } from "@/lib/config";

export const Route = createFileRoute("/_authenticated/subscriptions")({
  head: () => ({
    meta: [
      { title: `Abonnements — ${APP_NAME}` },
      { name: "description", content: "Les dernières vidéos de vos chaînes." },
      { property: "og:title", content: `Abonnements — ${APP_NAME}` },
      { property: "og:description", content: "Les dernières vidéos de vos chaînes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Subs,
});

function Subs() {
  const { user } = Route.useRouteContext();
  const { data, isLoading, error } = useQuery({
    queryKey: ["subs-feed", user.id],
    queryFn: async () => {
      const { data: subs, error: subsError } = await supabase.from("subscriptions").select("channel_id").eq("subscriber_id", user.id);
      if (subsError) throw subsError;
      const ids = (subs ?? []).map((s) => s.channel_id);
      if (!ids.length) return [];
      const { data, error } = await supabase
        .from("videos")
        .select(VIDEO_SELECT)
        .eq("visibility", "public")
        .in("channel_id", ids)
        .order("created_at", { ascending: false })
        .limit(48);
      if (error) throw error;
      return data as unknown as VideoCardData[];
    },
  });
  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Abonnements</h1>
      {error && <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">Impossible de charger les abonnements : {error instanceof Error ? error.message : "erreur Supabase"}.</div>}
      <VideoGrid
        videos={data}
        loading={isLoading}
        empty={
          <EmptyState
            title="Aucun abonnement"
            text="Abonnez-vous à des chaînes pour retrouver leurs vidéos ici."
            action={<Link to="/explore" className="text-sm font-medium text-glow">Explorer →</Link>}
          />
        }
      />
    </>
  );
}
