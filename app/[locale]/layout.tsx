import "@/app/globals.css";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getDictionary } from "@/lib/getDictionary";
import { isAndroidAppShellFromHeaders } from "@/lib/isCreepyHubApp";
import SidebarWrapper from "./SidebarWrapper";
import TopAppBarShortcuts from "./TopAppBarShortcuts";
import NativeBridge from "./NativeBridge";
import PushTokenRegistrar from "@/components/PushTokenRegistrar";
import PageTransition from "./PageTransition";
import FloatingPostButton from "./FloatingPostButton";
import AuthDrawer from "./AuthDrawer";
import Script from "next/script";
import BottomNav from "./BottomNav";
import WelcomeVideoModal from "@/components/WelcomeVideoModal";
import Footer from "@/components/Footer";
import StorageConsent from "@/components/StorageConsent";

const locales = ["ja", "en"] as const;
const BASE_URL = "https://creepyhub.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const dict = await getDictionary(locale);

  return {
    title: {
      default: dict.meta.title,
      template: `%s | creepy hub`,
    },
    description: dict.meta.description,
    openGraph: {
      type: "website",
      locale: locale === "en" ? "en_US" : "ja_JP",
      siteName: "creepy hub",
      title: dict.meta.title,
      description: dict.meta.description,
    },
    alternates: {
      canonical: `${BASE_URL}/${locale}`,
      languages: {
        ja: `${BASE_URL}/ja`,
        en: `${BASE_URL}/en`,
      },
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!locales.includes(locale as (typeof locales)[number])) {
    notFound();
  }

  const dict = await getDictionary(locale);
  // iOS は Native Drawer/Toolbar 未実装のため Web UI を出す必要がある。
  // Android shell でのみ Web UI を抑止する。
  const isAppShell = await isAndroidAppShellFromHeaders();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      {...(isAppShell ? { "data-app-shell": "true" } : {})}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{
              var t=localStorage.getItem('theme');
              if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);
              else if(window.matchMedia('(prefers-color-scheme:light)').matches)
                document.documentElement.setAttribute('data-theme','light');
              var p=location.pathname;
              if(/\\/(post|wiki|novel)\\//.test(p))
                document.documentElement.setAttribute('data-route','reading');
            }catch(e){}})()`,
          }}
        />
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6817166626712495"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body>
        <PageTransition>{children}</PageTransition>

        <BottomNav locale={locale} labels={dict.nav} />

        <Footer
          locale={locale}
          privacyLabel={dict.footer.privacy}
          termsLabel={dict.footer.terms}
          contactLabel={dict.footer.contact}
          rightsClaimLabel={dict.footer.rightsClaim}
        />

        <SidebarWrapper locale={locale} labels={dict.sidebar} isAppShell={isAppShell} />
        <TopAppBarShortcuts locale={locale} isAppShell={isAppShell} />
        {isAppShell && <NativeBridge />}
        {/* iOS/Android アプリ内のみで動作する（client 側で User-Agent 判定）。
            ブラウザでは no-op になるので無条件 mount で OK。 */}
        <PushTokenRegistrar />
        <FloatingPostButton locale={locale} />
        <AuthDrawer locale={locale} labels={dict.authDrawer} />
        <WelcomeVideoModal videoSrc="/welcome.webm/welcome-1.webm" />
        <StorageConsent
          locale={locale}
          message={dict.cookieConsent.message}
          privacyLinkText={dict.cookieConsent.privacyLink}
          acceptText={dict.cookieConsent.accept}
        />
      </body>
    </html>
  );
}
