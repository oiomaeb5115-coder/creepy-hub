import { MetadataRoute } from 'next'

const BASE_URL = 'https://creepyhub.com'
const locales = ['ja', 'en']

export default function sitemap(): MetadataRoute.Sitemap {
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

  return entries
}
