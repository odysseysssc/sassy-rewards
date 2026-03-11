import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/admin';

// GET - Fetch user details including shipping address
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

    // Get user with all details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        display_name,
        drip_account_id,
        shipping_name,
        shipping_email,
        shipping_phone,
        shipping_address,
        shipping_city,
        shipping_state,
        shipping_zip,
        shipping_country,
        created_at,
        updated_at
      `)
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user's credentials
    const { data: credentials } = await supabase
      .from('connected_credentials')
      .select('credential_type, identifier, verified')
      .eq('user_id', userId);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        drip_account_id: user.drip_account_id,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      address: user.shipping_address ? {
        name: user.shipping_name,
        email: user.shipping_email,
        phone: user.shipping_phone,
        address: user.shipping_address,
        city: user.shipping_city,
        state: user.shipping_state,
        zip: user.shipping_zip,
        country: user.shipping_country,
      } : null,
      credentials: credentials || [],
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    return NextResponse.json({ error: 'Failed to fetch user details' }, { status: 500 });
  }
}
