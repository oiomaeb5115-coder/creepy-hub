import { redirect, notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { postUrl } from "@/lib/postUrl";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

/**
 * slugなしの旧URL（/ja/post/18）でアクセスされた場合、
 * slugがあればslug付きURLへ301リダイレクトする。
 * slugがなければそのまま詳細ページとして表示するため
 * slug付きルートへ内部リダイレクト。
 */
export default async function PostRedirectPage({ params }: Props) {
  const { locale, id } = await params;

  const { data: post } = await supabaseAdmin
    .from("post")
    .select("id, slug")
    .eq("id", id)
    .eq("is_published", true)
    .single();

  if (!post) {
    notFound();
  }

  // slug付きURLへリダイレクト（slugがない場合は "post" をフォールバックslugとして使用）
  const targetSlug = post.slug || "post";
  redirect(postUrl(locale, post.id, targetSlug));
}
