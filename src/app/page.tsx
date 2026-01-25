'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { truncateWallet } from '@/lib/drip';

interface LeaderboardEntry {
  rank: number;
  wallet?: string;
  username?: string;
  points: number;
}

export default function Home() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const res = await fetch('/api/drip/leaderboard', {
          cache: 'no-store',
        });
        if (res.ok) {
          const data = await res.json();
          setLeaderboard(data.leaderboard || []);
        }
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        setLoadingLeaderboard(false);
      }
    }

    fetchLeaderboard();
  }, []);

  const getDisplayName = (entry: LeaderboardEntry) => {
    return entry.username || (entry.wallet ? truncateWallet(entry.wallet) : 'Anonymous');
  };

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3, 25);

  return (
    <main className="min-h-screen">
      <Header />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-12 pt-8 pb-6 md:pt-10 md:pb-8">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight mb-4">
            Earn GRIT.{' '}
            <span className="gradient-text">Get Rewarded.</span>
          </h1>
          <p className="text-base md:text-lg text-white/60 leading-relaxed">
            GRIT points track your participation in Shredding Sassy.<br />
            Earn GRIT through buying products and creating content.<br />
            The more you contribute, the more you earn.
          </p>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-12">
        <div className="h-px bg-white/5" />
      </div>

      {/* Shop and Earn Section */}
      <section id="store" className="max-w-7xl mx-auto px-4 md:px-6 lg:px-12 py-8 md:py-10 scroll-mt-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Shop and Earn
          </h2>
          <p className="text-white/50">
            Earn <span className="text-gold font-semibold">10 GRIT</span> for every $1 spent
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-6">
          {/* Hat Card */}
          <a
            href="https://www.shreddingsassy.com/collections/headwear"
            target="_blank"
            rel="noopener noreferrer"
            className="card-premium rounded-xl p-6 transition-all duration-300 block hover:scale-[1.02]"
          >
            <div className="aspect-square relative mb-4 rounded-lg overflow-hidden bg-purple-darker/50">
              <Image
                src="/images/Clasp Side .jpg"
                alt="Shredding Sassy Hats"
                fill
                className="object-cover"
              />
            </div>
            <h3 className="text-white font-semibold mb-2">Shredding Sassy Hats</h3>
            <div className="flex items-center justify-between">
              <span className="text-white/70">$59.95</span>
              <span className="text-gold font-bold">= 600 GRIT</span>
            </div>
          </a>

          {/* Single Pin Card */}
          <a
            href="https://www.shreddingsassy.com/collections/collectible-pins"
            target="_blank"
            rel="noopener noreferrer"
            className="card-premium rounded-xl p-6 transition-all duration-300 block hover:scale-[1.02]"
          >
            <div className="aspect-square relative mb-4 rounded-lg overflow-hidden bg-purple-darker/50">
              <Image
                src="/images/pin.webp"
                alt="Shredding Sassy Pins"
                fill
                className="object-cover"
              />
            </div>
            <h3 className="text-white font-semibold mb-2">Shredding Sassy Pins</h3>
            <div className="flex items-center justify-between">
              <span className="text-white/70">$9.95</span>
              <span className="text-gold font-bold">= 100 GRIT</span>
            </div>
          </a>

          {/* Sticker Pack Card */}
          <a
            href="https://www.shreddingsassy.com/collections/sticker-packs"
            target="_blank"
            rel="noopener noreferrer"
            className="card-premium rounded-xl p-6 transition-all duration-300 block hover:scale-[1.02]"
          >
            <div className="aspect-square relative mb-4 rounded-lg overflow-hidden bg-purple-darker/50">
              <Image
                src="/images/sticker pack.webp"
                alt="Shredding Sassy Sticker Pack"
                fill
                className="object-cover"
              />
            </div>
            <h3 className="text-white font-semibold mb-2">Shredding Sassy Sticker Pack</h3>
            <div className="flex items-center justify-between">
              <span className="text-white/70">$9.95</span>
              <span className="text-gold font-bold">= 100 GRIT</span>
            </div>
          </a>
        </div>

        <p className="text-white/40 text-sm text-center mb-8">
          All products earn GRIT — these are just examples
        </p>

        <div className="text-center">
          <a
            href="https://shreddingsassy.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-block px-8 py-3 rounded-lg text-base font-bold"
          >
            Visit the Store
          </a>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-12">
        <div className="h-px bg-white/5" />
      </div>

      {/* Create Content Section */}
      <section id="create" className="max-w-7xl mx-auto px-4 md:px-6 lg:px-12 py-8 md:py-10 scroll-mt-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Create Content and Earn
          </h2>
          <p className="text-white/50">
            Share your Shredding Sassy gear and earn GRIT rewards
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* General UGC Card */}
          <div className="card-premium rounded-xl p-6 relative overflow-hidden hover:border-gold/30 transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-gold/10 to-transparent rounded-bl-full" />
            <div className="relative">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-white font-semibold text-xl mb-3">Create Content, Earn GRIT</h3>
              <p className="text-white/50 mb-6">
                Show off your gear or spread the word. Post on X, TikTok, Instagram — unboxings, lifestyle shots, threads, Spaces. If you&apos;re featuring Shredding Sassy or talking about us, we want to see it.
              </p>
              <p className="text-white/70 font-medium mb-6">
                Post it. Submit it. Get GRIT.
              </p>
              <Link
                href="/submit"
                className="btn-primary inline-block px-6 py-2.5 rounded-lg text-sm font-bold"
              >
                Submit Content
              </Link>
            </div>
          </div>

          {/* Shred the Feed Card */}
          <div className="card-premium rounded-xl p-6 relative overflow-hidden hover:border-purple-500/30 transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-500/10 to-transparent rounded-bl-full" />
            <div className="relative">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-500/5 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-white font-semibold text-xl mb-3">Shred the Feed</h3>
              <p className="text-white/50 mb-6">
                Our monthly competition for action sports content. Skating, surfing, snowboarding — show us what you&apos;ve got.
              </p>
              <p className="text-white/70 font-medium mb-6">
                Separate from general submissions. Show us your shred.
              </p>
              <Link
                href="/shred-the-feed"
                className="inline-block px-6 py-2.5 rounded-lg text-sm font-bold border border-purple-500/50 text-purple-400 hover:bg-purple-500/10 transition-colors"
              >
                Enter Competition
              </Link>
            </div>
          </div>
        </div>

        <div className="text-center mt-8">
          <Link
            href="/submit"
            className="btn-primary inline-block px-8 py-3 rounded-lg text-base font-bold"
          >
            Learn More
          </Link>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-12">
        <div className="h-px bg-white/5" />
      </div>

      {/* What Can I Do With GRIT? Section */}
      <section id="rewards" className="max-w-7xl mx-auto px-4 md:px-6 lg:px-12 py-12 md:py-16 scroll-mt-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            What Can I Do With GRIT?
          </h2>
          <p className="text-white/50">
            Stack GRIT. Unlock rewards.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {/* Daily Pin Wheel */}
          <Link href="/raffle" className="card-premium rounded-xl p-6 hover:border-gold/30 transition-all block">
            <div className="flex items-start gap-4">
              <div className="text-4xl">🎰</div>
              <div>
                <h3 className="text-white font-semibold text-lg mb-2">Daily Pin Wheel</h3>
                <p className="text-white/50 text-sm">
                  Spin to win collectible enamel pins. Daily chances to add to your collection.
                </p>
              </div>
            </div>
          </Link>

          {/* Exclusive Rewards */}
          <div className="card-premium rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="text-4xl">🎁</div>
              <div>
                <h3 className="text-white font-semibold text-lg mb-2">Exclusive Rewards</h3>
                <p className="text-white/50 text-sm">
                  Raffles, limited edition drops, and more — only available with GRIT.
                </p>
              </div>
            </div>
          </div>

          {/* Shaka */}
          <div className="card-premium rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="text-4xl">🤙</div>
              <div>
                <h3 className="text-white font-semibold text-lg mb-2">Shaka</h3>
                <p className="text-white/50 text-sm">
                  Daily check-in to earn bonus GRIT. Coming soon.
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Divider */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-12">
        <div className="h-px bg-white/5" />
      </div>

      {/* Leaderboard Section */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 lg:px-12 py-8 md:py-10">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            GRIT Leaderboard
          </h2>
          <p className="text-white/50">
            Top earners in the Shredding Sassy community
          </p>
        </div>

        {loadingLeaderboard ? (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          </div>
        ) : top3.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/50">No leaderboard data available</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {/* Top 3 Podium */}
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              {/* Second Place */}
              {top3[1] && (
                <div className="card-premium rounded-xl p-5 md:mt-6 order-1 md:order-1">
                  <div className="text-center">
                    <div className="text-3xl mb-2">🥈</div>
                    <div className="text-gray-300 text-xs font-medium mb-1">#2</div>
                    <div className="font-bold text-base text-white mb-1">
                      {getDisplayName(top3[1])}
                    </div>
                    <div className="text-xl font-black text-gray-300">
                      {top3[1].points.toLocaleString()}
                    </div>
                    <div className="text-white/40 text-xs">GRIT</div>
                  </div>
                </div>
              )}

              {/* First Place */}
              {top3[0] && (
                <div className="card-premium rounded-xl p-6 order-0 md:order-2 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-gold/10 to-transparent" />
                  <div className="relative text-center">
                    <div className="text-4xl mb-2">🥇</div>
                    <div className="text-gold text-xs font-medium mb-1">#1</div>
                    <div className="font-bold text-lg text-white mb-1">
                      {getDisplayName(top3[0])}
                    </div>
                    <div className="text-2xl font-black gradient-text">
                      {top3[0].points.toLocaleString()}
                    </div>
                    <div className="text-white/40 text-xs">GRIT</div>
                  </div>
                </div>
              )}

              {/* Third Place */}
              {top3[2] && (
                <div className="card-premium rounded-xl p-5 md:mt-10 order-2 md:order-3">
                  <div className="text-center">
                    <div className="text-3xl mb-2">🥉</div>
                    <div className="text-amber-600 text-xs font-medium mb-1">#3</div>
                    <div className="font-bold text-base text-white mb-1">
                      {getDisplayName(top3[2])}
                    </div>
                    <div className="text-xl font-black text-amber-600">
                      {top3[2].points.toLocaleString()}
                    </div>
                    <div className="text-white/40 text-xs">GRIT</div>
                  </div>
                </div>
              )}
            </div>

            {/* Remaining Rankings */}
            {rest.length > 0 && (
              <div className="max-w-2xl mx-auto">
                <div className="card-premium rounded-xl overflow-hidden">
                  <div className="divide-y divide-white/5">
                    {rest.map((entry) => (
                      <div
                        key={entry.rank}
                        className="flex items-center justify-between px-6 py-3 hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <span className="font-mono text-sm w-8 text-white/40">
                            #{entry.rank}
                          </span>
                          <span className="font-medium text-white">
                            {getDisplayName(entry)}
                          </span>
                        </div>
                        <span className="font-bold text-white">
                          {entry.points.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <Footer />
    </main>
  );
}
