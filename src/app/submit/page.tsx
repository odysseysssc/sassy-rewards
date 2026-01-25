'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import Link from 'next/link';

interface Submission {
  id: string;
  content_url: string;
  status: 'pending' | 'approved' | 'rejected';
  grit_awarded: number;
  submitted_at: string;
  review_note: string | null;
}

export default function Submit() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  const [contentUrl, setContentUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (!session?.user) {
      router.push('/signin');
    }
  }, [session, sessionStatus, router]);

  useEffect(() => {
    async function fetchSubmissions() {
      if (!session?.user?.id) {
        setLoadingSubmissions(false);
        return;
      }
      try {
        const res = await fetch('/api/submissions?type=general');
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
        body: JSON.stringify({ contentUrl }),
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

      <section className="max-w-3xl mx-auto px-4 md:px-6 py-12 md:py-16">
        {/* Platform Icons */}
        <div className="flex justify-center gap-8 mb-8">
          {/* X/Twitter */}
          <svg className="w-8 h-8 text-white/60" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          {/* TikTok */}
          <svg className="w-8 h-8 text-white/60" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
          </svg>
          {/* Instagram */}
          <svg className="w-8 h-8 text-white/60" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
          </svg>
          {/* YouTube */}
          <svg className="w-8 h-8 text-white/60" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
          {/* Facebook */}
          <svg className="w-8 h-8 text-white/60" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        </div>

        {/* Headline */}
        <h1 className="text-2xl md:text-3xl font-bold text-white text-center mb-3">
          Post content. Tag <span className="text-gold">@shreddingsassy</span>. Earn GRIT.
        </h1>
        <p className="text-white/50 text-lg text-center mb-5">
          Talk about Shredding Sassy and earn GRIT.
        </p>
        <p className="text-white/40 text-base text-center mb-10 max-w-xl mx-auto">
          We want you creating content about Shredding Sassy — wearing the gear, unboxing pickups, sharing the story. The more people see it, the more you earn. GRIT converts to $SHAKA during periodic conversion windows.
        </p>

        {/* Rewards Card */}
        <div className="card-premium rounded-xl p-6 mb-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left - Content Types */}
            <div>
              <h3 className="text-white/40 text-sm font-semibold uppercase tracking-wide mb-4">Base Rewards</h3>
              <div className="space-y-3 text-base">
                <div className="flex justify-between">
                  <span className="text-white/70">Photo post</span>
                  <span className="text-gold font-semibold">25</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Short video (&lt;60s)</span>
                  <span className="text-gold font-semibold">150</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">X thread / article</span>
                  <span className="text-gold font-semibold">100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">X Space (hosting)</span>
                  <span className="text-gold font-semibold">100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Unboxing / styling video</span>
                  <span className="text-gold font-semibold">300</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Long-form video (10+ min)</span>
                  <span className="text-gold font-semibold">400</span>
                </div>
              </div>
            </div>

            {/* Right - Multipliers */}
            <div>
              <h3 className="text-white/40 text-sm font-semibold uppercase tracking-wide mb-4">View Multipliers</h3>
              <div className="space-y-3 text-base">
                <div className="flex justify-between">
                  <span className="text-white/70">Under 1k</span>
                  <span className="text-white font-semibold">1x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">1k - 5k</span>
                  <span className="text-gold font-semibold">1.5x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">5k - 20k</span>
                  <span className="text-gold font-semibold">2x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">20k+</span>
                  <span className="text-gold font-semibold">2.5x</span>
                </div>
              </div>
              <p className="text-white/30 text-sm mt-4">Multipliers apply to all except Spaces</p>
            </div>
          </div>
        </div>

        {/* Examples */}
        <div className="text-white/50 text-sm space-y-1.5 mb-8">
          <p>Unboxing video hits 8k views = 300 x 2 = <span className="text-gold">600 GRIT</span></p>
          <p>X thread goes viral at 25k views = 100 x 2.5 = <span className="text-gold">250 GRIT</span></p>
        </div>

        {/* Submit Form */}
        <form onSubmit={handleSubmit} className="mb-5">
          {success && (
            <div className="bg-green-500/20 border border-green-500/30 rounded-lg px-5 py-3 mb-5">
              <p className="text-green-400 text-base">Submitted! We&apos;ll review within 48-72 hours.</p>
            </div>
          )}

          <div className="flex gap-4">
            <input
              type="url"
              value={contentUrl}
              onChange={(e) => setContentUrl(e.target.value)}
              placeholder="Paste your content link..."
              className="input-premium flex-1 px-5 py-4 rounded-lg text-white text-base"
              required
            />
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary px-8 py-4 rounded-lg font-bold whitespace-nowrap text-base"
            >
              {submitting ? '...' : 'Submit'}
            </button>
          </div>

          {error && <p className="text-red-400 text-base mt-3">{error}</p>}
        </form>

        {/* Requirements */}
        <p className="text-white/40 text-sm text-center mb-8">
          One submission per day. Must be public. Original content only.
        </p>

        {/* Shred the Feed Link */}
        <div className="text-center mb-12">
          <Link href="/shred-the-feed" className="text-purple-400 text-base hover:underline">
            Looking for Shred the Feed? →
          </Link>
        </div>

        {/* Past Submissions */}
        {submissions.length > 0 && (
          <div className="border-t border-white/10 pt-8">
            <h3 className="text-white/40 text-sm font-semibold uppercase tracking-wide mb-5">Your Submissions</h3>
            <div className="space-y-3">
              {submissions.slice(0, 5).map((sub) => (
                <div key={sub.id} className="flex items-center justify-between py-3 text-base">
                  <a
                    href={sub.content_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/60 hover:text-white truncate flex-1 mr-4"
                  >
                    {sub.content_url}
                  </a>
                  <div className="flex items-center gap-4">
                    <StatusBadge status={sub.status} />
                    {sub.status === 'approved' && sub.grit_awarded > 0 && (
                      <span className="text-green-400 text-sm">+{sub.grit_awarded}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {submissions.length > 5 && (
              <Link href="/profile" className="text-gold text-sm hover:underline block mt-4">
                View all →
              </Link>
            )}
          </div>
        )}
      </section>

      <Footer />
    </main>
  );
}

function StatusBadge({ status }: { status: 'pending' | 'approved' | 'rejected' }) {
  const styles = {
    pending: 'text-yellow-400',
    approved: 'text-green-400',
    rejected: 'text-red-400',
  };
  return <span className={`text-sm ${styles[status]}`}>{status}</span>;
}
