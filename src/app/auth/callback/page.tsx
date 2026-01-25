'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Verifying...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const token = searchParams.get('token');
        const email = searchParams.get('email');

        if (!token || !email) {
          setError('Invalid login link. Please try again.');
          return;
        }

        setStatus('Verifying magic link...');

        // Verify the token via API
        const verifyRes = await fetch('/api/auth/verify-magic-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, email }),
        });

        if (!verifyRes.ok) {
          const data = await verifyRes.json();
          setError(data.error || 'Invalid or expired link. Please try again.');
          return;
        }

        setStatus('Creating your session...');

        // Sign in to NextAuth with email credentials
        const result = await signIn('email', {
          email: email,
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
  }, [router, searchParams]);

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

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="w-12 h-12 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </main>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
