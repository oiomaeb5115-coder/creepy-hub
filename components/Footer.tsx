import Link from "next/link";
import styles from "./footer.module.css";

type Props = {
  locale: string;
  privacyLabel: string;
  termsLabel: string;
  contactLabel: string;
  rightsClaimLabel: string;
};

export default function Footer({ locale, privacyLabel, termsLabel, contactLabel, rightsClaimLabel }: Props) {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <nav className={styles.footerLinks}>
          <Link href={`/${locale}/terms-of-service`} className={styles.footerLink}>
            {termsLabel}
          </Link>
          <Link href={`/${locale}/privacy-policy`} className={styles.footerLink}>
            {privacyLabel}
          </Link>
          <Link href={`/${locale}/contact`} className={styles.footerLink}>
            {contactLabel}
          </Link>
          <Link href={`/${locale}/rights-claim`} className={styles.footerLink}>
            {rightsClaimLabel}
          </Link>
        </nav>
        <p className={styles.copyright}>&copy; 2026 creepy.hub</p>
      </div>
    </footer>
  );
}
