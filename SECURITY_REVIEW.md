# Security Review Notes

## 2026-04-21

Reviewed the Next.js/Supabase application for authorization gaps, upload abuse, and XSS hardening.

### Fixed in this pass

- Cloudflare Stream deletion authorization
  - Risk: any authenticated user could call `DELETE /api/video/[uid]` and delete a Cloudflare Stream video if they knew the uid.
  - Fix: the API now validates the uid format and only allows admins, the owning post/story author, or the user recorded as the original Direct Upload owner to delete it.

- Story video ownership and external media URL injection
  - Risk: `POST /api/story` accepted any HTTPS `media_url` and any string `stream_video_id`, allowing users to attach another user's Stream uid or an arbitrary external URL.
  - Fix: Stream upload URLs are recorded when issued, story creation must claim a matching `story` upload owned by the caller, and video `media_url` must match the configured Cloudflare Stream manifest URL. Image stories are limited to the Supabase `story-media` public bucket URL.

- Cloudflare Direct Upload URL abuse
  - Risk: authenticated users could issue unlimited Direct Upload URLs, creating cost and quota exposure.
  - Fix: upload URL issuance now has user/IP rate limiting and records uid ownership in `cloudflare_stream_uploads`.

- Login lockout denial-of-service
  - Risk: account lockout was checked before password verification, so an attacker could lock a victim out by failing five logins for their email address.
  - Fix: the login route now applies IP/email-IP rate limits and still verifies the password when an email is in a locked state. A legitimate user with the correct password can log in and reset the failed counter.

- CSP hardening
  - Risk: `script-src 'unsafe-inline'` weakens the blast-radius reduction provided by CSP if an HTML injection bug appears.
  - Fix: CSP now blocks inline event handler attributes via `script-src-attr 'none'`, limits `<base>` tag abuse with `base-uri 'self'`, restricts form submission targets with `form-action 'self'`, and upgrades insecure requests in production.

### Still recommended

- Move CSP from `script-src 'unsafe-inline'` to a nonce-based policy. This is intentionally left as a separate hardening task because App Router nonce wiring, JSON-LD, the early theme script, and ad script compatibility need broader testing.
- Move post creation through a server API if stricter Stream uid attachment tracking is required for new posts. Current post creation still relies on Supabase RLS for the insert path.
