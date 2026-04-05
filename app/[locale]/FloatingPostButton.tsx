"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./floating-post-button.module.css";

type Props = { locale: string };

export default function FloatingPostButton({ locale }: Props) {
  const pathname = usePathname();

  const hide =
    pathname.endsWith("/wiki/submit") ||
    /\/wiki\/[^/]+\/edit$/.test(pathname) ||
    pathname.endsWith("/post/new");

  if (hide) return null;

  return (
    <Link href={`/${locale}/post/new`} className={styles.floatingButton} aria-label="New Post">
      <Image src="/images/ui/post.png" alt="POST" width={68} height={68} priority style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    </Link>
  );
}
