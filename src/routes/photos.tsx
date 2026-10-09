import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Image, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { uploadMedia, useMediaUrl } from "@/lib/media";
import { Input } from "@/components/ui/input";
import { APP_NAME } from "@/lib/config";

export const Route = createFileRoute("/photos")({
  head: () => ({ meta: [{ title: `Photos et GIFs — ${APP_NAME}` }] }),
  component: PhotosPage,
});

type Media = { id: string; channel_id: string; media_type: "photo" | "gif"; title: string; url: string; created_at: string; channel?: { handle: string; name: string; user_id: string } | null };

function MediaCard({ item, canDelete, onDelete }: { item: Media; canDelete: boolean; onDelete: (id: string) => void }) {
  const url = useMediaUrl("thumbnails", item.url);
  return <article className="overflow-hidden rounded-2xl bg-panel ring-1 ring-edge/40">
    <div className="aspect-square bg-frost">{url && <img src={url} alt={item.title || "Publication"} className="size-full object-cover" />}</div>
    <div className="p-4">
      <div className="flex items-center justify-between gap-2"><h2 className="truncate font-semibold">{item.title || "Sans titre"}</h2>{canDelete && <button onClick={() => onDelete(item.id)} aria-label="Supprimer"><Trash2 className="size-4 text-faint hover:text-red-400" /></button>}</div>
      <p className="mt-1 text-xs text-faint">{item.media_type === "gif" ? "GIF" : "Photo"} · <Link to="/c/$handle" params={{ handle: item.channel?.handle ?? "" }} className="hover:text-glow">{item.channel?.name ?? "Chaîne"}</Link></p>
      
    </div>
  </article>;
}

function PhotosPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<"photo" | "gif">("photo");
  const [busy, setBusy] = useState(false);

  const { data: media, isLoading } = useQuery({
    queryKey: ["channel-media-all"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("channel_media").select("*,channel:channels!inner(handle,name,user_id)").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as Media[];
    },
  });

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !file) return;
    const me = await (supabase as any).from("channels").select("id").eq("user_id", user.id).maybeSingle();
    if (me.error || !me.data) { toast.error("Créez d'abord votre chaîne."); return; }
    if (!file.type.startsWith("image/")) { toast.error("Choisissez une image ou un GIF."); return; }
    if (file.size > 25 * 1024 * 1024) { toast.error("25 Mo maximum."); return; }
    setBusy(true);
    try {
      const path = await uploadMedia("thumbnails", user.id, file, file.name.split(".").pop()?.toLowerCase() || "jpg");
      const { error } = await (supabase as any).from("channel_media").insert({ channel_id: me.data.id, media_type: type, title: title.trim(), url: path });
      if (error) throw error;
      setFile(null); setTitle("");
      qc.invalidateQueries({ queryKey: ["channel-media-all"] });
      toast.success("Publication ajoutée !");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Impossible de publier"); } finally { setBusy(false); }
  }

  async function remove(id: string) {
    const { error } = await (supabase as any).from("channel_media").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["channel-media-all"] });
  }

  return <div className="mx-auto max-w-6xl space-y-6">
    <header className="rounded-3xl bg-panel p-6 ring-1 ring-edge/50 sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-wider text-glow">Média de la communauté</p>
      <h1 className="mt-1 text-3xl font-black">Photos et GIFs</h1>
      <p className="mt-2 text-sm text-muted-foreground">Publiez des photos et des GIFs depuis votre chaîne et retrouvez-les ici.</p>
      {user && <form onSubmit={publish} className="mt-6 grid gap-3 rounded-2xl bg-frost/60 p-4 md:grid-cols-[auto_1fr_1fr_auto]">
        <select value={type} onChange={(e) => setType(e.target.value as "photo" | "gif")} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"><option value="photo">Photo</option><option value="gif">GIF</option></select>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre" maxLength={120} />
        
        <label className="cursor-pointer rounded-full bg-foreground px-4 py-2 text-center text-sm font-semibold text-background">{file ? file.name : "Choisir"}<input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
        <button disabled={busy || !file} className="rounded-full bg-glow px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 md:col-span-4">{busy ? "Publication…" : "Publier"}</button>
      </form>}
    </header>
    {isLoading ? <p className="text-center text-muted-foreground">Chargement…</p> : (media ?? []).length === 0 ? <div className="rounded-2xl bg-panel p-12 text-center text-muted-foreground">Aucune photo ou GIF pour le moment.</div> :
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{(media ?? []).map((item) => <MediaCard key={item.id} item={item} canDelete={item.channel?.user_id === user?.id} onDelete={remove} />)}</div>}
  </div>;
}
