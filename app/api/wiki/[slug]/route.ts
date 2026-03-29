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

  const { count: postCount } = await supabase
    .from("post")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userData.user.id)
    .eq("is_published", true)
    .is("deleted_at", null);

  return { id: userData.user.id, role: profile?.role ?? "user", postCount: postCount ?? 0, token };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const user = await getAuthorizedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: page } = await supabase
    .from("wiki_pages")
    .select("id, author_id")
    .eq("slug", slug)
    .eq("locale", "ja")
    .single();

  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAuthor = page.author_id === user.id;
  const isAdmin = user.role === "admin";

  if (!isAuthor && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { title, subtitle, summary, content, page_type, category_ids, image_url } = body;

  // image_url スキーム検証: https: のみ許可（null は削除を意味するので許可）
  if (image_url !== undefined && image_url !== null) {
    try {
      const parsed = new URL(image_url);
      if (parsed.protocol !== "https:") {
        return NextResponse.json({ error: "image_urlはhttpsで始まる必要があります" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "image_urlの形式が正しくありません" }, { status: 400 });
    }
  }

  // NOTE: サービスロールキーを使用（RLSバイパス）。認証・認可チェック済みのため許容。
  // TODO: RLSポリシーを整備してユーザートークンベースに移行することを推奨。
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const updatePayload: Record<string, unknown> = {
    title,
    subtitle: subtitle || null,
    summary,
    content,
    page_type,
    updated_at: new Date().toISOString(),
  };
  if (image_url !== undefined) updatePayload.image_url = image_url;

  const { error } = await adminSupabase
    .from("wiki_pages")
    .update(updatePayload)
    .eq("slug", slug)
    .eq("locale", "ja");

  if (error) return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });

  if (Array.isArray(category_ids)) {
    await adminSupabase.from("wiki_page_categories").delete().eq("wiki_page_id", page.id);
    if (category_ids.length > 0) {
      await adminSupabase.from("wiki_page_categories").insert(
        category_ids.map((cat_id: number) => ({ wiki_page_id: page.id, category_id: cat_id }))
      );
    }
  }

  revalidatePath(`/ja/wiki/${slug}`);
  revalidatePath(`/en/wiki/${slug}`);
  revalidatePath("/ja/wiki");

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const user = await getAuthorizedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // wiki の author_id を確認（ja 版を基準）
  const { data: page } = await supabase
    .from("wiki_pages")
    .select("author_id")
    .eq("slug", slug)
    .eq("locale", "ja")
    .single();

  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAuthor = page.author_id === user.id;
  const isAdmin = user.role === "admin";

  if (!isAuthor && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // NOTE: サービスロールキーを使用（RLSバイパス）。認証・認可チェック済みのため許容。
  // TODO: RLSポリシーを整備してユーザートークンベースに移行することを推奨。
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // ソフトデリート: 全ロケールを非公開化 + deleted_at をセット
  const { error } = await adminSupabase
    .from("wiki_pages")
    .update({ is_published: false, deleted_at: new Date().toISOString() })
    .eq("slug", slug);
  if (error) return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });

  revalidatePath("/ja/wiki");
  revalidatePath("/en/wiki");
  revalidatePath(`/ja/wiki/${slug}`);

  return NextResponse.json({ success: true });
}
