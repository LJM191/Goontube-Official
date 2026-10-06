import { supabase } from "@/integrations/supabase/client";

export const VIDEO_SELECT =
  "id,title,thumbnail_path,duration_seconds,view_count,created_at,is_live,visibility,channel:channels!inner(id,handle,name,avatar_path,verified)";

export type VideoCardData = {
  id: string;
  title: string;
  thumbnail_path: string | null;
  duration_seconds: number;
  view_count: number;
  created_at: string;
  is_live: boolean;
  visibility: string;
  channel: { id: string; handle: string; name: string; avatar_path: string | null; verified: boolean };
};

export async function fetchFeed(opts: { categoryId?: number | null; order?: "recent" | "popular"; limit?: number } = {}) {
  let q = supabase.from("videos").select(VIDEO_SELECT).eq("visibility", "public");
  if (opts.categoryId) q = q.eq("category_id", opts.categoryId);
  q = opts.order === "popular" ? q.order("view_count", { ascending: false }) : q.order("created_at", { ascending: false });
  const { data, error } = await q.limit(opts.limit ?? 48);
  if (error) throw error;
  return (data ?? []) as unknown as VideoCardData[];
}

export async function fetchCategories() {
  const { data, error } = await supabase.from("categories").select("*").order("id");
  if (error) throw error;
  return data ?? [];
}
