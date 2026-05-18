'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'sticky-ad-dismissed'

export default function StickyBottomAd() {
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    try {
      const v = sessionStorage.getItem(STORAGE_KEY)
      if (v !== '1') setDismissed(false)
    } catch {
      setDismissed(false)
    }
  }, [])

  if (dismissed) return null

  const close = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, '1')
    } catch {}
    setDismissed(true)
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .sticky-ad-wrap {
          position: fixed;
          left: 50%;
          bottom: calc(64px + env(safe-area-inset-bottom, 0px));
          transform: translateX(-50%);
          z-index: 50;
          display: flex;
          align-items: flex-start;
          background: rgba(20, 20, 20, 0.85);
          backdrop-filter: blur(8px);
          border-radius: 6px;
          padding: 2px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        }
        .sticky-ad-close {
          appearance: none;
          background: rgba(0, 0, 0, 0.6);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.3);
          width: 20px;
          height: 20px;
          border-radius: 50%;
          font-size: 14px;
          line-height: 1;
          cursor: pointer;
          padding: 0;
          margin-left: 4px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .sticky-ad-close:hover {
          background: rgba(0, 0, 0, 0.85);
        }
        @media (min-width: 769px) {
          .sticky-ad-wrap {
            bottom: 16px;
          }
        }
      `}} />
      <div className="sticky-ad-wrap" role="complementary" aria-label="広告">
        <iframe
          src="/ads/sticky.html"
          style={{ width: 320, height: 50, border: 'none', overflow: 'hidden', display: 'block' }}
          scrolling="no"
          title="広告"
        />
        <button
          className="sticky-ad-close"
          onClick={close}
          aria-label="広告を閉じる"
          type="button"
        >×</button>
      </div>
    </>
  )
}
