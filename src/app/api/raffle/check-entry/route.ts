import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// Get the draw date for the current entry window
function getDrawDate(): string {
  const now = new Date();
  const hour = now.getUTCHours();

  if (hour >= 20) {
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  return now.toISOString().split('T')[0];
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const wallet = searchParams.get('wallet');

  if (!wallet) {
    return NextResponse.json(
      { error: 'Wallet address is required' },
      { status: 400 }
    );
  }

  try {
    const supabase = createServerClient();
    const drawDate = getDrawDate();

    const { data: entry, error } = await supabase
      .from('pinwheel_entries')
      .select('*')
      .eq('wallet_address', wallet.toLowerCase())
      .eq('entry_date', drawDate)
      .maybeSingle();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to check entry' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      hasEntered: !!entry,
      entry: entry || null
    });
  } catch (error) {
    console.error('Error checking entry:', error);
    return NextResponse.json(
      { error: 'Failed to check entry' },
      { status: 500 }
    );
  }
}
