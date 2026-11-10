import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { MAX_VIDEO_UPLOAD_BYTES, shouldCompressVideo } from "@/lib/video-upload-limits";

export { MAX_VIDEO_UPLOAD_BYTES };
const CORE_BASE_URL = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";
const ENGINE_FETCH_TIMEOUT_MS = 45_000;
const METADATA_TIMEOUT_MS = 20_000;

export type VideoCompressionUpdate = {
  phase: "loading" | "encoding";
  progress: number;
  attempt: number;
  attempts: number;
};

type CompressionAttempt = { width: number; height: number; factor: number };

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoadPromise: Promise<FFmpeg> | null = null;

async function fetchAsBlobUrl(url: string, contentType: string) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), ENGINE_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: "force-cache" });
    if (!response.ok) {
      throw new Error(`Le moteur de compression est indisponible (HTTP ${response.status}).`);
    }
    return URL.createObjectURL(new Blob([await response.arrayBuffer()], { type: contentType }));
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error("Le téléchargement du moteur de compression a expiré. Vérifiez votre connexion puis réessayez.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function getFFmpeg(onProgress: (progress: number) => void) {
  if (ffmpegInstance?.loaded) return ffmpegInstance;
  if (!ffmpegLoadPromise) {
    ffmpegLoadPromise = (async () => {
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const ffmpeg = new FFmpeg();
      let coreURL: string | null = null;
      let wasmURL: string | null = null;
      try {
        coreURL = await fetchAsBlobUrl(`${CORE_BASE_URL}/ffmpeg-core.js`, "text/javascript");
        wasmURL = await fetchAsBlobUrl(`${CORE_BASE_URL}/ffmpeg-core.wasm`, "application/wasm");
        await ffmpeg.load({ coreURL, wasmURL });
        ffmpegInstance = ffmpeg;
        return ffmpeg;
      } catch (error) {
        ffmpeg.terminate();
        throw error;
      } finally {
        if (coreURL) URL.revokeObjectURL(coreURL);
        if (wasmURL) URL.revokeObjectURL(wasmURL);
      }
    })().catch((error) => {
      ffmpegLoadPromise = null;
      throw error;
    });
  }
  const ffmpeg = await ffmpegLoadPromise;
  onProgress(1);
  return ffmpeg;
}

function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    let settled = false;
    const timeout = window.setTimeout(() => finish(0), METADATA_TIMEOUT_MS);

    function finish(duration: number) {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      video.onloadedmetadata = null;
      video.onerror = null;
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
      resolve(duration);
    }

    video.preload = "metadata";
    video.muted = true;
    video.onloadedmetadata = () => finish(Number.isFinite(video.duration) ? video.duration : 0);
    video.onerror = () => finish(0);
    video.src = url;
  });
}

async function readDurationFromFFmpeg(ffmpeg: FFmpeg, inputName: string): Promise<number> {
  let duration = 0;
  const handleLog = ({ message }: { message: string }) => {
    const match = message.match(/Duration:\s*(\d{2,}):(\d{2}):(\d{2}(?:\.\d+)?)/);
    if (match) {
      duration = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
    }
  };

  ffmpeg.on("log", handleLog);
  try {
    // FFmpeg prints input metadata before returning a non-zero code because no output was requested.
    await ffmpeg.exec(["-i", inputName]);
  } catch {
    // The expected "no output file" exit can be surfaced as an exception by FFmpeg.wasm.
  } finally {
    ffmpeg.off("log", handleLog);
  }
  return duration;
}

