'use client';

import { useSession } from 'next-auth/react';
import { useAccount } from 'wagmi';
import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { truncateWallet } from '@/lib/drip';

interface LeaderboardEntry {
  rank: number;
  wallet?: string;
  username?: string;
  email?: string;
  accountId?: string;
  points: number;
}

export default function Leaderboard() {
  const { data: session } = useSession();
  const { address } = useAccount();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const displayWallet = session?.user?.wallet || address;
  const displayEmail = session?.user?.email;
  const dripAccountId = session?.user?.dripAccountId;

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const res = await fetch('/api/drip/leaderboard');
        if (res.ok) {
          const data = await res.json();
          setLeaderboard(data.leaderboard || []);
        }
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, []);

  // Check if entry matches current user by any identifier
  const isCurrentUser = (entry: LeaderboardEntry) => {
    if (dripAccountId && entry.accountId && entry.accountId === dripAccountId) {
      return true;
    }
    if (displayEmail && entry.email && entry.email.toLowerCase() === displayEmail.toLowerCase()) {
      return true;
    }
    if (displayWallet && entry.wallet && entry.wallet.toLowerCase() === displayWallet.toLowerCase()) {
      return true;
    }
    return false;
  };

  const getDisplayName = (entry: LeaderboardEntry) => {
    return entry.username || (entry.wallet ? truncateWallet(entry.wallet) : 'Anonymous');
  };

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3, 50);

  return (
    <main className="min-h-screen">
      <Header />

      <section className="max-w-5xl mx-auto px-4 md:px-6 lg:px-12 py-16 md:py-20">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
            GRIT Rankings
          </h1>
          <p className="text-white/50 text-lg">
            Top earners in the Shredding Sassy community
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-white/50 text-lg">No leaderboard data available</p>
          </div>
        ) : (
          <>
            {/* Top 3 Podium */}
            <div className="grid md:grid-cols-3 gap-4 mb-12">
              {/* Second Place */}
              {top3[1] && (
                <div className={`card-premium rounded-xl p-6 md:mt-8 order-1 md:order-1 ${isCurrentUser(top3[1]) ? 'ring-2 ring-gold' : ''}`}>
                  <div className="text-center">
                    <div className="text-4xl mb-3">🥈</div>
                    <div className="text-gray-300 text-sm font-medium mb-1">#2</div>
                    <div className={`font-bold text-lg mb-2 ${isCurrentUser(top3[1]) ? 'text-gold' : 'text-white'}`}>
                      {getDisplayName(top3[1])}
                      {isCurrentUser(top3[1]) && <span className="text-gold/70 text-xs ml-1">(You)</span>}
                    </div>
                    <div className="text-2xl font-black text-gray-300">
                      {top3[1].points.toLocaleString()}
                    </div>
                    <div className="text-white/40 text-xs">GRIT</div>
                  </div>
                </div>
              )}

              {/* First Place */}
              {top3[0] && (
                <div className={`card-premium rounded-xl p-8 order-0 md:order-2 relative overflow-hidden ${isCurrentUser(top3[0]) ? 'ring-2 ring-gold' : ''}`}>
                  <div className="absolute inset-0 bg-gradient-to-b from-gold/10 to-transparent" />
                  <div className="relative text-center">
                    <div className="text-5xl mb-3">🥇</div>
                    <div className="text-gold text-sm font-medium mb-1">#1</div>
                    <div className={`font-bold text-xl mb-2 ${isCurrentUser(top3[0]) ? 'text-gold' : 'text-white'}`}>
                      {getDisplayName(top3[0])}
                      {isCurrentUser(top3[0]) && <span className="text-gold/70 text-xs ml-1">(You)</span>}
                    </div>
                    <div className="text-3xl font-black gradient-text">
                      {top3[0].points.toLocaleString()}
                    </div>
                    <div className="text-white/40 text-xs">GRIT</div>
                  </div>
                </div>
              )}

              {/* Third Place */}
              {top3[2] && (
                <div className={`card-premium rounded-xl p-6 md:mt-12 order-2 md:order-3 ${isCurrentUser(top3[2]) ? 'ring-2 ring-gold' : ''}`}>
                  <div className="text-center">
                    <div className="text-4xl mb-3">🥉</div>
                    <div className="text-amber-600 text-sm font-medium mb-1">#3</div>
                    <div className={`font-bold text-lg mb-2 ${isCurrentUser(top3[2]) ? 'text-gold' : 'text-white'}`}>
                      {getDisplayName(top3[2])}
                      {isCurrentUser(top3[2]) && <span className="text-gold/70 text-xs ml-1">(You)</span>}
                    </div>
                    <div className="text-2xl font-black text-amber-600">
                      {top3[2].points.toLocaleString()}
                    </div>
                    <div className="text-white/40 text-xs">GRIT</div>
                  </div>
                </div>
              )}
            </div>

            {/* Remaining Rankings */}
            {rest.length > 0 && (
              <div className="card-premium rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10">
                  <h2 className="text-white font-semibold">Rankings</h2>
                </div>
                <div className="divide-y divide-white/5">
                  {rest.map((entry) => (
                    <div
                      key={entry.rank}
                      className={`flex items-center justify-between px-6 py-4 transition-colors ${
                        isCurrentUser(entry) ? 'bg-gold/5' : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-white/40 font-mono text-sm w-8">
                          #{entry.rank}
                        </span>
                        <span className={`font-medium ${isCurrentUser(entry) ? 'text-gold' : 'text-white'}`}>
                          {getDisplayName(entry)}
                          {isCurrentUser(entry) && (
                            <span className="ml-2 text-xs text-gold/70">(You)</span>
                          )}
                        </span>
                      </div>
                      <span className="font-bold text-white">
                        {entry.points.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <Footer />
    </main>
  );
}
