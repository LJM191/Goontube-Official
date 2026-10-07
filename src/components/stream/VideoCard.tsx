import { Link } from "@tanstack/react-router";
import { Play } from "lucide-react";
import { useMediaUrl } from "@/lib/media";
import { formatDuration, formatViews, timeAgo } from "@/lib/format";
import type { VideoCardData } from "@/lib/videos";
import { ChannelAvatar, VerifiedDot } from "./ChannelAvatar";
import { Skeleton } from "@/components/ui/skeleton";

export function Thumbnail({ video, className }: { video: VideoCardData; className?: string }) {
  const url = useMediaUrl("thumbnails", video.thumbnail_path);
  return (
    <div className={`relative overflow-hidden rounded-lg bg-frost outline-1 -outline-offset-1 outline-edge/40 ${className ?? ""}`}>
      <div className="aspect-video w-full">
        {url ? (
          <img
            src={url}
            alt={video.title}
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid size-full place-items-center text-faint">
            <Play className="size-8" />
          </div>
        )}
      </div>
      {video.is_live ? (
        <span className="absolute bottom-2 left-2 rounded-md bg-live/90 px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-live-foreground">
          En direct
        </span>
      ) : (
        <span className="absolute bottom-2 right-2 rounded-md bg-background/80 px-1.5 py-0.5 text-xs font-medium tabular-nums">
          {formatDuration(video.duration_seconds)}
        </span>
      )}
    </div>
  );
}

export function VideoCard({ video }: { video: VideoCardData }) {
  return (
    <article className="group animate-in fade-in duration-500">
      <Link to="/watch/$id" params={{ id: video.id }} className="block">
        <Thumbnail video={video} />
      </Link>
      <div className="mt-4 flex gap-3">
        <Link to="/c/$handle" params={{ handle: video.channel.handle }} className="mt-0.5">
          <ChannelAvatar name={video.channel.name} path={video.channel.avatar_path} />
        </Link>
        <div className="min-w-0">
          <Link to="/watch/$id" params={{ id: video.id }}>
            <h3 className="line-clamp-2 font-sans text-sm font-medium leading-snug text-balance transition-colors group-hover:text-glow">{video.title}</h3>
          </Link>
          <Link
            to="/c/$handle"
            params={{ handle: video.channel.handle }}
            className="mt-1 block text-sm text-muted-foreground hover:text-foreground"
          >
            {video.channel.name}
            {video.channel.verified && <VerifiedDot />}
          </Link>
          <p className="text-sm text-faint">
            {formatViews(video.view_count)} · {timeAgo(video.created_at)}
          </p>
        </div>
      </div>
    </article>
  );
}

export function VideoGrid({
  videos,
  loading,
  empty,
}: {
  videos: VideoCardData[] | undefined;
  loading?: boolean;
  empty?: React.ReactNode;
}) {
  if (loading)
    return (
      <div className="grid grid-cols-1 gap-x-7 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="aspect-video w-full rounded-lg bg-frost" />
            <div className="mt-4 flex gap-3">
              <Skeleton className="size-9 rounded-full bg-frost" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-4/5 bg-frost" />
                <Skeleton className="h-3 w-1/2 bg-frost" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  if (!videos?.length) return <>{empty}</>;
  return (
    <div className="grid grid-cols-1 gap-x-7 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {videos.map((v) => (
        <VideoCard key={v.id} video={v} />
      ))}
    </div>
  );
}
