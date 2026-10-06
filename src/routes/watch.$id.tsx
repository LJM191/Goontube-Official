import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Share2, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useMediaUrl } from "@/lib/media";
import { fetchFeed, type VideoCardData } from "@/lib/videos";
import { formatCount, formatViews, timeAgo } from "@/lib/format";
import { ChannelAvatar, VerifiedDot } from "@/components/stream/ChannelAvatar";
import { SubscribeButton } from "@/components/stream/SubscribeButton";
import { Comments } from "@/components/stream/Comments";
import { Thumbnail } from "@/components/stream/VideoCard";
import { EmptyState } from "@/components/stream/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_NAME } from "@/lib/config";

export const Route = createFileRoute("/watch/$id")({
  head: () => ({
    meta: [
      { title: `Lecture — ${APP_NAME}` },
      { name: "description", content: `Regardez cette vidéo sur ${APP_NAME}.` },
      { property: "og:title", content: `Vidéo — ${APP_NAME}` },
      { property: "og:description", content: `Regardez cette vidéo sur ${APP_NAME}.` },
      { property: "og:type", content: "video.other" },
    ],
  }),
  component: Watch,
});

function Reactions({ videoId, likes, dislikes }: { videoId: string; likes: number; dislikes: number }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const key = ["reaction", user?.id, videoId];
  const { data: mine } = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("video_reactions").select("value").eq("video_id", videoId).eq("user_id", user!.id).maybeSingle();
      return data?.value ?? 0;
    },
  });
  const react = useMutation({
    mutationFn: async (value: 1 | -1) => {
      if (mine === value) await supabase.from("video_reactions").delete().eq("video_id", videoId).eq("user_id", user!.id);
      else await supabase.from("video_reactions").upsert({ video_id: videoId, user_id: user!.id, value });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ["video", videoId] });
    },
  });
  const click = (v: 1 | -1) => (user ? react.mutate(v) : navigate({ to: "/auth" }));
  return (
    <div className="flex overflow-hidden rounded-full bg-panel/80 ring-1 ring-edge/40">
      <button onClick={() => click(1)} className="flex items-center gap-2 px-4 py-1.5 text-sm hover:bg-frost" aria-label="J'aime">
        <ThumbsUp className={`size-4 ${mine === 1 ? "fill-glow text-glow" : ""}`} /> {formatCount(likes)}
      </button>
      <span className="my-1.5 w-px bg-edge" />
      <button onClick={() => click(-1)} className="flex items-center gap-2 px-4 py-1.5 text-sm hover:bg-frost" aria-label="Je n'aime pas">
        <ThumbsDown className={`size-4 ${mine === -1 ? "fill-foreground" : ""}`} /> {dislikes > 0 ? formatCount(dislikes) : ""}
      </button>
    </div>
  );
}

function UpNext({ currentId }: { currentId: string }) {
  const { data } = useQuery({ queryKey: ["feed", null], queryFn: () => fetchFeed() });
  const list = (data ?? []).filter((v) => v.id !== currentId).slice(0, 12);
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-medium uppercase tracking-wide text-faint">À suivre</h2>
      {list.map((v) => (
        <Link key={v.id} to="/watch/$id" params={{ id: v.id }} className="group flex gap-3 rounded-2xl bg-frost/40 p-2 ring-1 ring-edge/30 hover:bg-frost/70">
          <Thumbnail video={v} className="w-40 shrink-0 rounded-lg" />
          <div className="min-w-0">
            <h3 className="line-clamp-2 font-sans text-sm font-medium leading-snug">{v.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{v.channel.name}</p>
            <p className="text-xs text-faint">{formatViews(v.view_count)}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function Watch() {
  const { id } = Route.useParams();
  const [expanded, setExpanded] = useState(false);
  const counted = useRef<string | null>(null);
  const { data: video, isLoading } = useQuery({
    queryKey: ["video", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("videos")
        .select("*, channel:channels(id,owner_id,handle,name,avatar_path,verified,subscriber_count), category:categories(name)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const src = useMediaUrl("videos", video?.video_path);
  const poster = useMediaUrl("thumbnails", video?.thumbnail_path);

  useEffect(() => {
    if (video && counted.current !== video.id) {
      counted.current = video.id;
      supabase.rpc("increment_view", { _video_id: video.id });
    }
  }, [video]);

  if (isLoading)
    return (
      <div className="max-w-5xl">
        <Skeleton className="aspect-video w-full rounded-2xl bg-frost" />
        <Skeleton className="mt-4 h-6 w-2/3 bg-frost" />
      </div>
    );
  if (!video) return <EmptyState title="Vidéo introuvable" text="Elle a peut-être été supprimée ou rendue privée." />;

  const ch = video.channel!;
  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_400px]">
      <div className="min-w-0">
        <div className="overflow-hidden rounded-2xl bg-background ring-1 ring-edge/40">
          {src ? (
            <video key={src} src={src} poster={poster ?? undefined} controls autoPlay playsInline className="aspect-video w-full bg-background" />
          ) : (
            <div className="aspect-video w-full animate-pulse bg-frost" />
          )}
        </div>
        <h1 className="mt-4 text-xl font-semibold text-balance">{video.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <Link to="/c/$handle" params={{ handle: ch.handle }} className="flex items-center gap-3">
            <ChannelAvatar name={ch.name} path={ch.avatar_path} className="size-10" />
            <div>
              <p className="text-sm font-medium">{ch.name}{ch.verified && <VerifiedDot />}</p>
              <p className="text-xs text-faint">{formatCount(ch.subscriber_count)} abonné{ch.subscriber_count > 1 ? "s" : ""}</p>
            </div>
          </Link>
          <SubscribeButton channelId={ch.id} ownerId={ch.owner_id} />
          <div className="ml-auto flex gap-2">
            <Reactions videoId={video.id} likes={video.like_count} dislikes={video.dislike_count} />
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(window.location.href);
                toast.success("Lien copié");
              }}
              className="flex items-center gap-2 rounded-full bg-panel/80 px-4 py-1.5 text-sm ring-1 ring-edge/40 hover:bg-frost"
            >
              <Share2 className="size-4" /> Partager
            </button>
          </div>
        </div>
        <div className="mt-4 rounded-2xl bg-panel/60 p-4 text-sm ring-1 ring-edge/30">
          <p className="font-medium">
            {formatViews(video.view_count)} · {timeAgo(video.created_at)}
            {video.category && <span className="text-muted-foreground"> · {video.category.name}</span>}
          </p>
          {video.description && (
            <p className={`mt-2 whitespace-pre-wrap text-muted-foreground ${expanded ? "" : "line-clamp-3"}`}>{video.description}</p>
          )}
          {video.tags.length > 0 && (
            <p className="mt-2 text-glow">{video.tags.map((t) => `#${t}`).join(" ")}</p>
          )}
          {video.description && video.description.length > 200 && (
            <button onClick={() => setExpanded(!expanded)} className="mt-2 font-medium">
              {expanded ? "Moins" : "Plus"}
            </button>
          )}
        </div>
        <Comments videoId={video.id} count={video.comment_count} />
      </div>
      <UpNext currentId={video.id} />
    </div>
  );
}

export type { VideoCardData };
