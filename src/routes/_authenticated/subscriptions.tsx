import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { VIDEO_SELECT, type VideoCardData } from "@/lib/videos";
import { VideoGrid } from "@/components/stream/VideoCard";
import { EmptyState } from "@/components/stream/EmptyState";
import { ChannelAvatar } from "@/components/stream/ChannelAvatar";
import { APP_NAME } from "@/lib/config";

export const Route = createFileRoute("/_authenticated/subscriptions")({
  head: () => ({ meta: [{ title: `Abonnements — ${APP_NAME}` }] }),
  component: Subs,
});

type SubChannel = {
  id: string;
  handle: string;
  name: string;
  avatar_path: string | null;
  subscriber_count: number;
};

function Subs() {
  const { user } = Route.useRouteContext();

  const { data, isLoading, error } = useQuery({
    queryKey: ["subscriptions-page", user.id],
    queryFn: async () => {
      const { data: subs, error: subsError } = await supabase
        .from("subscriptions")
        .select("channel_id")
        .eq("user_id", user.id);
      if (subsError) throw subsError;

      const ids = (subs ?? []).map((s) => s.channel_id);
      if (!ids.length) return { channels: [] as SubChannel[], videos: [] as VideoCardData[] };

      const [{ data: channels, error: channelsError }, { data: videos, error: videosError }] = await Promise.all([
        supabase
          .from("channels")
          .select("id,handle,name,avatar_path:avatar_url,subscriber_count")
          .in("id", ids)
          .order("name"),
        supabase
          .from("videos")
          .select(VIDEO_SELECT)
          .eq("visibility", "public")
          .in("channel_id", ids)
          .order("created_at", { ascending: false })
          .limit(48),
      ]);

      if (channelsError) throw channelsError;
      if (videosError) throw videosError;

      return {
        channels: (channels ?? []) as SubChannel[],
        videos: (videos ?? []) as unknown as VideoCardData[],
      };
    },
  });

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
        Impossible de charger les abonnements : {error instanceof Error ? error.message : "erreur Supabase"}.
      </div>
    );
  }

  if (!isLoading && !data?.channels.length) {
    return (
      <EmptyState
        title="Aucun abonnement"
        text="Abonnez-vous à des chaînes pour les retrouver ici."
        action={<Link to="/explore" className="text-sm font-medium text-glow">Explorer →</Link>}
      />
    );
  }

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Abonnements</h1>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold">Vos chaînes</h2>
        <div className="flex gap-5 overflow-x-auto pb-2">
          {(data?.channels ?? []).map((channel) => (
            <Link
              key={channel.id}
              to="/c/$handle"
              params={{ handle: channel.handle }}
              className="flex w-28 shrink-0 flex-col items-center gap-2 rounded-2xl p-3 text-center ring-1 ring-edge/30 hover:bg-frost"
            >
              <ChannelAvatar name={channel.name} path={channel.avatar_path} className="size-16" />
              <span className="w-full truncate text-sm font-medium">{channel.name}</span>
              <span className="text-xs text-faint">{channel.subscriber_count} abonnés</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Dernières vidéos</h2>
        <VideoGrid
          videos={data?.videos}
          loading={isLoading}
          empty={<EmptyState title="Aucune vidéo récente" text="Vos chaînes n'ont pas encore publié de nouvelle vidéo." />}
        />
      </section>
    </>
  );
}
