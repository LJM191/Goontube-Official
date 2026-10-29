import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Play } from "lucide-react";
import { useMediaUrl } from "@/lib/media";
import { formatDuration, formatViews, timeAgo } from "@/lib/format";
import type { VideoCardData } from "@/lib/videos";
import { ChannelAvatar } from "./ChannelAvatar";
import { Skeleton } from "@/components/ui/skeleton";

export function Thumbnail({ video, className, priority = false }: { video: VideoCardData; className?: string; priority?: boolean }) {
  const url = useMediaUrl("thumbnails", video.thumbnail_path);
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [url]);
  return (
    <div className={`relative overflow-hidden rounded-lg bg-frost outline-1 -outline-offset-1 outline-edge/40 ${className ?? ""}`}>
      <div className="aspect-video w-full">
        {url ? (
          <img
            src={url}
            alt={video.title}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid size-full place-items-center text-faint">
            <Play className="size-8" />
          </div>
        )}
      </div>
      <span className="absolute bottom-2 right-2 rounded-md bg-background/80 px-1.5 py-0.5 text-xs font-medium tabular-nums">
        {formatDuration(video.duration_seconds ?? 0)}
      </span>
    </div>
  );
}

export function VideoCard({ video, priority = false }: { video: VideoCardData; priority?: boolean }) {
  return (
    <article className="group">
      <Link to="/watch/$id" params={{ id: video.id }} className="block">
        <Thumbnail video={video} priority={priority} />
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
  empty?: ReactNode;
}) {
  if (loading)
    return (
      <div className="mx-auto grid w-full max-w-[1500px] grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
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
    <div className="mx-auto grid w-full max-w-[1500px] grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {videos.map((v, index) => (
        <VideoCard key={v.id} video={v} priority={index === 0} />
      ))}
    </div>
  );
}
