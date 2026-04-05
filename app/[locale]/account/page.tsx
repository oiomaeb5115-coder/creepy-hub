"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AccountPage() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "ja";
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace(`/${locale}/?modal=login`);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      if (data?.username) {
        router.replace(`/${locale}/u/${data.username}`);
      } else {
        router.replace(`/${locale}/account/settings`);
      }
      setChecked(true);
    })();
  }, [locale, router]);

  if (!checked) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#050204",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#8a7870",
        }}
      >
        Loading...
      </div>
    );
  }

  return null;
}
