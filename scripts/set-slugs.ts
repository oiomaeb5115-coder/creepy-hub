import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const updates = [
    { id: 9, slug: "post-anything-scary" },
    { id: 13, slug: "lets-talk-about-ryunosuke-kamiki" },
    { id: 16, slug: "looking-for-a-horror-anime-trending-on-reddit" },
    { id: 17, slug: "the-face-on-the-guardrail" },
    { id: 18, slug: "about-edwina-jardin" },
  ];

  for (const u of updates) {
    const { error } = await supabase
      .from("post")
      .update({ slug: u.slug })
      .eq("id", u.id);

    if (error) {
      console.log(`[ERROR] #${u.id}: ${error.message}`);
    } else {
      console.log(`[OK] #${u.id} → /${u.slug}`);
    }
  }
}

main();
