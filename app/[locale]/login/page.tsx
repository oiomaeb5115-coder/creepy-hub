import type { Metadata } from "next";
import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ err?: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  return { robots: { index: false, follow: true } };
}

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { err } = await searchParams;
  const target = err
    ? `/${locale}?modal=login&err=${encodeURIComponent(err)}`
    : `/${locale}?modal=login`;
  redirect(target);
}
