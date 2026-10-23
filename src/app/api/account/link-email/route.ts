import { NextResponse } from 'next/server';

// Retired: this endpoint let callers act on accounts without proving ownership
// (or was a debug tool). Replaced by verified flows; kept as a stub so old links fail cleanly.
function gone() {
  return NextResponse.json({ error: 'This endpoint has been retired.' }, { status: 410 });
}

export const GET = gone;
export const POST = gone;
