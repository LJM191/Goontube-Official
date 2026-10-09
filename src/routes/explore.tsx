import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchFeed, fetchCategories } from "@/lib/videos";
import { VideoGrid } from "@/components/stream/VideoCard";
import { EmptyState } from "@/components/stream/EmptyState";
import { APP_NAME } from "@/lib/config";

export const Route = createFileRoute("/explore")({
  validateSearch: (search: Record<string, unknown>): { category?: string } => ({ ...(typeof search["category"] === "string" ? { category: search["category"] } : {}) }),
  head: () => ({
    meta: [
      { title: `Explorer — ${APP_NAME}` },
      { name: "description", content: "Les vidéos les plus regardées du moment." },
      { property: "og:title", content: `Explorer — ${APP_NAME}` },
      { property: "og:description", content: "Les vidéos les plus regardées du moment." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Explore,
});

function Explore() {
  const search = Route.useSearch();
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories, staleTime: Infinity });
  const selectedCategory = categories?.find((category) => category.slug === search.category);
  const { data, isLoading } = useQuery({
    queryKey: ["feed", "popular", selectedCategory?.id ?? null],
    queryFn: () => fetchFeed({ order: "popular", categoryId: selectedCategory?.id ?? null }),
  });
  return (
    <>
      <h1 className="mb-1 text-2xl font-semibold">{selectedCategory?.name ?? "Explorer"}</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {selectedCategory ? `Vidéos de la catégorie « ${selectedCategory.name} ».` : "Les vidéos les plus regardées."}
      </p>
      <VideoGrid videos={data} loading={isLoading} empty={<EmptyState title="Rien à explorer dans cette catégorie pour l'instant" />} />
    </>
  );
}
