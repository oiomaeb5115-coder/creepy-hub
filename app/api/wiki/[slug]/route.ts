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

  return { id: userData.user.id, role: profile?.role ?? "user", token };
}

function isValidCategoryIds(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => Number.isInteger(item) && item > 0);
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
  const {
    title,
    subtitle,
    summary,
    content,
    category_ids,
    image_url,
    lat,
    lng,
    location_name,
    location_precision,
    map_category,
  } = body;

  if (typeof title === "string" && title.length > 200) {
    return NextResponse.json(
      { error: "タイトルは200文字以内にしてください" },
      { status: 400 }
    );
  }
  if (typeof subtitle === "string" && subtitle.length > 300) {
    return NextResponse.json(
      { error: "サブタイトルは300文字以内にしてください" },
      { status: 400 }
    );
  }
  if (typeof summary === "string" && summary.length > 1000) {
    return NextResponse.json(
      { error: "要約は1000文字以内にしてください" },
      { status: 400 }
    );
  }
  if (typeof content === "string" && content.length > 100000) {
    return NextResponse.json(
      { error: "本文は100000文字以内にしてください" },
      { status: 400 }
    );
  }
  if (category_ids !== undefined && !isValidCategoryIds(category_ids)) {
    return NextResponse.json(
      { error: "category_ids の形式が不正です" },
      { status: 400 }
    );
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

  if (image_url !== undefined && image_url !== null) {
    try {
      const parsed = new URL(image_url);
      if (parsed.protocol !== "https:") {
        return NextResponse.json(
          { error: "image_url は https のみ許可されています" },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "image_url の形式が正しくありません" },
        { status: 400 }
      );
    }
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const updatePayload: Record<string, unknown> = {
    title,
    subtitle: subtitle || null,
    summary,
    content,
    updated_at: new Date().toISOString(),
  };
  if (image_url !== undefined) updatePayload.image_url = image_url;
  if (lat !== undefined) updatePayload.lat = lat;
  if (lng !== undefined) updatePayload.lng = lng;
  if (location_name !== undefined) updatePayload.location_name = location_name;
  if (location_precision !== undefined) updatePayload.location_precision = location_precision;
  if (map_category !== undefined) updatePayload.map_category = map_category;

  const { error } = await adminSupabase
    .from("wiki_pages")
    .update(updatePayload)
    .eq("slug", slug)
    .eq("locale", "ja");

  if (error) {
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }

  if (category_ids !== undefined) {
    const { error: categoryReplaceError } = await adminSupabase.rpc(
      "replace_wiki_page_categories",
      {
        p_wiki_page_id: page.id,
        p_category_ids: category_ids,
      }
    );

    if (categoryReplaceError) {
      console.error("[wiki PATCH] category replace error:", categoryReplaceError.message);
      return NextResponse.json(
        { error: "カテゴリの更新に失敗しました" },
        { status: 500 }
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

  const { error } = await adminSupabase
    .from("wiki_pages")
    .update({ is_published: false, deleted_at: new Date().toISOString() })
    .eq("slug", slug);

  if (error) {
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }

  revalidatePath("/ja/wiki");
  revalidatePath("/en/wiki");
  revalidatePath(`/ja/wiki/${slug}`);

  return NextResponse.json({ success: true });
}
