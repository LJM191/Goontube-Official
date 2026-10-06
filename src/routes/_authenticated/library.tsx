import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FolderPlus, ListVideo, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { VIDEO_SELECT, type VideoCardData } from "@/lib/videos";
import { VideoGrid } from "@/components/stream/VideoCard";
import { EmptyState } from "@/components/stream/EmptyState";
import { APP_NAME } from "@/lib/config";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({
    meta: [
      { title: `Bibliothèque — ${APP_NAME}` },
      { name: "description", content: "Vos vidéos aimées, gems et playlists." },
      { property: "og:title", content: `Bibliothèque — ${APP_NAME}` },
      { property: "og:description", content: "Vos vidéos aimées, gems et playlists." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const { data: playlists, error: playlistsError } = useQuery({
    queryKey: ["playlists", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("playlists").select("id,name,description,is_public,created_at,updated_at").eq("user_id", user!.id).order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: playlistVideos, error: playlistVideosError } = useQuery({
    queryKey: ["playlist-videos", selected],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await supabase.from("playlist_items").select(`position, video:videos!inner(${VIDEO_SELECT})`).eq("playlist_id", selected!).order("position", { ascending: true }).order("added_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => r.video) as unknown as VideoCardData[];
    },
  });

  const createPlaylist = useMutation({
    mutationFn: async () => {
      const clean = name.trim();
      if (!clean) throw new Error("Donnez un nom à la playlist.");
      const { data, error } = await supabase.from("playlists").insert({ user_id: user!.id, name: clean }).select("id").single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (id) => {
      setName("");
      setSelected(id);
      qc.invalidateQueries({ queryKey: ["playlists", user?.id] });
    },
  });

  const deletePlaylist = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("playlists").delete().eq("id", id).eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["playlists", user?.id] });
    },
  });

  const selectedPlaylist = playlists?.find((p) => p.id === selected);
  const libraryError = playlistsError || playlistVideosError;

  return (
    <>
      {libraryError && (
        <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm">
          <p className="font-semibold text-red-300">La bibliothèque n’a pas pu charger ses données.</p>
          <p className="mt-1 text-red-200/70">{libraryError instanceof Error ? libraryError.message : "Vérifiez que les migrations Supabase sont bien déployées."}</p>
        </div>
      )}
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Bibliothèque</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tout ce que vous avez enregistré sur Goontube.</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); createPlaylist.mutate(); }} className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom de la playlist" className="h-10 w-48 rounded-xl bg-panel px-3 text-sm ring-1 ring-edge/50 outline-none focus:ring-glow/60" />
          <button disabled={createPlaylist.isPending} className="inline-flex h-10 items-center gap-2 rounded-xl bg-glow px-4 text-sm font-semibold text-background disabled:opacity-50">
            <FolderPlus className="size-4" /> Créer
          </button>
        </form>
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <button onClick={() => setSelected(null)} className="rounded-2xl bg-panel/70 p-4 text-left ring-1 ring-edge/40 hover:bg-frost">
          <div className="mb-3 grid size-11 place-items-center rounded-xl bg-glow/15 text-glow"><Gem className="size-5" /></div>
          <p className="font-semibold">Gems</p>
          <p className="mt-1 text-sm text-faint">{gems?.length ?? 0} vidéo{(gems?.length ?? 0) > 1 ? "s" : ""}</p>
        </button>
        {(playlists ?? []).map((playlist) => (
          <div key={playlist.id} className="rounded-2xl bg-panel/70 p-4 ring-1 ring-edge/40">
            <button onClick={() => setSelected(playlist.id)} className="w-full text-left">
              <div className="mb-3 grid size-11 place-items-center rounded-xl bg-frost"><ListVideo className="size-5" /></div>
              <p className="font-semibold">{playlist.name}</p>
              <p className="mt-1 text-sm text-faint">{playlist.is_public ? "Publique" : "Privée"}</p>
            </button>
            <button onClick={() => deletePlaylist.mutate(playlist.id)} className="mt-3 text-xs text-faint hover:text-red-400">
              <Trash2 className="mr-1 inline size-3" /> Supprimer
            </button>
          </div>
        ))}
      </div>

      {selectedPlaylist ? (
        <>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div><h2 className="text-xl font-semibold">{selectedPlaylist.name}</h2><p className="text-sm text-faint">{playlistVideos?.length ?? 0} vidéo{(playlistVideos?.length ?? 0) > 1 ? "s" : ""}</p></div>
            <button onClick={() => setSelected(null)} className="rounded-full bg-panel px-4 py-2 text-sm ring-1 ring-edge/40 hover:bg-frost">Retour</button>
          </div>
          <VideoGrid videos={playlistVideos} empty={<EmptyState title="Playlist vide" text="Ajoutez des vidéos à cette playlist depuis leur page de lecture." />} />
        </>
      ) : (
        <>
          <section className="mb-10">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold"><Gem className="size-5 text-glow" /> Gems</h2>
            <VideoGrid videos={gems} loading={gemsLoading} empty={<EmptyState title="Aucun gem" text="Utilisez le bouton Gem sur une vidéo pour la garder dans votre bibliothèque." />} />
          </section>
          <section>
            <h2 className="mb-4 text-xl font-semibold">J'aime</h2>
            <VideoGrid videos={liked} loading={likedLoading} empty={<EmptyState title="Aucune vidéo aimée" text="Les vidéos que vous aimez apparaîtront ici." />} />
          </section>
        </>
      )}
    </>
  );
}
