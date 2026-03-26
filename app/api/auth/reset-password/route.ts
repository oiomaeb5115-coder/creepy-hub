import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  const { email, locale } = await req.json();

  if (!email) {
    return NextResponse.json(
      { error: "メールアドレスを入力してください" },
      { status: 400 }
    );
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const origin = process.env.SITE_URL ?? req.headers.get("origin") ?? "";

  const { data: linkData, error } =
    await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${origin}/auth/callback?locale=${locale ?? "ja"}&type=recovery`,
      },
    });

  if (error || !linkData?.properties?.action_link) {
    // エラー詳細を返さない（メールアドレス列挙攻撃を防ぐため）
    return NextResponse.json({ success: true });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error: emailError } = await resend.emails.send({
    from: "creepy.hub <noreply@creepyhub.com>",
    to: email,
    subject: "【creepy.hub】パスワードのリセット",
    html: buildResetEmailHtml(linkData.properties.action_link),
  });

  if (emailError) {
    return NextResponse.json(
      { error: "メール送信に失敗しました" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

function buildResetEmailHtml(resetUrl: string): string {
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
                パスワードリセットのリクエストを受け付けました。<br>
                下のボタンからパスワードをリセットしてください。
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:8px 0 32px;">
              <a href="${resetUrl}"
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
