import crypto from 'crypto';

/**
 * Verifies that an incoming webhook request actually came from Lemon Squeezy.
 * Uses HMAC-SHA256 with the webhook signing secret, compared with a
 * timing-safe comparison to avoid timing attacks.
 *
 * IMPORTANT: `rawBody` must be the exact raw request body string — do NOT
 * verify against a re-serialized JSON.stringify(parsedBody), since that can
 * produce a different byte sequence than what Lemon Squeezy actually signed.
 */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;

  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('LEMONSQUEEZY_WEBHOOK_SECRET is not configured');
    return false;
  }

  const expectedDigest = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  const signatureBuffer = Buffer.from(signatureHeader, 'utf8');
  const digestBuffer = Buffer.from(expectedDigest, 'utf8');

  // Buffers of different length would throw inside timingSafeEqual, so guard first.
  if (signatureBuffer.length !== digestBuffer.length) return false;

  return crypto.timingSafeEqual(signatureBuffer, digestBuffer);
}