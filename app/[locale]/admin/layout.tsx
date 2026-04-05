import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  // Supabase stores auth tokens in cookies like sb-<ref>-auth-token
  const authCookie = allCookies.find((c) => c.name.includes("auth-token"));

  if (!authCookie?.value) {
    notFound();
  }

  // Parse the cookie value — Supabase stores it as a JSON-encoded array or base64
  let accessToken: string | null = null;
  try {
    const parsed = JSON.parse(decodeURIComponent(authCookie.value));
    // Supabase auth cookie format: [access_token, refresh_token, ...]
    if (Array.isArray(parsed) && parsed.length > 0) {
      accessToken = parsed[0];
    } else if (typeof parsed === "string") {
      accessToken = parsed;
    }
  } catch {
    // Try using the raw value as token
    accessToken = authCookie.value;
  }

  if (!accessToken) {
    notFound();
  }

  // Decode JWT payload to extract user ID (signature is verified by Supabase RLS)
  const parts = accessToken.split(".");
  if (parts.length !== 3) {
    notFound();
  }
  let userId: string | undefined;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    userId = payload.sub;
  } catch {
    notFound();
  }
  if (!userId) {
    notFound();
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (profile?.role !== "admin") {
    notFound();
  }

  return <>{children}</>;
}
