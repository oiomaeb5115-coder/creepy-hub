import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type WikiRandomPageProps = {
  params: Promise<{ locale: string }>;
};

type WikiRandomRow = {
  slug: string;
};

export default async function WikiRandomPage({
  params,
}: WikiRandomPageProps) {
  const { locale } = await params;

  const { data, error } = await supabaseAdmin
    .from("wiki_pages")
    .select("slug")
    .eq("locale", locale)
    .eq("is_published", true)
    .limit(100);

  if (error || !data || data.length === 0) {
    redirect(`/${locale}/wiki`);
  }

  const items = data as WikiRandomRow[];
  const randomIndex = Math.floor(Math.random() * items.length);
  const randomSlug = items[randomIndex]?.slug;

  if (!randomSlug) {
    redirect(`/${locale}/wiki`);
  }

  redirect(`/${locale}/wiki/${randomSlug}`);
}