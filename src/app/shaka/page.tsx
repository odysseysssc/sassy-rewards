'use client';

import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function ShakaPage() {
  return (
    <main className="min-h-screen">
      <Header />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-12 py-16 md:py-24">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-6">
            <span className="gradient-text">$SHAKA</span>
          </h1>
          <p className="text-xl md:text-2xl text-white/60 leading-relaxed">
            When the brand wins, holders win.
          </p>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-12 py-12 md:py-16">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
                The Old Model is Broken
              </h2>
              <p className="text-white/60 mb-4 text-lg">
                You buy the product. Tell your friends. Watch it blow up. And get nothing.
              </p>
              <p className="text-white/60 text-lg">
                The people who build the hype never share in the upside. Early supporters get zero equity in the brands they help create.
              </p>
            </div>
            <div className="card-premium rounded-xl p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <span className="text-white/70">You spread the word</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <span className="text-white/70">Brand blows up</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <span className="text-white/70">You get nothing</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-12">
        <div className="h-px bg-white/5" />
      </div>

      {/* The Solution Section */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-12 py-12 md:py-16">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="card-premium rounded-xl p-6 order-2 md:order-1">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-white/70">10% revenue to buybacks</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-white/70">Real value from real revenue</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-white/70">Community shares the upside</span>
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
                $SHAKA Flips That
              </h2>
              <p className="text-white/60 mb-4 text-lg">
                10% of all brand revenue flows into $SHAKA buybacks. The more Shredding Sassy grows, the more the ecosystem gets fueled.
              </p>
              <p className="text-white/70 text-lg font-medium">
                When the brand wins, holders win. Period.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-12">
        <div className="h-px bg-white/5" />
      </div>

      {/* How It Works Section */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-12 py-12 md:py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            How It Works
          </h2>
        </div>

        <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {/* Step 1 */}
          <div className="card-premium rounded-xl p-6 text-center relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-gradient-to-br from-gold to-gold/50 flex items-center justify-center text-black font-bold text-sm">
              1
            </div>
            <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center mx-auto mb-4 mt-4">
              <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-white font-semibold mb-2">Brand Revenue</h3>
            <p className="text-white/50 text-sm">
              Merch, collabs, licensing — Shredding Sassy generates revenue
            </p>
          </div>

          {/* Step 2 */}
          <div className="card-premium rounded-xl p-6 text-center relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-gradient-to-br from-gold to-gold/50 flex items-center justify-center text-black font-bold text-sm">
              2
            </div>
            <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center mx-auto mb-4 mt-4">
              <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
            <h3 className="text-white font-semibold mb-2">10% to Buybacks</h3>
            <p className="text-white/50 text-sm">
              Portion of revenue allocated to buy $SHAKA from the market
            </p>
          </div>

          {/* Step 3 */}
          <div className="card-premium rounded-xl p-6 text-center relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-gradient-to-br from-gold to-gold/50 flex items-center justify-center text-black font-bold text-sm">
              3
            </div>
            <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center mx-auto mb-4 mt-4">
              <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="text-white font-semibold mb-2">Value Supported</h3>
            <p className="text-white/50 text-sm">
              Real revenue creates real demand for $SHAKA
            </p>
          </div>

          {/* Step 4 */}
          <div className="card-premium rounded-xl p-6 text-center relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-gradient-to-br from-gold to-gold/50 flex items-center justify-center text-black font-bold text-sm">
              4
            </div>
            <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center mx-auto mb-4 mt-4">
              <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-white font-semibold mb-2">Holders Benefit</h3>
            <p className="text-white/50 text-sm">
              Community shares in brand growth
            </p>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-12">
        <div className="h-px bg-white/5" />
      </div>

      {/* GRIT to SHAKA Conversion Section */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-12 py-12 md:py-16">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Earn Your Way In
            </h2>
          </div>

          <div className="card-premium rounded-2xl p-8 md:p-10">
            <p className="text-lg text-white/60 mb-6 text-center">
              GRIT is how you prove you&apos;re part of this. Stack GRIT through purchases and content.
            </p>

            <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10 mb-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-white mb-1">GRIT</div>
                <div className="text-white/40 text-sm">Your Points</div>
              </div>
              <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold gradient-text mb-1">SHAKA</div>
                <div className="text-white/40 text-sm">Your Tokens</div>
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-6">
              <p className="text-white/70 text-center">
                Periodically we open conversion windows where you can swap GRIT for $SHAKA.
              </p>
              <p className="text-white/50 text-sm text-center mt-2">
                Conversion events are announced in Discord.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-12">
        <div className="h-px bg-white/5" />
      </div>

      {/* Token Info Section */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-12 py-12 md:py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Token Info
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto mb-10">
          <div className="card-premium rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-white mb-1">Base</div>
            <div className="text-white/40 text-sm">Blockchain</div>
          </div>
          <div className="card-premium rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-gold mb-1">10%</div>
            <div className="text-white/40 text-sm">Revenue to Buybacks</div>
          </div>
          <div className="card-premium rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-white mb-1">$SHAKA</div>
            <div className="text-white/40 text-sm">Ticker</div>
          </div>
        </div>

        {/* Contract Address */}
        <div className="card-premium rounded-xl p-6 max-w-2xl mx-auto">
          <div className="text-center">
            <p className="text-white/50 text-sm mb-2">Contract Address (Base)</p>
            <code className="text-white/70 text-sm font-mono break-all">
              Coming soon
            </code>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-12">
        <div className="h-px bg-white/5" />
      </div>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-12 py-16 md:py-20">
        <div className="card-premium rounded-2xl p-8 md:p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-gold/10 via-transparent to-purple-500/10" />

          <div className="relative z-10">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Get Started
            </h2>
            <p className="text-white/60 mb-8 max-w-xl mx-auto">
              Stack GRIT now. When conversion windows open, you&apos;ll be ready.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/"
                className="btn-primary px-8 py-3 rounded-lg text-base font-bold"
              >
                Start Earning GRIT
              </Link>
              <a
                href="https://dexscreener.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 rounded-lg text-base font-bold border border-white/20 text-white hover:bg-white/5 transition-colors"
              >
                Buy $SHAKA
              </a>
              <a
                href="https://discord.gg/sassy"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 rounded-lg text-base font-bold border border-white/20 text-white hover:bg-white/5 transition-colors"
              >
                Join Discord
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
