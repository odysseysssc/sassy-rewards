import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getMemberByWallet, getMemberByAccountId, deductGrit } from '@/lib/drip';
import { RAFFLE_COST } from '@/lib/constants';

// Helper to check if a string is a wallet address (starts with 0x)
function isWalletAddress(identifier: string): boolean {
  return identifier.startsWith('0x');
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

  // Track which Drip accounts we've already processed to prevent duplicates
  const processedDripAccounts = new Set<string>();

  for (const entry of autoEntries) {
    const wallet = entry.wallet_address;

    try {
      // ALWAYS look up the Drip member first to get canonical account ID
      let member;
      if (isWalletAddress(wallet)) {
        member = await getMemberByWallet(wallet);
      } else {
        member = await getMemberByAccountId(wallet);
      }

      if (!member) {
        skipped++;
        results.push({ wallet, success: false, reason: 'Account not found in Drip' });
        continue;
      }

      // Use Drip account ID as the canonical identifier
      const canonicalId = member.id.toLowerCase();

      // Skip if we already processed this Drip account in this batch
      if (processedDripAccounts.has(canonicalId)) {
        skipped++;
        results.push({ wallet, success: true, reason: 'Drip account already processed this batch' });
        continue;
      }
      processedDripAccounts.add(canonicalId);

      // Check if already entered today using canonical Drip account ID
      const { data: existingEntry } = await supabase
        .from('pinwheel_entries')
        .select('id')
        .eq('wallet_address', canonicalId)
        .eq('entry_date', drawDate)
        .single();

      if (existingEntry) {
        skipped++;
        results.push({ wallet, success: true, reason: 'Already entered today' });
        continue;
      }

      // Also check for legacy entries using the raw identifier
      if (wallet.toLowerCase() !== canonicalId) {
        const { data: legacyEntry } = await supabase
          .from('pinwheel_entries')
          .select('id')
          .eq('wallet_address', wallet.toLowerCase())
          .eq('entry_date', drawDate)
          .single();

        if (legacyEntry) {
          skipped++;
          results.push({ wallet, success: true, reason: 'Already entered today (legacy)' });
          continue;
        }
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

      // Create entry FIRST to claim the slot
      const { error: insertError } = await supabase
        .from('pinwheel_entries')
        .insert({
          wallet_address: canonicalId,
          entry_date: drawDate,
        });

      if (insertError) {
        // If it's a unique constraint violation, user already entered
        if (insertError.code === '23505') {
          skipped++;
          results.push({ wallet, success: true, reason: 'Already entered today (race condition prevented)' });
          continue;
        }
        failed++;
        results.push({ wallet, success: false, reason: 'Failed to create entry' });
        console.error('Error creating auto-entry:', insertError);
        continue;
      }

      // Now deduct Grit (entry is already claimed)
      const deductResult = await deductGrit(member.id, RAFFLE_COST, member.currencyId);
      if (!deductResult.success) {
        // GRIT deduction failed - remove the entry we just created
        await supabase
          .from('pinwheel_entries')
          .delete()
          .eq('wallet_address', canonicalId)
          .eq('entry_date', drawDate);

        failed++;
        results.push({ wallet, success: false, reason: deductResult.error || 'Failed to deduct Grit' });
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
