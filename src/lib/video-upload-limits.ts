/** Supabase videos bucket limit (50 MB, decimal bytes). */
export const VIDEO_STORAGE_LIMIT_BYTES = 50_000_000;
/** Compress slightly before the bucket limit to leave room for provider-side accounting. */
export const MAX_VIDEO_UPLOAD_BYTES = 46_000_000;