/** Compress locally. The returned file is guaranteed to fit the application upload ceiling. */
export async function compressVideo(
  file: File,
  onProgress: (update: VideoCompressionUpdate) => void,
): Promise<File> {
  if (!shouldCompressVideo(file.size)) return file;
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("La compression vidéo doit être lancée depuis un navigateur.");
  }

  const browserDuration = await readVideoDuration(file);

  onProgress({ phase: "loading", progress: 0, attempt: 0, attempts: 6 });
  const ffmpeg = await getFFmpeg((progress) => {
    onProgress({ phase: "loading", progress, attempt: 0, attempts: 6 });
  });

  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
  const inputName = `input-${Date.now()}.${extension}`;
  const outputName = `compressed-${Date.now()}.mp4`;
  let inputBytes = new Uint8Array(await file.arrayBuffer());
  try {
    await ffmpeg.writeFile(inputName, inputBytes);
  } finally {
    // FFmpeg has its own copy in its virtual filesystem; release the extra browser-side buffer.
    inputBytes = new Uint8Array(0);
  }

  const duration = browserDuration || await readDurationFromFFmpeg(ffmpeg, inputName);
  if (!duration || duration <= 0) {
    try {
      await ffmpeg.deleteFile(inputName);
    } catch {
      // Ignore cleanup failures when metadata cannot be read.
    }
    throw new Error("Impossible de lire la durée de cette vidéo. Essayez un fichier MP4, MOV ou WebM standard.");
  }

  const attempts: CompressionAttempt[] = [
    { width: 1920, height: 1080, factor: 1 },
    { width: 1920, height: 1080, factor: 0.85 },
    { width: 1280, height: 720, factor: 0.72 },
    { width: 1280, height: 720, factor: 0.58 },
    { width: 960, height: 540, factor: 0.46 },
    { width: 720, height: 480, factor: 0.35 },
  ];
  const targetTotalBitrate = Math.floor((MAX_VIDEO_UPLOAD_BYTES * 8 * 0.86) / duration);
  const audioBitrate = Math.max(16_000, Math.min(96_000, Math.floor(targetTotalBitrate * 0.16)));
  const budgetBitrate = Math.max(24_000, targetTotalBitrate - audioBitrate);
  let currentAttempt = 0;
  let successfulEncodes = 0;
  let lastEncodingError = "";

  const handleLog = ({ message }: { message: string }) => {
    if (/error|failed|invalid|unsupported|unable/i.test(message)) {
      lastEncodingError = message.trim().slice(-500);
    }
  };
  const handleProgress = ({ progress }: { progress: number }) => {
    onProgress({
      phase: "encoding",
      progress: Math.max(0, Math.min(1, progress)),
      attempt: currentAttempt,
      attempts: attempts.length,
    });
  };

  ffmpeg.on("progress", handleProgress);
  ffmpeg.on("log", handleLog);

  try {
    for (let index = 0; index < attempts.length; index += 1) {
      const attempt = attempts[index]!;
      currentAttempt = index + 1;
      onProgress({ phase: "encoding", progress: 0, attempt: currentAttempt, attempts: attempts.length });
      try {
        await ffmpeg.deleteFile(outputName);
      } catch {
        // The output does not exist before the first attempt.
      }

      const videoBitrate = Math.max(18_000, Math.floor(budgetBitrate * attempt.factor));
      const scale = `scale='min(${attempt.width},iw)':'min(${attempt.height},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2`;
      let exitCode: number;
      try {
        exitCode = await ffmpeg.exec([
          "-i", inputName,
          "-vf", scale,
          "-c:v", "libx264",
          "-preset", "veryfast",
          "-b:v", String(videoBitrate),
          "-maxrate", String(videoBitrate),
          "-bufsize", String(videoBitrate * 2),
          "-pix_fmt", "yuv420p",
          "-c:a", "aac",
          "-b:a", String(audioBitrate),
          "-movflags", "+faststart",
          "-y", outputName,
        ]);
      } catch (error) {
        lastEncodingError = error instanceof Error ? error.message : String(error);
        continue;
      }

      if (exitCode !== 0) {
        lastEncodingError = lastEncodingError || `FFmpeg a terminé avec le code ${exitCode}.`;
        continue;
      }

      let output: Awaited<ReturnType<typeof ffmpeg.readFile>>;
      try {
        output = await ffmpeg.readFile(outputName);
      } catch (error) {
        lastEncodingError = error instanceof Error ? error.message : String(error);
        continue;
      }
      if (typeof output === "string") {
        lastEncodingError = "Le fichier compressé est illisible.";
        continue;
      }

      successfulEncodes += 1;
      const outputBuffer = new Uint8Array(output).buffer as ArrayBuffer;
      if (outputBuffer.byteLength <= MAX_VIDEO_UPLOAD_BYTES) {
        const baseName = file.name.replace(/\.[^.]+$/, "") || "video";
        return new File([outputBuffer], `${baseName}-compressed.mp4`, {
          type: "video/mp4",
          lastModified: Date.now(),
        });
      }
    }
  } finally {
    ffmpeg.off("progress", handleProgress);
    ffmpeg.off("log", handleLog);
    for (const name of [inputName, outputName]) {
      try {
        await ffmpeg.deleteFile(name);
      } catch {
        // Ignore cleanup errors after a compression failure.
      }
    }
  }

  if (successfulEncodes === 0) {
    throw new Error(
      `La compression n’a pas réussi à encoder cette vidéo. Essayez un MP4 ou MOV standard. ${lastEncodingError}`.trim(),
    );
  }

  throw new Error(
    "La vidéo reste trop volumineuse après six essais. Essayez une vidéo plus courte ou une résolution inférieure.",
  );
}
