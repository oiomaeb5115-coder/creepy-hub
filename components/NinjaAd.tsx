'use client'

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
  const config = AD_CONFIG[type]

  // 忍者AdMaxはdocument.writeを使用するため、iframeで読み込む
  const iframeSrcDoc = `<!DOCTYPE html><html><head><style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:${config.height}px;overflow:hidden;}</style></head><body><script src="${config.src}"><\/script></body></html>`

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
        srcDoc={iframeSrcDoc}
        style={{
          width: config.width,
          height: config.height,
          border: 'none',
          overflow: 'hidden',
        }}
        scrolling="no"
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
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
