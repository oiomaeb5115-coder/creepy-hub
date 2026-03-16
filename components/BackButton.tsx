"use client";

import { useRouter, usePathname } from "next/navigation";
import styles from "./BackButton.module.css";

export default function BackButton() {
  const router = useRouter();
  const pathname = usePathname();
  const label = pathname.startsWith("/en") ? "← Back" : "← 戻る";

  return (
    <button className={styles.backButton} onClick={() => router.back()}>
      {label}
    </button>
  );
}
