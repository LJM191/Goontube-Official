import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Clock,
  Compass,
  Home,
  Library,
  LogOut,
  Plus,
  Search,
  Tv,
  User as UserIcon,
} from "lucide-react";
import goontubeLogo from "@/assets/goontube-logo.png";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/config";
import { useAuth, useMe } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ChannelAvatar } from "./ChannelAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV = [
  { to: "/", label: "Accueil", icon: Home },
  { to: "/explore", label: "Explorer", icon: Compass },
  { to: "/subscriptions", label: "Abonnements", icon: Tv },
  { to: "/library", label: "Bibliothèque", icon: Library },
  { to: "/history", label: "Historique", icon: Clock },
] as const;

export function Logo() {
  return (
    <Link to="/" aria-label={`${APP_NAME} — Accueil`} className="flex shrink-0 items-center">
      <img src={goontubeLogo} alt={APP_NAME} width={1445} height={236} className="h-auto w-36 sm:w-48 lg:w-52" />
    </Link>
  );
}

function SearchBar() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    try {
      setRecent(JSON.parse(localStorage.getItem("goontube-recent-searches") ?? "[]"));
    } catch {}
  }, []);

  const term = q.trim();
  const { data: suggestions, isFetching } = useQuery({
    queryKey: ["search-suggestions", term],
    enabled: term.length >= 2,
    staleTime: 15_000,
    queryFn: async () => {
      const [videos, channels] = await Promise.all([
        supabase
          .from("videos")
          .select("id,title,thumbnail_path,view_count,channel:channels!inner(handle,name,avatar_path)")
          .eq("visibility", "public")
          .or("title.ilike.%" + term + "%,description.ilike.%" + term + "%")
          .order("view_count", { ascending: false })
          .limit(5),
        supabase
          .from("channels")
          .select("id,handle,name,avatar_path,subscriber_count,verified")
          .or("name.ilike.%" + term + "%,handle.ilike.%" + term + "%")
          .order("subscriber_count", { ascending: false })
          .limit(4),
      ]);
      if (videos.error) throw videos.error;
      if (channels.error) throw channels.error;
      return { videos: videos.data ?? [], channels: channels.data ?? [] };
    },
  });

  const saveSearch = (value: string) => {
    const clean = value.trim();
    if (!clean) return;
    const next = [clean, ...recent.filter((x) => x.toLowerCase() !== clean.toLowerCase())].slice(0, 6);
    setRecent(next);
    localStorage.setItem("goontube-recent-searches", JSON.stringify(next));
  };

  const submit = (value = q) => {
    const clean = value.trim();
    if (!clean) return;
    saveSearch(clean);
    setOpen(false);
    navigate({ to: "/search", search: { q: clean } });
  };

  return (
    <div className="relative min-w-0 max-w-4xl flex-1">
      <form onSubmit={(e) => { e.preventDefault(); submit(); }}
        className="flex h-12 items-center gap-3 rounded-full bg-panel/90 px-5 ring-1 ring-edge/50 shadow-sm focus-within:ring-glow/60"
      >
        <Search className="size-5 shrink-0 text-faint" />
        <input
          value={q}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          placeholder="Rechercher une vidéo ou une chaîne"
          aria-label="Rechercher"
          className="w-full bg-transparent text-base outline-none placeholder:text-faint"
        />
        {q && <button type="button" onClick={() => setQ("")} className="text-sm text-faint hover:text-foreground">Effacer</button>}
      </form>

      {open && (term.length >= 2 || recent.length > 0) && (
        <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-50 overflow-hidden rounded-2xl bg-panel/98 p-2 shadow-2xl ring-1 ring-edge/60 backdrop-blur-xl">
          {term.length < 2 && recent.length > 0 && (
            <>
              <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-faint">Recherches récentes</p>
              {recent.map((item) => (
                <button key={item} onClick={() => submit(item)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-frost">
                  <Clock className="size-4 text-faint" /><span>{item}</span>
                </button>
              ))}
            </>
          )}
          {term.length >= 2 && isFetching && <p className="px-3 py-4 text-sm text-muted-foreground">Recherche…</p>}
          {term.length >= 2 && !isFetching && suggestions && (
            <>
              {suggestions.channels.length > 0 && (
                <div className="border-b border-edge/40 pb-2">
                  <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-faint">Chaînes</p>
                  {suggestions.channels.map((channel) => (
                    <Link key={channel.id} to="/c/$handle" params={{ handle: channel.handle }} onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-frost">
                      <ChannelAvatar name={channel.name} path={channel.avatar_path} className="size-9" />
                      <div className="min-w-0"><p className="truncate text-sm font-medium">{channel.name}</p><p className="text-xs text-faint">@{channel.handle} · {channel.subscriber_count} abonnés</p></div>
                    </Link>
                  ))}
                </div>
              )}
              {suggestions.videos.length > 0 && (
                <div className="pt-1">
                  <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-faint">Vidéos</p>
                  {suggestions.videos.map((video) => (
                    <Link key={video.id} to="/watch/$id" params={{ id: video.id }} onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-frost">
                      <div className="grid size-16 shrink-0 place-items-center rounded-lg bg-frost text-faint"><Search className="size-5" /></div>
                      <div className="min-w-0"><p className="line-clamp-2 text-sm font-medium">{video.title}</p><p className="text-xs text-faint">{video.channel?.name ?? "Chaîne"} · {video.view_count} vues</p></div>
                    </Link>
                  ))}
                </div>
              )}
              <button onClick={() => submit()} className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-3 text-sm font-medium text-glow hover:bg-frost">
                <Search className="size-4" /> Voir tous les résultats pour « {term} »
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const { user, loading } = useAuth();
  const { data } = useMe();
  const navigate = useNavigate();
  if (loading) return <div className="size-9 rounded-full bg-panel" />;
  if (!user)
    return (
      <Link
        to="/auth"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-edge/60 px-3 py-2 text-xs font-medium transition-colors hover:border-glow/50 hover:bg-panel sm:px-5 sm:text-sm"
      >
        <UserIcon className="size-4" /> Se connecter
      </Link>
    );
  const name = data?.channel?.name ?? data?.profile?.display_name ?? "Moi";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full ring-1 ring-edge/40 outline-none focus-visible:ring-glow">
        <ChannelAvatar name={name} path={data?.channel?.avatar_path} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">{name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {data?.channel && (
          <DropdownMenuItem onClick={() => navigate({ to: "/c/$handle", params: { handle: data.channel?.handle ?? "" } })}>
            <Tv className="size-4" /> Ma chaîne
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => navigate({ to: "/upload" })}>
          <Plus className="size-4" /> Mettre en ligne
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            await supabase.auth.signOut();
            navigate({ to: "/", replace: true });
          }}
        >
          <LogOut className="size-4" /> Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const topNav = [
    { to: "/", label: "ACCUEIL" },
    { to: "/search", label: "VIDÉOS", dropdown: ["Toutes les vidéos", "Vidéos récentes", "Vidéos populaires"] },
    { to: "/explore", label: "CATÉGORIES", dropdown: ["Gaming", "Musique", "Sport", "Technologie"] },
    { to: "/explore", label: "CRÉATEURS", dropdown: ["Créateurs populaires", "Nouveaux créateurs"] },
    { to: "/subscriptions", label: "COMMUNAUTÉ", dropdown: ["Découvrir la communauté", "Concours de créateurs", "Flux de la communauté", "Membres populaires", "Créateurs récents", "Créateurs populaires", "Membres en ligne", "Rechercher un membre", "Devenir contributeur"] },
    { to: "/photos", label: "PHOTOS ET GIFS" },
  ] as const;

  return (
    <div className="min-h-screen">
      <header className="glass-bar sticky top-0 z-30 border-b border-edge/60">
        <div className="flex min-h-20 items-center gap-3 px-3 sm:gap-7 sm:px-6 lg:px-8">
          <div className="flex shrink-0 items-center lg:w-60"><Logo /></div>
          <SearchBar />
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {user && (
              <Button variant="ghost" size="icon" aria-label="Notifications"
                className="relative grid size-9 place-items-center rounded-full bg-panel/80 ring-1 ring-edge/40 transition-colors hover:bg-frost">
                <Bell className="size-4 text-muted-foreground" />
              </Button>
            )}
            <UserMenu />
          </div>
        </div>

        <nav aria-label="Navigation principale" className="hidden h-16 items-stretch justify-center gap-1 border-t border-edge/40 px-2 md:flex lg:gap-3">
          {topNav.map(({ to, label, dropdown }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <div key={label} className="group relative flex h-full items-stretch">
                <Link
                  to={to}
                  className={
                    "relative flex min-w-[145px] items-center justify-center gap-2 px-5 text-base font-extrabold tracking-tight transition-colors " +
                    (active ? "text-foreground" : "text-muted-foreground hover:text-foreground")
                  }
                >
                  {label}
                  {dropdown && <span className="text-[10px] opacity-80 transition-transform group-hover:rotate-180">▼</span>}
                  <span className={
                    "absolute inset-x-2 bottom-0 h-0.5 origin-center transition-all " +
                    (active ? "scale-x-100 bg-glow" : "scale-x-0 bg-glow group-hover:scale-x-100")
                  } />
                </Link>
                {dropdown && (
                  <div className="invisible absolute left-1/2 top-full z-50 w-56 -translate-x-1/2 translate-y-1 opacity-0 transition-all duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                    <div className="mt-2 rounded-xl bg-panel p-2 shadow-2xl ring-1 ring-edge/60">
                      {dropdown.map((item) => (
                        <Link key={item} to={label === "COMMUNAUTÉ" ? "/community" : "/explore"} className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-frost hover:text-foreground">{item}</Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </header>

      <div className="flex">
        <aside className="glass-side sticky top-36 hidden h-[calc(100vh-9rem)] w-60 shrink-0 flex-col gap-1 border-r border-edge/60 p-3 lg:flex">
          <nav className="flex flex-col gap-1">
            {NAV.map(({ to, label, icon: Icon }) => {
              const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
              return (
                <Link key={to} to={to}
                  className={active
                    ? "flex items-center gap-3 rounded-xl bg-panel px-3 py-2.5 text-sm font-medium text-glow ring-1 ring-edge/30"
                    : "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-panel/70"}>
                  <Icon className={active ? "size-4 text-glow" : "size-4"} />{label}
                </Link>
              );
            })}
          </nav>
          {!user && (
            <div className="mt-auto rounded-2xl bg-panel/70 p-4 ring-1 ring-edge/40">
              <p className="text-sm font-medium">Rejoignez {APP_NAME}</p>
              <p className="mt-1 text-xs text-faint">Abonnez-vous, aimez et publiez vos vidéos.</p>
              <Link to="/auth" className="mt-3 inline-block text-sm font-medium text-glow">Se connecter →</Link>
            </div>
          )}
        </aside>

        <main className="min-w-0 flex-1 px-4 pb-24 pt-6 sm:px-6 lg:pb-10">{children}</main>
      </div>

      <nav className="glass-bar fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-edge/60 py-2 lg:hidden">
        {[NAV[0], NAV[1], { to: "/upload", label: "Créer", icon: Plus } as const, NAV[2], NAV[4]].map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return <Link key={to} to={to} className={`flex flex-col items-center gap-0.5 px-2 text-[11px] ${active ? "text-glow" : "text-muted-foreground"}`}><Icon className="size-5" />{label}</Link>;
        })}
      </nav>
    </div>
  );
}
