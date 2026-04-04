import type { MetadataRoute } from 'next'
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'
import { postUrl } from '@/lib/postUrl'

const BASE_URL = 'https://creepyhub.com'
const locales = ['ja', 'en']

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages = [
    '',       // home
    '/post',  // post一覧
    '/wiki',  // wiki一覧
    '/wiki/categories', // wikiカテゴリー一覧
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

  // 動的コンテンツ（Stories・Wiki・カテゴリー）
  const [
    jaStoriesResult, enStoriesResult,
    jaWikiResult, enWikiResult,
    storyCategoriesResult, jaWikiCategoriesResult, enWikiCategoriesResult,
  ] = await Promise.all([
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
    // カテゴリー
    supabase
      .from('story_categories')
      .select('slug')
      .eq('is_active', true),
    supabase
      .from('categories')
      .select('slug')
      .eq('locale', 'ja'),
    supabase
      .from('categories')
      .select('slug')
      .eq('locale', 'en'),
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

  // 投稿カテゴリー（両locale）
  for (const cat of storyCategoriesResult.data ?? []) {
    for (const locale of locales) {
      entries.push({
        url: `${BASE_URL}/${locale}/post/category/${cat.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.6,
      })
    }
  }

  // Wikiカテゴリー JA
  for (const cat of jaWikiCategoriesResult.data ?? []) {
    entries.push({
      url: `${BASE_URL}/ja/wiki/category/${cat.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    })
  }

  // Wikiカテゴリー EN
  for (const cat of enWikiCategoriesResult.data ?? []) {
    entries.push({
      url: `${BASE_URL}/en/wiki/category/${cat.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    })
  }

  return entries
}
