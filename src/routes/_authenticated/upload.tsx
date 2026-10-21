import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  UploadCloud,
  Loader2,
  FileVideo,
  ImagePlus,
  CheckCircle2,
  ShieldCheck,
  X,
  LockKeyhole,
  Globe2,
  Link2,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia } from "@/lib/media";
import { compressVideo, MAX_VIDEO_UPLOAD_BYTES } from "@/lib/video-compression";
import { fetchCategories } from "@/lib/videos";
import { formatDuration } from "@/lib/format";
import { useMe } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { APP_NAME } from "@/lib/config";

export const Route = createFileRoute("/_authenticated/upload")({
  head: () => ({
    meta: [
      { title: `Mettre en ligne — ${APP_NAME}` },
      { name: "description", content: "Publiez une nouvelle vidéo sur votre chaîne." },
      { property: "og:title", content: `Mettre en ligne — ${APP_NAME}` },
      { property: "og:description", content: "Publiez une nouvelle vidéo sur votre chaîne." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Upload,
});

// Source files are compressed locally when needed. Keep the source limit generous,
// while the final object uploaded to storage must remain below the 50 Mo bucket cap.
const MAX_SOURCE_BYTES = 500 * 1024 * 1024;
const STORAGE_LIMIT_BYTES = 50_000_000;
const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/ogg"];
const ACCEPTED_VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".ogg"];

type CompressionStatus = {
  phase: "loading" | "encoding";
  progress: number;
  attempt: number;
  attempts: number;
};

/** Read duration and grab a frame as an auto-thumbnail. */
function probeVideo(file: File): Promise<{ duration: number; frame: Blob | null }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    v.src = url;
    v.onloadedmetadata = () => {
      v.currentTime = Math.min(2, (v.duration || 0) / 3);
    };
    v.onseeked = () => {
      const c = document.createElement("canvas");
      c.width = 1280;
      c.height = Math.round((1280 * v.videoHeight) / (v.videoWidth || 1)) || 720;
      c.getContext("2d")?.drawImage(v, 0, 0, c.width, c.height);
      c.toBlob(
        (b) => {
          URL.revokeObjectURL(url);
          resolve({ duration: v.duration || 0, frame: b });
        },
        "image/jpeg",
        0.85,
      );
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ duration: 0, frame: null });
    };
  });
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function Upload() {
  const { user } = Route.useRouteContext();
  const { data: me } = useMe();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: categories, isLoading: categoriesLoading, isError: categoriesError } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: Infinity,
  });

  const [file, setFile] = useState<File | null>(null);
  const [probe, setProbe] = useState<{ duration: number; frame: Blob | null } | null>(null);
  const [thumb, setThumb] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [visibility, setVisibility] = useState<"public" | "unlisted" | "private">("public");
  const [step, setStep] = useState<string | null>(null);
  const [compression, setCompression] = useState<CompressionStatus | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const blob = thumb ?? probe?.frame;
    if (!blob) {
      setPreview(null);
      return;
    }
    const u = URL.createObjectURL(blob);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [thumb, probe]);

  useEffect(() => {
    if (!file) {
      setVideoPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setVideoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function pick(f: File | undefined) {
    if (!f) return;
    const extension = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
    if (!ACCEPTED_VIDEO_TYPES.includes(f.type) && !ACCEPTED_VIDEO_EXTENSIONS.includes(extension)) {
      toast.error("Choisissez une vidéo au format MP4, WebM, MOV ou OGG.");
      return;
    }
    if (f.size > MAX_SOURCE_BYTES) {
      toast.error("Cette vidéo dépasse la limite de fichier source de 500 Mo.");
      return;
    }
    setFile(f);
    setProbe(null);
    setThumb(null);
    setCompression(null);
    setStep(null);
    setTitle((current) => current || f.name.replace(/\.[^.]+$/, ""));
    setProbe(await probeVideo(f));
  }

  function resetFile() {
    if (step) return;
    setFile(null);
    setProbe(null);
    setThumb(null);
    setCompression(null);
    setStep(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !me?.channel) return;
    if (!title.trim()) {
      toast.error("Ajoutez un titre à la vidéo.");
      return;
    }
    if (!categoryId) {
      toast.error("Choisissez une catégorie avant de publier.");
      return;
    }

    try {
      let uploadFile = file;
      setCompression(null);
      if (file.size > MAX_VIDEO_UPLOAD_BYTES) {
        setStep("Préparation de la compression…");
        setCompression({ phase: "loading", progress: 0, attempt: 0, attempts: 6 });
        uploadFile = await compressVideo(file, (status) => {
          setCompression(status);
          if (status.phase === "loading") {
            setStep("Préparation du moteur de compression…");
          } else {
            setStep("Compression en cours…");
          }
        });
      }
      setCompression(null);
      setStep("Envoi de la vidéo…");
      const ext = uploadFile.name.split(".").pop()?.toLowerCase() || "mp4";
      const videoPath = await uploadMedia("videos", user.id, uploadFile, ext);
      setStep("Envoi de la miniature…");
      const thumbBlob = thumb ?? probe?.frame;
      const thumbPath = thumbBlob
        ? await uploadMedia("thumbnails", user.id, thumbBlob, thumb ? thumb.name.split(".").pop() || "jpg" : "jpg")
        : null;
      setStep("Publication…");
      const { data, error } = await supabase
        .from("videos")
        .insert({
          channel_id: me.channel.id,
          title: title.trim(),
          description: description.trim() || "",
          video_url: videoPath,
          thumbnail_url: thumbPath,
          duration_seconds: Math.round(probe?.duration ?? 0),
          category_id: categoryId,
          visibility,
        })
        .select("id")
        .single();
      if (error) throw error;
      toast.success("Vidéo publiée !");
      navigate({ to: "/watch/$id", params: { id: data.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de la mise en ligne");
      setStep(null);
      setCompression(null);
    }
  }

  const isBusy = !!step;
  const compressionPercent = Math.round((compression?.progress ?? 0) * 100);
  const categoryName = categories?.find((category) => category.id === categoryId)?.name;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-6 sm:px-6 lg:pt-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-glow">
            <Sparkles className="size-4" /> Espace créateur
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Mettre en ligne une vidéo</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Partagez votre vidéo avec la communauté Goontube. Préparez les détails, choisissez qui peut la regarder, puis publiez.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-edge/70 bg-panel/70 px-3 py-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 text-glow" />
          Compression directement sur votre appareil
        </div>
      </div>

      {!file ? (
        <section className="overflow-hidden rounded-3xl border border-edge/70 bg-panel/60 shadow-xl shadow-black/5">
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setIsDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              void pick(event.dataTransfer.files?.[0]);
            }}
            className={`m-3 flex min-h-[320px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-12 text-center transition sm:m-5 sm:min-h-[370px] ${isDragging ? "border-glow bg-glow/10" : "border-edge bg-background/35 hover:border-glow/60 hover:bg-glow/[0.03]"}`}
          >
            <div className="mb-5 flex size-20 items-center justify-center rounded-3xl bg-glow/10 text-glow ring-1 ring-glow/20">
              <UploadCloud className="size-10" />
            </div>
            <h2 className="text-xl font-semibold sm:text-2xl">Déposez votre vidéo ici</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Faites glisser un fichier depuis votre appareil ou choisissez-le pour commencer la publication.
            </p>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                inputRef.current?.click();
              }}
              className="mt-6 rounded-full bg-glow px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-glow/15 transition hover:brightness-110"
            >
              Choisir une vidéo
            </button>
            <p className="mt-4 text-xs text-muted-foreground">MP4, WebM, MOV ou OGG · Fichier source jusqu’à 500 Mo</p>
            <input
              ref={inputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/ogg,.mp4,.webm,.mov,.ogg"
              className="hidden"
              onChange={(event) => void pick(event.target.files?.[0])}
            />
          </div>
          <div className="grid gap-3 border-t border-edge/60 bg-background/25 p-4 sm:grid-cols-3 sm:p-5">
            <div className="flex gap-3 rounded-xl p-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-glow/10 text-glow"><FileVideo className="size-5" /></div>
              <div><p className="text-sm font-medium">Aperçu automatique</p><p className="mt-1 text-xs leading-5 text-muted-foreground">La vidéo et sa miniature sont préparées dès la sélection.</p></div>
            </div>
            <div className="flex gap-3 rounded-xl p-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-glow/10 text-glow"><Sparkles className="size-5" /></div>
              <div><p className="text-sm font-medium">Compression intégrée</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Les vidéos trop volumineuses sont réduites avant l’envoi.</p></div>
            </div>
            <div className="flex gap-3 rounded-xl p-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-glow/10 text-glow"><ShieldCheck className="size-5" /></div>
              <div><p className="text-sm font-medium">Vous gardez le contrôle</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Titre, catégorie, miniature et visibilité restent modifiables avant publication.</p></div>
            </div>
          </div>
        </section>
      ) : (
        <form onSubmit={publish} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_350px]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-edge/70 bg-panel/60 p-5 shadow-lg shadow-black/5 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Détails de la vidéo</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Aidez les spectateurs à comprendre ce qu’ils vont regarder.</p>
                </div>
                <span className="rounded-full bg-background/70 px-3 py-1 text-xs text-muted-foreground">Étape 1 sur 2</span>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="title">Titre <span className="text-destructive">*</span></Label>
                  <Input id="title" required maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} disabled={isBusy} placeholder="Donnez un titre à votre vidéo" className="h-11 bg-background/60" />
                  <div className="flex justify-end text-xs text-muted-foreground">{title.length}/100</div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desc">Description</Label>
                  <Textarea id="desc" rows={6} maxLength={5000} value={description} onChange={(event) => setDescription(event.target.value)} disabled={isBusy} placeholder="De quoi parle cette vidéo ? Ajoutez des détails utiles aux spectateurs…" className="resize-y bg-background/60" />
                  <div className="text-right text-xs text-muted-foreground">{description.length}/5000</div>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cat">Catégorie <span className="text-destructive">*</span></Label>
                    <select id="cat" required value={categoryId} onChange={(event) => setCategoryId(event.target.value)} disabled={isBusy || categoriesLoading || categoriesError} className="h-11 w-full rounded-lg border border-input bg-background/60 px-3 text-sm outline-none transition focus:border-glow focus:ring-2 focus:ring-glow/20 disabled:opacity-60">
                      <option value="">{categoriesLoading ? "Chargement des catégories…" : categoriesError ? "Catégories indisponibles" : "Choisir une catégorie…"}</option>
                      {categories?.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                    </select>
                    {categoriesError && <p className="text-xs text-destructive">Impossible de charger les catégories. Rechargez la page avant de publier.</p>}
                    {categoryName && <p className="text-xs text-muted-foreground">Votre vidéo sera classée dans « {categoryName} ».</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vis">Visibilité</Label>
                    <select id="vis" value={visibility} onChange={(event) => setVisibility(event.target.value as typeof visibility)} disabled={isBusy} className="h-11 w-full rounded-lg border border-input bg-background/60 px-3 text-sm outline-none transition focus:border-glow focus:ring-2 focus:ring-glow/20 disabled:opacity-60">
                      <option value="public">Publique — tout le monde</option>
                      <option value="unlisted">Non répertoriée — avec le lien</option>
                      <option value="private">Privée — vous uniquement</option>
                    </select>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {visibility === "public" ? <Globe2 className="size-3.5" /> : visibility === "unlisted" ? <Link2 className="size-3.5" /> : <LockKeyhole className="size-3.5" />}
                      {visibility === "public" ? "Votre vidéo pourra apparaître dans les résultats et le fil." : visibility === "unlisted" ? "La vidéo n’apparaît pas dans le fil public." : "La vidéo n’est visible que par vous."}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-edge/70 bg-panel/60 p-5 shadow-lg shadow-black/5 sm:p-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Miniature</h2>
                <p className="mt-1 text-sm text-muted-foreground">Choisissez l’image qui représentera votre vidéo.</p>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="aspect-video w-full overflow-hidden rounded-xl border border-edge/70 bg-background/70 sm:w-56">
                  {preview ? <img src={preview} alt="Aperçu de la miniature" className="size-full object-cover" /> : <div className="flex size-full items-center justify-center text-muted-foreground"><ImagePlus className="size-8" /></div>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{thumb ? thumb.name : probe?.frame ? "Miniature générée automatiquement" : "Aucune miniature disponible"}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Une image est extraite automatiquement lorsque c’est possible. Vous pouvez la remplacer par votre propre image.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <label className={`inline-flex cursor-pointer items-center gap-2 rounded-full border border-edge px-4 py-2 text-sm font-medium transition hover:bg-background/70 ${isBusy ? "pointer-events-none opacity-50" : ""}`}>
                      <ImagePlus className="size-4" /> Importer une image
                      <input type="file" accept="image/*" className="hidden" disabled={isBusy} onChange={(event) => setThumb(event.target.files?.[0] ?? null)} />
                    </label>
                    {thumb && <button type="button" disabled={isBusy} onClick={() => setThumb(null)} className="rounded-full px-3 py-2 text-sm text-muted-foreground hover:bg-background/70 hover:text-foreground">Utiliser l’image automatique</button>}
                  </div>
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6">
            <section className="overflow-hidden rounded-2xl border border-edge/70 bg-panel/60 shadow-lg shadow-black/5">
              <div className="border-b border-edge/60 px-4 py-3">
                <h2 className="text-sm font-semibold">Aperçu de la vidéo</h2>
              </div>
              <div className="bg-black">
                {videoPreview ? <video src={videoPreview} controls playsInline preload="metadata" className="aspect-video w-full object-contain" /> : <div className="flex aspect-video items-center justify-center text-white/60"><FileVideo className="size-10" /></div>}
              </div>
              <div className="space-y-2 p-4">
                <p className="break-words text-sm font-semibold">{title || file.name}</p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <span>{formatDuration(probe?.duration ?? 0)}</span><span>·</span><span>{formatFileSize(file.size)}</span>
                </div>
                {categoryName && <span className="inline-flex rounded-full bg-glow/10 px-2.5 py-1 text-xs text-glow">{categoryName}</span>}
              </div>
            </section>

            <section className="rounded-2xl border border-edge/70 bg-panel/60 p-4">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-glow/10 text-glow"><ShieldCheck className="size-5" /></div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Limite de stockage : 50 Mo</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Si la vidéo dépasse environ 46 Mo, elle est compressée automatiquement avec une marge de sécurité. La compression se fait sur votre appareil avant l’envoi.</p>
                </div>
              </div>
            </section>

            {compression && (
              <section role="status" aria-live="polite" className="rounded-2xl border border-glow/30 bg-glow/[0.06] p-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="size-4 shrink-0 animate-spin text-glow" />
                  <h3 className="text-sm font-semibold">{compression.phase === "loading" ? "Préparation de la compression" : "Compression de la vidéo"}</h3>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {compression.phase === "loading"
                    ? "Chargement du moteur de compression dans votre navigateur…"
                    : `Réduction de la taille du fichier — essai ${compression.attempt} sur ${compression.attempts}.`}
                </p>
                {compression.phase === "encoding" ? (
                  <div className="mt-3 space-y-2">
                    <Progress value={compressionPercent} className="h-2.5 bg-glow/15" />
                    <div className="flex justify-between text-xs text-muted-foreground"><span>Progression de cet essai</span><span className="font-semibold text-foreground">{compressionPercent} %</span></div>
                  </div>
                ) : (
                  <div className="mt-3"><Progress value={undefined} className="h-2.5 animate-pulse bg-glow/15" /></div>
                )}
                <div className="mt-4 rounded-xl bg-background/60 p-3">
                  <p className="text-sm font-semibold">Pas de panique si ça dure longtemps !</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Les vidéos longues peuvent prendre plusieurs minutes. Gardez cette page ouverte : l’envoi commencera automatiquement lorsque le fichier sera prêt.</p>
                </div>
              </section>
            )}

            {step && !compression && (
              <section role="status" aria-live="polite" className="flex items-start gap-3 rounded-2xl border border-edge/70 bg-panel/60 p-4">
                <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-glow" />
                <div><p className="text-sm font-semibold">{step}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Ne fermez pas cette page pendant le transfert et la publication.</p></div>
              </section>
            )}

            <div className="space-y-3 rounded-2xl border border-edge/70 bg-panel/60 p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="size-4 text-glow" /> Vérifiez les détails avant de publier.</div>
              <button type="submit" disabled={isBusy || !me?.channel || !categoryId || categoriesLoading || categoriesError} className="flex w-full items-center justify-center gap-2 rounded-full bg-glow px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-glow/15 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55">
                {isBusy ? <><Loader2 className="size-4 animate-spin" /> {step}</> : <><UploadCloud className="size-4" /> Publier la vidéo</>}
              </button>
              <button type="button" disabled={isBusy} onClick={resetFile} className="flex w-full items-center justify-center gap-2 rounded-full border border-edge px-5 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-background/70 hover:text-foreground disabled:opacity-50">
                <X className="size-4" /> Changer de vidéo
              </button>
              {!me?.channel && <p className="text-center text-xs text-destructive">Créez une chaîne avant de publier une vidéo.</p>}
            </div>
          </aside>
        </form>
      )}
    </main>
  );
}
