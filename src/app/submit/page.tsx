'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import Link from 'next/link';

interface Submission {
  id: string;
  platform: string;
  content_url: string;
  content_type: string;
  status: 'pending' | 'approved' | 'rejected';
  grit_awarded: number;
  submitted_at: string;
  review_note: string | null;
}

export default function Submit() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  // Form state
  const [contentUrl, setContentUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Submissions state
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);

  // Redirect if not logged in
  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (!session?.user) {
      router.push('/signin');
    }
  }, [session, sessionStatus, router]);

  // Fetch submissions
  useEffect(() => {
    async function fetchSubmissions() {
      if (!session?.user?.id) {
        setLoadingSubmissions(false);
        return;
      }

      try {
        const res = await fetch('/api/submissions');
        if (res.ok) {
          const data = await res.json();
          setSubmissions(data.submissions || []);
        }
      } catch (err) {
        console.error('Error fetching submissions:', err);
      } finally {
        setLoadingSubmissions(false);
      }
    }

    fetchSubmissions();
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentUrl,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSuccess(true);
        setSubmissions([data.submission, ...submissions]);
        setContentUrl('');
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to submit');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (sessionStatus === 'loading' || !session?.user) {
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

      <section className="max-w-3xl mx-auto px-4 md:px-6 lg:px-12 py-16 md:py-20">
        <h1 className="text-3xl md:text-4xl font-bold text-white text-center mb-2">
          Submit Content
        </h1>
        <p className="text-white/50 text-center mb-12">
          Create content for Shredding Sassy. Earn GRIT. Convert to SHAKA.
        </p>

        {/* How GRIT Works */}
        <div className="card-premium rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-white mb-3">How It Works</h2>
          <p className="text-white/60 text-sm mb-4">
            GRIT is our loyalty points system. Create content featuring Shredding Sassy or talking about us,
            and earn GRIT based on the content type and how many people see it. During periodic conversion
            windows, you can swap your GRIT for $SHAKA tokens.
          </p>
        </div>

        {/* Base Rewards */}
        <div className="card-premium rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-white mb-4">Base GRIT Rewards</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-white/70">Photo post</span>
              <span className="text-gold font-bold">25 GRIT</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-white/70">X thread or article</span>
              <span className="text-gold font-bold">100 GRIT</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-white/70">X Space (hosting)</span>
              <span className="text-gold font-bold">100 GRIT</span>
              <span className="text-white/40 text-xs ml-2">(flat rate)</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-white/70">Short video (under 60s)</span>
              <span className="text-gold font-bold">150 GRIT</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-white/70">Unboxing or styling video</span>
              <span className="text-gold font-bold">300 GRIT</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-white/70">Long-form video (3+ min)</span>
              <span className="text-gold font-bold">400 GRIT</span>
            </div>
          </div>
        </div>

        {/* View Multipliers */}
        <div className="card-premium rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-white mb-2">View Multipliers</h2>
          <p className="text-white/40 text-sm mb-4">
            More reach = more GRIT. Applies to all content except Spaces.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-white/50 text-xs mb-1">Under 1k</div>
              <div className="text-white font-bold">1x</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-white/50 text-xs mb-1">1k - 5k</div>
              <div className="text-gold font-bold">1.5x</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-white/50 text-xs mb-1">5k - 20k</div>
              <div className="text-gold font-bold">2x</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-white/50 text-xs mb-1">20k+</div>
              <div className="text-gold font-bold">2.5x</div>
            </div>
          </div>
        </div>

        {/* Examples */}
        <div className="card-premium rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-white mb-4">Examples</h2>
          <div className="space-y-4 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-gold text-xs">1</span>
              </div>
              <div>
                <p className="text-white/70">
                  Post a photo wearing our gear, gets 800 views
                </p>
                <p className="text-gold font-medium">
                  25 GRIT x 1x = 25 GRIT
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-gold text-xs">2</span>
              </div>
              <div>
                <p className="text-white/70">
                  Drop a TikTok unboxing, hits 8k views
                </p>
                <p className="text-gold font-medium">
                  300 GRIT x 2x = 600 GRIT
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-gold text-xs">3</span>
              </div>
              <div>
                <p className="text-white/70">
                  Write an X thread about us, goes viral at 25k views
                </p>
                <p className="text-gold font-medium">
                  100 GRIT x 2.5x = 250 GRIT
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-gold text-xs">4</span>
              </div>
              <div>
                <p className="text-white/70">
                  Host a Space talking about Shredding Sassy
                </p>
                <p className="text-gold font-medium">
                  100 GRIT (flat rate, no multiplier)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Requirements */}
        <div className="card-premium rounded-xl p-6 mb-8">
          <h2 className="text-lg font-bold text-white mb-3">Requirements</h2>
          <ul className="space-y-2 text-sm text-white/60">
            <li className="flex items-center gap-2">
              <span className="text-gold">•</span>
              Tag <span className="text-white font-medium">@shreddingsassy</span> in your content
            </li>
            <li className="flex items-center gap-2">
              <span className="text-gold">•</span>
              One submission per day per account
            </li>
            <li className="flex items-center gap-2">
              <span className="text-gold">•</span>
              Content must be public (no locked accounts)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-gold">•</span>
              Original content only
            </li>
          </ul>
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-white/40 text-sm">
              <span className="text-purple-400 font-medium">Looking for Shred the Feed?</span>{' '}
              That&apos;s our monthly action sports competition with its own{' '}
              <Link href="/shred-the-feed" className="text-purple-400 hover:underline">
                submission page
              </Link>
              . This page is for general content only.
            </p>
          </div>
        </div>

        {/* Submission Form */}
        <div className="card-premium rounded-xl p-6 mb-8">
          <h2 className="text-lg font-bold text-white mb-4">Submit Your Link</h2>

          {success && (
            <div className="bg-green-500/20 border border-green-500/30 rounded-lg px-4 py-3 mb-6">
              <p className="text-green-400 text-sm">
                Submission received! We&apos;ll review it within 48-72 hours.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="url"
                value={contentUrl}
                onChange={(e) => setContentUrl(e.target.value)}
                placeholder="Paste your content link here..."
                className="input-premium w-full px-4 py-4 rounded-lg text-white text-lg"
                required
              />
              <p className="text-white/40 text-xs mt-2">
                We&apos;ll figure out the platform and content type from the link.
              </p>
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full py-4 rounded-lg font-bold text-lg"
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </form>
        </div>

        {/* Past Submissions */}
        <div className="card-premium rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Your Submissions</h2>

          {loadingSubmissions ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            </div>
          ) : submissions.length === 0 ? (
            <p className="text-white/50 text-center py-8">
              No submissions yet. Drop your first link above.
            </p>
          ) : (
            <div className="space-y-3">
              {submissions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-start justify-between py-3 border-b border-white/5 last:border-b-0"
                >
                  <div className="flex-1 min-w-0">
                    <a
                      href={sub.content_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white hover:text-gold text-sm truncate block"
                    >
                      {sub.content_url}
                    </a>
                    <p className="text-white/40 text-xs mt-1">
                      {new Date(sub.submitted_at).toLocaleDateString()}
                    </p>
                    {sub.review_note && sub.status === 'rejected' && (
                      <p className="text-red-400/70 text-xs mt-1">
                        Note: {sub.review_note}
                      </p>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <StatusBadge status={sub.status} />
                    {sub.status === 'approved' && sub.grit_awarded > 0 && (
                      <p className="text-green-400 text-xs mt-1">
                        +{sub.grit_awarded} GRIT
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {submissions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/10 text-center">
              <Link href="/profile" className="text-gold text-sm hover:underline">
                View Full Profile
              </Link>
            </div>
          )}
        </div>
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
