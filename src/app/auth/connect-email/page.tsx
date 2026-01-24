'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { createClient } from '@supabase/supabase-js';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function ConnectEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function handleEmailConnection() {
      try {
        // Get the Supabase session from the URL hash (magic link)
        const { data: { session: supabaseSession }, error: authError } = await supabase.auth.getSession();

        if (authError || !supabaseSession?.user?.email) {
          setStatus('error');
          setErrorMessage('Failed to verify email. The link may have expired.');
          return;
        }

        const email = supabaseSession.user.email;
        const userId = searchParams.get('userId');

        if (!userId) {
          setStatus('error');
          setErrorMessage('Invalid verification link.');
          return;
        }

        // Call API to link the email to the user
        const res = await fetch('/api/account/link-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, userId }),
        });

        if (res.ok) {
          setStatus('success');
          // Update the session to include the new email
          await updateSession();
          // Redirect to profile after a short delay
          setTimeout(() => router.push('/profile'), 2000);
        } else {
          const data = await res.json();
          setStatus('error');
          setErrorMessage(data.error || 'Failed to connect email.');
        }
      } catch (error) {
        console.error('Email connection error:', error);
        setStatus('error');
        setErrorMessage('An unexpected error occurred.');
      }
    }

    handleEmailConnection();
  }, [searchParams, router, updateSession]);

  return (
    <div className="card-premium rounded-xl p-8 text-center">
      {status === 'loading' && (
        <>
          <div className="w-12 h-12 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Connecting Email...</h2>
          <p className="text-white/50">Please wait while we verify your email.</p>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Email Connected!</h2>
          <p className="text-white/50 mb-4">
            Your email has been linked to your account. Any GRIT from Shopify purchases will now be credited to you.
          </p>
          <p className="text-white/40 text-sm">Redirecting to profile...</p>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Connection Failed</h2>
          <p className="text-white/50 mb-4">{errorMessage}</p>
          <button
            onClick={() => router.push('/profile')}
            className="btn-primary px-6 py-2.5 rounded-lg text-sm font-semibold"
          >
            Back to Profile
          </button>
        </>
      )}
    </div>
  );
}

export default function ConnectEmailCallback() {
  return (
    <main className="min-h-screen">
      <Header />

      <section className="max-w-md mx-auto px-4 py-20">
        <Suspense fallback={
          <div className="card-premium rounded-xl p-8 text-center">
            <div className="w-12 h-12 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Loading...</h2>
          </div>
        }>
          <ConnectEmailContent />
        </Suspense>
      </section>

      <Footer />
    </main>
  );
}
