import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServerClient } from '@/lib/supabase';
import { awardGritToAccount, getMemberByEmail } from '@/lib/drip';

// POST - Award extra GRIT to an approved submission
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isAdmin: authorized, error } = await requireAdmin();
  if (!authorized) {
    return NextResponse.json({ error }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { amount, note } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get the submission
    const { data: submission, error: fetchError } = await supabase
      .from('submissions')
      .select('*, users:user_id (email, drip_account_id)')
      .eq('id', id)
      .single();

    if (fetchError || !submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    if (submission.status !== 'approved') {
      return NextResponse.json(
        { error: 'Can only award extra GRIT to approved submissions' },
        { status: 400 }
      );
    }

    // Award GRIT
    const user = submission.users as { email?: string; drip_account_id?: string } | null;
    let awarded = false;

    if (user?.drip_account_id) {
      await awardGritToAccount(
        user.drip_account_id,
        amount,
        note || `Extra GRIT award for: ${submission.content_url}`
      );
      awarded = true;
    } else if (user?.email) {
      const member = await getMemberByEmail(user.email);
      if (member?.id) {
        await awardGritToAccount(
          member.id,
          amount,
          note || `Extra GRIT award for: ${submission.content_url}`
        );
        awarded = true;
      }
    }

    if (!awarded) {
      return NextResponse.json(
        { error: 'Could not find Drip account to award GRIT' },
        { status: 400 }
      );
    }

    // Update the submission's total grit_awarded
    const newTotal = (submission.grit_awarded || 0) + amount;
    const { error: updateError } = await supabase
      .from('submissions')
      .update({
        grit_awarded: newTotal,
        review_note: note
          ? `${submission.review_note || ''}\n[+${amount} GRIT] ${note}`.trim()
          : submission.review_note,
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating submission:', updateError);
    }

    return NextResponse.json({
      success: true,
      amountAwarded: amount,
      newTotal,
    });
  } catch (error) {
    console.error('Error awarding extra GRIT:', error);
    return NextResponse.json(
      { error: 'Failed to award GRIT' },
      { status: 500 }
    );
  }
}
