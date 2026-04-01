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
  const { title, content, category_id } = body;

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

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // タイトル変更時はslugも再生成
  const slug = title ? generateSlug(title) : undefined;
  const updateData: Record<string, unknown> = { title, content, category_id: category_id ?? null };
  if (slug !== undefined) updateData.slug = slug;

  const { error } = await adminSupabase
    .from("post")
    .update(updateData)
    .eq("id", postId);

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
    .select("user_id")
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

  revalidatePath("/ja");
  revalidatePath("/en");
  revalidatePath("/ja/story");

  return NextResponse.json({ success: true });
}
