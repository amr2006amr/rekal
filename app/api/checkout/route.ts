import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { createCheckout } from '@/lib/lemonsqueezy/api';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '').trim();

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the token with Supabase itself and derive the user id from it.
    // We NEVER trust a user_id sent in the request body — that would let
    // anyone create a checkout (and later, subscription credit) for someone
    // else's account just by knowing their id.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const checkoutUrl = await createCheckout({
      userId: user.id,
      userEmail: user.email,
    });

    return NextResponse.json({ url: checkoutUrl });
  } catch (err: any) {
    console.error('Error in /api/checkout:', err);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}