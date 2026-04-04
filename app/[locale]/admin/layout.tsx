import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
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

  // Verify the token and check admin role
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: userData, error: userError } = await anonClient.auth.getUser(accessToken);
  if (userError || !userData.user) {
    notFound();
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (profile?.role !== "admin") {
    notFound();
  }

  return <>{children}</>;
}
