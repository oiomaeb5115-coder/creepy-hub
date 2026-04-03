import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { postUrl } from "@/lib/postUrl";

type PostRandomPageProps = {
  params: Promise<{ locale: string }>;
};

type PostRandomRow = {
  id: number;
  slug: string | null;
};

export default async function PostRandomPage({ params }: PostRandomPageProps) {
  const { locale } = await params;

  const { data, error } = await supabaseAdmin
    .from("post")
    .select("id, slug")
    .eq("is_published", true)
    .limit(100);

  if (error || !data || data.length === 0) {
    redirect(`/${locale}/post`);
  }

  const items = data as PostRandomRow[];
  const randomIndex = Math.floor(Math.random() * items.length);
  const randomPost = items[randomIndex];

  if (!randomPost?.id) {
    redirect(`/${locale}/post`);
  }

  redirect(postUrl(locale, randomPost.id, randomPost.slug));
}
