'use client';

import { useSession } from 'next-auth/react';
import { useAccount } from 'wagmi';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { truncateWallet } from '@/lib/drip';
import Link from 'next/link';

interface Activity {
  id: string;
  date: string;
  action: string;
  amount: number;
}

interface Submission {
  id: string;
  platform: string;
  content_url: string;
  content_type: string;
  status: 'pending' | 'approved' | 'rejected';
  grit_awarded: number;
  submitted_at: string;
}

export default function Profile() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const { address, isConnected } = useAccount();

  const [gritBalance, setGritBalance] = useState<number | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  // Email connection state
  const [emailInput, setEmailInput] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Determine login status
  const isLoggedIn = !!session?.user || isConnected;

  // Get display values
  const displayEmail = session?.user?.email;
  const displayWallet = session?.user?.wallet || address;

  // Redirect if not logged in
  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (!isLoggedIn) {
      router.push('/signin');
    }
  }, [isLoggedIn, sessionStatus, router]);

  // Handle email connection
  const handleConnectEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;

    setEmailLoading(true);
    setEmailError('');

    try {
      const res = await fetch('/api/account/connect-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput.trim() }),
      });

      if (res.ok) {
        setEmailSent(true);
      } else {
        const data = await res.json();
        setEmailError(data.error || 'Failed to send verification email');
      }
    } catch {
      setEmailError('An error occurred. Please try again.');
    } finally {
      setEmailLoading(false);
    }
  };

  // Fetch member data
  useEffect(() => {
    async function fetchData() {
      if (!isLoggedIn) {
        setLoading(false);
        return;
      }

      try {
        // Build query params based on available identifiers
        const params = new URLSearchParams();
        if (session?.user?.dripAccountId) {
          params.set('accountId', session.user.dripAccountId);
        } else if (session?.user?.email) {
          params.set('email', session.user.email);
        } else if (session?.user?.wallet || address) {
          params.set('wallet', session?.user?.wallet || address || '');
        } else if (session?.user?.discordId) {
          params.set('discordId', session.user.discordId);
        }

        if (params.toString()) {
          const res = await fetch(`/api/drip/member?${params.toString()}`);
          if (res.ok) {
            const data = await res.json();
            setGritBalance(data.member?.points ?? 0);

            // Fetch activity if we have member ID
            if (data.member?.id) {
              const activityRes = await fetch(`/api/drip/activity?memberId=${data.member.id}`);
              if (activityRes.ok) {
                const activityData = await activityRes.json();
                setActivity(activityData.activity || []);
              }
            }
          }
        }

        // Fetch submissions if logged in with email
        if (session?.user?.id) {
          const subRes = await fetch('/api/submissions');
          if (subRes.ok) {
            const subData = await subRes.json();
            setSubmissions(subData.submissions || []);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [isLoggedIn, session, address]);

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

      <section className="max-w-2xl mx-auto px-4 md:px-6 lg:px-12 py-16 md:py-20">
        <h1 className="text-3xl font-bold text-white text-center mb-8">
          Your Profile
        </h1>

        {/* GRIT Balance Card */}
        <div className="card-premium rounded-xl p-8 mb-6">
          <div className="text-center">
            <p className="text-white/50 text-sm mb-2">Your GRIT Balance</p>
            {loading ? (
              <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto" />
            ) : (
              <p className="text-5xl font-black gradient-text">
                {gritBalance?.toLocaleString() ?? 0}
              </p>
            )}
          </div>
        </div>

        {/* Account Info */}
        <div className="card-premium rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Account</h2>
          <div className="space-y-4">
            {/* Email */}
            {displayEmail && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white/50 text-xs">Email</p>
                    <p className="text-white font-medium">{displayEmail}</p>
                  </div>
                </div>
                <span className="text-green-400 text-xs">Primary</span>
              </div>
            )}

            {/* Wallet */}
            {displayWallet && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white/50 text-xs">Wallet</p>
                    <p className="text-white font-medium font-mono">{truncateWallet(displayWallet)}</p>
                  </div>
                </div>
                <span className="text-green-400 text-xs">Connected</span>
              </div>
            )}

            {/* Discord */}
            {session?.user?.discordId && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#5865F2]/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#5865F2]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-white/50 text-xs">Discord</p>
                    <p className="text-white font-medium">Connected</p>
                  </div>
                </div>
                <span className="text-green-400 text-xs">Linked</span>
              </div>
            )}
          </div>
        </div>

        {/* Connect Email Section - Show when logged in without email */}
        {!displayEmail && isLoggedIn && (
          <div className="card-premium rounded-xl p-6 mb-6 border border-gold/20">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold mb-1">Connect Your Email</h3>
                <p className="text-white/50 text-sm mb-4">
                  Link your email to receive GRIT from Shopify purchases. Use the same email you shop with!
                </p>

                {emailSent ? (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="font-medium">Verification email sent!</span>
                    </div>
                    <p className="text-white/60 text-sm mt-2">
                      Check your inbox and click the link to connect your email.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleConnectEmail} className="space-y-3">
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-gold/50 transition-colors"
                      required
                    />
                    {emailError && (
                      <p className="text-red-400 text-sm">{emailError}</p>
                    )}
                    <button
                      type="submit"
                      disabled={emailLoading}
                      className="btn-primary px-6 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {emailLoading ? 'Sending...' : 'Connect Email'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Recent Submissions */}
        {submissions.length > 0 && (
          <div className="card-premium rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Recent Submissions</h2>
              <Link href="/submit" className="text-gold text-sm hover:underline">
                Submit New
              </Link>
            </div>
            <div className="space-y-3">
              {submissions.slice(0, 5).map((sub) => (
                <div key={sub.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-b-0">
                  <div>
                    <p className="text-white text-sm capitalize">{sub.platform} - {sub.content_type}</p>
                    <p className="text-white/40 text-xs">{new Date(sub.submitted_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={sub.status} />
                    {sub.status === 'approved' && sub.grit_awarded > 0 && (
                      <p className="text-green-400 text-xs mt-1">+{sub.grit_awarded} GRIT</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activity History */}
        {activity.length > 0 && (
          <div className="card-premium rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">GRIT Activity</h2>
            <div className="space-y-3">
              {activity.slice(0, 10).map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-b-0">
                  <div>
                    <p className="text-white text-sm">{item.action}</p>
                    <p className="text-white/40 text-xs">{new Date(item.date).toLocaleDateString()}</p>
                  </div>
                  <span className={`font-bold ${item.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {item.amount >= 0 ? '+' : ''}{item.amount} GRIT
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && activity.length === 0 && submissions.length === 0 && (
          <div className="text-center py-8">
            <p className="text-white/50 mb-4">No activity yet. Start earning GRIT!</p>
            <Link href="/submit" className="btn-primary inline-block px-6 py-3 rounded-lg">
              Submit Content
            </Link>
          </div>
        )}
      </section>

      <Footer />
    </main>
  );
}

function StatusBadge({ status }: { status: 'pending' | 'approved' | 'rejected' }) {
  const styles = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    approved: 'bg-green-500/20 text-green-400',
    rejected: 'bg-red-500/20 text-red-400',
  };

  return (
    <span className={`text-xs px-2 py-1 rounded-full ${styles[status]} capitalize`}>
      {status}
    </span>
  );
}
