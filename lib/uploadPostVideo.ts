import { supabase } from "@/lib/supabase";
import { validateVideoFile } from "@/lib/validateVideoFile";

const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const MAX_VIDEO_SIZE = 75 * 1024 * 1024; // 75MB
const BUCKET = "story-media";

/**
 * Post 用動画をアップロードする。
 * 3分以内・75MB以内の MP4/WebM/MOV のみ許可。
 */
export async function uploadPostVideo(
  file: File,
  userId: string
): Promise<string> {
  if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
    throw new Error("動画ファイル（MP4 / WebM / MOV）のみアップロード可能です");
  }
  if (file.size > MAX_VIDEO_SIZE) {
    throw new Error("動画ファイルは75MB以内にしてください");
  }

  if (file.type !== "video/quicktime") {
    const isValid = await validateVideoFile(file);
    if (!isValid) {
      throw new Error("ファイルの内容が動画形式と一致しません");
    }
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
