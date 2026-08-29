const LS_API_BASE = 'https://api.lemonsqueezy.com/v1';

interface CreateCheckoutParams {
  userId: string;
  userEmail?: string | null;
}

/**
 * Creates a Lemon Squeezy hosted checkout session for a subscription purchase.
 * The Supabase user id is embedded as custom_data so the webhook can later
 * identify which account to upgrade — Lemon Squeezy echoes custom_data back
 * on every subscription webhook event for this checkout.
 */
export async function createCheckout({ userId, userEmail }: CreateCheckoutParams): Promise<string> {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  const variantId = process.env.LEMONSQUEEZY_VARIANT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!apiKey || !storeId || !variantId || !appUrl) {
    throw new Error('Lemon Squeezy environment variables are not fully configured');
  }

  const response = await fetch(`${LS_API_BASE}/checkouts`, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            email: userEmail || undefined,
            custom: {
              user_id: userId,
            },
          },
          product_options: {
            redirect_url: `${appUrl}/settings?upgraded=1`,
          },
        },
        relationships: {
          store: { data: { type: 'stores', id: storeId } },
          variant: { data: { type: 'variants', id: variantId } },
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Lemon Squeezy checkout creation failed:', response.status, errorText);
    throw new Error('Failed to create checkout session');
  }

  const json = await response.json();
  const checkoutUrl: string | undefined = json?.data?.attributes?.url;

  if (!checkoutUrl) {
    throw new Error('Lemon Squeezy response did not include a checkout URL');
  }

  return checkoutUrl;
}