import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';
import { createEmailCredential, awardGritToEmail, findCredentialByEmail } from '@/lib/drip';

// GET - Preview unclaimed GRIT transactions
export async function GET() {
  const { isAdmin: authorized, error } = await requireAdmin();
  if (!authorized) {
    return NextResponse.json({ error }, { status: 401 });
  }

  try {
    const supabase = createServerClient();

    const { data: transactions, error: fetchError } = await supabase
      .from('grit_transactions')
      .select('*')
      .eq('claimed', false)
      .order('created_at', { ascending: false });

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }

    return NextResponse.json({
      count: transactions?.length || 0,
      totalGrit: transactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0,
      transactions,
    });
  } catch (error) {
    console.error('Error fetching pending GRIT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Claim all pending GRIT transactions (actually award to Drip)
export async function POST() {
  const { isAdmin: authorized, error } = await requireAdmin();
  if (!authorized) {
    return NextResponse.json({ error }, { status: 401 });
  }

  try {
    const supabase = createServerClient();

    const { data: transactions, error: fetchError } = await supabase
      .from('grit_transactions')
      .select('*')
      .eq('claimed', false);

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending transactions to claim',
        claimed: 0,
      });
    }

    const results: Array<{
      email: string;
      amount: number;
      status: 'claimed' | 'error';
      error?: string;
    }> = [];

    for (const transaction of transactions) {
      if (!transaction.email) {
        results.push({
          email: 'unknown',
          amount: transaction.amount,
          status: 'error',
          error: 'No email on transaction',
        });
        continue;
      }

      try {
        // Check if credential exists
        let credential = await findCredentialByEmail(transaction.email);

        // Create credential if it doesn't exist
        if (!credential) {
          console.log(`Creating credential for ${transaction.email}`);
          try {
            credential = await createEmailCredential(
              transaction.email,
              transaction.email.split('@')[0]
            );
          } catch (e) {
            console.error(`Failed to create credential for ${transaction.email}:`, e);
          }
        }

        // Award the GRIT
        const awarded = await awardGritToEmail(
          transaction.email,
          transaction.amount,
          `Claim pending: ${transaction.source} ${transaction.source_reference || ''}`
        );

        if (awarded) {
          // Mark as claimed
          await supabase
            .from('grit_transactions')
            .update({ claimed: true, claimed_at: new Date().toISOString() })
            .eq('id', transaction.id);

          results.push({
            email: transaction.email,
            amount: transaction.amount,
            status: 'claimed',
          });
        } else {
          results.push({
            email: transaction.email,
            amount: transaction.amount,
            status: 'error',
            error: 'awardGritToEmail returned false',
          });
        }
      } catch (e) {
        results.push({
          email: transaction.email,
          amount: transaction.amount,
          status: 'error',
          error: e instanceof Error ? e.message : 'Unknown error',
        });
      }
    }

    const claimed = results.filter(r => r.status === 'claimed').length;
    const errors = results.filter(r => r.status === 'error').length;
    const totalClaimed = results
      .filter(r => r.status === 'claimed')
      .reduce((sum, r) => sum + r.amount, 0);

    return NextResponse.json({
      success: true,
      total: transactions.length,
      claimed,
      errors,
      totalGritClaimed: totalClaimed,
      results,
    });
  } catch (error) {
    console.error('Error claiming pending GRIT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
