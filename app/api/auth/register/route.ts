import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/getClientIp";

const REGISTER_RATE_LIMIT = {
  name: "register",
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
};

type AdminLookupUser = {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  deleted_at: string | null;
};

export async function POST(req: NextRequest) {
  const { email, password, locale } = await req.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "メールアドレスとパスワードを入力してください" },
      { status: 400 }
    );
  }

  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "有効なメールアドレスを入力してください" },
      { status: 400 }
    );
  }

  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    return NextResponse.json(
      { error: "パスワードは8文字以上128文字以下で入力してください" },
      { status: 400 }
    );
  }

  const ip = getClientIp(req);
  const rateCheck = checkRateLimit(REGISTER_RATE_LIMIT, ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "リクエストが多すぎます。しばらくしてから再度お試しください" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rateCheck.retryAfterMs / 1000)) } }
    );
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const origin = process.env.SITE_URL ?? "https://creepyhub.com";

  const lookupRes = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}&per_page=1`,
    {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      },
    }
  );

  if (!lookupRes.ok) {
    console.error("[Register] user lookup failed:", lookupRes.status, await lookupRes.text());
    return NextResponse.json({ error: "登録前の確認に失敗しました" }, { status: 500 });
  }

  const lookupJson = await lookupRes.json();
  const existingUser =
    (lookupJson?.users as AdminLookupUser[] | undefined)?.find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    ) ?? null;

  const { data: existingProfile, error: existingProfileError } = existingUser
    ? await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("id", existingUser.id)
        .maybeSingle()
    : { data: null, error: null };

  if (existingProfileError) {
    console.error("[Register] profile lookup error:", existingProfileError.message);
    return NextResponse.json({ error: "既存アカウントの確認に失敗しました" }, { status: 500 });
  }

  if (existingUser?.email_confirmed_at) {
    if (!existingProfile) {
      console.error("[Register] confirmed user exists without profile:", existingUser.id);
      return NextResponse.json(
        { error: "このメールアドレスの既存アカウント状態を確認してください" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "このメールアドレスは既に登録されています" },
      { status: 409 }
    );
  }

  if (existingUser) {
    if (existingProfile) {
      return NextResponse.json(
        { error: "メール確認が完了していない既存登録があります。受信メールをご確認ください" },
        { status: 409 }
      );
    }

    const { error: deleteGhostError } = await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
    if (deleteGhostError) {
      console.error("[Register] ghost user delete error:", deleteGhostError.message);
      return NextResponse.json(
        { error: "既存の未確認登録の整理に失敗しました" },
        { status: 500 }
      );
    }
  }

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: { redirectTo: `${origin}/${locale ?? "ja"}/auth/callback?type=register` },
  });

  if (error) {
    console.error("[Register] generateLink error:", error.message);
    return NextResponse.json({ error: "登録に失敗しました" }, { status: 400 });
  }

  if (!data?.properties?.action_link) {
    console.error("[Register] generateLink returned no action_link:", JSON.stringify(data));
    return NextResponse.json({ error: "確認リンクの生成に失敗しました" }, { status: 500 });
  }

  const confirmationUrl = data.properties.action_link;

  if (data.user?.id) {
    const confirmResetRes = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${data.user.id}`,
      {
        method: "PUT",
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email_confirm: false }),
      }
    );

    if (!confirmResetRes.ok) {
      console.error(
        "[Register] failed to reset email_confirm flag:",
        confirmResetRes.status,
        await confirmResetRes.text()
      );
      return NextResponse.json({ error: "登録状態の初期化に失敗しました" }, { status: 500 });
    }

    const randomUsername = `user_${Math.floor(100000 + Math.random() * 900000)}`;
    const { error: profileUpsertError } = await supabaseAdmin
      .from("profiles")
      .upsert({ id: data.user.id, username: randomUsername, display_name: null });

    if (profileUpsertError) {
      console.error("[Register] profile upsert error:", profileUpsertError.message);
      return NextResponse.json({ error: "プロフィール初期化に失敗しました" }, { status: 500 });
    }
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error: emailError } = await resend.emails.send({
    from: "creepy.hub <noreply@creepyhub.com>",
    to: email,
    subject: "creepy.hub メールアドレス確認",
    html: buildEmailHtml(confirmationUrl),
  });

  if (emailError) {
    console.error("[Register] Resend email error:", JSON.stringify(emailError));
    return NextResponse.json({ error: "確認メールの送信に失敗しました" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildEmailHtml(confirmationUrl: string): string {
  const safeUrl = escapeHtml(confirmationUrl);

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#111111;border:1px solid #222222;padding:48px 40px;">
          <tr>
            <td align="center" style="padding-bottom:32px;border-bottom:1px solid #222222;">
              <p style="margin:0;color:#888888;font-size:11px;letter-spacing:0.2em;">HORROR ARCHIVE</p>
              <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;letter-spacing:0.15em;font-weight:400;">creepy.hub</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 0 24px;">
              <p style="margin:0 0 8px;color:#cccccc;font-size:15px;">メールアドレスの確認</p>
              <p style="margin:0;color:#888888;font-size:13px;line-height:1.7;">
                creepy.hub への登録ありがとうございます。<br>
                下のボタンからメールアドレスの確認を完了してください。
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:8px 0 32px;">
              <a href="${safeUrl}" style="display:inline-block;padding:14px 36px;background:#ffffff;color:#000000;text-decoration:none;font-size:13px;font-weight:bold;letter-spacing:0.1em;">
                メールアドレスを確認する
              </a>
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid #222222;padding-top:24px;">
              <p style="margin:0;color:#555555;font-size:11px;line-height:1.7;">
                このメールに心当たりがない場合は、そのまま破棄してください。<br>
                リンクの有効期限は24時間です。
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
