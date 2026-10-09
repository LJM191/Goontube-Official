import { supabase } from "@/integrations/supabase/client";

export const VIDEO_SELECT =
  "id,title,thumbnail_path:thumbnail_url,duration_seconds,view_count,like_count,dislike_count,comment_count,created_at,published_at,visibility,channel:channels!inner(id,handle,name,avatar_path:avatar_url,subscriber_count)";

export type VideoCardData = {
  id: string;
  title: string;
  thumbnail_path: string | null;
  duration_seconds: number | null;
  view_count: number;
  like_count: number;
  dislike_count: number;
  comment_count: number;
  created_at: string;
  published_at: string;
  visibility: string;
  channel: { id: string; handle: string; name: string; avatar_path: string | null; subscriber_count: number };
};

export async function fetchFeed(opts: { categoryId?: string | null; order?: "recent" | "popular"; limit?: number } = {}) {
  let q = supabase.from("videos").select(VIDEO_SELECT).eq("visibility", "public");
  if (opts.categoryId) q = q.eq("category_id", opts.categoryId);
  q = opts.order === "popular" ? q.order("view_count", { ascending: false }) : q.order("published_at", { ascending: false });
  const { data, error } = await q.limit(opts.limit ?? 36);
  if (error) throw error;
  return (data ?? []) as unknown as VideoCardData[];
}

export async function fetchCategories() {
  const { data, error } = await supabase.from("categories").select("id,name,slug").order("name");
  if (error) throw error;
  return data ?? [];
}
