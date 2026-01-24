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

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'twitter', label: 'Twitter/X' },
];

const SPORTS = [
  { value: 'skateboarding', label: 'Skateboarding' },
  { value: 'surfing', label: 'Surfing' },
  { value: 'snowboarding', label: 'Snowboarding' },
  { value: 'skiing', label: 'Skiing' },
  { value: 'bmx', label: 'BMX' },
  { value: 'other', label: 'Other Action Sport' },
];

export default function ShredTheFeed() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  // Form state
  const [platform, setPlatform] = useState('');
  const [contentUrl, setContentUrl] = useState('');
  const [sport, setSport] = useState('');
  const [description, setDescription] = useState('');
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
        const res = await fetch('/api/submissions?type=shred-the-feed');
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
          platform,
          contentUrl,
          contentType: 'shred-the-feed',
          description: `[${sport}] ${description}`.trim(),
          submissionType: 'shred-the-feed',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSuccess(true);
        setSubmissions([data.submission, ...submissions]);
        // Reset form
        setPlatform('');
        setContentUrl('');
        setSport('');
        setDescription('');
        // Hide success after 3 seconds
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
          <div className="w-12 h-12 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <Header />

      <section className="max-w-3xl mx-auto px-4 md:px-6 lg:px-12 py-16 md:py-20">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-purple-500/20 border border-purple-500/30 rounded-full px-4 py-1.5 mb-6">
            <span className="text-purple-400 text-sm font-medium">Action Sports Competition</span>
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            Shred the Feed
          </h1>
          <p className="text-white/50 text-lg max-w-xl mx-auto">
            Show us your best action sports content featuring Shredding Sassy gear.
            Skating, surfing, snowboarding — if you&apos;re shredding, we want to see it.
          </p>
        </div>

        {/* Prize Info */}
        <div className="card-premium rounded-xl p-6 mb-8 border border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl mb-2">🏆</div>
              <h3 className="text-white font-semibold mb-1">Bigger Rewards</h3>
              <p className="text-white/50 text-sm">Top shredders earn bonus GRIT</p>
            </div>
            <div>
              <div className="text-3xl mb-2">🎬</div>
              <h3 className="text-white font-semibold mb-1">Get Featured</h3>
              <p className="text-white/50 text-sm">Best clips shared on our socials</p>
            </div>
            <div>
              <div className="text-3xl mb-2">🛹</div>
              <h3 className="text-white font-semibold mb-1">Rep the Brand</h3>
              <p className="text-white/50 text-sm">Join the shredding community</p>
            </div>
          </div>
        </div>

        {/* Requirements */}
        <div className="card-premium rounded-xl p-6 mb-8">
          <h2 className="text-lg font-bold text-white mb-4">What We&apos;re Looking For</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-purple-400 text-sm font-semibold mb-3">Must Have</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span className="text-white/70">Action sports footage (skating, surfing, snowboarding, etc.)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span className="text-white/70">Shredding Sassy gear clearly visible</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span className="text-white/70">Original content you created</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span className="text-white/70">Posted on a public account</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-purple-400 text-sm font-semibold mb-3">Bonus Points For</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-purple-400">★</span>
                  <span className="text-white/70">High-quality footage and editing</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400">★</span>
                  <span className="text-white/70">Creative tricks and style</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400">★</span>
                  <span className="text-white/70">Epic locations and scenery</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400">★</span>
                  <span className="text-white/70">Good vibes and energy</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10">
            <p className="text-white/40 text-sm">
              <span className="text-gold font-semibold">Note:</span> This is separate from general content submissions.
              For lifestyle photos, unboxing videos, and non-action content, use the{' '}
              <Link href="/submit" className="text-gold hover:underline">regular submission page</Link>.
            </p>
          </div>
        </div>

        {/* Submission Form */}
        <div className="card-premium rounded-xl p-6 mb-8">
          <h2 className="text-lg font-bold text-white mb-4">Submit Your Clip</h2>

          {success && (
            <div className="bg-green-500/20 border border-green-500/30 rounded-lg px-4 py-3 mb-6">
              <p className="text-green-400 text-sm">
                Submission received! We&apos;ll review your shred clip within 48-72 hours.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Platform */}
            <div>
              <label className="block text-white/70 text-sm mb-2">Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="input-premium w-full px-4 py-3 rounded-lg text-white bg-purple-darker"
                required
              >
                <option value="">Select platform...</option>
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Content URL */}
            <div>
              <label className="block text-white/70 text-sm mb-2">Video URL</label>
              <input
                type="url"
                value={contentUrl}
                onChange={(e) => setContentUrl(e.target.value)}
                placeholder="https://instagram.com/reel/..."
                className="input-premium w-full px-4 py-3 rounded-lg text-white"
                required
              />
            </div>

            {/* Sport Type */}
            <div>
              <label className="block text-white/70 text-sm mb-2">Sport</label>
              <select
                value={sport}
                onChange={(e) => setSport(e.target.value)}
                className="input-premium w-full px-4 py-3 rounded-lg text-white bg-purple-darker"
                required
              >
                <option value="">Select sport...</option>
                {SPORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-white/70 text-sm mb-2">
                Tell us about it <span className="text-white/40">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Location, trick names, the story behind the clip..."
                className="input-premium w-full px-4 py-3 rounded-lg text-white resize-none"
                rows={3}
                maxLength={500}
              />
              <p className="text-white/30 text-xs mt-1">{description.length}/500</p>
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-lg font-bold bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white transition-all disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit for Review'}
            </button>
          </form>
        </div>

        {/* Past Submissions */}
        <div className="card-premium rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Your Shred Submissions</h2>

          {loadingSubmissions ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            </div>
          ) : submissions.length === 0 ? (
            <p className="text-white/50 text-center py-8">
              No shred submissions yet. Drop your first clip above!
            </p>
          ) : (
            <div className="space-y-3">
              {submissions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-start justify-between py-3 border-b border-white/5 last:border-b-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm capitalize mb-1">
                      {sub.platform}
                    </p>
                    <a
                      href={sub.content_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400/70 hover:text-purple-400 text-xs truncate block"
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
