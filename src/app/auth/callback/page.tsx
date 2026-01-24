'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import Link from 'next/link';

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Verifying...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        setStatus('Verifying magic link...');
        const { data, error: authError } = await supabase.auth.getSession();

        if (authError) {
          console.error('Supabase auth error:', authError);
          setError('Authentication failed. Please try again.');
          return;
        }

        if (!data.session) {
          setError('No session found. Please try signing in again.');
          return;
        }

        const { user } = data.session;
        if (!user.email) {
          setError('No email found in session.');
          return;
        }

        setStatus('Creating your account...');

        // Sign in to NextAuth with email credentials
        const result = await signIn('email', {
          email: user.email,
          supabaseUserId: user.id,
          redirect: false,
        });

        if (result?.ok) {
          setStatus('Success! Redirecting...');
          router.push('/');
        } else {
          console.error('NextAuth sign in failed:', result?.error);
          setError('Failed to create session. Please try again.');
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError('An error occurred. Please try again.');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <Link href="/" className="relative w-40 h-14 mb-8">
        <Image
          src="/images/logo.png"
          alt="Shredding Sassy"
          fill
          className="object-contain"
          priority
        />
      </Link>

      {error ? (
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Link
            href="/signin"
            className="btn-primary inline-block px-6 py-3 rounded-lg"
          >
            Try Again
          </Link>
        </div>
      ) : (
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">{status}</p>
        </div>
      )}
    </main>
  );
}
