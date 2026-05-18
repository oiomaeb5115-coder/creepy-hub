'use client'

export default function InArticleAd() {
  return (
    <div
      style={{
        width: '100%',
        margin: '24px auto',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <iframe
        src="/ads/in-article.html"
        style={{
          width: '100%',
          maxWidth: 600,
          height: 280,
          border: 'none',
          overflow: 'hidden',
          display: 'block',
        }}
        scrolling="no"
        title="広告"
      />
    </div>
  )
}
