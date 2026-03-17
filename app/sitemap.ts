import type { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase'

const BASE_URL = 'https://creepyhub.com'
const locales = ['ja', 'en']

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages = [
    '',
    '/story',
    '/story/popular',
    '/story/hot',
    '/story/search',
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
  const [storiesResult, jaWikiResult, enWikiResult] = await Promise.all([
    supabase
      .from('post')
      .select('id, updated_at, created_at')
      .eq('is_published', true),
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

  // Stories（両ロケールで同じURL）
  for (const locale of locales) {
    for (const post of storiesResult.data ?? []) {
      entries.push({
        url: `${BASE_URL}/${locale}/story/${post.id}`,
        lastModified: new Date(post.updated_at ?? post.created_at),
        changeFrequency: 'weekly',
        priority: 0.7,
      })
    }
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
