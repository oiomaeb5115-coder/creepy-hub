"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./cookie-consent.module.css";

const STORAGE_KEY = "storage_consent_accepted";

type Props = {
  locale: string;
  message: string;
  privacyLinkText: string;
  acceptText: string;
};

export default function StorageConsent({ locale, message, privacyLinkText, acceptText }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY) && !localStorage.getItem("cookie_consent_accepted")) {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // localStorage unavailable
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className={styles.banner} role="alert">
      <p className={styles.text}>
        {message}{" "}
        <Link href={`/${locale}/privacy-policy`} className={styles.link}>
          {privacyLinkText}
        </Link>
      </p>
      <button className={styles.acceptButton} onClick={handleAccept}>
        {acceptText}
      </button>
    </div>
  );
}
