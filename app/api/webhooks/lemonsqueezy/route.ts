import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { verifyWebhookSignature } from '@/lib/lemonsqueezy/verify-webhook';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// Events that mean the user currently has paid access.
const GRANT_ACCESS_EVENTS = new Set([
  'subscription_created',
  'subscription_updated',
  'subscription_resumed',
  'subscription_unpaused',
]);

// Events that mean the paid period is truly over — downgrade to free.
const REVOKE_ACCESS_EVENTS = new Set(['subscription_expired']);

export async function POST(request: NextRequest) {
  // Read the raw body BEFORE any JSON parsing — the signature was computed
  // over these exact bytes, so verifying against a re-serialized object can
  // silently fail (or worse, silently pass on a body that was tampered with).
  const rawBody = await request.text();
  const signature = request.headers.get('x-signature');

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.error('Rejected Lemon Squeezy webhook: invalid signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const eventName: string | undefined = payload?.meta?.event_name;
  const userId: string | undefined = payload?.meta?.custom_data?.user_id;

  if (!eventName) {
    return NextResponse.json({ error: 'Missing event name' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  // --- Idempotency / duplicate-delivery protection -------------------------
  // Lemon Squeezy retries webhooks that don't return 2xx, and in rare cases
  // two deliveries can arrive at nearly the same time. We hash the exact raw
  // body and try to INSERT it into a table with a UNIQUE constraint on the
  // hash. Only the first insert for a given payload succeeds; every repeat
  // delivery hits a unique-constraint violation and we exit early without
  // reprocessing. Because this is a single atomic INSERT, it's also safe
  // against two concurrent requests racing each other.
  const eventHash = crypto.createHash('sha256').update(rawBody).digest('hex');

  const { error: insertError } = await admin
    .from('webhook_events')
    .insert({ event_hash: eventHash, event_name: eventName });

  if (insertError) {
    if (insertError.code === '23505') {
      // Already processed this exact payload — acknowledge and stop.
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error('Failed to record webhook event:', insertError);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }

  if (!userId) {
    // Nothing we can act on, but we've already recorded the event above so
    // a retry from Lemon Squeezy won't cause duplicate processing later.
    console.error(`Webhook "${eventName}" arrived with no user_id in custom_data`);
    return NextResponse.json({ received: true, warning: 'missing user_id' });
  }

  const attrs = payload?.data?.attributes ?? {};
  const subscriptionId = payload?.data?.id ? String(payload.data.id) : null;
  const customerId = attrs.customer_id != null ? String(attrs.customer_id) : null;
  const renewsAt: string | null = attrs.renews_at ?? null;
  const status: string | undefined = attrs.status; // 'active' | 'cancelled' | 'expired' | 'past_due' | 'on_trial' | ...

  try {
    if (GRANT_ACCESS_EVENTS.has(eventName) || status === 'active' || status === 'on_trial') {
      await admin
        .from('user_settings')
        .update({
          subscription_status: 'active',
          ls_subscription_id: subscriptionId,
          ls_customer_id: customerId,
          subscription_renews_at: renewsAt,
        })
        .eq('user_id', userId);
    } else if (eventName === 'subscription_cancelled') {
      // The user turned off auto-renew, but they already paid for the
      // current billing period — access must stay active until Lemon
      // Squeezy fires subscription_expired at the end of that period.
      // We just record when that will happen.
      await admin
        .from('user_settings')
        .update({ subscription_renews_at: renewsAt })
        .eq('user_id', userId);
    } else if (REVOKE_ACCESS_EVENTS.has(eventName) || status === 'expired') {
      await admin
        .from('user_settings')
        .update({ subscription_status: 'free' })
        .eq('user_id', userId);
    } else if (eventName === 'subscription_payment_failed') {
      await admin
        .from('user_settings')
        .update({ subscription_status: 'past_due' })
        .eq('user_id', userId);
    }
    // Any other event type is acknowledged but requires no action.
  } catch (err) {
    console.error(`Failed applying webhook "${eventName}" for user ${userId}:`, err);
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}