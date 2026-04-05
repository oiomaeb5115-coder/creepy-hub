import { supabase } from "@/lib/supabase";
import { validateImageFile } from "@/lib/validateImageFile";
import { compressImage } from "@/lib/compressImage";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024;

export async function uploadImage(
  file: File | null,
  userId: string,
  suffix: string
): Promise<string | null> {
  if (!file) return null;
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("画像ファイル（JPEG / PNG / WebP / GIF）のみアップロード可能です");
  }
  if (file.size > MAX_SIZE) {
    throw new Error("ファイルサイズは5MB以内にしてください");
  }
  const isValidImage = await validateImageFile(file);
  if (!isValidImage) {
    throw new Error("ファイルの内容が画像形式と一致しません");
  }
  const compressed = await compressImage(file);
  const fileExt = compressed.name.split(".").pop() || "jpg";
  const fileName = `${userId}/${Date.now()}-${suffix}.${fileExt}`;
  const { error } = await supabase.storage
    .from("post-images")
    .upload(fileName, compressed, { cacheControl: "3600", upsert: false });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("post-images").getPublicUrl(fileName);
  return data.publicUrl;
}
