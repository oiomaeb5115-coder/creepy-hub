import type { Metadata } from "next";
import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  return { robots: { index: false, follow: true } };
}

export default async function LoginPage({ params }: Props) {
  const { locale } = await params;
  redirect(`/${locale}?modal=login`);
}
