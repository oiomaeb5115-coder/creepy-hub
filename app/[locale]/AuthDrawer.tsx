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
  orDivider: string;
  googleLogin: string;
  googleRegister: string;
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

  const handleGoogleOAuth = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?locale=${locale}&type=oauth`,
      },
    });
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

  const googleIcon = (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 19.001 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
    </svg>
  );

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
              <div className={styles.divider}>{labels.orDivider}</div>
              <button type="button" className={styles.googleButton} onClick={handleGoogleOAuth}>
                {googleIcon}{labels.googleLogin}
              </button>
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
              <div className={styles.divider}>{labels.orDivider}</div>
              <button type="button" className={styles.googleButton} onClick={handleGoogleOAuth}>
                {googleIcon}{labels.googleRegister}
              </button>
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
