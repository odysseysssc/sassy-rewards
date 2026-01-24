'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { PinWheel } from '@/components/PinWheel';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { RAFFLE_COST, PINS } from '@/lib/constants';

interface Winner {
  wallet_address: string;
  pin_won: string;
  date_won: string;
  display_name: string;
}

export default function RafflePage() {
  const { data: session } = useSession();
  const { openConnectModal } = useConnectModal();
  const { address, isConnected } = useAccount();

  // Get accountId from session if available
  const accountId = session?.user?.dripAccountId;
  const [gritBalance, setGritBalance] = useState<number | null>(null);
  const [hasEntered, setHasEntered] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [entryCount, setEntryCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [prize, setPrize] = useState<string | null>(null);
  const [targetSegment, setTargetSegment] = useState<number | null>(null);
  const [autoEntryEnabled, setAutoEntryEnabled] = useState(false);
  const [isTogglingAutoEntry, setIsTogglingAutoEntry] = useState(false);
  const [winners, setWinners] = useState<Winner[]>([]);

  // Fetch winners history on page load
  useEffect(() => {
    async function fetchWinners() {
      try {
        const res = await fetch('/api/pinwheel/winners');
        if (res.ok) {
          const data = await res.json();
          setWinners(data.winners || []);
        }
      } catch (err) {
        console.error('Error fetching winners:', err);
      }
    }
    fetchWinners();
  }, []);

  const fetchData = useCallback(async () => {
    if (!address && !accountId) return;

    try {
      // Fetch Grit balance - prefer accountId, fallback to wallet
      const params = new URLSearchParams();
      if (accountId) {
        params.set('accountId', accountId);
      } else if (address) {
        params.set('wallet', address);
      }

      const memberRes = await fetch(`/api/drip/member?${params.toString()}`);
      if (memberRes.ok) {
        const data = await memberRes.json();
        setGritBalance(data.member?.points ?? 0);
      }

      // Check if already entered today - use wallet or accountId
      const entryIdentifier = address?.toLowerCase() || accountId;
      if (entryIdentifier) {
        const entryRes = await fetch(`/api/raffle/check-entry?wallet=${entryIdentifier}`);
        if (entryRes.ok) {
          const data = await entryRes.json();
          setHasEntered(data.hasEntered);
        }
      }

      // Get today's entry count
      const todayRes = await fetch('/api/raffle/today');
      if (todayRes.ok) {
        const data = await todayRes.json();
        setEntryCount(data.entryCount);
      }

      // Check auto-entry status - use wallet or accountId
      if (entryIdentifier) {
        const autoEntryRes = await fetch(`/api/pinwheel/auto-entry?wallet=${entryIdentifier}`);
        if (autoEntryRes.ok) {
          const data = await autoEntryRes.json();
          setAutoEntryEnabled(data.enabled);
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  }, [address, accountId]);

  useEffect(() => {
    if ((isConnected && address) || accountId) {
      fetchData();
    } else {
      setGritBalance(null);
      setHasEntered(false);
      setAutoEntryEnabled(false);
    }
  }, [isConnected, address, accountId, fetchData]);

  const handleEnterRaffle = async () => {
    if ((!address && !accountId) || isEntering || hasEntered) return;

    setIsEntering(true);
    setError(null);

    try {
      const res = await fetch('/api/raffle/enter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: address, accountId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to enter raffle');
        return;
      }

      // Success - update state and spin the wheel
      setHasEntered(true);
      setGritBalance(data.newBalance);
      setEntryCount((prev) => prev + 1);
      // Pick a random pin to land on for visual effect
      const randomSegment = Math.floor(Math.random() * PINS.length);
      setTargetSegment(randomSegment);
      setPrize(PINS[randomSegment].name);
      setIsSpinning(true);
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error('Error entering raffle:', err);
    } finally {
      setIsEntering(false);
    }
  };

  const handleToggleAutoEntry = async () => {
    if ((!address && !accountId) || isTogglingAutoEntry) return;

    setIsTogglingAutoEntry(true);
    setError(null);

    try {
      // Use wallet if available, otherwise use accountId as the identifier
      const identifier = address?.toLowerCase() || accountId;
      const res = await fetch('/api/pinwheel/auto-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: identifier, enabled: !autoEntryEnabled }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to toggle auto-entry');
        return;
      }

      setAutoEntryEnabled(data.enabled);
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error('Error toggling auto-entry:', err);
    } finally {
      setIsTogglingAutoEntry(false);
    }
  };

  const handleSpinComplete = () => {
    setIsSpinning(false);
  };

  // Calculate time until 8pm UTC draw
  const now = new Date();
  const drawTime = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 20, 0, 0));
  // If past 8pm UTC today, show time until tomorrow's draw
  if (now.getTime() > drawTime.getTime()) {
    drawTime.setUTCDate(drawTime.getUTCDate() + 1);
  }
  const msUntilDraw = drawTime.getTime() - now.getTime();
  const hoursUntilDraw = Math.floor(msUntilDraw / (1000 * 60 * 60));
  const minutesUntilDraw = Math.floor((msUntilDraw % (1000 * 60 * 60)) / (1000 * 60));

  const isLoggedIn = isConnected || !!accountId;
  const canEnter = isLoggedIn && gritBalance !== null && gritBalance >= RAFFLE_COST && !hasEntered && !isSpinning;

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <main className="min-h-screen">
      <Header />
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-12 py-12">
        {/* Hero */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4">
            <span className="text-gold">Pin Wheel</span>
          </h1>
          <p className="text-white/60 text-lg md:text-xl max-w-3xl mx-auto">
            Enter daily for your chance to win one of our collectible enamel pins. 10 Grit per entry.
            At 8pm UTC the wheel will spin and a winner will be picked. Winners are notified in Discord!
          </p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card-premium rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-gold">{entryCount}</div>
            <div className="text-white/50 text-sm">Today&apos;s Entries</div>
          </div>
          <div className="card-premium rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-white">
              {hoursUntilDraw}h {minutesUntilDraw}m
            </div>
            <div className="text-white/50 text-sm">Until Draw</div>
          </div>
          <div className="card-premium rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-gold">{RAFFLE_COST}</div>
            <div className="text-white/50 text-sm">Grit per Entry</div>
          </div>
          <div className="card-premium rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-white">1</div>
            <div className="text-white/50 text-sm">Entry per Day</div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          {/* Wheel Section - takes 3 columns */}
          <div className="lg:col-span-3 card-premium rounded-xl p-8">
            <h2 className="text-xl font-bold text-white mb-6 text-center">The Wheel</h2>
            <PinWheel
              isSpinning={isSpinning}
              targetSegment={targetSegment}
              onSpinComplete={handleSpinComplete}
            />
          </div>

          {/* Right Side - takes 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Connection State */}
            {!isLoggedIn ? (
              <div className="card-premium rounded-xl p-6 text-center">
                <h3 className="text-xl font-bold text-white mb-4">Connect to Enter</h3>
                <p className="text-white/60 mb-6">
                  Connect your wallet to enter the daily pin wheel draw.
                </p>
                <button
                  onClick={openConnectModal}
                  className="btn-primary px-6 py-3 rounded-lg font-semibold"
                >
                  Connect Wallet
                </button>
              </div>
            ) : (
              <>
                {/* Balance Card */}
                <div className="card-premium rounded-xl p-6">
                  <div className="text-white/50 text-sm">Your Grit Balance</div>
                  <div className="text-3xl font-bold text-gold">
                    {gritBalance?.toLocaleString() ?? '--'}
                  </div>
                </div>

                {/* Auto-Entry Toggle */}
                <div className="card-premium rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-semibold">Auto-Entry</div>
                      <div className="text-white/50 text-sm">Auto-enter daily at 7:55pm UTC</div>
                    </div>
                    <button
                      onClick={handleToggleAutoEntry}
                      disabled={isTogglingAutoEntry}
                      className={`relative w-14 h-8 rounded-full transition-colors ${
                        autoEntryEnabled ? 'bg-gold' : 'bg-white/20'
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-transform ${
                          autoEntryEnabled ? 'left-7' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Next Draw / Entry Section */}
                <div className="card-premium rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Next Draw</h3>

                  {prize ? (
                    <div className="text-center">
                      <div className="text-white/50 mb-2">You landed on:</div>
                      <div className="text-2xl font-bold text-gold mb-4">{prize}</div>
                      <p className="text-white/60 text-sm">
                        You&apos;re entered! Winner announced at 8pm UTC.
                      </p>
                    </div>
                  ) : hasEntered ? (
                    <div className="text-center">
                      <div className="px-4 py-2 rounded-full bg-green-500/20 border border-green-500/30 inline-block mb-4">
                        <span className="text-green-400 text-sm font-medium">Entered Today</span>
                      </div>
                      <p className="text-white/60 text-sm">
                        Come back tomorrow for another chance!
                      </p>
                    </div>
                  ) : gritBalance !== null && gritBalance < RAFFLE_COST ? (
                    <div className="text-center">
                      <p className="text-white/60 mb-4">
                        You need at least {RAFFLE_COST} Grit to enter.
                      </p>
                      <a
                        href="/submit"
                        className="btn-secondary px-6 py-3 rounded-lg inline-block"
                      >
                        Earn Grit
                      </a>
                    </div>
                  ) : (
                    <div className="text-center">
                      <button
                        onClick={handleEnterRaffle}
                        disabled={!canEnter || isEntering}
                        className="btn-primary px-8 py-4 rounded-xl text-lg font-bold w-full"
                      >
                        {isEntering ? 'Entering...' : `Enter Draw (${RAFFLE_COST} Grit)`}
                      </button>
                      <p className="text-white/40 text-sm mt-3">
                        One entry per wallet per day
                      </p>
                    </div>
                  )}

                  {error && (
                    <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                      <p className="text-red-400 text-sm">{error}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Winners History Section */}
        {winners.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-white mb-6">Recent Winners</h2>
            <div className="card-premium rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-white/50 text-sm font-medium px-6 py-4">Date</th>
                    <th className="text-left text-white/50 text-sm font-medium px-6 py-4">Winner</th>
                    <th className="text-left text-white/50 text-sm font-medium px-6 py-4">Pin Won</th>
                  </tr>
                </thead>
                <tbody>
                  {winners.map((winner, index) => (
                    <tr
                      key={`${winner.wallet_address}-${winner.date_won}`}
                      className={index !== winners.length - 1 ? 'border-b border-white/5' : ''}
                    >
                      <td className="text-white/70 text-sm px-6 py-4">
                        {formatDate(winner.date_won)}
                      </td>
                      <td className="text-white text-sm px-6 py-4 font-mono">
                        {winner.display_name}
                      </td>
                      <td className="text-gold text-sm px-6 py-4 font-semibold">
                        {winner.pin_won}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
