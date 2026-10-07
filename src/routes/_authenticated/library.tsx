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
  head: () => ({ meta: [{ title: `Bibliothèque — ${APP_NAME}` }] }),
  component: LibraryPage,
});

function LibraryPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const { data: playlists, error } = useQuery({
    queryKey: ["playlists", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("playlists")
        .select("id,name,description,is_public,created_at,updated_at")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: playlistVideos, isLoading: videosLoading } = useQuery({
    queryKey: ["playlist-videos", selected],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("playlist_items")
        .select(`position, video:videos!inner(${VIDEO_SELECT})`)
        .eq("playlist_id", selected!)
        .order("position", { ascending: true })
        .order("added_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => r.video) as unknown as VideoCardData[];
    },
  });

  const createPlaylist = useMutation({
    mutationFn: async () => {
      const clean = name.trim();
      if (!clean) throw new Error("Donnez un nom à la playlist.");
      const { data, error } = await supabase
        .from("playlists")
        .insert({ user_id: user!.id, name: clean })
        .select("id")
        .single();
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
      const { error } = await (supabase as any).from("playlists").delete().eq("id", id).eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["playlists", user?.id] });
    },
  });

  const selectedPlaylist = playlists?.find((p) => p.id === selected);

  return (
    <>
      {error && (
        <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          Impossible de charger les playlists : {error instanceof Error ? error.message : "erreur Supabase"}.
        </div>
      )}

      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Bibliothèque</h1>
          <p className="mt-1 text-sm text-muted-foreground">Créez et organisez vos playlists.</p>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); createPlaylist.mutate(); }}
          className="flex gap-2"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom de la playlist"
            className="h-10 w-52 rounded-xl bg-panel px-3 text-sm ring-1 ring-edge/50 outline-none focus:ring-glow/60"
          />
          <button
            disabled={createPlaylist.isPending}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-glow px-4 text-sm font-semibold text-background disabled:opacity-50"
          >
            <FolderPlus className="size-4" /> Créer une playlist
          </button>
        </form>
      </div>

      {(playlists ?? []).length > 0 ? (
        <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(playlists ?? []).map((playlist) => (
            <div key={playlist.id} className="rounded-2xl bg-panel/70 p-4 ring-1 ring-edge/40">
              <button onClick={() => setSelected(playlist.id)} className="w-full text-left">
                <div className="mb-3 grid size-11 place-items-center rounded-xl bg-frost">
                  <ListVideo className="size-5" />
                </div>
                <p className="font-semibold">{playlist.name}</p>
                <p className="mt-1 text-sm text-faint">{playlist.is_public ? "Publique" : "Privée"}</p>
              </button>
              <button onClick={() => deletePlaylist.mutate(playlist.id)} className="mt-3 text-xs text-faint hover:text-red-400">
                <Trash2 className="mr-1 inline size-3" /> Supprimer
              </button>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="Aucune playlist" text="Créez votre première playlist avec le bouton « Créer une playlist »." />
      )}

      {selectedPlaylist && (
        <section className="mt-10">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">{selectedPlaylist.name}</h2>
              <p className="text-sm text-faint">{playlistVideos?.length ?? 0} vidéo{(playlistVideos?.length ?? 0) > 1 ? "s" : ""}</p>
            </div>
            <button onClick={() => setSelected(null)} className="rounded-full bg-panel px-4 py-2 text-sm ring-1 ring-edge/40 hover:bg-frost">
              Retour
            </button>
          </div>
          <VideoGrid
            videos={playlistVideos}
            loading={videosLoading}
            empty={<EmptyState title="Playlist vide" text="Ajoutez des vidéos à cette playlist depuis leur page de lecture." />}
          />
        </section>
      )}
    </>
  );
}
