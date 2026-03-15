import Link from "next/link";
import { supabase } from "@/lib/supabase";
import BackButton from "@/components/BackButton";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function BookmarksPage({ params }: Props) {
  const { locale } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <p>ログインしてください</p>;
  }

  const { data } = await supabase
    .from("user_bookmarks")
    .select(`
      post(
        id,
        title,
        view_count
      )
    `)
    .eq("user_id", user.id);

  const posts = data ?? [];

  return (
    <main style={{ padding: 40 }}>
      <BackButton />
      <h1>保存した投稿</h1>

      {posts.map((item: any) => (
        <div key={item.post.id}>
          <Link href={`/${locale}/story/${item.post.id}`}>
            {item.post.title}
          </Link>
        </div>
      ))}
    </main>
  );
}