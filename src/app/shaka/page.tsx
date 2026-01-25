'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function ShakaPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const { isConnected } = useAccount();
  const [copied, setCopied] = useState(false);

  const isLoggedIn = isConnected || !!session?.user;
  const contractAddress = "0x478e03D45716dDa94F6DbC15A633B0D90c237E2F";

  const handleCopy = () => {
    navigator.clipboard.writeText(contractAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (!isLoggedIn) {
      router.push('/signin');
    }
  }, [isLoggedIn, sessionStatus, router]);

  if (sessionStatus === 'loading' || !isLoggedIn) {
    return (
      <main className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center py-32">
          <div className="w-12 h-12 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <Header />

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-4 md:px-6 pt-16 pb-8 md:pt-24 md:pb-12 text-center">
        <div className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-6 relative">
          <Image
            src="/images/shaka.gif"
            alt="Shaka"
            fill
            className="object-contain"
            unoptimized
          />
        </div>
        <h1 className="text-5xl md:text-7xl font-black mb-4">
          <span className="text-gold">$SHAKA</span>
        </h1>
        <p className="text-xl md:text-2xl text-white/80 font-medium">
          When the brand wins, holders win.
        </p>
      </section>

      {/* The Problem → Solution */}
      <section className="max-w-4xl mx-auto px-4 md:px-6 py-12">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Old Way */}
          <div className="card-premium rounded-xl p-6">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-4">The Old Way</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-white/40">1.</span>
                <span className="text-white/60">You spread the word</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-white/40">2.</span>
                <span className="text-white/60">Brand blows up</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-white/40">3.</span>
                <span className="text-red-400 font-semibold">You get nothing</span>
              </div>
            </div>
          </div>

          {/* New Way */}
          <div className="card-premium rounded-xl p-6 border-gold/20">
            <p className="text-gold text-xs uppercase tracking-wider mb-4">With $SHAKA</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-gold/60">1.</span>
                <span className="text-white/80">You spread the word</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gold/60">2.</span>
                <span className="text-white/80">Brand blows up</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gold/60">3.</span>
                <span className="text-gold font-semibold">You benefit too</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Big Number */}
      <section className="max-w-3xl mx-auto px-4 md:px-6 py-12 text-center">
        <div className="card-premium rounded-2xl p-8 md:p-12">
          <p className="text-white/40 text-sm uppercase tracking-wider mb-2">Revenue Share</p>
          <div className="text-7xl md:text-8xl lg:text-9xl font-black text-gold leading-none mb-4">
            10%
          </div>
          <p className="text-white/60 text-lg">
            of all brand revenue goes to token buybacks
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-3xl mx-auto px-4 md:px-6 py-12">
        <h2 className="text-xl font-bold text-white text-center mb-8">How It Works</h2>
        <div className="flex flex-col md:flex-row items-center justify-center gap-4">
          <div className="card-premium rounded-xl px-6 py-4 text-center">
            <p className="text-white font-medium">Brand sells merch</p>
          </div>
          <span className="text-white/30 text-2xl hidden md:block">→</span>
          <span className="text-white/30 text-xl md:hidden">↓</span>
          <div className="card-premium rounded-xl px-6 py-4 text-center">
            <p className="text-white font-medium">Revenue buys $SHAKA</p>
          </div>
          <span className="text-white/30 text-2xl hidden md:block">→</span>
          <span className="text-white/30 text-xl md:hidden">↓</span>
          <div className="card-premium rounded-xl px-6 py-4 text-center border-gold/20">
            <p className="text-gold font-medium">Holders benefit</p>
          </div>
        </div>
      </section>

      {/* Earn Your Way In */}
      <section className="max-w-2xl mx-auto px-4 md:px-6 py-12">
        <div className="card-premium rounded-2xl p-8 text-center">
          <h2 className="text-xl font-bold text-white mb-3">Earn Your Way In</h2>
          <p className="text-white/50 mb-6">
            Stack GRIT through purchases and content. Convert to $SHAKA during periodic windows.
          </p>
          <div className="flex items-center justify-center gap-4 mb-8">
            <span className="text-2xl font-bold text-white">GRIT</span>
            <span className="text-gold text-2xl">→</span>
            <span className="text-2xl font-bold text-gold">$SHAKA</span>
          </div>
          <Link
            href="/"
            className="inline-block bg-gold hover:bg-yellow-400 text-purple-darker px-8 py-3 rounded-full font-bold transition-colors"
          >
            Start Earning GRIT
          </Link>
        </div>
      </section>

      {/* For Crypto Users */}
      <section className="max-w-2xl mx-auto px-4 md:px-6 py-12">
        <div className="text-center">
          <p className="text-white/30 text-sm mb-6">Already crypto-native?</p>

          <div className="flex flex-wrap justify-center gap-3 mb-6">
            <a
              href="https://app.uniswap.org/swap?outputCurrency=0x478e03D45716dDa94F6DbC15A633B0D90c237E2F&chain=base"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-white/10 text-white/50 hover:text-white hover:border-white/30 font-medium px-5 py-2 rounded-full transition-all text-sm"
            >
              Uniswap
            </a>
            <a
              href="https://aerodrome.finance/swap?to=0x478e03D45716dDa94F6DbC15A633B0D90c237E2F"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-white/10 text-white/50 hover:text-white hover:border-white/30 font-medium px-5 py-2 rounded-full transition-all text-sm"
            >
              Aerodrome
            </a>
            <a
              href="https://dexscreener.com/base/0x478e03D45716dDa94F6DbC15A633B0D90c237E2F"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-white/10 text-white/50 hover:text-white hover:border-white/30 font-medium px-5 py-2 rounded-full transition-all text-sm"
            >
              DexScreener
            </a>
          </div>

          <div className="flex items-center justify-center gap-2 text-white/20 text-xs">
            <span className="uppercase tracking-wider">Base</span>
            <span>•</span>
            <code className="font-mono">{contractAddress.slice(0, 6)}...{contractAddress.slice(-4)}</code>
            <button
              onClick={handleCopy}
              className="hover:text-white/40 transition-colors p-1"
              title="Copy address"
            >
              {copied ? (
                <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
