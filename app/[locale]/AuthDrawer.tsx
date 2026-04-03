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
  alertEmailNotConfirmed: string;
  alertLockoutJustLocked: string;
  alertLockoutStillLocked: string;
  alertAttemptsLeft: string;
  orDivider: string;
  googleLogin: string;
  googleRegister: string;
  discordLogin: string;
  discordRegister: string;
  ageConfirm: string;
  termsLink: string;
  termsAnd: string;
  privacyLink: string;
  termsAgree: string;
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
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

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

      if (res.status === 403 && json.error === "email_not_confirmed") {
        alert(labels.alertEmailNotConfirmed);
        return;
      }

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
    const type = mode === "register" ? "register" : "oauth";
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/${locale}/auth/callback?type=${type}`,
      },
    });
  };

  const handleDiscordOAuth = async () => {
    const type = mode === "register" ? "register" : "oauth";
    await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: `${window.location.origin}/${locale}/auth/callback?type=${type}`,
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
      window.location.href = `/${locale}/register/email-sent`;
    } finally {
      setIsSubmitting(false);
    }
  };

  const discordIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="#5865F2">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  );

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
          <button className={styles.closeButton} onClick={close} aria-label="close">
            ✕
          </button>
        </div>

        <img
          src="/images/ui/auth-logo.png"
          alt="logo"
          className={styles.drawerLogo}
        />

        <div className={styles.drawerInner}>
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
              <button type="button" className={styles.discordButton} onClick={handleDiscordOAuth}>
                {discordIcon}{labels.discordLogin}
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
                <div className={styles.checkboxGroup}>
                  <label className={styles.checkboxLabel}>
                    <input type="checkbox" checked={ageConfirmed} onChange={(e) => setAgeConfirmed(e.target.checked)} className={styles.checkbox} />
                    <span>{labels.ageConfirm}</span>
                  </label>
                </div>
                <div className={styles.checkboxGroup}>
                  <label className={styles.checkboxLabel}>
                    <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className={styles.checkbox} />
                    <span>
                      <a href={`/${locale}/terms-of-service`} target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>{labels.termsLink}</a>
                      {labels.termsAnd}
                      <a href={`/${locale}/privacy-policy`} target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>{labels.privacyLink}</a>
                      {labels.termsAgree}
                    </span>
                  </label>
                </div>
                <div className={styles.submitRow}>
                  <button type="submit" className={styles.primaryButton} disabled={isSubmitting || !ageConfirmed || !termsAccepted}>
                    {isSubmitting ? labels.registering : labels.registerButton}
                  </button>
                </div>
              </form>
              <div className={styles.divider}>{labels.orDivider}</div>
              <button type="button" className={styles.googleButton} disabled={!ageConfirmed || !termsAccepted} onClick={handleGoogleOAuth}>
                {googleIcon}{labels.googleRegister}
              </button>
              <button type="button" className={styles.discordButton} disabled={!ageConfirmed || !termsAccepted} onClick={handleDiscordOAuth}>
                {discordIcon}{labels.discordRegister}
              </button>
              <div className={styles.authFooter}>
                <span>{labels.hasAccount}</span>
                <button className={styles.switchLink} onClick={() => switchMode("login")}>{labels.toLogin}</button>
              </div>
            </>
          )}
        </div>
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
