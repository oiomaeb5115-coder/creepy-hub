import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

let ffmpeg: FFmpeg | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg && ffmpeg.loaded) return ffmpeg;
  ffmpeg = new FFmpeg();
  await ffmpeg.load();
  return ffmpeg;
}

/**
 * MOV ファイルを MP4 に変換して返す。
 * onProgress に 0〜1 の進捗値を渡す。
 */
export async function convertMovToMp4(
  file: File,
  onProgress?: (ratio: number) => void
): Promise<File> {
  const ff = await getFFmpeg();

  if (onProgress) {
    ff.on("progress", ({ progress }) => onProgress(Math.min(progress, 1)));
  }

  await ff.writeFile("input.mov", await fetchFile(file));
  await ff.exec(["-i", "input.mov", "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-c:a", "aac", "-movflags", "+faststart", "output.mp4"]);
  const data = await ff.readFile("output.mp4");

  await ff.deleteFile("input.mov");
  await ff.deleteFile("output.mp4");

  const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(data);
  const mp4Blob = new Blob([bytes.slice().buffer], { type: "video/mp4" });
  const mp4Name = file.name.replace(/\.mov$/i, ".mp4");
  return new File([mp4Blob], mp4Name, { type: "video/mp4" });
}
