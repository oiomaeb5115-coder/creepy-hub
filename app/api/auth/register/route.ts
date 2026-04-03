import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { checkRateLimit } from "@/lib/rateLimit";

const REGISTER_RATE_LIMIT = {
  name: "register",
  windowMs: 15 * 60 * 1000, // 15分
  maxRequests: 5,            // 15分あたり5回まで
};

export async function POST(req: NextRequest) {
  const { email, password, locale } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "メールアドレスとパスワードを入力してください" }, { status: 400 });
  }

  // IPアドレスベースのレート制限
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rateCheck = checkRateLimit(REGISTER_RATE_LIMIT, ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "リクエストが多すぎます。しばらくしてからお試しください。" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rateCheck.retryAfterMs / 1000)) } }
    );
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // SITE_URL を使用し、未設定時はハードコードされたデフォルトにフォールバック
  // （信頼できない origin ヘッダーは使用しない）
  const origin = process.env.SITE_URL ?? "https://creepyhub.com";

  // 既存ユーザーか確認（email フィルターで1件だけ取得）
  // NOTE: メールアドレスがURLクエリパラメータに含まれるが、これはサーバーサイド(Route Handler)から
  // Supabase への直接通信であり、ブラウザには露出しない。Supabase Admin API は GET のみ対応のため
  // クエリパラメータでの指定が必須。
  const lookupRes = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}&per_page=1`,
    {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      },
    }
  );
  const lookupJson = await lookupRes.json();
  console.log("[Register] lookup result:", JSON.stringify({
    userCount: lookupJson?.users?.length ?? 0,
    firstUser: lookupJson?.users?.[0] ? {
      id: lookupJson.users[0].id,
      email: lookupJson.users[0].email,
      email_confirmed_at: lookupJson.users[0].email_confirmed_at,
      deleted_at: lookupJson.users[0].deleted_at,
    } : null,
  }));
  const existingUser = (lookupJson?.users as { id: string; email_confirmed_at: string | null }[] | undefined)?.[0];

  if (existingUser?.email_confirmed_at) {
    console.log("[Register] existing confirmed user found, returning early");
    // すでに登録済みでも同一レスポンスを返す（メールアドレス列挙攻撃を防ぐため）
    return NextResponse.json({ success: true });
  }

  // 未確認ユーザーが存在する場合は削除して再作成
  if (existingUser) {
    await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
  }

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: { redirectTo: `${origin}/${locale ?? "ja"}/auth/callback?type=register` },
  });

  if (error) {
    console.error("[Register] generateLink error:", error.message);
    return NextResponse.json({ error: error.message ?? "登録に失敗しました" }, { status: 400 });
  }

  if (!data?.properties?.action_link) {
    console.error("[Register] generateLink returned no action_link:", JSON.stringify(data));
    return NextResponse.json({ error: "確認リンクの生成に失敗しました" }, { status: 500 });
  }

  const confirmationUrl = data.properties.action_link;
  console.log("[Register] confirmation link generated for:", email);

  // generateLink は admin API のためユーザーが自動確認される場合がある
  // メール確認を必須にするため、email_confirmed_at を明示的にクリアする
  if (data.user?.id) {
    await fetch(
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
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data: emailData, error: emailError } = await resend.emails.send({
    from: "creepy.hub <noreply@creepyhub.com>",
    to: email,
    subject: "【creepy.hub】メールアドレスの確認",
    html: buildEmailHtml(confirmationUrl),
  });

  if (emailError) {
    console.error("[Register] Resend email error:", JSON.stringify(emailError));
    return NextResponse.json({ error: "メール送信に失敗しました" }, { status: 500 });
  }

  console.log("[Register] email sent successfully, id:", emailData?.id);
  return NextResponse.json({ success: true });
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildEmailHtml(confirmationUrl: string): string {
  const safeUrl = escapeHtml(confirmationUrl);
  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
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
                creepy.hub にご登録いただきありがとうございます。<br>
                下のボタンをクリックしてメールアドレスを確認してください。
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:8px 0 32px;">
              <a href="${safeUrl}"
                 style="display:inline-block;padding:14px 36px;background:#ffffff;color:#000000;text-decoration:none;font-size:13px;font-weight:bold;letter-spacing:0.1em;">
                メールアドレスを確認する
              </a>
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid #222222;padding-top:24px;">
              <p style="margin:0;color:#555555;font-size:11px;line-height:1.7;">
                このメールに心当たりがない場合は無視していただいて構いません。<br>
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
