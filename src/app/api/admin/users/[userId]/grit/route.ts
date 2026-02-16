import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';
import { getMemberByAccountId, awardGritToAccount, deductGrit } from '@/lib/drip';

// POST - Adjust GRIT balance (credit or debit)
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
    const { amount, reason } = await request.json();

    if (typeof amount !== 'number' || amount === 0) {
      return NextResponse.json({ error: 'Amount must be a non-zero number' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Get user's drip_account_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, drip_account_id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.drip_account_id) {
      return NextResponse.json({ error: 'User has no Drip account linked' }, { status: 400 });
    }

    // Get current member info to verify account exists and get currencyId
    const member = await getMemberByAccountId(user.drip_account_id);
    if (!member) {
      return NextResponse.json({ error: 'Drip account not found' }, { status: 404 });
    }

    const oldBalance = member.points || 0;
    let newBalance: number;
    let success: boolean;

    if (amount > 0) {
      // Credit GRIT
      success = await awardGritToAccount(
        user.drip_account_id,
        amount,
        reason || `Admin credit: ${amount} GRIT`
      );
      newBalance = oldBalance + amount;
    } else {
      // Debit GRIT
      if (!member.currencyId) {
        return NextResponse.json({ error: 'Could not find Grit currency' }, { status: 500 });
      }

      const debitAmount = Math.abs(amount);
      if (debitAmount > oldBalance) {
        return NextResponse.json({
          error: `Insufficient balance. User has ${oldBalance} GRIT, cannot deduct ${debitAmount}`
        }, { status: 400 });
      }

      const result = await deductGrit(member.id, debitAmount, member.currencyId);
      success = result.success;
      newBalance = result.newBalance ?? (oldBalance - debitAmount);

      if (!success) {
        return NextResponse.json({ error: result.error || 'Failed to deduct GRIT' }, { status: 500 });
      }
    }

    if (!success) {
      return NextResponse.json({ error: 'Failed to adjust GRIT balance' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      oldBalance,
      newBalance,
      adjustment: amount,
      reason: reason || null,
    });
  } catch (error) {
    console.error('Error adjusting GRIT:', error);
    return NextResponse.json({ error: 'Failed to adjust GRIT' }, { status: 500 });
  }
}

// GET - Get current GRIT balance
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { isAdmin: authorized, error } = await requireAdmin();
  if (!authorized) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const { userId } = await params;

  try {
    const supabase = createServerClient();

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, drip_account_id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.drip_account_id) {
      return NextResponse.json({ gritBalance: 0, hasDripAccount: false });
    }

    const member = await getMemberByAccountId(user.drip_account_id);

    return NextResponse.json({
      gritBalance: member?.points || 0,
      hasDripAccount: true,
      dripAccountId: user.drip_account_id,
    });
  } catch (error) {
    console.error('Error fetching GRIT balance:', error);
    return NextResponse.json({ error: 'Failed to fetch GRIT balance' }, { status: 500 });
  }
}
