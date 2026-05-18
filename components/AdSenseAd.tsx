'use client'

type AdType = 'leaderboard' | 'sp-banner' | 'rectangle' | 'sidebar' | 'sticky-bottom'

const AD_CONFIG: Record<AdType, { path: string; width: number; height: number }> = {
  leaderboard: {
    path: '/ads/leaderboard.html',
    width: 728,
    height: 90,
  },
  'sp-banner': {
    path: '/ads/sp-banner.html',
    width: 300,
    height: 250,
  },
  rectangle: {
    path: '/ads/rectangle.html',
    width: 300,
    height: 250,
  },
  sidebar: {
    path: '/ads/sidebar.html',
    width: 300,
    height: 600,
  },
  'sticky-bottom': {
    path: '/ads/sticky.html',
    width: 320,
    height: 50,
  },
}

export default function AdSenseAd({ type }: { type: AdType }) {
  const config = AD_CONFIG[type]

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        width: '100%',
        margin: '16px auto',
      }}
    >
      <iframe
        src={config.path}
        style={{
          width: config.width,
          height: config.height,
          border: 'none',
          overflow: 'hidden',
        }}
        scrolling="no"
      />
    </div>
  )
}

export function ResponsiveAd({ pc, sp }: { pc: AdType; sp: AdType }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .adsense-ad-sp { display: none; }
        .adsense-ad-pc { display: block; }
        @media (max-width: 768px) {
          .adsense-ad-sp { display: block; }
          .adsense-ad-pc { display: none; }
        }
      `}} />
      <div className="adsense-ad-pc">
        <AdSenseAd type={pc} />
      </div>
      <div className="adsense-ad-sp">
        <AdSenseAd type={sp} />
      </div>
    </>
  )
}
