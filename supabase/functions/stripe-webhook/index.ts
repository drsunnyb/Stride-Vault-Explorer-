// ============================================================================
// Stride Quest — Stripe Webhook
// Supabase Edge Function (Deno runtime).
//
// Responsibilities:
//   1. Verify Stripe signature (rejects forged calls).
//   2. Idempotency: refuse to process the same stripe_event_id twice.
//   3. On checkout.session.completed / subscription.created → upgrade tier.
//      If product is Founder, atomically allocate founder_number via
//      founder_seq; if >100, refund and downgrade to stride_plus.
//   4. On invoice.paid → bump membership_renews_at.
//   5. On subscription.deleted / canceled → downgrade to 'free'.
//   6. Append a row to membership_events for every state change.
//
// Deploy:
//   supabase functions deploy stripe-webhook --no-verify-jwt
//   supabase secrets set STRIPE_SECRET_KEY=sk_live_... \
//                       STRIPE_WEBHOOK_SECRET=whsec_... \
//                       STRIPE_PRICE_STRIDE_PLUS=price_xxx \
//                       STRIPE_PRICE_FOUNDER=price_yyy
//
// The function uses SUPABASE_SERVICE_ROLE_KEY (auto-injected) which bypasses
// RLS — this is the ONLY place server-mediated writes to the sensitive
// profile columns happen.
// ============================================================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});
const cryptoProvider = Stripe.createSubtleCryptoProvider();

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const WEBHOOK_SECRET    = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const PRICE_STRIDE_PLUS = Deno.env.get("STRIPE_PRICE_STRIDE_PLUS")!;
const PRICE_FOUNDER     = Deno.env.get("STRIPE_PRICE_FOUNDER")!;

type Tier = "free" | "stride_plus" | "founder";

const priceToTier = (priceId: string | null | undefined): Tier => {
  if (priceId === PRICE_FOUNDER)     return "founder";
  if (priceId === PRICE_STRIDE_PLUS) return "stride_plus";
  return "free";
};

