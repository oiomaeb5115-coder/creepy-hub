"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import styles from "./PopularPeriodDropdown.module.css";

type Props = {
  locale: string;
  currentPeriod: string;
  labels: {
    today: string;
    "3days": string;
    week: string;
    month: string;
  };
};

const periods = ["today", "3days", "week", "month"] as const;

export default function PopularPeriodDropdown({ locale, currentPeriod, labels }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const labelMap: Record<string, string> = {
    today: labels.today,
    "3days": labels["3days"],
    week: labels.week,
    month: labels.month,
  };

  return (
    <div className={styles.wrapper} ref={ref}>
      <button
        className={styles.triggerButton}
        onClick={() => setOpen((v) => !v)}
        aria-label="Select period"
      >
        <span className={styles.currentLabel}>{labelMap[currentPeriod]}</span>
        <svg
          className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
        >
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className={styles.dropdown}>
          {periods.map((p) => (
            <Link
              key={p}
              href={`/${locale}?sort=popular&period=${p}`}
              className={`${styles.dropdownItem} ${p === currentPeriod ? styles.dropdownItemActive : ""}`}
              onClick={() => setOpen(false)}
            >
              {labelMap[p]}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
