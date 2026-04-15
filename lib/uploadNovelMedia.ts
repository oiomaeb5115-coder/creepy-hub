import { supabase } from "@/lib/supabase";
import { validateImageFile } from "@/lib/validateImageFile";

const BUCKET = "novel-media";

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_AUDIO_TYPES = ["audio/mpeg", "audio/mp3"];
const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * ノベル用画像をアップロードする。
 * PNG の透過を保持するため圧縮はスキップ。
 */
export async function uploadNovelImage(file: File): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error(
      "画像ファイル（JPEG / PNG / WebP / GIF）のみアップロード可能です"
    );
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("画像ファイルは10MB以内にしてください");
  }

  const isValid = await validateImageFile(file);
  if (!isValid) {
    throw new Error("ファイルの内容が画像形式と一致しません");
  }

  const ext = file.name.split(".").pop() || "png";
  const fileName = `images/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, file, { cacheControl: "3600", upsert: false });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}

/**
 * ノベル用音声ファイル（MP3）をアップロードする。
 */
export async function uploadNovelAudio(file: File): Promise<string> {
  if (!ALLOWED_AUDIO_TYPES.includes(file.type)) {
    throw new Error("MP3ファイルのみアップロード可能です");
  }
  if (file.size > MAX_AUDIO_SIZE) {
    throw new Error("音声ファイルは10MB以内にしてください");
  }

  const ext = "mp3";
  const fileName = `audio/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, file, { cacheControl: "3600", upsert: false });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}
