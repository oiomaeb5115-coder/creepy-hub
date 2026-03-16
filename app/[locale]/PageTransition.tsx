"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import styles from "./page-transition.module.css";

// ナビバーのタブ順序。左のタブ → 右のタブへの移動は右スライド、逆は左スライド
const NAV_ORDER = ["/", "/story", "/wiki", "/u", "/account", "/notifications", "/login", "/register"];

function getNavIndex(pathname: string, locale: string): number {
  const stripped = pathname.replace(`/${locale}`, "") || "/";
  const match = NAV_ORDER.findIndex((p) => stripped === p || stripped.startsWith(p + "/"));
  return match === -1 ? 0 : match;
}

export default function PageTransition({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: string;
}) {
  const pathname = usePathname();
  const prevIndexRef = useRef<number>(getNavIndex(pathname, locale));
  const [animClass, setAnimClass] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentIndex = getNavIndex(pathname, locale);
    const prevIndex = prevIndexRef.current;

    const direction = currentIndex >= prevIndex ? styles.slideRight : styles.slideLeft;

    const el = containerRef.current;
    if (el) {
      el.classList.remove(styles.slideRight, styles.slideLeft);
      void el.offsetWidth; // reflow で再トリガー
      el.classList.add(direction);
    }
    setAnimClass(direction);
    prevIndexRef.current = currentIndex;
  }, [pathname, locale]);

  return (
    <div ref={containerRef} className={animClass}>
      {children}
    </div>
  );
}
