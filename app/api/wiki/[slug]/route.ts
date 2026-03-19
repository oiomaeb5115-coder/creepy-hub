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
  const { title, subtitle, summary, content, page_type, category_ids } = body;

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await adminSupabase
    .from("wiki_pages")
    .update({
      title,
      subtitle: subtitle || null,
      summary,
      content,
      page_type,
      updated_at: new Date().toISOString(),
    })
    .eq("slug", slug)
    .eq("locale", "ja");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // ソフトデリート: 全ロケールを非公開化 + deleted_at をセット
  const { error } = await adminSupabase
    .from("wiki_pages")
    .update({ is_published: false, deleted_at: new Date().toISOString() })
    .eq("slug", slug);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/ja/wiki");
  revalidatePath("/en/wiki");
  revalidatePath(`/ja/wiki/${slug}`);

  return NextResponse.json({ success: true });
}
