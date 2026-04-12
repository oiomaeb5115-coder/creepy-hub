import { supabase } from "@/lib/supabase";
import { validateImageFile } from "@/lib/validateImageFile";
import { compressImage } from "@/lib/compressImage";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;       // 5MB
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

