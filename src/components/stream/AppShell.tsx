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
  ChevronDown,
  X,
} from "lucide-react";
import goontubeLogo from "@/assets/goontube-logo.png";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/config";
import { useAuth, useMe } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ChannelAvatar } from "./ChannelAvatar";
import { SiteFooter } from "./SiteFooter";
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
    <div className="relative w-full max-w-2xl">
      <form onSubmit={(e) => { e.preventDefault(); submit(); }}
        className="flex h-12 items-center gap-3 rounded-full bg-panel/90 px-5 ring-1 ring-edge/50 shadow-sm focus-within:ring-glow/60"
      >
        <Search className="size-5 shrink-0 text-faint" />
        <input
          value={q}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          placeholder="Rechercher une vidéo ou une chaîne"
          aria-label="Rechercher"
          className="w-full bg-transparent text-base outline-none placeholder:text-faint"
        />
        {q && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { setQ(""); setOpen(false); }}
            aria-label="Effacer la recherche"
            className="grid size-7 shrink-0 place-items-center rounded-full text-faint hover:bg-frost hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </form>

      {open && (term.length >= 2 || recent.length > 0) && (
        <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-50 overflow-hidden rounded-2xl bg-panel/98 p-2 shadow-2xl ring-1 ring-edge/60 backdrop-blur-xl">
          {term.length < 2 && recent.length > 0 && (
            <div>
              <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-faint">Recherches récentes</p>
              {recent.map((item) => (
                <div key={item} className="flex items-center rounded-xl hover:bg-frost">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => submit(item)}
                    className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left"
                  >
                    <Clock className="size-4 shrink-0 text-faint" /><span className="truncate">{item}</span>
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      const next = recent.filter((search) => search !== item);
                      setRecent(next);
                      localStorage.setItem("goontube-recent-searches", JSON.stringify(next));
                    }}
                    aria-label={`Supprimer la recherche « ${item} »`}
                    className="mr-2 grid size-7 shrink-0 place-items-center rounded-full text-faint hover:bg-panel hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {term.length >= 2 && isFetching && <p className="px-3 py-4 text-sm text-muted-foreground">Recherche…</p>}
          {term.length >= 2 && !isFetching && suggestions && (
            <div>
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
            </div>
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

function OrientationIcon({ type }: { type: string }) {
  if (type === "Hétéro") return <span aria-hidden="true" className="text-lg leading-none">⚥</span>;
  if (type === "Bi") return <span aria-hidden="true" className="text-lg leading-none">⚤</span>;
  if (type === "Gay") return <span aria-hidden="true" className="text-lg leading-none">⚣ ❤️</span>;
  if (type === "S'identifie comme un cheval") return <span aria-hidden="true" className="text-lg leading-none">🐴</span>;
  if (type === "S'identifie comme un chien") return <span aria-hidden="true" className="text-lg leading-none">🐶</span>;
  if (type === "S'identifie comme un chat") return <span aria-hidden="true" className="text-lg leading-none">🐱</span>;
  if (type === "Pansexuel") {
    return (
      <span aria-hidden="true" className="flex w-5 flex-col gap-px overflow-hidden rounded-sm">
        <span className="h-1 bg-pink-500" />
        <span className="h-1 bg-yellow-300" />
        <span className="h-1 bg-cyan-400" />
      </span>
    );
  }
  return <span aria-hidden="true" className="text-lg leading-none">🐧</span>;
}

const ORIENTATION_OPTIONS = [
  { label: "Hétéro", slug: "orientation-hetero" },
  { label: "Bi", slug: "orientation-bi" },
  { label: "Gay", slug: "orientation-gay" },
  { label: "S'identifie comme un cheval", slug: "orientation-cheval" },
  { label: "S'identifie comme un pingouin", slug: "orientation-pingouin" },
  { label: "S'identifie comme un chien", slug: "orientation-chien" },
  { label: "S'identifie comme un chat", slug: "orientation-chat" },
  { label: "Pansexuel", slug: "orientation-pansexuel" },
] as const;

function OrientationMenu() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("Hétéro");

  useEffect(() => {
    const saved = localStorage.getItem("goontube-orientation");
    if (saved && ORIENTATION_OPTIONS.some((option) => option.label === saved)) setSelected(saved);
  }, []);

  const choose = (option: (typeof ORIENTATION_OPTIONS)[number]) => {
    setSelected(option.label);
    localStorage.setItem("goontube-orientation", option.label);
    setOpen(false);
    window.location.href = `/explore?category=${encodeURIComponent(option.slug)}`;
  };

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={`Catégorie ${selected}`}
        title={selected}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-panel/70 hover:text-foreground"
      >
        <OrientationIcon type={selected} />
        <span className="flex-1 truncate text-left">{selected}</span>
        <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-xl bg-panel p-1.5 shadow-xl ring-1 ring-edge/60">
          {ORIENTATION_OPTIONS.map((option) => (
            <button
              key={option.slug}
              type="button"
              onClick={() => choose(option)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-muted-foreground hover:bg-frost hover:text-foreground"
            >
              <OrientationIcon type={option.label} />
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const activeClass = (to: string) =>
    to === "/" ? pathname === "/" : pathname.startsWith(to);

  const navClass = (active: boolean) =>
    "relative flex min-w-[145px] items-center justify-center gap-2 px-5 text-base font-extrabold tracking-tight transition-colors " +
    (active ? "text-foreground" : "text-muted-foreground hover:text-foreground");

  const underlineClass = (active: boolean) =>
    "absolute inset-x-2 bottom-0 h-0.5 origin-center transition-all " +
    (active ? "scale-x-100 bg-glow" : "scale-x-0 bg-glow group-hover:scale-x-100");

  return (
    <div className="min-h-screen">
      <header className="glass-bar sticky top-0 z-30 border-b border-edge/60">
        <div className="relative flex min-h-24 items-center gap-3 px-4 sm:gap-8 sm:px-8 lg:px-10">
          <div className="flex shrink-0 items-center lg:w-64"><Logo /></div>
          <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:block">
            <SearchBar />
          </div>
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

        <nav aria-label="Navigation principale" className="relative hidden h-16 items-stretch justify-center gap-1 border-t border-edge/40 px-2 md:flex lg:gap-3 lg:px-8">
          <div className="absolute left-2 top-0 flex h-full w-60 items-center pr-2 lg:left-8">
            <OrientationMenu />
          </div>

          <div className="flex h-full items-stretch justify-center gap-1 lg:gap-3">
            <div className="group relative flex h-full items-stretch">
              <Link to="/" className={navClass(activeClass("/"))}>
                ACCUEIL
                <span className="text-[10px] opacity-80 transition-transform group-hover:rotate-180">▼</span>
                <span className={underlineClass(activeClass("/"))} />
              </Link>
              <div className="invisible absolute left-1/2 top-full z-50 w-56 -translate-x-1/2 translate-y-1 opacity-0 transition-all duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                <div className="mt-2 rounded-xl bg-panel p-2 shadow-2xl ring-1 ring-edge/60">
                  <Link to="/" className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-frost hover:text-foreground">Accueil</Link>
                  <Link to="/explore" className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-frost hover:text-foreground">Explorer</Link>
                  <Link to="/subscriptions" className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-frost hover:text-foreground">Abonnements</Link>
                  <Link to="/library" className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-frost hover:text-foreground">Bibliothèque</Link>
                  <Link to="/history" className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-frost hover:text-foreground">Historique</Link>
                </div>
              </div>
            </div>

            <div className="group relative flex h-full items-stretch">
              <Link to="/search" className={navClass(activeClass("/search"))}>
                VIDÉOS
                <span className="text-[10px] opacity-80 transition-transform group-hover:rotate-180">▼</span>
                <span className={underlineClass(activeClass("/search"))} />
              </Link>
              <div className="invisible absolute left-1/2 top-full z-50 w-56 -translate-x-1/2 translate-y-1 opacity-0 transition-all duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                <div className="mt-2 rounded-xl bg-panel p-2 shadow-2xl ring-1 ring-edge/60">
                  <Link to="/search" className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-frost hover:text-foreground">Toutes les vidéos</Link>
                  <Link to="/search" className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-frost hover:text-foreground">Vidéos récentes</Link>
                  <Link to="/search" className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-frost hover:text-foreground">Vidéos populaires</Link>
                </div>
              </div>
            </div>

            <div className="group relative flex h-full items-stretch">
              <Link to="/explore" className={navClass(activeClass("/explore"))}>
                CATÉGORIES
                <span className="text-[10px] opacity-80 transition-transform group-hover:rotate-180">▼</span>
                <span className={underlineClass(activeClass("/explore"))} />
              </Link>
              <div className="invisible absolute left-1/2 top-full z-50 w-56 -translate-x-1/2 translate-y-1 opacity-0 transition-all duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                <div className="mt-2 rounded-xl bg-panel p-2 shadow-2xl ring-1 ring-edge/60">
                  <Link to="/explore" className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-frost hover:text-foreground">Gaming</Link>
                  <Link to="/explore" className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-frost hover:text-foreground">Musique</Link>
                  <Link to="/explore" className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-frost hover:text-foreground">Sport</Link>
                  <Link to="/explore" className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-frost hover:text-foreground">Technologie</Link>
                </div>
              </div>
            </div>

            <div className="group relative flex h-full items-stretch">
              <Link to="/explore" className={navClass(activeClass("/explore"))}>
                CRÉATEURS
                <span className="text-[10px] opacity-80 transition-transform group-hover:rotate-180">▼</span>
                <span className={underlineClass(activeClass("/explore"))} />
              </Link>
              <div className="invisible absolute left-1/2 top-full z-50 w-56 -translate-x-1/2 translate-y-1 opacity-0 transition-all duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                <div className="mt-2 rounded-xl bg-panel p-2 shadow-2xl ring-1 ring-edge/60">
                  <Link to="/explore" className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-frost hover:text-foreground">Créateurs populaires</Link>
                  <Link to="/explore" className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-frost hover:text-foreground">Nouveaux créateurs</Link>
                </div>
              </div>
            </div>

            <div className="group relative flex h-full items-stretch">
              <Link to="/subscriptions" className={navClass(activeClass("/subscriptions"))}>
                COMMUNAUTÉ
                <span className="text-[10px] opacity-80 transition-transform group-hover:rotate-180">▼</span>
                <span className={underlineClass(activeClass("/subscriptions"))} />
              </Link>
              <div className="invisible absolute left-1/2 top-full z-50 w-56 -translate-x-1/2 translate-y-1 opacity-0 transition-all duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                <div className="mt-2 rounded-xl bg-panel p-2 shadow-2xl ring-1 ring-edge/60">
                  <Link to="/community" className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-frost hover:text-foreground">Découvrir la communauté</Link>
                  <Link to="/community" className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-frost hover:text-foreground">Concours de créateurs</Link>
                  <Link to="/community" className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-frost hover:text-foreground">Flux de la communauté</Link>
                  <Link to="/community" className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-frost hover:text-foreground">Membres populaires</Link>
                  <Link to="/community" className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-frost hover:text-foreground">Créateurs récents</Link>
                  <Link to="/community" className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-frost hover:text-foreground">Créateurs populaires</Link>
                  <Link to="/community" className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-frost hover:text-foreground">Membres en ligne</Link>
                  <Link to="/community" className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-frost hover:text-foreground">Rechercher un membre</Link>
                  <Link to="/community" className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-frost hover:text-foreground">Devenir contributeur</Link>
                </div>
              </div>
            </div>

            <Link to="/photos" className={navClass(activeClass("/photos"))}>
              PHOTOS ET GIFS
              <span className={underlineClass(activeClass("/photos"))} />
            </Link>
          </div>
        </nav>
      </header>

      <div className="flex">
        <main className="mx-auto w-full max-w-[1680px] min-w-0 px-4 pb-24 pt-8 sm:px-8 lg:px-10 lg:pb-12 lg:pt-10">{children}</main>
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
