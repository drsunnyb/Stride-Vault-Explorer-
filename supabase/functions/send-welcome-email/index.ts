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
    const stripePlusLink = `${origin}/#stride-plus`;
    const founderLink = `${origin}/#founder`;

    const isCohort01 = cohort === "01";
    const tierLabel = isCohort01 ? "COHORT 01" : "WAITLIST";
    const tierColour = isCohort01 ? "#10B981" : "#FFD60A";
    const posLabel = queue_position != null ? `#${queue_position}` : "—";

    const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>You're in, Strider.</title>
<style>
  body{margin:0!important;padding:0!important;background-color:#0A0A0C!important;}
  @media only screen and (max-width:600px){
    .card{width:100%!important;}
    .side-pad{padding-left:20px!important;padding-right:20px!important;}
    .upsell-cell{display:block!important;width:100%!important;padding:0 0 12px 0!important;}
    .h1{font-size:30px!important;}
    .pos-num{font-size:36px!important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#0A0A0C;" bgcolor="#0A0A0C">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">You're on the Stride Quest waitlist — queue position ${posLabel}. Share your link to climb. &#8203;&#xFEFF;&#8203;&#xFEFF;</div>
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" bgcolor="#0A0A0C" style="background-color:#0A0A0C;">
<tr><td align="center" style="padding:40px 16px;">
<table class="card" width="560" cellpadding="0" cellspacing="0" border="0" role="presentation" bgcolor="#17171C" style="background-color:#17171C;border:1px solid #23232B;border-radius:24px;max-width:560px;">
<tr><td height="1" bgcolor="#FFD60A" style="background-color:#FFD60A;font-size:1px;line-height:1px;">&nbsp;</td></tr>
<tr><td class="side-pad" style="padding:28px 36px 0;" bgcolor="#17171C">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr>
    <td style="vertical-align:middle;">
      <table cellpadding="0" cellspacing="0" border="0" role="presentation"><tr>
        <td width="36" height="36" bgcolor="#FFD60A" style="background-color:#FFD60A;border-radius:50%;text-align:center;vertical-align:middle;width:36px;height:36px;font-weight:800;font-size:18px;color:#0A0A0C;font-family:-apple-system,Helvetica,Arial,sans-serif;">S</td>
        <td style="padding-left:10px;font-weight:700;font-size:15px;letter-spacing:0.06em;color:#FFFFFF;font-family:-apple-system,Helvetica,Arial,sans-serif;">STRIDE QUEST</td>
      </tr></table>
    </td>
    <td align="right"><span style="display:inline-block;border:1px solid #10B981;color:#10B981;padding:5px 12px;border-radius:999px;font-size:10px;font-family:monospace,Courier,serif;letter-spacing:.18em;text-transform:uppercase;">● LIVE</span></td>
  </tr></table>
</td></tr>
<tr><td class="side-pad" style="padding:32px 36px 0;" bgcolor="#17171C">
  <p style="margin:0 0 12px;font-family:monospace,Courier,serif;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:${tierColour};">${tierLabel} · LONDON LAUNCH</p>
  <h1 class="h1" style="margin:0 0 16px;font-weight:800;font-size:36px;line-height:1.05;letter-spacing:-0.03em;color:#FFFFFF;font-family:-apple-system,Helvetica,Arial,sans-serif;">You're in,<br><span style="color:#FFD60A;">Strider.</span></h1>
  <p style="margin:0;font-size:16px;line-height:1.65;color:#9A9AA6;font-family:-apple-system,Helvetica,Arial,sans-serif;">${isCohort01 ? "You've got <strong style='color:#FFFFFF;'>Cohort 01 priority access</strong> — you'll be among the first to walk when Stride Quest launches in London." : "You're on the waitlist. London's about to become a game — and you're in early. Every step will earn. Every borough will compete. You're ahead of everyone who hasn't signed up yet."}</p>
</td></tr>
<tr><td class="side-pad" style="padding:24px 36px 0;" bgcolor="#17171C">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" bgcolor="#0E0E12" style="background-color:#0E0E12;border:1px solid #2A2A1A;border-radius:16px;"><tr>
    <td width="50%" style="text-align:center;padding:24px 20px;border-right:1px solid #23232B;" bgcolor="#0E0E12">
      <div class="pos-num" style="font-weight:800;font-size:48px;line-height:1;letter-spacing:-0.04em;color:#FFD60A;font-family:-apple-system,Helvetica,Arial,sans-serif;">${posLabel}</div>
      <div style="font-family:monospace,Courier,serif;font-size:9px;letter-spacing:.18em;color:#7A7A86;text-transform:uppercase;margin-top:6px;">QUEUE POSITION</div>
    </td>
    <td width="50%" style="text-align:center;padding:24px 20px;" bgcolor="#0E0E12">
      <div style="display:inline-block;border:1px solid rgba(255,214,10,0.4);color:#FFD60A;padding:6px 14px;border-radius:999px;font-family:monospace,Courier,serif;font-size:10px;letter-spacing:.16em;text-transform:uppercase;">${tierLabel}</div>
      <div style="font-family:monospace,Courier,serif;font-size:9px;letter-spacing:.18em;color:#7A7A86;text-transform:uppercase;margin-top:10px;">YOUR TIER</div>
    </td>
  </tr></table>
</td></tr>
<tr><td class="side-pad" style="padding:28px 36px 0;" bgcolor="#17171C">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr><td style="border-top:1px solid #2A2A2A;font-size:0;line-height:0;">&nbsp;</td></tr></table>
</td></tr>
<tr><td class="side-pad" style="padding:24px 36px 0;" bgcolor="#17171C">
  <p style="margin:0 0 6px;font-family:monospace,Courier,serif;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#7A7A86;">WANT MORE THAN A SEAT?</p>
  <h2 style="margin:0 0 8px;font-weight:800;font-size:22px;letter-spacing:-0.02em;color:#FFFFFF;font-family:-apple-system,Helvetica,Arial,sans-serif;">Upgrade your access.</h2>
  <p style="margin:0;font-size:14px;line-height:1.55;color:#9A9AA6;font-family:-apple-system,Helvetica,Arial,sans-serif;">Your waitlist spot is free. But Stride+ and Founder unlock a different game entirely — and both are limited.</p>
</td></tr>
<tr><td class="side-pad" style="padding:16px 36px 0;" bgcolor="#17171C">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr>
    <td class="upsell-cell" width="48%" style="vertical-align:top;padding-right:8px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" bgcolor="#0E0E12" style="background-color:#0E0E12;border:1px solid #1A3A2A;border-radius:16px;">
        <tr><td style="padding:18px 18px 14px;border-bottom:1px solid #1A3A2A;" bgcolor="#0E1510">
          <p style="margin:0 0 6px;font-family:monospace,Courier,serif;font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:#10B981;">STRIDE+</p>
          <div style="font-weight:800;font-size:26px;letter-spacing:-0.03em;color:#FFFFFF;font-family:-apple-system,Helvetica,Arial,sans-serif;">£60<span style="font-size:13px;font-weight:500;color:#7A7A86;">/yr</span></div>
        </td></tr>
        <tr><td style="padding:14px 18px;" bgcolor="#0E0E12">
          <p style="margin:0 0 7px;font-size:13px;color:#CCCCCC;font-family:-apple-system,Helvetica,Arial,sans-serif;"><span style="color:#10B981;">✦</span>&nbsp; Priority queue position</p>
          <p style="margin:0 0 7px;font-size:13px;color:#CCCCCC;font-family:-apple-system,Helvetica,Arial,sans-serif;"><span style="color:#10B981;">✦</span>&nbsp; Stride+ badge in-app</p>
          <p style="margin:0 0 7px;font-size:13px;color:#CCCCCC;font-family:-apple-system,Helvetica,Arial,sans-serif;"><span style="color:#10B981;">✦</span>&nbsp; Exclusive Stride+ routes</p>
          <p style="margin:0;font-size:13px;color:#CCCCCC;font-family:-apple-system,Helvetica,Arial,sans-serif;"><span style="color:#10B981;">✦</span>&nbsp; Earn free — 10 referrals</p>
        </td></tr>
        <tr><td style="padding:4px 18px 18px;" bgcolor="#0E0E12">
          <a href="${stripePlusLink}" style="display:block;text-align:center;background-color:#10B981;color:#FFFFFF;padding:12px 16px;border-radius:10px;font-weight:700;font-size:13px;text-decoration:none;font-family:-apple-system,Helvetica,Arial,sans-serif;">Claim Stride+ &rarr;</a>
        </td></tr>
      </table>
    </td>
    <td class="upsell-cell" width="48%" style="vertical-align:top;padding-left:8px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" bgcolor="#0E0E12" style="background-color:#0E0E12;border:1px solid #3A3010;border-radius:16px;">
        <tr><td style="padding:18px 18px 14px;border-bottom:1px solid #2A2810;" bgcolor="#151204">
          <p style="margin:0 0 6px;font-family:monospace,Courier,serif;font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:#FFD60A;">FOUNDER</p>
          <div style="font-weight:800;font-size:26px;letter-spacing:-0.03em;color:#FFFFFF;font-family:-apple-system,Helvetica,Arial,sans-serif;">£99<span style="font-size:13px;font-weight:500;color:#7A7A86;">/yr</span></div>
          <span style="display:inline-block;margin-top:6px;border:1px solid #3A3010;color:#FFD60A;padding:3px 8px;border-radius:6px;font-family:monospace,Courier,serif;font-size:9px;letter-spacing:.14em;text-transform:uppercase;">Limited seats</span>
        </td></tr>
        <tr><td style="padding:14px 18px;" bgcolor="#0E0E12">
          <p style="margin:0 0 7px;font-size:13px;color:#CCCCCC;font-family:-apple-system,Helvetica,Arial,sans-serif;"><span style="color:#FFD60A;">✦</span>&nbsp; Permanent #001–#100 badge</p>
          <p style="margin:0 0 7px;font-size:13px;color:#CCCCCC;font-family:-apple-system,Helvetica,Arial,sans-serif;"><span style="color:#FFD60A;">✦</span>&nbsp; Lifetime access, never renews</p>
          <p style="margin:0 0 7px;font-size:13px;color:#CCCCCC;font-family:-apple-system,Helvetica,Arial,sans-serif;"><span style="color:#FFD60A;">✦</span>&nbsp; Exclusive Founder's Vault</p>
          <p style="margin:0;font-size:13px;color:#CCCCCC;font-family:-apple-system,Helvetica,Arial,sans-serif;"><span style="color:#FFD60A;">✦</span>&nbsp; Skip the queue forever</p>
        </td></tr>
        <tr><td style="padding:4px 18px 18px;" bgcolor="#0E0E12">
          <a href="${founderLink}" style="display:block;text-align:center;background-color:#0E0E12;border:2px solid #FFD60A;color:#FFD60A;padding:11px 16px;border-radius:10px;font-weight:700;font-size:13px;text-decoration:none;font-family:-apple-system,Helvetica,Arial,sans-serif;">Become a Founder &rarr;</a>
        </td></tr>
      </table>
    </td>
  </tr></table>
</td></tr>
<tr><td class="side-pad" style="padding:24px 36px 0;" bgcolor="#17171C">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr><td style="border-top:1px solid #2A2A2A;font-size:0;line-height:0;padding-bottom:20px;">&nbsp;</td></tr></table>
  <p style="margin:0 0 14px;font-family:monospace,Courier,serif;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#7A7A86;">OR CLIMB FOR FREE — THE REFERRAL LADDER</p>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
    <tr><td style="padding:10px 0;border-bottom:1px solid #23232B;"><table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr>
      <td width="28" style="font-size:18px;color:#FFFFFF;">🏃</td>
      <td style="font-size:14px;color:#CCCCCC;padding:0 8px;line-height:1.4;font-family:-apple-system,Helvetica,Arial,sans-serif;"><strong style="color:#FFFFFF;">3 referrals</strong> → promoted to Cohort 01</td>
      <td align="right" style="font-family:monospace,Courier,serif;font-size:10px;color:#FFD60A;white-space:nowrap;">3 REFS</td>
    </tr></table></td></tr>
    <tr><td style="padding:10px 0;border-bottom:1px solid #23232B;"><table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr>
      <td width="28" style="font-size:18px;color:#FFFFFF;">⚡</td>
      <td style="font-size:14px;color:#CCCCCC;padding:0 8px;line-height:1.4;font-family:-apple-system,Helvetica,Arial,sans-serif;"><strong style="color:#FFFFFF;">10 referrals</strong> → free Stride+ for 1 year (£60)</td>
      <td align="right" style="font-family:monospace,Courier,serif;font-size:10px;color:#FFD60A;white-space:nowrap;">10 REFS</td>
    </tr></table></td></tr>
    <tr><td style="padding:10px 0;"><table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr>
      <td width="28" style="font-size:18px;color:#FFFFFF;">🏛️</td>
      <td style="font-size:14px;color:#CCCCCC;padding:0 8px;line-height:1.4;font-family:-apple-system,Helvetica,Arial,sans-serif;"><strong style="color:#FFFFFF;">25 referrals</strong> → free Founder membership (£99/yr)</td>
      <td align="right" style="font-family:monospace,Courier,serif;font-size:10px;color:#FFD60A;white-space:nowrap;">25 REFS</td>
    </tr></table></td></tr>
  </table>
</td></tr>
<tr><td class="side-pad" style="padding:24px 36px 0;" bgcolor="#17171C">
  <p style="margin:0 0 10px;font-family:monospace,Courier,serif;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#7A7A86;">YOUR PERSONAL INVITE LINK</p>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" bgcolor="#0E0E12" style="background-color:#0E0E12;border:2px solid #FFD60A;border-radius:12px;">
    <tr><td style="padding:14px 16px;font-family:monospace,Courier,serif;font-size:13px;color:#FFD60A;word-break:break-all;">${shareLink}</td></tr>
  </table>
  <p style="margin:10px 0 0;font-size:13px;color:#9A9AA6;line-height:1.5;font-family:-apple-system,Helvetica,Arial,sans-serif;">Share this. Every friend who signs up through it climbs you up the queue — and earns you rewards.</p>
</td></tr>
<tr><td class="side-pad" style="padding:24px 36px 0;" bgcolor="#17171C">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"><tr>
    <td width="50%" style="padding-right:8px;">
      <a href="${statusLink}" style="display:block;text-align:center;background-color:#FFD60A;color:#0A0A0C;padding:15px 20px;border-radius:12px;font-weight:700;font-size:15px;text-decoration:none;font-family:-apple-system,Helvetica,Arial,sans-serif;">Check my position &rarr;</a>
    </td>
    <td width="50%" style="padding-left:8px;">
      <a href="${leaderboardLink}" style="display:block;text-align:center;background-color:#0E0E12;border:1px solid #2A2A2A;color:#9A9AA6;padding:15px 20px;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;font-family:-apple-system,Helvetica,Arial,sans-serif;">View leaderboard</a>
    </td>
  </tr></table>
</td></tr>
<tr><td class="side-pad" style="padding:24px 36px 0;" bgcolor="#17171C">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" bgcolor="#0E0E12" style="background-color:#0E0E12;border:1px solid #23232B;border-radius:16px;">
    <tr><td style="padding:20px 22px;" bgcolor="#0E0E12">
      <p style="margin:0 0 10px;font-family:monospace,Courier,serif;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#7A7A86;">WHAT IS STRIDE QUEST?</p>
      <p style="margin:0;font-size:14px;line-height:1.65;color:#CCCCCC;font-family:-apple-system,Helvetica,Arial,sans-serif;">London's first <strong style="color:#FFFFFF;">AR walking game</strong> — walk to earn, stake coins on routes, compete by borough. Every step has a value. Every borough has a leaderboard. Launch is Cohort 01 only. Invites are scarce.</p>
    </td></tr>
  </table>
</td></tr>
<tr><td class="side-pad" style="padding:24px 36px 36px;" bgcolor="#17171C">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
    <tr><td style="border-top:1px solid #23232B;padding-top:24px;text-align:center;">
      <p style="margin:0 0 8px;font-size:12px;color:#7A7A86;font-family:-apple-system,Helvetica,Arial,sans-serif;">You're receiving this because you joined the Stride Quest waitlist.</p>
      <p style="margin:0;font-family:monospace,Courier,serif;font-size:10px;letter-spacing:.12em;color:#3A3A46;text-transform:uppercase;">STRIDE QUEST · LONDON · 2026</p>
    </td></tr>
  </table>
</td></tr>
</table>
</td></tr>
</table>
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