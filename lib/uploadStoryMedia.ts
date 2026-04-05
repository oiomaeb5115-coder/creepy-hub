import { supabase } from "@/lib/supabase";
import { validateImageFile } from "@/lib/validateImageFile";
import { validateVideoFile } from "@/lib/validateVideoFile";
import { compressImage } from "@/lib/compressImage";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;       // 5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;       // 50MB
const BUCKET = "story-media";

/**
 * ストーリー用画像をアップロードする。
 * 既存の uploadImage.ts と同パターンだが story-media バケットを使用。
 */
export async function uploadStoryImage(
  file: File,
  userId: string
): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("画像ファイル（JPEG / PNG / WebP / GIF）のみアップロード可能です");
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("画像ファイルは5MB以内にしてください");
  }

  const isValid = await validateImageFile(file);
  if (!isValid) {
    throw new Error("ファイルの内容が画像形式と一致しません");
  }

  const compressed = await compressImage(file);
  const ext = compressed.name.split(".").pop() || "jpg";
  const fileName = `${userId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, compressed, { cacheControl: "3600", upsert: false });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}

/**
 * ストーリー用動画をアップロードする。
 * クライアントサイドの圧縮は行わず、そのままアップロード。
 */
export async function uploadStoryVideo(
  file: File,
  userId: string
): Promise<string> {
  if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
    throw new Error("動画ファイル（MP4 / WebM）のみアップロード可能です");
  }
  if (file.size > MAX_VIDEO_SIZE) {
    throw new Error("動画ファイルは50MB以内にしてください");
  }

  const isValid = await validateVideoFile(file);
  if (!isValid) {
    throw new Error("ファイルの内容が動画形式と一致しません");
  }

  const ext = file.name.split(".").pop() || "mp4";
  const fileName = `${userId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, file, { cacheControl: "3600", upsert: false });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}
