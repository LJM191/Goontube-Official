import { describe, expect, it } from "vitest";
import {
  canUploadVideo,
  MAX_VIDEO_UPLOAD_BYTES,
  shouldCompressVideo,
  VIDEO_STORAGE_LIMIT_BYTES,
} from "@/lib/video-upload-limits";

describe("video upload size limits", () => {
  it("compresses only files larger than the 46 MB threshold", () => {
    expect(shouldCompressVideo(MAX_VIDEO_UPLOAD_BYTES)).toBe(false);
    expect(shouldCompressVideo(MAX_VIDEO_UPLOAD_BYTES + 1)).toBe(true);
  });

  it("allows uploads up to the exact 50 MB storage limit", () => {
    expect(canUploadVideo(VIDEO_STORAGE_LIMIT_BYTES)).toBe(true);
    expect(canUploadVideo(VIDEO_STORAGE_LIMIT_BYTES + 1)).toBe(false);
  });

  it("keeps a 4 MB safety margin between compression and storage limits", () => {
    expect(VIDEO_STORAGE_LIMIT_BYTES - MAX_VIDEO_UPLOAD_BYTES).toBe(4_000_000);
  });
});
