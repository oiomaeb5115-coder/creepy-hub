import type { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase'
import { postUrl } from '@/lib/postUrl'

const BASE_URL = 'https://creepyhub.com'
const locales = ['ja', 'en']

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages = [
    '',
    '/post',
    '/post/popular',
    '/post/hot',
    '/post/search',
    '/wiki',
    '/wiki/search',
    '/wiki/random',
    '/search',
    '/register',
    '/login',
  ]

  const entries: MetadataRoute.Sitemap = []

  // ルートページ
  entries.push({
    url: BASE_URL,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 1,
  })

  // 各ロケール × 静的ページ
  for (const locale of locales) {
    for (const page of staticPages) {
      entries.push({
        url: `${BASE_URL}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: page === '' ? 0.9 : 0.7,
      })
    }
  }

  // 動的コンテンツ（Stories・Wiki）
  const [jaStoriesResult, enStoriesResult, jaWikiResult, enWikiResult] = await Promise.all([
    supabase
      .from('post')
      .select('id, slug, updated_at, created_at')
      .eq('is_published', true),
    // EN は翻訳済み投稿のみ（noindex ページをサイトマップに含めない）
    supabase
      .from('post_translations')
      .select('post_id, post:post!inner(id, slug, updated_at, created_at)')
      .eq('locale', 'en')
      .eq('post.is_published', true),
    supabase
      .from('wiki_pages')
      .select('slug, updated_at')
      .eq('locale', 'ja')
      .eq('is_published', true),
    supabase
      .from('wiki_pages')
      .select('slug, updated_at')
      .eq('locale', 'en')
      .eq('is_published', true),
  ])

  // Stories JA（全公開投稿）
  for (const post of jaStoriesResult.data ?? []) {
    entries.push({
      url: `${BASE_URL}${postUrl('ja', post.id, post.slug)}`,
      lastModified: new Date(post.updated_at ?? post.created_at),
      changeFrequency: 'weekly',
      priority: 0.7,
    })
  }

  // Stories EN（翻訳済み投稿のみ）
  for (const row of enStoriesResult.data ?? []) {
    const post = (row.post as unknown) as { id: number; slug: string | null; updated_at: string | null; created_at: string }
    entries.push({
      url: `${BASE_URL}${postUrl('en', post.id, post.slug)}`,
      lastModified: new Date(post.updated_at ?? post.created_at),
      changeFrequency: 'weekly',
      priority: 0.7,
    })
  }

  // Wiki JA
  for (const page of jaWikiResult.data ?? []) {
    entries.push({
      url: `${BASE_URL}/ja/wiki/${page.slug}`,
      lastModified: new Date(page.updated_at),
      changeFrequency: 'weekly',
      priority: 0.8,
    })
  }

  // Wiki EN
  for (const page of enWikiResult.data ?? []) {
    entries.push({
      url: `${BASE_URL}/en/wiki/${page.slug}`,
      lastModified: new Date(page.updated_at),
      changeFrequency: 'weekly',
      priority: 0.8,
    })
  }

  return entries
}
