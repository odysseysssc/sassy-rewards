'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { Footer } from '@/components/Footer';

export default function SignIn() {
  const router = useRouter();
  const { address, isConnected } = useAccount();

  // Email magic link state
  const [email, setEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Auto-sign in when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      signIn('wallet', { wallet: address, redirect: false }).then((result) => {
        if (result?.ok) {
          router.push('/');
        }
      });
    }
  }, [isConnected, address, router]);

  // Handle email magic link submission
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailLoading(true);
    setEmailError(null);

    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setEmailSent(true);
      } else {
        const data = await res.json();
        setEmailError(data.error || 'Failed to send magic link');
      }
    } catch {
      setEmailError('An error occurred. Please try again.');
    } finally {
      setEmailLoading(false);
    }
  };

  // Handle Discord sign in
  const handleDiscordSignIn = () => {
    signIn('discord', { callbackUrl: '/' });
  };

  return (
    <main className="min-h-screen flex flex-col">
      {/* Simple Header */}
      <header className="w-full border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-12 py-4">
          <Link href="/" className="relative w-32 h-12 md:w-40 md:h-14 block">
            <Image
              src="/images/logo.png"
              alt="Shredding Sassy"
              fill
              className="object-contain object-left"
              priority
            />
          </Link>
        </div>
      </header>

      {/* Sign In Options */}
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold text-white text-center mb-2">
            Sign In
          </h1>
          <p className="text-white/50 text-center mb-8">
            Sign in to view and earn GRIT rewards
          </p>

          {/* Email Magic Link - Primary */}
          <div className="card-premium rounded-xl p-6 mb-4">
            <h2 className="text-sm font-semibold text-gold mb-4 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email
            </h2>

            {emailSent ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-white mb-1">Check your email!</p>
                <p className="text-white/50 text-sm">
                  We sent a magic link to <strong className="text-white">{email}</strong>
                </p>
                <button
                  onClick={() => setEmailSent(false)}
                  className="text-gold text-sm mt-4 hover:underline"
                >
                  Use a different email
                </button>
              </div>
            ) : (
              <form onSubmit={handleEmailSubmit}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input-premium w-full px-4 py-3 rounded-lg text-white mb-3"
                  required
                />
                {emailError && (
                  <p className="text-red-400 text-sm mb-3">{emailError}</p>
                )}
                <button
                  type="submit"
                  disabled={emailLoading}
                  className="btn-primary w-full py-3 rounded-lg font-bold"
                >
                  {emailLoading ? 'Sending...' : 'Send Magic Link'}
                </button>
              </form>
            )}

            <p className="text-white/40 text-xs text-center mt-4">
              Use the same email as your Shopify orders to link your GRIT
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/30 text-sm">or continue with</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Secondary Auth Options */}
          <div className="space-y-3">
            {/* Wallet Connect */}
            <ConnectButton.Custom>
              {({ openConnectModal, mounted }) => {
                const ready = mounted;
                return (
                  <button
                    onClick={openConnectModal}
                    disabled={!ready}
                    className="w-full flex items-center justify-center gap-3 bg-purple-darker hover:bg-purple-dark border border-white/10 hover:border-gold/30 rounded-lg px-6 py-4 transition-all"
                  >
                    <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <span className="text-white font-semibold">Connect Wallet</span>
                  </button>
                );
              }}
            </ConnectButton.Custom>

            {/* Discord */}
            <button
              onClick={handleDiscordSignIn}
              className="w-full flex items-center justify-center gap-3 bg-purple-darker hover:bg-purple-dark border border-white/10 hover:border-gold/30 rounded-lg px-6 py-4 transition-all"
            >
              <svg className="w-5 h-5 text-[#5865F2]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              <span className="text-white font-semibold">Continue with Discord</span>
            </button>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
