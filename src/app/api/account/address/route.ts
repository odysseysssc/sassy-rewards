import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('users')
      .select('shipping_name, shipping_address, shipping_city, shipping_state, shipping_zip, shipping_country')
      .eq('id', session.user.id)
      .single();

    if (error) {
      console.error('Error fetching address:', error);
      return NextResponse.json({ address: null });
    }

    return NextResponse.json({
      address: data ? {
        name: data.shipping_name,
        address: data.shipping_address,
        city: data.shipping_city,
        state: data.shipping_state,
        zip: data.shipping_zip,
        country: data.shipping_country,
      } : null
    });
  } catch (error) {
    console.error('Error in address GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, address, city, state, zip, country } = await request.json();

    if (!name || !address || !city || !state || !zip) {
      return NextResponse.json({ error: 'All address fields are required' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { error } = await supabase
      .from('users')
      .update({
        shipping_name: name,
        shipping_address: address,
        shipping_city: city,
        shipping_state: state,
        shipping_zip: zip,
        shipping_country: country || 'United States',
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.user.id);

    if (error) {
      console.error('Error saving address:', error);
      return NextResponse.json({ error: 'Failed to save address' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in address POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
