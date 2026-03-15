import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

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
    .eq("id", id)
    .single();

  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAuthor = post.user_id === user.id;
  const isAdmin = user.role === "admin";

  if (!isAuthor && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { title, content, category_id } = body;

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await adminSupabase
    .from("post")
    .update({ title, content, category_id: category_id ?? null })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath(`/ja/story/${id}`);
  revalidatePath(`/en/story/${id}`);
  revalidatePath("/ja");
  revalidatePath("/en");

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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
    .eq("id", id)
    .single();

  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAuthor = post.user_id === user.id;
  const isAdmin = user.role === "admin";

  if (!isAuthor && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // サービスロールキーでRLSをバイパスして削除
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await adminSupabase.from("post").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/ja");
  revalidatePath("/en");
  revalidatePath("/ja/story");

  return NextResponse.json({ success: true });
}
