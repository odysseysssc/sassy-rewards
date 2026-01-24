import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const credentialType = searchParams.get('type');

    const supabase = createServerClient();

    let query = supabase
      .from('connected_credentials')
      .select('credential_type, identifier, display_name, verified, created_at')
      .eq('user_id', session.user.id);

    if (credentialType) {
      query = query.eq('credential_type', credentialType);
    }

    const { data: credentials, error } = await query;

    if (error) {
      console.error('Error fetching credentials:', error);
      return NextResponse.json({ credentials: [] });
    }

    return NextResponse.json({ credentials: credentials || [] });
  } catch (error) {
    console.error('Error in credentials GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
