import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createSubmission, getUserSubmissions } from '@/lib/db';

// GET - Fetch user's submissions
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const submissions = await getUserSubmissions(session.user.id);

    return NextResponse.json({ submissions });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 500 }
    );
  }
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
    const { platform, contentUrl, contentType, description } = body;

    // Validate required fields
    if (!platform || !contentUrl || !contentType) {
      return NextResponse.json(
        { error: 'Platform, content URL, and content type are required' },
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

    // Validate platform
    const validPlatforms = ['twitter', 'instagram', 'tiktok', 'youtube', 'other'];
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform' },
        { status: 400 }
      );
    }

    // Validate content type
    const validContentTypes = ['photo', 'video', 'story', 'post', 'other'];
    if (!validContentTypes.includes(contentType)) {
      return NextResponse.json(
        { error: 'Invalid content type' },
        { status: 400 }
      );
    }

    // Create submission
    const submission = await createSubmission(
      session.user.id,
      platform,
      contentUrl,
      contentType,
      description
    );

    return NextResponse.json({ submission }, { status: 201 });
  } catch (error) {
    console.error('Error creating submission:', error);
    return NextResponse.json(
      { error: 'Failed to create submission' },
      { status: 500 }
    );
  }
}
