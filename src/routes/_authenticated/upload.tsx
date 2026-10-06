import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UploadCloud, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia } from "@/lib/media";
import { fetchCategories } from "@/lib/videos";
import { formatDuration } from "@/lib/format";
import { useMe } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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

const MAX_BYTES = 500 * 1024 * 1024;

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

function Upload() {
  const { user } = Route.useRouteContext();
  const { data: me } = useMe();
  const navigate = useNavigate();
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories, staleTime: Infinity });

  const [file, setFile] = useState<File | null>(null);
  const [probe, setProbe] = useState<{ duration: number; frame: Blob | null } | null>(null);
  const [thumb, setThumb] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [tags, setTags] = useState("");
  const [visibility, setVisibility] = useState<"public" | "unlisted" | "private">("public");
  const [step, setStep] = useState<string | null>(null);

  useEffect(() => {
    const blob = thumb ?? probe?.frame;
    if (!blob) return setPreview(null);
    const u = URL.createObjectURL(blob);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [thumb, probe]);

  async function pick(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith("video/")) {
      toast.error("Choisissez un fichier vidéo (MP4, WebM, MOV).");
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error("Fichier trop volumineux (500 Mo max).");
      return;
    }
    setFile(f);
    setTitle((t) => t || f.name.replace(/\.[^.]+$/, ""));
    setProbe(await probeVideo(f));
  }

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !me?.channel) return;
    try {
      setStep("Envoi de la vidéo…");
      const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
      const videoPath = await uploadMedia("videos", user.id, file, ext);
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
          owner_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          video_path: videoPath,
          thumbnail_path: thumbPath,
          duration_seconds: Math.round(probe?.duration ?? 0),
          category_id: categoryId ? Number(categoryId) : null,
          tags: Array.from(new Set(tags.split(/[\s,]+/).map((t) => t.trim().replace(/^#+/, "").toLowerCase()).filter((t) => /^[\p{L}\p{N}_-]+$/u.test(t))).values()).slice(0, 60),
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
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 text-2xl font-semibold">Mettre en ligne une vidéo</h1>

      {!file ? (
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-edge bg-panel/50 px-6 py-20 text-center transition-colors hover:border-glow/60">
          <UploadCloud className="mb-4 size-10 text-glow" />
          <span className="font-medium">Glissez ou choisissez un fichier vidéo</span>
          <span className="mt-1 text-sm text-faint">MP4, WebM ou MOV — 500 Mo max</span>
          <input type="file" accept="video/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        </label>
      ) : (
        <form onSubmit={publish} className="grid gap-6 md:grid-cols-[1fr_300px]">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Titre</Label>
              <Input id="title" required maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="desc">Description</Label>
              <Textarea id="desc" rows={6} maxLength={5000} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cat">Catégorie</Label>
                <select
                  id="cat"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">Aucune</option>
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vis">Visibilité</Label>
                <select
                  id="vis"
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as typeof visibility)}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="public">Publique</option>
                  <option value="unlisted">Non répertoriée</option>
                  <option value="private">Privée</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tags">Tags (séparés par des virgules)</Label>
              <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl bg-panel ring-1 ring-edge/40">
              <div className="aspect-video bg-frost">
                {preview && <img src={preview} alt="Miniature" className="size-full object-cover" />}
              </div>
              <div className="p-3 text-sm">
                <p className="truncate font-medium">{file.name}</p>
                <p className="text-faint">{formatDuration(probe?.duration ?? 0)} · {(file.size / 1024 / 1024).toFixed(1)} Mo</p>
              </div>
            </div>
            <label className="block cursor-pointer rounded-full bg-panel/80 px-4 py-2 text-center text-sm ring-1 ring-edge/40 hover:bg-frost">
              Changer la miniature
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setThumb(e.target.files?.[0] ?? null)} />
            </label>
            <button
              disabled={!!step || !me?.channel}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-glow py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-glow/90 disabled:opacity-60"
            >
              {step ? <><Loader2 className="size-4 animate-spin" /> {step}</> : "Publier"}
            </button>
            {!step && (
              <button type="button" onClick={() => { setFile(null); setProbe(null); setThumb(null); }} className="w-full text-sm text-muted-foreground hover:text-foreground">
                Choisir un autre fichier
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
