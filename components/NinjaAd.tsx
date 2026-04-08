'use client'

type AdType = 'leaderboard' | 'sp-banner' | 'rectangle'

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
}

export default function NinjaAd({ type }: { type: AdType }) {
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

/**
 * PC: leaderboard (728x90) or rectangle (300x250)
 * SP: sp-banner (320x100)
 * Switches via CSS media query for SSR compatibility.
 */
export function ResponsiveAd({ pc, sp }: { pc: AdType; sp: AdType }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .ninja-ad-sp { display: none; }
        .ninja-ad-pc { display: block; }
        @media (max-width: 768px) {
          .ninja-ad-sp { display: block; }
          .ninja-ad-pc { display: none; }
        }
      `}} />
      <div className="ninja-ad-pc">
        <NinjaAd type={pc} />
      </div>
      <div className="ninja-ad-sp">
        <NinjaAd type={sp} />
      </div>
    </>
  )
}
