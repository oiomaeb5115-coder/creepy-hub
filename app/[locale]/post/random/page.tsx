import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

type PostRandomPageProps = {
  params: Promise<{ locale: string }>;
};

type PostRandomRow = {
  id: number;
};

export default async function PostRandomPage({ params }: PostRandomPageProps) {
  const { locale } = await params;

  const { data, error } = await supabase
    .from("post")
    .select("id")
    .eq("is_published", true)
    .limit(100);

  if (error || !data || data.length === 0) {
    redirect(`/${locale}/post`);
  }

  const items = data as PostRandomRow[];
  const randomIndex = Math.floor(Math.random() * items.length);
  const randomId = items[randomIndex]?.id;

  if (!randomId) {
    redirect(`/${locale}/post`);
  }

  redirect(`/${locale}/post/${randomId}`);
}
