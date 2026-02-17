import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createServerClient } from '@/lib/supabase';

// Content type rewards mapping
export const CONTENT_REWARDS = {
  'x_post': { label: 'X post', base: 5 },
  'photo': { label: 'Product photo post', base: 50 },
  'short_video': { label: 'Short video with product', base: 150 },
  'thread': { label: 'X thread / article', base: 100 },
  'space': { label: 'X Space (hosting)', base: 100 },
  'unboxing': { label: 'Unboxing / styling video', base: 300 },
  'long_video': { label: 'Long-form video (10+ min)', base: 400 },
} as const;

// View multipliers
export const VIEW_MULTIPLIERS = [
  { min: 0, max: 1999, multiplier: 1, label: 'Under 2k' },
  { min: 2000, max: 4999, multiplier: 1.5, label: '2k - 5k' },
  { min: 5000, max: 19999, multiplier: 2, label: '5k - 20k' },
  { min: 20000, max: Infinity, multiplier: 2.5, label: '20k+' },
];

export function calculateReward(contentType: string, viewCount: number): number {
  const reward = CONTENT_REWARDS[contentType as keyof typeof CONTENT_REWARDS];
  if (!reward) return 0;

  // X Spaces don't get view multipliers
  if (contentType === 'space') {
    return reward.base;
  }

  const multiplier = VIEW_MULTIPLIERS.find(m => viewCount >= m.min && viewCount <= m.max);
  return Math.round(reward.base * (multiplier?.multiplier || 1));
}

// GET - Fetch all submissions for admin review
export async function GET(request: NextRequest) {
  const { isAdmin: authorized, error } = await requireAdmin();
  if (!authorized) {
    return NextResponse.json({ error }, { status: 401 });
  }

  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const type = searchParams.get('type') || 'all'; // 'general', 'shred', or 'all'
    const month = searchParams.get('month'); // Format: YYYY-MM (for STF approved filtering)
    const platform = searchParams.get('platform'); // 'twitter' or 'instagram' (for STF)

    let query = supabase
      .from('submissions')
      .select(`
        *,
        users:user_id (
          email,
          display_name
        )
      `)
      .order('submitted_at', { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (type !== 'all') {
      query = query.eq('submission_type', type);
    }

    // For STF approved tab, add month and platform filters
    if (type === 'shred' && status === 'approved' && month) {
      const startDate = `${month}-01`;
      const endDate = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 0)
        .toISOString().split('T')[0]; // Last day of month
      query = query.gte('submitted_at', startDate).lte('submitted_at', `${endDate}T23:59:59`);
    }

    if (platform && platform !== 'all') {
      query = query.eq('platform', platform);
    }

    const { data, error: dbError } = await query.limit(200);

    if (dbError) throw dbError;

    return NextResponse.json({
      submissions: data,
      contentRewards: CONTENT_REWARDS,
      viewMultipliers: VIEW_MULTIPLIERS,
    });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 500 }
    );
  }
}
