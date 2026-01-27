import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getMemberByWallet, getMemberByAccountId, deductGrit } from '@/lib/drip';
import { RAFFLE_COST } from '@/lib/constants';

// Helper to check if a string looks like a Drip account ID (UUID format)
function isAccountId(identifier: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
}

// Get today's draw date (same logic as enter endpoint)
function getDrawDate(): string {
  const now = new Date();
  const hour = now.getUTCHours();

  if (hour >= 20) {
    // After 8pm UTC, entries are for tomorrow's draw
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  // Before 8pm UTC, entries are for today's draw
  return now.toISOString().split('T')[0];
}

type AutoEntryResult = {
  wallet: string;
  success: boolean;
  reason?: string;
};

async function processAutoEntries(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  results: AutoEntryResult[];
}> {
  const supabase = createServerClient();
  const drawDate = getDrawDate();
  const results: AutoEntryResult[] = [];

  // Get all wallets with auto-entry enabled
  const { data: autoEntries, error: fetchError } = await supabase
    .from('pinwheel_auto_entries')
    .select('wallet_address')
    .eq('enabled', true);

  if (fetchError) {
    console.error('Error fetching auto-entries:', fetchError);
    throw new Error('Failed to fetch auto-entry list');
  }

  if (!autoEntries || autoEntries.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0, skipped: 0, results: [] };
  }

  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  for (const entry of autoEntries) {
    const wallet = entry.wallet_address;

    try {
      // Check if already entered today
      const { data: existingEntry } = await supabase
        .from('pinwheel_entries')
        .select('id')
        .eq('wallet_address', wallet)
        .eq('entry_date', drawDate)
        .single();

      if (existingEntry) {
        skipped++;
        results.push({ wallet, success: true, reason: 'Already entered today' });
        continue;
      }

      // Get member from Drip and check balance (wallet can be a wallet address or account ID)
      let member;
      if (isAccountId(wallet)) {
        member = await getMemberByAccountId(wallet);
      } else {
        member = await getMemberByWallet(wallet);
      }

      if (!member) {
        skipped++;
        results.push({ wallet, success: false, reason: 'Account not found in Drip' });
        continue;
      }

      if (member.points < RAFFLE_COST) {
        skipped++;
        results.push({ wallet, success: false, reason: `Insufficient Grit (${member.points}/${RAFFLE_COST})` });
        continue;
      }

      if (!member.currencyId) {
        failed++;
        results.push({ wallet, success: false, reason: 'Could not find Grit currency' });
        continue;
      }

      // Deduct Grit
      const deductResult = await deductGrit(member.id, RAFFLE_COST, member.currencyId);
      if (!deductResult.success) {
        failed++;
        results.push({ wallet, success: false, reason: deductResult.error || 'Failed to deduct Grit' });
        continue;
      }

      // Create entry
      const { error: insertError } = await supabase
        .from('pinwheel_entries')
        .insert({
          wallet_address: wallet,
          entry_date: drawDate,
        });

      if (insertError) {
        failed++;
        results.push({ wallet, success: false, reason: 'Failed to create entry' });
        console.error('Error creating auto-entry:', insertError);
        continue;
      }

      succeeded++;
      results.push({ wallet, success: true, reason: 'Auto-entered successfully' });
    } catch (error) {
      failed++;
      results.push({
        wallet,
        success: false,
        reason: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return {
    processed: autoEntries.length,
    succeeded,
    failed,
    skipped,
    results,
  };
}

// GET - Called by Vercel Cron at 7:55pm UTC
export async function GET() {
  try {
    console.log('Starting auto-entry processing...');
    const result = await processAutoEntries();
    console.log('Auto-entry complete:', result);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error in auto-entry cron:', error);
    return NextResponse.json(
      { error: 'Failed to process auto-entries' },
      { status: 500 }
    );
  }
}

// POST - Manual trigger with auth
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const expectedKey = process.env.CRON_SECRET || process.env.ADMIN_API_KEY;

  if (!expectedKey || authHeader !== `Bearer ${expectedKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('Manual auto-entry trigger...');
    const result = await processAutoEntries();
    console.log('Auto-entry complete:', result);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error in manual auto-entry:', error);
    return NextResponse.json(
      { error: 'Failed to process auto-entries' },
      { status: 500 }
    );
  }
}
