/**
 * send-welcome-email — Stride Quest waitlist welcome
 *
 * Called client-side immediately after join_waitlist_anon succeeds.
 * Sends a branded HTML welcome email via Resend, then fires a Supabase
 * magic-link OTP so the user can reach status.html without a separate sign-in.
 *
 * POST body: { email, share_code, queue_position, cohort, site_origin }
 *
 * Env vars required:
 *   RESEND_API_KEY        — from resend.com
 *   SUPABASE_URL          — auto-injected by Supabase Edge Runtime
 *   SUPABASE_SERVICE_ROLE_KEY — for sending OTP on behalf of user
 *   SITE_ORIGIN           — e.g. https://stridequestwaitlist.netlify.app
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, share_code, queue_position, cohort, site_origin } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "invalid email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const origin = site_origin || Deno.env.get("SITE_ORIGIN") || "https://stridequestwaitlist.netlify.app";
    const shareLink = `${origin}/?ref=${share_code}`;
    const statusLink = `${origin}/signin.html?email=${encodeURIComponent(email)}`;
    const leaderboardLink = `${origin}/leaderboard.html`;

    const isCohort01 = cohort === "01";
    const tierLabel = isCohort01 ? "COHORT 01" : "WAITLIST";
    const tierColour = isCohort01 ? "#10B981" : "#FFD60A";
    const posLabel = queue_position != null ? `#${queue_position}` : "—";

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>You're in, Strider.</title>
</head>
<body style="margin:0;padding:0;background:#0A0A0C;font-family:-apple-system,'Inter',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">

<!-- Outer wrapper -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0A0A0C;min-height:100vh;">
<tr><td align="center" style="padding:40px 16px;">

<!-- Card -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#17171C;border:1px solid #23232B;border-radius:24px;overflow:hidden;">

  <!-- Gold top-border stripe -->
  <tr><td style="background:linear-gradient(90deg,transparent,#FFD60A,transparent);height:1px;padding:0;font-size:0;">&nbsp;</td></tr>

  <!-- Header -->
  <tr><td style="padding:32px 36px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="vertical-align:middle;">
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="width:36px;height:36px;background:#FFD60A;border-radius:50%;text-align:center;vertical-align:middle;">
                <span style="font-weight:800;font-size:18px;color:#0A0A0C;line-height:36px;">S</span>
              </td>
              <td style="padding-left:10px;font-weight:700;font-size:15px;letter-spacing:0.06em;color:#FFFFFF;">STRIDE QUEST</td>
            </tr>
          </table>
        </td>
        <td align="right">
          <span style="display:inline-block;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.35);color:#10B981;padding:5px 12px;border-radius:999px;font-size:10px;font-family:monospace;letter-spacing:.18em;text-transform:uppercase;">● LIVE</span>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Hero -->
  <tr><td style="padding:36px 36px 0;">
    <p style="margin:0 0 14px;font-family:monospace;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:${tierColour};">${tierLabel} · LONDON LAUNCH</p>
    <h1 style="margin:0 0 16px;font-weight:800;font-size:38px;line-height:1.05;letter-spacing:-0.03em;color:#FFFFFF;">You're in,<br><span style="color:#FFD60A;">Strider.</span></h1>
    <p style="margin:0;font-size:16px;line-height:1.6;color:#7A7A86;">
      ${isCohort01
        ? "You've got <strong style='color:#FFFFFF;'>Cohort 01 priority access</strong> — you'll be among the first to walk when Stride Quest launches in London. The city's about to become a game."
        : "You're on the waitlist. London's about to become a game — and you're in early. Every step will earn. Every borough will compete. You're ahead of everyone who hasn't signed up yet."}
    </p>
  </td></tr>

  <!-- Position card -->
  <tr><td style="padding:28px 36px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,rgba(255,214,10,0.07),rgba(255,214,10,0.02));border:1px solid rgba(255,214,10,0.2);border-radius:16px;">
      <tr><td style="padding:24px 24px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="text-align:center;border-right:1px solid #23232B;padding-right:20px;">
              <div style="font-weight:800;font-size:48px;line-height:1;letter-spacing:-0.04em;color:#FFD60A;font-variant-numeric:tabular-nums;">${posLabel}</div>
              <div style="font-family:monospace;font-size:9px;letter-spacing:.18em;color:#7A7A86;text-transform:uppercase;margin-top:6px;">QUEUE POSITION</div>
            </td>
            <td style="text-align:center;padding-left:20px;">
              <div style="display:inline-block;background:${isCohort01 ? "rgba(16,185,129,0.12)" : "rgba(255,214,10,0.1)"};border:1px solid ${isCohort01 ? "rgba(16,185,129,0.35)" : "rgba(255,214,10,0.3)"};color:${tierColour};padding:6px 14px;border-radius:999px;font-family:monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;">${tierLabel}</div>
              <div style="font-family:monospace;font-size:9px;letter-spacing:.18em;color:#7A7A86;text-transform:uppercase;margin-top:10px;">YOUR TIER</div>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </td></tr>

  <!-- Climb section -->
  <tr><td style="padding:28px 36px 0;">
    <p style="margin:0 0 16px;font-family:monospace;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#7A7A86;">THE REFERRAL CLIMB</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #23232B;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="width:28px;font-size:18px;">🏃</td>
              <td style="font-size:14px;color:#CCCCCC;padding:0 8px;line-height:1.4;"><strong style="color:#FFFFFF;">3 referrals</strong> → promoted to Cohort 01</td>
              <td align="right" style="font-family:monospace;font-size:10px;color:#FFD60A;white-space:nowrap;">3 REFS</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #23232B;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="width:28px;font-size:18px;">⚡</td>
              <td style="font-size:14px;color:#CCCCCC;padding:0 8px;line-height:1.4;"><strong style="color:#FFFFFF;">10 referrals</strong> → free Stride+ for 1 year (£60)</td>
              <td align="right" style="font-family:monospace;font-size:10px;color:#FFD60A;white-space:nowrap;">10 REFS</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="width:28px;font-size:18px;">🏛️</td>
              <td style="font-size:14px;color:#CCCCCC;padding:0 8px;line-height:1.4;"><strong style="color:#FFFFFF;">25 referrals</strong> → free Founder membership (£99/yr)</td>
              <td align="right" style="font-family:monospace;font-size:10px;color:#FFD60A;white-space:nowrap;">25 REFS</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Share link -->
  <tr><td style="padding:28px 36px 0;">
    <p style="margin:0 0 10px;font-family:monospace;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#7A7A86;">YOUR PERSONAL INVITE LINK</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0E0E12;border:1px solid #FFD60A;border-radius:12px;">
      <tr><td style="padding:14px 16px;font-family:monospace;font-size:13px;color:#FFD60A;word-break:break-all;">${shareLink}</td></tr>
    </table>
    <p style="margin:10px 0 0;font-size:13px;color:#7A7A86;line-height:1.5;">Share this link. Every friend who signs up through it moves you up the queue — and earns you rewards.</p>
  </td></tr>

  <!-- CTA buttons -->
  <tr><td style="padding:28px 36px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding-right:8px;">
          <a href="${statusLink}" style="display:block;text-align:center;background:#FFD60A;color:#0A0A0C;padding:15px 20px;border-radius:12px;font-weight:700;font-size:15px;text-decoration:none;letter-spacing:-0.01em;">Check my queue position →</a>
        </td>
        <td style="padding-left:8px;">
          <a href="${leaderboardLink}" style="display:block;text-align:center;background:transparent;border:1px solid #23232B;color:#7A7A86;padding:15px 20px;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;">View leaderboard</a>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- What is Stride Quest -->
  <tr><td style="padding:28px 36px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0E0E12;border:1px solid #23232B;border-radius:16px;">
      <tr><td style="padding:20px 22px;">
        <p style="margin:0 0 10px;font-family:monospace;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#7A7A86;">WHAT IS STRIDE QUEST?</p>
        <p style="margin:0;font-size:14px;line-height:1.65;color:#CCCCCC;">London's first <strong style="color:#FFFFFF;">AR walking game</strong> — walk to earn, stake coins on routes, compete by borough. Every step has a value. Every borough has a leaderboard. Launch is Cohort 01 only. Invites are scarce.</p>
      </td></tr>
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:28px 36px 36px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #23232B;">
      <tr><td style="padding-top:24px;text-align:center;">
        <p style="margin:0 0 8px;font-size:12px;color:#7A7A86;">You're receiving this because you joined the Stride Quest waitlist.</p>
        <p style="margin:0;font-family:monospace;font-size:10px;letter-spacing:.12em;color:#3A3A46;text-transform:uppercase;">STRIDE QUEST · LONDON · 2026</p>
      </td></tr>
    </table>
  </td></tr>

</table>
<!-- /Card -->

</td></tr>
</table>
<!-- /Outer -->
</body>
</html>`;

    const plainText = `You're in the Stride Quest waitlist.

Queue position: ${posLabel}
Tier: ${tierLabel}

Your invite link: ${shareLink}

Referral rewards:
- 3 referrals → Cohort 01 priority access
- 10 referrals → free Stride+ for 1 year (£60)
- 25 referrals → free Founder membership (£99/yr)

Check your status: ${statusLink}
View leaderboard: ${leaderboardLink}

Stride Quest — London's AR walking game. Walk to earn. Stake to win. Launch is Cohort 01 only.`;

    // Send via Resend
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.error("RESEND_API_KEY not set");
      return new Response(JSON.stringify({ error: "email service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Stride Quest <welcome@stridequest.xyz>",
        to: [email],
        subject: `You're in, Strider — your queue position is ${posLabel}`,
        html,
        text: plainText,
      }),
    });

    if (!emailRes.ok) {
      const errBody = await emailRes.text();
      console.error("Resend error:", errBody);
      return new Response(JSON.stringify({ error: "email send failed", detail: errBody }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("send-welcome-email error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
