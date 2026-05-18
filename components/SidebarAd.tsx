'use client'

import AdSenseAd from './AdSenseAd'

export default function SidebarAd() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .sidebar-ad-wrap { display: none; }
        @media (min-width: 1100px) {
          .sidebar-ad-wrap {
            display: block;
            position: fixed;
            top: 80px;
            left: calc(50% + 340px);
            z-index: 5;
          }
        }
      `}} />
      <div className="sidebar-ad-wrap" aria-hidden="true">
        <AdSenseAd type="sidebar" />
      </div>
    </>
  )
}
