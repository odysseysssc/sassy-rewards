import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServerClient } from '@/lib/supabase';
import { awardGritToAccount, getMemberByEmail } from '@/lib/drip';

// PATCH - Update submission (approve/reject)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isAdmin: authorized, error } = await requireAdmin();
  if (!authorized) {
    return NextResponse.json({ error }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { status, gritAwarded, rewardType, viewCount, reviewNote } = body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be approved or rejected.' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get the submission first
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

    // Update submission
    const updateData: Record<string, unknown> = {
      status,
      reviewed_at: new Date().toISOString(),
      review_note: reviewNote || null,
    };

    if (status === 'approved') {
      updateData.grit_awarded = gritAwarded || 0;
      updateData.reward_type = rewardType || null;
      updateData.view_count = viewCount || null;
    }

    const { error: updateError } = await supabase
      .from('submissions')
      .update(updateData)
      .eq('id', id);

    if (updateError) throw updateError;

    // Award GRIT if approved and has amount
    if (status === 'approved' && gritAwarded > 0) {
      const user = submission.users as { email?: string; drip_account_id?: string } | null;

      if (user?.drip_account_id) {
        // Award directly to Drip account
        await awardGritToAccount(
          user.drip_account_id,
          gritAwarded,
          `Content submission approved: ${submission.content_url}`
        );
      } else if (user?.email) {
        // Try to find Drip account by email
        const member = await getMemberByEmail(user.email);
        if (member?.id) {
          await awardGritToAccount(
            member.id,
            gritAwarded,
            `Content submission approved: ${submission.content_url}`
          );
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating submission:', error);
    return NextResponse.json(
      { error: 'Failed to update submission' },
      { status: 500 }
    );
  }
}
