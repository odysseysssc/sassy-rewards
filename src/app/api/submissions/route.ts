import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createSubmission, getUserSubmissions, findUserById, createUser, hasSubmittedToday } from '@/lib/db';

// GET - Fetch user's submissions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'general' | 'shred' | null;

    const submissions = await getUserSubmissions(session.user.id, type || undefined);

    return NextResponse.json({ submissions });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 500 }
    );
  }
}

// Helper to detect platform from URL
function detectPlatform(url: string): string {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) return 'twitter';
  if (lowerUrl.includes('instagram.com')) return 'instagram';
  if (lowerUrl.includes('tiktok.com')) return 'tiktok';
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return 'youtube';
  if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.com')) return 'facebook';
  return 'other';
}

// Helper to detect content type from URL
function detectContentType(url: string, platform: string): string {
  const lowerUrl = url.toLowerCase();

  // Instagram
  if (platform === 'instagram') {
    if (lowerUrl.includes('/reel/') || lowerUrl.includes('/reels/')) return 'video';
    if (lowerUrl.includes('/stories/')) return 'story';
    return 'post';
  }

  // TikTok is always video
  if (platform === 'tiktok') return 'video';

  // YouTube is always video
  if (platform === 'youtube') return 'video';

  // Twitter/X
  if (platform === 'twitter') {
    if (lowerUrl.includes('/spaces/')) return 'post'; // X Spaces
    return 'post';
  }

  return 'post';
}

// POST - Create new submission
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      contentUrl,
      platform: providedPlatform,
      contentType: providedContentType,
      description,
      submissionType = 'general'
    } = body;

    // Validate content URL is required
    if (!contentUrl) {
      return NextResponse.json(
        { error: 'Content URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(contentUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid content URL' },
        { status: 400 }
      );
    }

    // Validate submission type
    const validSubmissionType = submissionType === 'shred' ? 'shred' : 'general';

    // Check if user has already submitted today for this type
    const alreadySubmitted = await hasSubmittedToday(session.user.id, validSubmissionType);
    if (alreadySubmitted) {
      return NextResponse.json(
        { error: 'You can only submit once per day. Come back tomorrow!' },
        { status: 400 }
      );
    }

    // Auto-detect platform and content type if not provided
    const platform = providedPlatform || detectPlatform(contentUrl);
    const contentType = providedContentType || detectContentType(contentUrl, platform);

    // Ensure user exists in database
    const existingUser = await findUserById(session.user.id);
    if (!existingUser) {
      // Create user record if it doesn't exist
      try {
        await createUser(
          session.user.id,
          session.user.email || `wallet_${session.user.id}@placeholder.local`,
          session.user.dripAccountId,
          undefined
        );
      } catch (createError) {
        console.error('Error creating user record:', createError);
        return NextResponse.json(
          { error: 'Failed to initialize user account. Please try signing out and back in.' },
          { status: 500 }
        );
      }
    }

    // Create submission
    try {
      const submission = await createSubmission(
        session.user.id,
        platform,
        contentUrl,
        contentType,
        description,
        validSubmissionType
      );

      return NextResponse.json({ submission }, { status: 201 });
    } catch (dbError) {
      console.error('Database error creating submission:', dbError);
      const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown database error';

      // Check for common issues
      if (errorMessage.includes('foreign key') || errorMessage.includes('user_id')) {
        return NextResponse.json(
          { error: 'User account not found. Please try signing out and back in.' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to create submission. Please try again.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error creating submission:', error);
    return NextResponse.json(
      { error: 'Failed to create submission' },
      { status: 500 }
    );
  }
}
