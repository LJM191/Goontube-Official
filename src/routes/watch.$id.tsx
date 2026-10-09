import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { FolderPlus, ListPlus, Share2, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useMediaUrl } from "@/lib/media";
import { fetchFeed, type VideoCardData } from "@/lib/videos";
import { formatCount, formatViews, timeAgo } from "@/lib/format";
import { ChannelAvatar } from "@/components/stream/ChannelAvatar";
import { SubscribeButton } from "@/components/stream/SubscribeButton";
import { Comments } from "@/components/stream/Comments";
import { VideoPlayer } from "@/components/stream/VideoPlayer";
import { Thumbnail } from "@/components/stream/VideoCard";
import { EmptyState } from "@/components/stream/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_NAME } from "@/lib/config";

function HashtagText({ text }: { text: string }) {
  const parts = text.split(/(#[\p{L}\p{N}_-]+)/gu);
  return <>{parts.map((part, i) => /^#[\p{L}\p{N}_-]+$/u.test(part) ? (
    <Link key={i} to="/hashtag/$tag" params={{ tag: part.slice(1) }} className="font-medium text-glow hover:underline">{part}</Link>
  ) : part)}</>;
}

export const Route = createFileRoute("/watch/$id")({
  head: () => ({
    meta: [
      { title: `Lecture — ${APP_NAME}` },
      { name: "description", content: `Regardez cette vidéo sur ${APP_NAME}.` },
      { property: "og:title", content: `Vidéo — ${APP_NAME}` },
      { property: "og:description", content: `Regardez cette vidéo sur ${APP_NAME}.` },
      { property: "og:type", content: "video.other" },
      { name: "twitter:card", content: "summary_large_image" },
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
      const { data, error } = await supabase.from("video_reactions").select("reaction").eq("video_id", videoId).eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data?.reaction ?? null;
    },
  });
  const react = useMutation({
    mutationFn: async (value: 1 | -1) => {
      const reaction = value === 1 ? "like" : "dislike";
      if (mine === reaction) {
        const { error } = await supabase.from("video_reactions").delete().eq("video_id", videoId).eq("user_id", user!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("video_reactions").upsert({ video_id: videoId, user_id: user!.id, reaction });
        if (error) throw error;
      }
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Impossible d’enregistrer la réaction"),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ["video", videoId] });
    },
  });
  const click = (v: 1 | -1) => (user ? react.mutate(v) : navigate({ to: "/auth" }));
  const liked = mine === "like";
  const disliked = mine === "dislike";
  return (
    <div className="flex overflow-hidden rounded-full bg-panel/80 ring-1 ring-edge/40">
      <button onClick={() => click(1)} className="flex items-center gap-2 px-4 py-1.5 text-sm hover:bg-frost" aria-label="J'aime">
        <ThumbsUp className={`size-4 ${liked ? "fill-glow text-glow" : ""}`} /> {formatCount(likes)}
      </button>
      <span className="my-1.5 w-px bg-edge" />
      <button onClick={() => click(-1)} className="flex items-center gap-2 px-4 py-1.5 text-sm hover:bg-frost" aria-label="Je n'aime pas">
        <ThumbsDown className={`size-4 ${disliked ? "fill-foreground" : ""}`} /> {dislikes > 0 ? formatCount(dislikes) : ""}
      </button>
    </div>
  );
}

function SaveActions({ videoId }: { videoId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  const { data: playlists } = useQuery({
    queryKey: ["playlists", user?.id],
    enabled: !!user && open,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("playlists").select("id,name").eq("user_id", user!.id).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const addToPlaylist = async (playlistId: string) => {
    if (!user) return;
    const { error } = await (supabase as any).from("playlist_items").upsert({ playlist_id: playlistId, video_id: videoId });
    if (error) toast.error(error.message);
    else toast.success("Vidéo ajoutée à la playlist");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["playlist-videos", playlistId] });
  };

  const createPlaylist = async () => {
    if (!user || !name.trim()) return;
    const { data, error } = await (supabase as any)
      .from("playlists")
      .insert({ user_id: user.id, name: name.trim() })
      .select("id")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setName("");
    setCreating(false);
    qc.invalidateQueries({ queryKey: ["playlists", user.id] });
    await addToPlaylist(data.id);
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full bg-panel/80 px-4 py-1.5 text-sm ring-1 ring-edge/40 hover:bg-frost"
      >
        <ListPlus className="size-4" /> Enregistrer
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-40 w-72 rounded-2xl bg-panel p-2 shadow-2xl ring-1 ring-edge/60">
          <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-faint">Enregistrer dans une playlist</p>
          {(playlists ?? []).map((playlist: any) => (
            <button key={playlist.id} onClick={() => addToPlaylist(playlist.id)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-frost">
              <ListPlus className="size-4" /> {playlist.name}
            </button>
          ))}
          {creating ? (
            <form onSubmit={(e) => { e.preventDefault(); void createPlaylist(); }} className="mt-2 border-t border-edge/40 pt-2">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nom de la playlist"
                className="mb-2 h-9 w-full rounded-lg bg-frost px-3 text-sm outline-none ring-1 ring-edge/40 focus:ring-glow/60"
              />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 rounded-lg bg-glow px-3 py-2 text-xs font-semibold text-background">Créer</button>
                <button type="button" onClick={() => setCreating(false)} className="rounded-lg bg-frost px-3 py-2 text-xs">Annuler</button>
              </div>
            </form>
          ) : (
            <button onClick={() => setCreating(true)} className="mt-2 flex w-full items-center gap-2 rounded-xl border-t border-edge/40 px-3 py-3 pt-3 text-left text-sm font-medium text-glow hover:bg-frost">
              <FolderPlus className="size-4" /> Créer une playlist
            </button>
          )}
        </div>
      )}
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
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [cinema, setCinema] = useState(false);
  const counted = useRef<string | null>(null);
  const { data: video, isLoading } = useQuery({
    queryKey: ["video", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("videos")
        .select("*, channel:channels(id,user_id,handle,name,avatar_url,subscriber_count)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const src = useMediaUrl("videos", video?.video_url);
  const poster = useMediaUrl("thumbnails", video?.thumbnail_url);

  useEffect(() => {
    if (video && counted.current !== video.id) {
      counted.current = video.id;
      void (async () => {
        const { error } = await supabase.rpc("increment_view", { video_uuid: video.id });
        if (!error) {
          qc.invalidateQueries({ queryKey: ["video", video.id] });
          qc.invalidateQueries({ queryKey: ["feed"] });
        }
      })();
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
    <div className={cinema ? "mx-auto max-w-7xl" : "mx-auto grid max-w-[1500px] gap-8 xl:grid-cols-[minmax(0,1fr)_380px]"}>
      <div className="min-w-0">
        <div className={cinema ? "overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-edge/40" : "mx-auto max-w-5xl overflow-hidden rounded-2xl bg-black shadow-xl ring-1 ring-edge/40"}>
          {src ? (
            <VideoPlayer src={src} poster={poster} title={video.title} sources={video.quality_sources ?? []} subtitleSources={video.subtitle_tracks ?? []} />
          ) : (
            <div className="aspect-video w-full animate-pulse bg-frost" />
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <h1 className="min-w-0 flex-1 text-xl font-semibold text-balance">{video.title}</h1>
          <button onClick={() => setCinema(!cinema)} className="rounded-full bg-panel/80 px-4 py-2 text-sm font-medium ring-1 ring-edge/40 hover:bg-frost">{cinema ? "Quitter le mode cinéma" : "Mode cinéma"}</button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <Link to="/c/$handle" params={{ handle: ch.handle }} className="flex items-center gap-3">
            <ChannelAvatar name={ch.name} path={ch.avatar_url} className="size-10" />
            <div>
              <p className="text-sm font-medium">{ch.name}</p>
              <p className="text-xs text-faint">{formatCount(ch.subscriber_count)} abonné{ch.subscriber_count > 1 ? "s" : ""}</p>
            </div>
          </Link>
          <SubscribeButton channelId={ch.id} ownerId={ch.user_id} />
          <div className="ml-auto flex gap-2">
            <Reactions videoId={video.id} likes={video.like_count} dislikes={video.dislike_count} />
            <SaveActions videoId={video.id} />
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
          </p>
          {video.description && (
            <p className={`mt-2 whitespace-pre-wrap text-muted-foreground ${expanded ? "" : "line-clamp-3"}`}>{video.description}</p>
          )}
          
          {video.description && video.description.length > 200 && (
            <button onClick={() => setExpanded(!expanded)} className="mt-2 font-medium">
              {expanded ? "Moins" : "Plus"}
            </button>
          )}
        </div>
        <div className="mt-4 rounded-2xl bg-panel/60 p-4 ring-1 ring-edge/30">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-full bg-glow/15 text-glow">✦</span>
            <div>
              <p className="font-medium">Résumé intelligent</p>
              <p className="text-xs text-faint">Synthèse basée sur les informations fournies par le créateur</p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {video.description
              ? video.description.length > 500 ? `${video.description.slice(0, 500).trim()}…` : video.description
              : "Cette vidéo n'a pas encore de description. Un résumé automatique pourra être généré lorsque l'IA sera connectée au Studio."}
          </p>
        </div>
        <Comments videoId={video.id} count={video.comment_count} ownerId={ch.user_id} />
      </div>
      <UpNext currentId={video.id} />
    </div>
  );
}

export type { VideoCardData };
