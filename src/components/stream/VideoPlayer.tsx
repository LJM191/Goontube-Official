import { useEffect, useMemo, useRef, useState } from "react";
import { AudioLines, Captions, Cast, Check, Languages, Maximize, Minimize, Pause, PictureInPicture2, Play, Settings, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type QualitySource = { label: string; src: string; height?: number };
type PlayerProps = {
  src: string;
  poster?: string | null;
  title: string;
  autoPlay?: boolean;
  sources?: QualitySource[] | null;
};

const speeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export function VideoPlayer({ src, poster, title, autoPlay = true, sources = [] }: PlayerProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const [activeSrc, setActiveSrc] = useState(src);
  const [playing, setPlaying] = useState(autoPlay);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [settings, setSettings] = useState(false);
  const [languageMenu, setLanguageMenu] = useState(false);
  const [captions, setCaptions] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState(-1);
  const [selectedQuality, setSelectedQuality] = useState("auto");
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimer = useRef<number | null>(null);

  const qualitySources = useMemo(() => {
    const valid = Array.isArray(sources) ? sources.filter((item) => item && typeof item.src === "string" && typeof item.label === "string") : [];
    return [{ label: "Automatique", src }, ...valid];
  }, [sources, src]);

  useEffect(() => {
    setActiveSrc(src);
    setSelectedQuality("auto");
  }, [src]);

  useEffect(() => {
    const onFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => document.removeEventListener("fullscreenchange", onFullscreen);
  }, []);

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
  }, [activeSrc]);

  const showControls = () => {
    setControlsVisible(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    if (playing) hideTimer.current = window.setTimeout(() => setControlsVisible(false), 2800);
  };

  useEffect(() => () => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
  }, []);

  const togglePlay = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
    showControls();
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
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await el.requestFullscreen();
    } catch {
      toast.error("Le plein écran n'est pas disponible sur cet appareil.");
    }
  };

  const pictureInPicture = async () => {
    const v = ref.current;
    if (!v || !document.pictureInPictureEnabled) {
      toast.info("Le mode image dans l'image n'est pas pris en charge par ce navigateur.");
      return;
    }
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await v.requestPictureInPicture();
    } catch {
      toast.error("Impossible d'activer l'image dans l'image.");
    }
  };

  const castVideo = async () => {
    const v = ref.current as (HTMLVideoElement & { remote?: { prompt: () => Promise<void> }; webkitShowPlaybackTargetPicker?: () => void }) | null;
    if (!v) return;
    try {
      if (typeof v.webkitShowPlaybackTargetPicker === "function") {
        v.webkitShowPlaybackTargetPicker();
        return;
      }
      if (v.remote && typeof v.remote.prompt === "function") {
        await v.remote.prompt();
        return;
      }
      toast.info("La diffusion dépend des appareils et du navigateur. Google Cast peut nécessiter une intégration dédiée ; AirPlay est pris en charge seulement sur certains appareils Apple.");
    } catch {
      toast.error("Aucun appareil de diffusion disponible ou autorisé.");
    }
  };

  const tracks = () => ref.current ? Array.from(ref.current.textTracks) : [];
  const chooseCaption = (index: number) => {
    const list = tracks();
    list.forEach((track, i) => { track.mode = index === i ? "showing" : "disabled"; });
    setSelectedTrack(index);
    setCaptions(index >= 0);
  };

  const changeQuality = (value: string) => {
    if (value === "auto") {
      setSelectedQuality("auto");
      setActiveSrc(src);
      return;
    }
    const option = qualitySources.find((item) => item.label === value);
    if (!option) return;
    const v = ref.current;
    const time = v?.currentTime ?? 0;
    const wasPlaying = v ? !v.paused : false;
    setSelectedQuality(value);
    setActiveSrc(option.src);
    window.setTimeout(() => {
      const next = ref.current;
      if (!next) return;
      next.currentTime = Math.min(time, next.duration || time);
      if (wasPlaying) void next.play().catch(() => undefined);
    }, 0);
  };

  const changeAudioTrack = (index: number) => {
    const v = ref.current as (HTMLVideoElement & { audioTracks?: { length: number; [index: number]: { enabled: boolean } } }) | null;
    if (!v?.audioTracks || !v.audioTracks.length) {
      toast.info("Cette vidéo ne fournit pas de pistes audio alternatives.");
      return;
    }
    for (let i = 0; i < v.audioTracks.length; i++) v.audioTracks[i].enabled = i === index;
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
      onPointerMove={showControls}
      onTouchStart={showControls}
    >
      <video
        ref={ref}
        key={activeSrc}
        src={activeSrc}
        poster={poster ?? undefined}
        autoPlay={autoPlay}
        playsInline
        preload="metadata"
        className="size-full touch-manipulation object-contain"
        onClick={togglePlay}
      />

      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-b from-black/65 via-transparent to-black/80 transition-opacity duration-200", controlsVisible ? "opacity-100" : "opacity-0")} />
      <div className={cn("pointer-events-none absolute left-3 right-3 top-3 transition-opacity sm:left-5 sm:right-5 sm:top-4", controlsVisible ? "opacity-100" : "opacity-0")}>
        <p className="line-clamp-2 text-sm font-medium text-white drop-shadow-lg">{title}</p>
      </div>

      <button
        onClick={(event) => { event.stopPropagation(); togglePlay(); showControls(); }}
        aria-label={playing ? "Pause" : "Lecture"}
        className={cn("absolute left-1/2 top-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-all hover:scale-105 sm:size-16", controlsVisible ? "opacity-100" : "opacity-0")}
      >
        {playing ? <Pause className="size-7 fill-white" /> : <Play className="ml-1 size-7 fill-white" />}
      </button>

      <div className={cn("absolute inset-x-0 bottom-0 px-2 pb-2 pt-12 transition-opacity sm:px-4 sm:pb-3", controlsVisible ? "opacity-100" : "opacity-0")}>
        <input aria-label="Progression" type="range" min={0} max={duration || 0} step={0.1} value={progress} onChange={(e) => seek(Number(e.target.value))} className="mb-2 h-2 w-full cursor-pointer accent-red-500 touch-manipulation sm:h-1" />
        <div className="flex min-h-10 items-center gap-1 text-white sm:gap-2">
          <button onClick={togglePlay} aria-label={playing ? "Pause" : "Lecture"} className="grid size-9 place-items-center rounded-full p-1.5 hover:bg-white/15 sm:size-8">
            {playing ? <Pause className="size-5 fill-white" /> : <Play className="size-5 fill-white" />}
          </button>
          <button onClick={() => { setMuted(!muted); if (ref.current) ref.current.muted = !muted; }} aria-label="Son" className="grid size-9 place-items-center rounded-full p-1.5 hover:bg-white/15 sm:size-8">
            {muted || volume === 0 ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </button>
          <input aria-label="Volume" type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume} onChange={(e) => { const n = Number(e.target.value); setVolume(n); setMuted(n === 0); if (ref.current) { ref.current.volume = n; ref.current.muted = n === 0; } }} className="hidden w-20 accent-white sm:block" />
          <span className="text-[10px] tabular-nums sm:text-xs">{fmt(progress)} / {fmt(duration)}</span>
          <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
            <div className="relative">
              <button onClick={() => { setLanguageMenu(!languageMenu); setSettings(false); }} aria-label="Langues et sous-titres" title="Langues et sous-titres" className={cn("grid size-9 place-items-center rounded-full p-1.5 hover:bg-white/15 sm:size-8", captions && "bg-white/20")}><Languages className="size-5" /></button>
              {languageMenu && (
                <div className="absolute bottom-10 right-0 z-30 max-h-[min(65vh,24rem)] w-60 overflow-y-auto rounded-xl bg-black/95 p-2 text-sm shadow-2xl ring-1 ring-white/15 backdrop-blur-xl">
                  <p className="px-2 py-2 text-xs font-semibold uppercase tracking-wide text-white/50">Sous-titres</p>
                  <button onClick={() => chooseCaption(-1)} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-white/10">Désactivés {selectedTrack === -1 && <Check className="size-4" />}</button>
                  {tracks().map((track, index) => (
                    <button key={index} onClick={() => chooseCaption(index)} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-white/10">
                      {track.label || track.language || `Piste ${index + 1}`}{selectedTrack === index && <Check className="size-4" />}
                    </button>
                  ))}
                  {tracks().length === 0 && <p className="px-3 py-2 text-xs leading-5 text-white/50">Aucun fichier de sous-titres n'est fourni avec cette vidéo pour le moment.</p>}
                  <div className="my-1 h-px bg-white/10" />
                  <button onClick={() => toast.info("La génération et la traduction automatique nécessitent encore de connecter un service IA à GoonTube.")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-white/10"><Captions className="size-4 shrink-0" /> Sous-titres traduits par IA</button>
                  <p className="px-3 pb-2 text-[11px] leading-4 text-white/40">La traduction IA sera disponible après connexion du service de transcription et de traduction.</p>
                </div>
              )}
            </div>
            <button onClick={castVideo} aria-label="Caster la vidéo" title="Caster la vidéo" className="grid size-9 place-items-center rounded-full p-1.5 hover:bg-white/15 sm:size-8"><Cast className="size-5" /></button>
            <div className="relative">
              <button onClick={() => { setSettings(!settings); setLanguageMenu(false); }} aria-label="Paramètres" title="Paramètres" className="grid size-9 place-items-center rounded-full p-1.5 hover:bg-white/15 sm:size-8"><Settings className="size-5" /></button>
              {settings && (
                <div className="absolute bottom-10 right-0 z-30 max-h-[min(70vh,28rem)] w-60 overflow-y-auto rounded-xl bg-black/95 p-1 text-sm shadow-2xl ring-1 ring-white/15 backdrop-blur-xl">
                  <div className="px-3 py-2 text-xs text-white/50">Vitesse de lecture</div>
                  {speeds.map((s) => <button key={s} onClick={() => { setSpeed(s); setSettings(false); }} className={cn("flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-white/10", speed === s && "bg-white/10")}>{s === 1 ? "Normale" : `${s}×`}{speed === s && <Check className="size-4" />}</button>)}
                  <div className="my-1 h-px bg-white/10" />
                  <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white/50"><Settings className="size-3.5" /> Qualité vidéo</div>
                  {qualitySources.map((option, index) => {
                    const value = index === 0 ? "auto" : option.label;
                    return <button key={value} onClick={() => { changeQuality(value); setSettings(false); }} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-white/10">{option.label}{selectedQuality === value && <Check className="size-4" />}</button>;
                  })}
                  {qualitySources.length === 1 && <p className="px-3 pb-2 text-[11px] leading-4 text-white/40">Cette vidéo ne possède qu'une seule version. Les choix 360p/480p/720p apparaîtront lorsque plusieurs versions seront encodées.</p>}
                  <div className="my-1 h-px bg-white/10" />
                  <button onClick={() => { changeAudioTrack(0); setSettings(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-white/10"><AudioLines className="size-4" /> Piste audio</button>
                  <p className="px-3 pb-2 text-[11px] leading-4 text-white/40">Les pistes audio alternatives dépendent du fichier vidéo et du navigateur.</p>
                </div>
              )}
            </div>
            <button onClick={pictureInPicture} aria-label="Image dans l'image" title="Image dans l'image" className="hidden rounded-full p-1.5 hover:bg-white/15 sm:block"><PictureInPicture2 className="size-5" /></button>
            <button onClick={toggleFullscreen} aria-label="Plein écran" title="Plein écran" className="grid size-9 place-items-center rounded-full p-1.5 hover:bg-white/15 sm:size-8">{fullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
