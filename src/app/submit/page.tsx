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
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'other', label: 'Other' },
];

const CONTENT_TYPES = [
  { value: 'photo', label: 'Photo' },
  { value: 'video', label: 'Video' },
  { value: 'story', label: 'Story/Reel' },
  { value: 'post', label: 'Post/Thread' },
  { value: 'other', label: 'Other' },
];

export default function Submit() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  // Form state
  const [platform, setPlatform] = useState('');
  const [contentUrl, setContentUrl] = useState('');
  const [contentType, setContentType] = useState('');
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
          platform,
          contentUrl,
          contentType,
          description: description || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSuccess(true);
        setSubmissions([data.submission, ...submissions]);
        // Reset form
        setPlatform('');
        setContentUrl('');
        setContentType('');
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
          Submit Your Content
        </h1>
        <p className="text-white/50 text-center mb-12">
          Share your Shredding Sassy content on socials, submit the link here, and earn GRIT when approved.
        </p>

        {/* How It Works */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-white text-center mb-8">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-gold font-bold">1</span>
              </div>
              <h3 className="text-white font-semibold mb-2">Create</h3>
              <p className="text-white/50 text-sm">
                Post content featuring Shredding Sassy products on your socials (Instagram, TikTok, X, YouTube)
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-gold font-bold">2</span>
              </div>
              <h3 className="text-white font-semibold mb-2">Submit</h3>
              <p className="text-white/50 text-sm">
                Drop the link here for review
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-gold font-bold">3</span>
              </div>
              <h3 className="text-white font-semibold mb-2">Earn</h3>
              <p className="text-white/50 text-sm">
                Get GRIT when your submission is approved (reviewed within 48-72 hours)
              </p>
            </div>
          </div>
        </div>

        {/* What We're Looking For */}
        <div className="card-premium rounded-xl p-6 mb-8">
          <h2 className="text-lg font-bold text-white mb-4">What We&apos;re Looking For</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-white/70 text-sm font-semibold mb-3">Content We Love</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span>🛹</span>
                  <span className="text-white/60">Action shots - skating, surfing, snowboarding in Shredding Sassy gear</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>📸</span>
                  <span className="text-white/60">Lifestyle photos - wearing Shredding Sassy out in the wild</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>📦</span>
                  <span className="text-white/60">Unboxing videos and first impressions</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>🎬</span>
                  <span className="text-white/60">Creative edits and honest reviews</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>🌄</span>
                  <span className="text-white/60">Adventure content featuring the brand</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-white/70 text-sm font-semibold mb-3">Tips for Approval</h3>
              <ul className="space-y-2 text-sm text-white/60">
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Original content only (not reposts)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Shredding Sassy products clearly visible</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Public posts (not private/locked accounts)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <span>Quality matters - put some effort in</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10">
            <p className="text-white/40 text-sm">
              <span className="text-purple-400 font-semibold">Note about Shred the Feed:</span>{' '}
              Looking for the Shred the Feed competition? That&apos;s a separate event specifically for action sports shredding content. This submission page is for ALL content featuring Shredding Sassy.
            </p>
          </div>
        </div>

        {/* Submission Form */}
        <div className="card-premium rounded-xl p-6 mb-8">
          {success && (
            <div className="bg-green-500/20 border border-green-500/30 rounded-lg px-4 py-3 mb-6">
              <p className="text-green-400 text-sm">
                Submission received! We&apos;ll review it within 48-72 hours.
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
              <label className="block text-white/70 text-sm mb-2">Content URL</label>
              <input
                type="url"
                value={contentUrl}
                onChange={(e) => setContentUrl(e.target.value)}
                placeholder="https://twitter.com/yourhandle/status/..."
                className="input-premium w-full px-4 py-3 rounded-lg text-white"
                required
              />
            </div>

            {/* Content Type */}
            <div>
              <label className="block text-white/70 text-sm mb-2">Content Type</label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                className="input-premium w-full px-4 py-3 rounded-lg text-white bg-purple-darker"
                required
              >
                <option value="">Select type...</option>
                {CONTENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-white/70 text-sm mb-2">
                Description <span className="text-white/40">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell us about this content..."
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
              className="btn-primary w-full py-3 rounded-lg font-bold"
            >
              {submitting ? 'Submitting...' : 'Submit for Review'}
            </button>
          </form>

          {/* Guidelines */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <h3 className="text-white/70 text-sm font-semibold mb-2">Submission Guidelines</h3>
            <ul className="text-white/40 text-xs space-y-1">
              <li>• Original content featuring Shredding Sassy products</li>
              <li>• Must be public (not private/locked accounts)</li>
              <li>• One submission per piece of content</li>
              <li>• Submissions reviewed within 48-72 hours</li>
            </ul>
          </div>
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
              No submissions yet. Submit your first content above!
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
                      {sub.platform} - {sub.content_type}
                    </p>
                    <a
                      href={sub.content_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gold/70 hover:text-gold text-xs truncate block"
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
