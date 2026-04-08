'use client'

import { useEffect, useRef } from 'react'

type AdType = 'leaderboard' | 'sp-banner' | 'rectangle'

const AD_CONFIG: Record<AdType, { src: string; width: number; height: number }> = {
  leaderboard: {
    src: 'https://adm.shinobi.jp/s/a1dfbbec31ebeff55c80320fb7631c5b',
    width: 728,
    height: 90,
  },
  'sp-banner': {
    src: 'https://adm.shinobi.jp/s/f8bf70b37536a0b5db703891277141e2',
    width: 320,
    height: 100,
  },
  rectangle: {
    src: 'https://adm.shinobi.jp/s/59fcb423fbdd78a61cd073fa1eb4c7a2',
    width: 300,
    height: 250,
  },
}

export default function NinjaAd({ type }: { type: AdType }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const config = AD_CONFIG[type]
    const script = document.createElement('script')
    script.src = config.src
    script.async = true
    container.appendChild(script)

    return () => {
      if (container) {
        container.innerHTML = ''
      }
    }
  }, [type])

  const config = AD_CONFIG[type]

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: config.height,
        width: '100%',
        maxWidth: config.width,
        margin: '16px auto',
        overflow: 'hidden',
      }}
    />
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
      <div className="ninja-ad-pc">
        <NinjaAd type={pc} />
      </div>
      <div className="ninja-ad-sp">
        <NinjaAd type={sp} />
      </div>
      <style jsx global>{`
        .ninja-ad-sp { display: none; }
        .ninja-ad-pc { display: block; }
        @media (max-width: 768px) {
          .ninja-ad-sp { display: block; }
          .ninja-ad-pc { display: none; }
        }
      `}</style>
    </>
  )
}