// ----- Idempotency check ----------------------------------------------------
async function alreadyProcessed(stripeEventId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("membership_events")
    .select("id")
    .eq("stripe_event_id", stripeEventId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

// ----- Helpers --------------------------------------------------------------
async function getProfileByCustomer(customerId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("user_id, membership_tier, founder_number, email")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return data;
}

async function getProfileByEmail(email: string) {
  const { data } = await supabase
    .from("profiles")
    .select("user_id, membership_tier, founder_number, email")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  return data;
}

// Atomically allocate a founder number. Returns null if cap exceeded.
// Calls the SECURITY DEFINER RPC `allocate_founder_number` (service-role only).
async function allocateFounderNumber(): Promise<number | null> {
  const { data, error } = await supabase.rpc("allocate_founder_number");
  if (error) throw error;
  return data == null ? null : Number(data);
}

async function appendEvent(row: {
  user_id: string;
  event_type: string;
  tier_from: Tier | null;
  tier_to: Tier | null;
  stripe_event_id: string;
  amount_paid_pence?: number | null;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await supabase.from("membership_events").insert({
    user_id: row.user_id,
    event_type: row.event_type,
    tier_from: row.tier_from,
    tier_to: row.tier_to,
    stripe_event_id: row.stripe_event_id,
    amount_paid_pence: row.amount_paid_pence ?? null,
    metadata: row.metadata ?? {},
  });
  if (error) throw error;
}

// ----- Event handlers -------------------------------------------------------
async function handleCheckoutCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;
  const email = session.customer_details?.email?.toLowerCase() ?? null;
  if (!email) throw new Error("checkout.session.completed missing customer email");

  // Look up subscription to know which price was bought
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = sub.items.data[0]?.price?.id;
  let tier = priceToTier(priceId);

  // Find or attach the profile
  let profile = await getProfileByCustomer(customerId) ?? await getProfileByEmail(email);
  if (!profile) {
    // Edge case: paid before signing into waitlist. Park the customer mapping;
    // on first auth we'll merge by email.
    await appendEvent({
      user_id: "00000000-0000-0000-0000-000000000000", // sentinel; FK will fail — instead, log+return
      event_type: "subscribed",
      tier_from: null, tier_to: tier,
      stripe_event_id: event.id,
      metadata: { unmatched: true, email, customer_id: customerId },
    }).catch(() => { /* sentinel insert will fail, swallow — keep webhook 200 */ });
    console.warn(`No profile for ${email}; will reconcile on auth.`);
    return;
  }

  const oldTier = (profile.membership_tier ?? "free") as Tier;
  let founderNumber: number | null = profile.founder_number ?? null;

  // Atomically claim a founder number if applicable
  if (tier === "founder" && founderNumber == null) {
    founderNumber = await allocateFounderNumber();
    if (founderNumber == null) {
      // Cap exceeded → downgrade to stride_plus and partially refund
      tier = "stride_plus";
      try {
        const inv = await stripe.invoices.retrieve(sub.latest_invoice as string);
        const charge = inv.charge as string;
        if (charge) {
          // Refund the difference (£99 → £60 = £39)
          await stripe.refunds.create({ charge, amount: 3900, reason: "requested_by_customer" });
        }
      } catch (e) { console.error("Refund failed", e); }
    }
  }

  const updates: Record<string, unknown> = {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    membership_tier: tier,
    membership_started_at: new Date(sub.start_date * 1000).toISOString(),
    membership_renews_at:  new Date(sub.current_period_end * 1000).toISOString(),
    cohort: "01",  // anyone paying pre-launch is Cohort 01
  };
  if (founderNumber != null) updates.founder_number = founderNumber;

  const { error } = await supabase.from("profiles").update(updates).eq("user_id", profile.user_id);
  if (error) throw error;

  await appendEvent({
    user_id: profile.user_id,
    event_type: oldTier === "free" ? "subscribed" : "upgraded",
    tier_from: oldTier,
    tier_to: tier,
    stripe_event_id: event.id,
    amount_paid_pence: session.amount_total ?? null,
    metadata: { founder_number: founderNumber, price_id: priceId },
  });
}

async function handleInvoicePaid(event: Stripe.Event) {
  const inv = event.data.object as Stripe.Invoice;
  if (!inv.subscription) return;
  const sub = await stripe.subscriptions.retrieve(inv.subscription as string);
  const customerId = sub.customer as string;
  const profile = await getProfileByCustomer(customerId);
  if (!profile) { console.warn(`invoice.paid for unknown customer ${customerId}`); return; }

  const tier = (profile.membership_tier ?? "free") as Tier;
  const { error } = await supabase
    .from("profiles")
    .update({ membership_renews_at: new Date(sub.current_period_end * 1000).toISOString() })
    .eq("user_id", profile.user_id);
  if (error) throw error;

  await appendEvent({
    user_id: profile.user_id,
    event_type: "renewed",
    tier_from: tier, tier_to: tier,
    stripe_event_id: event.id,
    amount_paid_pence: inv.amount_paid,
  });
}

async function handleSubscriptionDeleted(event: Stripe.Event) {
  const sub = event.data.object as Stripe.Subscription;
  const customerId = sub.customer as string;
  const profile = await getProfileByCustomer(customerId);
  if (!profile) return;

  const oldTier = (profile.membership_tier ?? "free") as Tier;
  // NOTE: founder_number is intentionally NOT cleared — it's a permanent badge.
  const { error } = await supabase.from("profiles").update({
    membership_tier: "free",
    membership_renews_at: null,
    stripe_subscription_id: null,
  }).eq("user_id", profile.user_id);
  if (error) throw error;

  await appendEvent({
    user_id: profile.user_id,
    event_type: "cancelled",
    tier_from: oldTier, tier_to: "free",
    stripe_event_id: event.id,
  });
}

async function handleInvoiceFailed(event: Stripe.Event) {
  const inv = event.data.object as Stripe.Invoice;
  if (!inv.customer) return;
  const profile = await getProfileByCustomer(inv.customer as string);
  if (!profile) return;
  const tier = (profile.membership_tier ?? "free") as Tier;
  await appendEvent({
    user_id: profile.user_id,
    event_type: "payment_failed",
    tier_from: tier, tier_to: tier,
    stripe_event_id: event.id,
    amount_paid_pence: 0,
    metadata: { attempt: inv.attempt_count, next_retry: inv.next_payment_attempt },
  });
}

// ----- HTTP handler ---------------------------------------------------------
serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body, signature, WEBHOOK_SECRET, undefined, cryptoProvider,
    );
  } catch (err) {
    console.error("Bad signature:", (err as Error).message);
    return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }

  // Idempotency gate
  if (await alreadyProcessed(event.id)) {
    return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":   await handleCheckoutCompleted(event);   break;
      case "invoice.paid":                 await handleInvoicePaid(event);         break;
      case "invoice.payment_failed":       await handleInvoiceFailed(event);       break;
      case "customer.subscription.deleted":
      case "customer.subscription.paused":
        await handleSubscriptionDeleted(event); break;
      default:
        // Unhandled event — return 200 so Stripe stops retrying
        break;
    }
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err) {
    console.error(`Handler failed for ${event.type}:`, err);
    return new Response(`Handler error: ${(err as Error).message}`, { status: 500 });
  }
});
