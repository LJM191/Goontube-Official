/** Supabase videos bucket limit (50 MB, decimal bytes). */
export const VIDEO_STORAGE_LIMIT_BYTES = 50_000_000;
/** Compress before reaching the bucket limit to leave a 4 MB safety margin. */
export const MAX_VIDEO_UPLOAD_BYTES = 46_000_000;

export function shouldCompressVideo(fileSize: number): boolean {
  return fileSize > MAX_VIDEO_UPLOAD_BYTES;
}

export function canUploadVideo(fileSize: number): boolean {
  return fileSize <= VIDEO_STORAGE_LIMIT_BYTES;
}
