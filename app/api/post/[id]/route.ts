import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { generateSlug } from "@/lib/slug";

async function getAuthorizedUser(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: userData, error } = await supabase.auth.getUser(token);
  if (error || !userData.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  return { id: userData.user.id, role: profile?.role ?? "user" };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const postId = parseInt(id, 10);
  if (isNaN(postId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = authHeader.slice(7);

  const user = await getAuthorizedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: post } = await supabase
    .from("post")
    .select("user_id")
    .eq("id", postId)
    .single();

  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAuthor = post.user_id === user.id;
  const isAdmin = user.role === "admin";

  if (!isAuthor && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    title,
    content,
    category_id,
    image_url,
    image_url_2,
    image_url_3,
    video_url,
    stream_video_id,
    lat,
    lng,
    location_name,
    location_precision,
    map_category,
    is_sensitive,
  } = body;

  // サーバーサイド入力バリデーション
  if (title !== undefined && (typeof title !== "string" || title.length === 0 || title.length > 200)) {
    return NextResponse.json({ error: "タイトルは1〜200文字で入力してください" }, { status: 400 });
  }
  if (content !== undefined && (typeof content !== "string" || content.length === 0 || content.length > 50000)) {
    return NextResponse.json({ error: "本文は1〜50000文字で入力してください" }, { status: 400 });
  }
  if (category_id !== undefined && category_id !== null && typeof category_id !== "number") {
    return NextResponse.json({ error: "カテゴリIDが不正です" }, { status: 400 });
  }
  for (const key of ["image_url", "image_url_2", "image_url_3", "video_url", "stream_video_id"] as const) {
    const val = body[key];
    if (val !== undefined && val !== null && typeof val !== "string") {
      return NextResponse.json({ error: "メディアURLが不正です" }, { status: 400 });
    }
  }
  // 位置情報のバリデーション
  for (const [key, val] of [
    ["lat", lat] as const,
    ["lng", lng] as const,
  ]) {
    if (val !== undefined && val !== null && (typeof val !== "number" || !Number.isFinite(val))) {
      return NextResponse.json({ error: `${key} が不正です` }, { status: 400 });
    }
  }
  if (location_name !== undefined && location_name !== null && typeof location_name !== "string") {
    return NextResponse.json({ error: "location_name が不正です" }, { status: 400 });
  }
  if (
    location_precision !== undefined &&
    location_precision !== null &&
    !["exact", "town", "prefecture"].includes(location_precision)
  ) {
    return NextResponse.json({ error: "location_precision が不正です" }, { status: 400 });
  }
  if (
    map_category !== undefined &&
    map_category !== null &&
    !["haunted", "horror", "sightseeing", "legend"].includes(map_category)
  ) {
    return NextResponse.json({ error: "map_category が不正です" }, { status: 400 });
  }
  if (is_sensitive !== undefined && typeof is_sensitive !== "boolean") {
    return NextResponse.json({ error: "is_sensitive が不正です" }, { status: 400 });
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // タイトル変更時はslugも再生成
  const slug = title ? generateSlug(title) : undefined;
  const updateData: Record<string, unknown> = { title, content, category_id: category_id ?? null };
  if (slug !== undefined) updateData.slug = slug;
  if (image_url !== undefined) updateData.image_url = image_url;
  if (image_url_2 !== undefined) updateData.image_url_2 = image_url_2;
  if (image_url_3 !== undefined) updateData.image_url_3 = image_url_3;
  if (video_url !== undefined) updateData.video_url = video_url;
  if (stream_video_id !== undefined) updateData.stream_video_id = stream_video_id;
  if (lat !== undefined) updateData.lat = lat;
  if (lng !== undefined) updateData.lng = lng;
  if (location_name !== undefined) updateData.location_name = location_name;
  if (location_precision !== undefined) updateData.location_precision = location_precision;
  if (map_category !== undefined) updateData.map_category = map_category;
  if (is_sensitive !== undefined) updateData.is_sensitive = is_sensitive;

  let { error } = await adminSupabase
    .from("post")
    .update(updateData)
    .eq("id", postId);

  // is_sensitive カラム不在エラー時は当該キーを除いて再試行（マイグレーション未適用環境対応）
  if (error && /is_sensitive/.test(error.message ?? "")) {
    const { is_sensitive: _omit, ...rest } = updateData;
    void _omit;
    const retry = await adminSupabase.from("post").update(rest).eq("id", postId);
    error = retry.error;
  }

  if (error) return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });

  revalidatePath(`/ja/post/${postId}`);
  revalidatePath(`/en/post/${postId}`);
  revalidatePath("/ja");
  revalidatePath("/en");

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const postId = parseInt(id, 10);
  if (isNaN(postId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = authHeader.slice(7);

  const user = await getAuthorizedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ユーザーのトークンをセットすることでRLSが正しく機能する
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  // 投稿の owner を確認
  const { data: post } = await supabase
    .from("post")
    .select("user_id, stream_video_id")
    .eq("id", postId)
    .single();

  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAuthor = post.user_id === user.id;
  const isAdmin = user.role === "admin";

  if (!isAuthor && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // ソフトデリート: 非公開化 + deleted_at をセット
  const { error } = await adminSupabase
    .from("post")
    .update({ is_published: false, deleted_at: new Date().toISOString() })
    .eq("id", postId);
  if (error) return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });

  // Cloudflare Stream 動画のクリーンアップ
  if (post.stream_video_id) {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;
    if (accountId && apiToken) {
      fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${post.stream_video_id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${apiToken}` },
      }).catch((err) => console.error("[DELETE /api/post] Stream cleanup error:", err));
    }
  }

  revalidatePath("/ja");
  revalidatePath("/en");
  revalidatePath("/ja/story");

  return NextResponse.json({ success: true });
}
