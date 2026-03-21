"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { clearAuthCache } from "@/lib/auth";
import styles from "./auth-drawer.module.css";

type Mode = "login" | "register";

type Labels = {
  loginTitle: string;
  loginSub: string;
  emailLabel: string;
  passwordLabel: string;
  loggingIn: string;
  loginButton: string;
  noAccount: string;
  toRegister: string;
  registerTitle: string;
  registerSub: string;
  registering: string;
  registerButton: string;
  hasAccount: string;
  toLogin: string;
  alertEmailPassword: string;
  alertLoginFailed: string;
  alertRegisterFailed: string;
  alertVerifyEmail: string;
  alertLockoutJustLocked: string;
  alertLockoutStillLocked: string;
  alertAttemptsLeft: string;
};

function AuthDrawerInner({ locale, labels }: { locale: string; labels: Labels }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const modalParam = searchParams.get("modal");
  const isOpen = modalParam === "login" || modalParam === "register";
  const [mode, setMode] = useState<Mode>(modalParam === "register" ? "register" : "login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (modalParam === "login" || modalParam === "register") {
      setMode(modalParam);
    }
  }, [modalParam]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const close = () => {
    router.replace(pathname, { scroll: false });
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setEmail("");
    setPassword("");
    router.replace(`${pathname}?modal=${next}`, { scroll: false });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      alert(labels.alertEmailPassword);
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, locale }),
      });
      const json = await res.json();

      if (res.status === 423) {
        if (json.justLocked) {
          alert(labels.alertLockoutJustLocked);
        } else {
          alert(labels.alertLockoutStillLocked.replace("{mins}", String(json.remainingMinutes ?? 30)));
        }
        return;
      }

      if (!res.ok) {
        if (json.attemptsLeft != null) {
          alert(labels.alertAttemptsLeft.replace("{count}", String(json.attemptsLeft)));
        } else {
          alert(`${labels.alertLoginFailed}${json.error}`);
        }
        return;
      }

      await supabase.auth.setSession(json.session);
      clearAuthCache();
      window.location.href = `/${locale}`;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      alert(labels.alertEmailPassword);
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, locale }),
      });
      const json = await res.json();
      if (!res.ok) { alert(`${labels.alertRegisterFailed}${json.error}`); return; }
      alert(labels.alertVerifyEmail);
      window.location.href = `/${locale}/login`;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div
        className={`${styles.overlay} ${isOpen ? styles.overlayVisible : ""}`}
        onClick={close}
      />

      <div className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ""}`}>
        <div className={styles.drawerHeader}>
          <p className={styles.drawerTitle}>ACCOUNT</p>
          <button className={styles.closeButton} onClick={close} aria-label="close">
            ✕
          </button>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${mode === "login" ? styles.tabActive : ""}`}
            onClick={() => switchMode("login")}
          >
            LOGIN
          </button>
          <button
            className={`${styles.tab} ${mode === "register" ? styles.tabActive : ""}`}
            onClick={() => switchMode("register")}
          >
            REGISTER
          </button>
        </div>

        <div className={styles.drawerBody}>
          {mode === "login" ? (
            <>
              <h2 className={styles.sectionTitle}>{labels.loginTitle}</h2>
              <p className={styles.sectionSub}>{labels.loginSub}</p>
              <form onSubmit={handleLogin}>
                <div className={styles.formGroup}>
                  <label htmlFor="auth-email">{labels.emailLabel}</label>
                  <input id="auth-email" type="email" className={styles.formControl} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="auth-password">{labels.passwordLabel}</label>
                  <input id="auth-password" type="password" className={styles.formControl} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
                </div>
                <div className={styles.submitRow}>
                  <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
                    {isSubmitting ? labels.loggingIn : labels.loginButton}
                  </button>
                </div>
              </form>
              <div className={styles.authFooter}>
                <span>{labels.noAccount}</span>
                <button className={styles.switchLink} onClick={() => switchMode("register")}>{labels.toRegister}</button>
              </div>
            </>
          ) : (
            <>
              <h2 className={styles.sectionTitle}>{labels.registerTitle}</h2>
              <p className={styles.sectionSub}>{labels.registerSub}</p>
              <form onSubmit={handleRegister}>
                <div className={styles.formGroup}>
                  <label htmlFor="reg-email">{labels.emailLabel}</label>
                  <input id="reg-email" type="email" className={styles.formControl} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="reg-password">{labels.passwordLabel}</label>
                  <input id="reg-password" type="password" className={styles.formControl} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
                </div>
                <div className={styles.submitRow}>
                  <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
                    {isSubmitting ? labels.registering : labels.registerButton}
                  </button>
                </div>
              </form>
              <div className={styles.authFooter}>
                <span>{labels.hasAccount}</span>
                <button className={styles.switchLink} onClick={() => switchMode("login")}>{labels.toLogin}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default function AuthDrawer({ locale, labels }: { locale: string; labels: Labels }) {
  return (
    <Suspense fallback={null}>
      <AuthDrawerInner locale={locale} labels={labels} />
    </Suspense>
  );
}
