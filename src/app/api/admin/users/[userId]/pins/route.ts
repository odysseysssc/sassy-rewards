import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';

// POST - Award a pin to a user (Golden Ticket)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { isAdmin: authorized, error } = await requireAdmin();
  if (!authorized) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const { userId } = await params;

  try {
    const { pinName } = await request.json();

    if (!pinName || typeof pinName !== 'string') {
      return NextResponse.json({ error: 'Pin name is required' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Get user and their wallet/drip_account_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, drip_account_id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Use drip_account_id as canonical identifier (consistent with pinwheel entry)
    const identifier = user.drip_account_id?.toLowerCase();

    if (!identifier) {
      return NextResponse.json({
        error: 'User has no wallet or Drip account linked. Cannot award pin.'
      }, { status: 400 });
    }

    // Insert the pin as a golden ticket win
    const { error: insertError } = await supabase
      .from('pinwheel_winners')
      .insert({
        wallet_address: identifier,
        pin_won: pinName,
        date_won: new Date().toISOString().split('T')[0],
        spin_segment_index: 0, // Not from wheel spin
        shipped: false,
        source: 'golden_ticket',
      });

    if (insertError) {
      console.error('Error inserting pin:', insertError);
      return NextResponse.json({ error: 'Failed to award pin' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Awarded ${pinName} pin to user as Golden Ticket win`,
      pinName,
      userId,
    });
  } catch (error) {
    console.error('Error awarding pin:', error);
    return NextResponse.json({ error: 'Failed to award pin' }, { status: 500 });
  }
}
