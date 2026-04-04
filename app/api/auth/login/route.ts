import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 30;

export async function POST(req: NextRequest) {
  const { email, password, locale } = await req.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "メールアドレスとパスワードを入力してください" },
      { status: 400 }
    );
  }

  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "有効なメールアドレスを入力してください" }, { status: 400 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // SITE_URL を使用し、未設定時はハードコードされたデフォルトにフォールバック
  // （信頼できない origin ヘッダーは使用しない）
  const origin = process.env.SITE_URL ?? "https://creepyhub.com";

  // ---- ロックアウト状態を確認 ----
  const { data: attemptRow } = await supabaseAdmin
    .from("login_attempts")
    .select("failed_count, locked_at")
    .eq("email", email)
    .maybeSingle();

  if (attemptRow?.locked_at) {
    const lockedAt = new Date(attemptRow.locked_at).getTime();
    const elapsedMs = Date.now() - lockedAt;
    const lockMs = LOCK_MINUTES * 60 * 1000;

    if (elapsedMs < lockMs) {
      const remainingMinutes = Math.ceil((lockMs - elapsedMs) / 60000);
      return NextResponse.json(
        { error: "locked", remainingMinutes },
        { status: 423 }
      );
    }

    // 30分経過 → 自動ロック解除
    await supabaseAdmin
      .from("login_attempts")
      .update({ failed_count: 0, locked_at: null })
      .eq("email", email);
  }

  // ---- メール確認済みチェック ----
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
  const targetUser = (lookupJson?.users as { email: string; email_confirmed_at: string | null }[] | undefined)
    ?.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
  if (targetUser && !targetUser.email_confirmed_at) {
    return NextResponse.json(
      { error: "email_not_confirmed" },
      { status: 403 }
    );
  }

  // ---- ログイン試行 ----
  const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabaseAnon.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // DB レベルでアトミックにインクリメント（競合状態を防ぐ）
    const { data: rpcResult } = await supabaseAdmin
      .rpc("record_login_failure", { p_email: email, p_max_attempts: MAX_ATTEMPTS });

    const newCount: number = rpcResult?.[0]?.new_count ?? 1;
    const justLocked: boolean = rpcResult?.[0]?.just_locked ?? false;

    if (justLocked) {
      // パスワードリセットメールを送信
      await sendResetEmail(email, locale ?? "ja", origin);
      return NextResponse.json(
        { error: "locked", justLocked: true },
        { status: 423 }
      );
    }

    return NextResponse.json(
      { error: "invalid", attemptsLeft: MAX_ATTEMPTS - newCount },
      { status: 401 }
    );
  }

  // ---- ログイン成功 → カウントをリセット ----
  await supabaseAdmin
    .from("login_attempts")
    .upsert(
      {
        email,
        failed_count: 0,
        locked_at: null,
        last_failed_at: new Date().toISOString(),
      },
      { onConflict: "email" }
    );

  const session = data.session;
  return NextResponse.json({
    session: {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    },
  });
}

async function sendResetEmail(
  email: string,
  locale: string,
  origin: string
) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: {
      redirectTo: `${origin}/auth/callback?locale=${locale}&type=recovery`,
    },
  });

  if (!linkData?.properties?.action_link) return;

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: "creepy.hub <noreply@creepyhub.com>",
    to: email,
    subject: "【creepy.hub】パスワードのリセット",
    html: buildResetEmailHtml(linkData.properties.action_link),
  });
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildResetEmailHtml(resetUrl: string): string {
  const safeUrl = escapeHtml(resetUrl);
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
              <p style="margin:0 0 8px;color:#cccccc;font-size:15px;">パスワードのリセット</p>
              <p style="margin:0;color:#888888;font-size:13px;line-height:1.7;">
                ログインに複数回失敗したため、セキュリティのためアカウントをロックしました。<br>
                下のボタンからパスワードをリセットしてロックを解除してください。
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:8px 0 32px;">
              <a href="${safeUrl}"
                 style="display:inline-block;padding:14px 36px;background:#ffffff;color:#000000;text-decoration:none;font-size:13px;font-weight:bold;letter-spacing:0.1em;">
                パスワードをリセットする
              </a>
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid #222222;padding-top:24px;">
              <p style="margin:0;color:#555555;font-size:11px;line-height:1.7;">
                このメールに心当たりがない場合は無視していただいて構いません。<br>
                リンクの有効期限は1時間です。
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
