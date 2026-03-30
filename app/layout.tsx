import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  metadataBase: new URL("https://creepyhub.com"),
  title: {
    default: "creepy hub | イナクロ怪集部",
    template: "%s | creepy hub",
  },
  description:
    "イナクロ怪集部が運営する怪談・都市伝説・オカルト情報サイト。怖い話の投稿・閲覧や、オカルトWikiが楽しめます。",
  keywords: [
    "イナクロ怪集部",
    "creepy hub",
    "怪談",
    "都市伝説",
    "オカルト",
    "怖い話",
    "心霊",
    "怪集部",
  ],
  authors: [{ name: "イナクロ怪集部" }],
  creator: "イナクロ怪集部",
  verification: {
    google: "CEXYVBT-gNDaaYB6azIPikNpzpBOW2tZzBCJZn1QhJw",
  },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "creepy hub",
    title: "creepy hub | イナクロ怪集部",
    description:
      "イナクロ怪集部が運営する怪談・都市伝説・オカルト情報サイト。",
  },
  twitter: {
    card: "summary_large_image",
    title: "creepy hub | イナクロ怪集部",
    description:
      "イナクロ怪集部が運営する怪談・都市伝説・オカルト情報サイト。",
    creator: "@inakuro_kaishuu",
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}