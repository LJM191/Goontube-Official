import { FFmpeg } from "@ffmpeg/ffmpeg";

export const MAX_VIDEO_UPLOAD_BYTES = 46_000_000;
const CORE_BASE_URL = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";

export type VideoCompressionUpdate = {
  phase: "loading" | "encoding";
  progress: number;
  attempt: number;
  attempts: number;
};

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoadPromise: Promise<FFmpeg> | null = null;

async function fetchAsBlobUrl(url: string, contentType: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Impossible de télécharger le moteur de compression vidéo.");
  }
  return URL.createObjectURL(new Blob([await response.arrayBuffer()], { type: contentType }));
}

async function getFFmpeg(onProgress: (progress: number) => void) {
  if (ffmpegInstance?.loaded) return ffmpegInstance;
  if (!ffmpegLoadPromise) {
    ffmpegLoadPromise = (async () => {
      const ffmpeg = new FFmpeg();
      const coreURL = await fetchAsBlobUrl(`${CORE_BASE_URL}/ffmpeg-core.js`, "text/javascript");
      const wasmURL = await fetchAsBlobUrl(`${CORE_BASE_URL}/ffmpeg-core.wasm`, "application/wasm");
      try {
        await ffmpeg.load({ coreURL, wasmURL });
      } finally {
        URL.revokeObjectURL(coreURL);
        URL.revokeObjectURL(wasmURL);
      }
      ffmpegInstance = ffmpeg;
      return ffmpeg;
    })().catch((error) => {
      ffmpegLoadPromise = null;
      throw error;
    });
  }
  const ffmpeg = await ffmpegLoadPromise;
  onProgress(1);
  return ffmpeg;
}

/**
 * Compress a video locally in the browser. Nothing is sent to the server until
 * the output has been checked against the configured upload-size ceiling.
 */
export async function compressVideo(
  file: File,
  onProgress: (update: VideoCompressionUpdate) => void,
): Promise<File> {
  if (file.size <= MAX_VIDEO_UPLOAD_BYTES) return file;

  onProgress({ phase: "loading", progress: 0, attempt: 0, attempts: 6 });
  const ffmpeg = await getFFmpeg((progress) => {
    onProgress({ phase: "loading", progress, attempt: 0, attempts: 6 });
  });

  const inputName = `input-${Date.now()}.${file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4"}`;
  const outputName = `compressed-${Date.now()}.mp4`;
  const inputBytes = new Uint8Array(await file.arrayBuffer());
  await ffmpeg.writeFile(inputName, inputBytes);

  const duration = await new Promise<number>((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const seconds = Number.isFinite(video.duration) ? video.duration : 0;
      URL.revokeObjectURL(url);
      resolve(seconds);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
    video.src = url;
  });

  if (!duration || duration <= 0) {
    await ffmpeg.deleteFile(inputName);
    throw new Error("Impossible de lire la durée de cette vidéo pour la compresser.");
  }

  const attempts = [
    { width: 1920, factor: 1 },
    { width: 1920, factor: 0.85 },
    { width: 1280, factor: 0.72 },
    { width: 1280, factor: 0.58 },
    { width: 960, factor: 0.46 },
    { width: 720, factor: 0.35 },
  ];
  const targetTotalBitrate = Math.floor((MAX_VIDEO_UPLOAD_BYTES * 8 * 0.9) / duration);
  const audioBitrate = Math.max(16_000, Math.min(96_000, Math.floor(targetTotalBitrate * 0.18)));
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
      onProgress({ phase: "encoding", progress: 0, attempt: index + 1, attempts: attempts.length });
      try {
        await ffmpeg.deleteFile(outputName);
      } catch {
        // The output file does not exist on the first attempt.
      }

      const videoBitrate = Math.max(18_000, Math.floor(budgetBitrate * attempt.factor));
      const scale = `scale='min(${attempt.width},iw)':'min(${attempt.width},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2`;
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
        if (!lastEncodingError) lastEncodingError = `FFmpeg a terminé avec le code ${exitCode}.`;
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
        // Ignore cleanup failures after a compression error.
      }
    }
  }

  if (successfulEncodes === 0) {
    throw new Error(
      `La compression n’a pas réussi à encoder cette vidéo. Essayez un fichier MP4 ou MOV standard. ${lastEncodingError}`.trim(),
    );
  }

  throw new Error(
    "La vidéo reste trop volumineuse après six essais de compression. Essayez une vidéo plus courte ou une résolution inférieure.",
  );
}
