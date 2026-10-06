import { useEffect, useRef, useState } from "react";
import { Captions, ChevronDown, Maximize, Minimize, Pause, PictureInPicture2, Play, Settings, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

type PlayerProps = {
  src: string;
  poster?: string | null;
  title: string;
  autoPlay?: boolean;
};

const speeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export function VideoPlayer({ src, poster, title, autoPlay = true }: PlayerProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(autoPlay);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [settings, setSettings] = useState(false);
  const [captions, setCaptions] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.playbackRate = speed;
  }, [speed]);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const onTime = () => setProgress(v.currentTime);
    const onMeta = () => {
      setDuration(v.duration || 0);
      setPlaying(!v.paused);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, []);

  const togglePlay = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  };

  const seek = (value: number) => {
    const v = ref.current;
    if (!v || !duration) return;
    v.currentTime = value;
    setProgress(value);
  };

  const toggleFullscreen = async () => {
    const el = ref.current?.parentElement;
    if (!el) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await el.requestFullscreen();
  };

  const pictureInPicture = async () => {
    const v = ref.current;
    if (!v || !document.pictureInPictureEnabled) return;
    if (document.pictureInPictureElement) await document.exitPictureInPicture();
    else await v.requestPictureInPicture();
  };

  const toggleCaptions = () => {
    const v = ref.current;
    if (!v) return;
    const tracks = Array.from(v.textTracks);
    if (!tracks.length) return;
    const next = !captions;
    tracks.forEach((track) => { track.mode = next ? "showing" : "hidden"; });
    setCaptions(next);
  };

  const fmt = (seconds: number) => {
    if (!Number.isFinite(seconds)) return "0:00";
    const s = Math.floor(seconds % 60).toString().padStart(2, "0");
    const m = Math.floor(seconds / 60);
    const h = Math.floor(m / 60);
    return h ? `${h}:${(m % 60).toString().padStart(2, "0")}:${s}` : `${m}:${s}`;
  };

  return (
    <div
      className={cn("group relative aspect-video overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/10", fullscreen && "rounded-none")}
      onDoubleClick={toggleFullscreen}
    >
      <video
        ref={ref}
        src={src}
        poster={poster ?? undefined}
        autoPlay={autoPlay}
        playsInline
        className="size-full object-contain"
        onClick={togglePlay}
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/65 via-transparent to-black/80 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100" />

      <div className="pointer-events-none absolute left-5 right-5 top-4 opacity-0 transition-opacity group-hover:opacity-100">
        <p className="line-clamp-2 text-sm font-medium text-white drop-shadow-lg">{title}</p>
      </div>

      <button
        onClick={togglePlay}
        aria-label={playing ? "Pause" : "Lecture"}
        className="absolute left-1/2 top-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur-sm transition-all hover:scale-105 group-hover:opacity-100"
      >
        {playing ? <Pause className="size-7 fill-white" /> : <Play className="ml-1 size-7 fill-white" />}
      </button>

      <div className="absolute inset-x-0 bottom-0 px-4 pb-3 pt-10 opacity-0 transition-opacity group-hover:opacity-100">
        <input
          aria-label="Progression"
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={progress}
          onChange={(e) => seek(Number(e.target.value))}
          className="mb-2 h-1 w-full cursor-pointer accent-red-500"
        />
        <div className="flex items-center gap-2 text-white">
          <button onClick={togglePlay} aria-label={playing ? "Pause" : "Lecture"} className="rounded-full p-1.5 hover:bg-white/15">
            {playing ? <Pause className="size-5 fill-white" /> : <Play className="size-5 fill-white" />}
          </button>
          <button onClick={() => { setMuted(!muted); if (ref.current) ref.current.muted = !muted; }} aria-label="Son" className="rounded-full p-1.5 hover:bg-white/15">
            {muted || volume === 0 ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </button>
          <input aria-label="Volume" type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume} onChange={(e) => { const n = Number(e.target.value); setVolume(n); setMuted(n === 0); if (ref.current) { ref.current.volume = n; ref.current.muted = n === 0; } }} className="hidden w-20 accent-white sm:block" />
          <span className="text-xs tabular-nums">{fmt(progress)} / {fmt(duration)}</span>
          <div className="ml-auto flex items-center gap-1">
            <button onClick={toggleCaptions} aria-label="Sous-titres" className={cn("rounded-full p-1.5 hover:bg-white/15", captions && "bg-white/20")}><Captions className="size-5" /></button>
            <button onClick={pictureInPicture} aria-label="Picture in Picture" className="hidden rounded-full p-1.5 hover:bg-white/15 sm:block"><PictureInPicture2 className="size-5" /></button>
            <div className="relative">
              <button onClick={() => setSettings(!settings)} aria-label="Paramètres" className="rounded-full p-1.5 hover:bg-white/15"><Settings className="size-5" /></button>
              {settings && (
                <div className="absolute bottom-10 right-0 w-52 overflow-hidden rounded-xl bg-black/90 p-1 text-sm shadow-2xl ring-1 ring-white/15 backdrop-blur-xl">
                  <div className="px-3 py-2 text-xs text-white/50">Lecture</div>
                  {speeds.map((s) => <button key={s} onClick={() => { setSpeed(s); setSettings(false); }} className={cn("flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-white/10", speed === s && "bg-white/10")}>{s === 1 ? "Normale" : `${s}×`}{speed === s && "✓"}</button>)}
                  <div className="my-1 h-px bg-white/10" />
                  <div className="flex items-center justify-between px-3 py-2 text-white/60"><span>Qualité</span><span>Auto</span></div>
                  <div className="px-3 pb-2 text-[11px] text-white/40">Les qualités HD multiples seront disponibles quand une vidéo possède plusieurs versions.</div>
                </div>
              )}
            </div>
            <button onClick={toggleFullscreen} aria-label="Plein écran" className="rounded-full p-1.5 hover:bg-white/15">{fullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
