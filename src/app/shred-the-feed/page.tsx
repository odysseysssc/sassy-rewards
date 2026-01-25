'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import Link from 'next/link';
import Image from 'next/image';

// Action stills from previous competition entries
// Replace these with actual image paths
const actionStills = [
  { src: '/stills/shred-1.jpg', alt: 'Skater doing kickflip' },
  { src: '/stills/shred-2.jpg', alt: 'Surfer on wave' },
  { src: '/stills/shred-3.jpg', alt: 'Snowboarder mid-air' },
  { src: '/stills/shred-4.jpg', alt: 'BMX rider' },
  { src: '/stills/shred-5.jpg', alt: 'Skater grinding rail' },
  { src: '/stills/shred-6.jpg', alt: 'Surfer barrel' },
];

interface Submission {
  id: string;
  content_url: string;
  status: 'pending' | 'approved' | 'rejected';
  grit_awarded: number;
  submitted_at: string;
}

export default function ShredTheFeed() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  const [contentUrl, setContentUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (!session?.user) {
      router.push('/signin');
    }
  }, [session, sessionStatus, router]);

  // Fetch user's shred submissions
  useEffect(() => {
    async function fetchSubmissions() {
      if (!session?.user) return;
      try {
        const res = await fetch('/api/submissions?type=shred');
        if (res.ok) {
          const data = await res.json();
          setSubmissions(data.submissions || []);
        }
      } catch (err) {
        console.error('Error fetching submissions:', err);
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
          submissionType: 'shred',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSuccess(true);
        setContentUrl('');
        setSubmissions([data.submission, ...submissions]);
        setTimeout(() => setSuccess(false), 5000);
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
    <main className="min-h-screen relative overflow-hidden">
      {/* Tiled Background Stills - extends down the page */}
      <div className="fixed inset-0 z-0">
        {/* Grid of tiled stills */}
        <div className="absolute inset-0 grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1 opacity-[0.07]">
          {[...Array(24)].map((_, i) => (
            <div key={i} className="aspect-square relative bg-[#1a1625]">
              <Image
                src={actionStills[i % actionStills.length].src}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 768px) 33vw, (max-width: 1024px) 25vw, 17vw"
                priority={i < 6}
              />
            </div>
          ))}
        </div>
        {/* Dark overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-purple-darker via-purple-darker/95 to-purple-darker" />
      </div>

      <div className="relative z-20">
        <Header />
      </div>

      <div className="relative z-10">
        {/* Hero Section with Action Stills Grid */}
        <section className="max-w-6xl mx-auto px-4 md:px-6 pt-4 pb-2 md:pt-8">
          <div className="relative">
            {/* Action Stills Grid - Behind Title, bigger and closer */}
            <div className="absolute inset-x-0 -top-4 -mx-4 md:-mx-8">
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2 opacity-50">
                {actionStills.map((still, i) => (
                  <div key={i} className="aspect-square rounded-lg overflow-hidden relative bg-[#2d1f4e]">
                    <Image
                      src={still.src}
                      alt={still.alt}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 33vw, 17vw"
                      priority
                    />
                    {/* Gradient overlay for readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-purple-darker via-purple-darker/50 to-purple-darker/30" />
                  </div>
                ))}
              </div>
            </div>

            {/* Title Content - On Top */}
            <div className="relative text-center pt-12 md:pt-20 pb-4">
              {/* Platform Icons */}
              <div className="flex justify-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                  </svg>
                </div>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white mb-3 tracking-tight drop-shadow-2xl">
                SHRED THE FEED
              </h1>
              <p className="text-white/70 text-xl md:text-2xl mb-3">
                Monthly competition. Show us what you&apos;ve got.
              </p>
              <p className="text-white/50 text-base max-w-lg mx-auto">
                Brighten up our feeds with people getting out there in the real world and getting after it. We&apos;ve got prizes for you.
              </p>
            </div>
          </div>
        </section>

        {/* How It Works - Visual Steps */}
        <section className="max-w-4xl mx-auto px-4 md:px-6 py-2">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="card-premium rounded-xl px-4 py-3 text-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-center gap-3">
                <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="text-white font-bold text-sm">Post Your Clip</h3>
                  <p className="text-white/50 text-xs">Share on X or Instagram</p>
                </div>
              </div>
            </div>

            <div className="card-premium rounded-xl px-4 py-3 text-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-center gap-3">
                <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="text-white font-bold text-sm">Tag Us</h3>
                  <p className="text-white/50 text-xs">@shreddingsassy</p>
                </div>
              </div>
            </div>

            <div className="card-premium rounded-xl px-4 py-3 text-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-center gap-3">
                <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="text-white font-bold text-sm">Win Prizes</h3>
                  <p className="text-white/50 text-xs">Monthly winners announced</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Submit Section - Right after how it works */}
        <section className="max-w-4xl mx-auto px-4 md:px-6 py-6">
          <div className="max-w-xl mx-auto">
            <h2 className="text-2xl font-bold text-white text-center mb-6">Submit Your Clip</h2>
            {success ? (
              <div className="bg-green-500/20 backdrop-blur border border-green-500/30 rounded-xl px-6 py-4">
                <p className="text-green-400 text-center">Submitted! We&apos;ll review your clip and add the bonus GRIT.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={contentUrl}
                    onChange={(e) => setContentUrl(e.target.value)}
                    placeholder="Drop your X or Instagram link..."
                    className="flex-1 px-5 py-4 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-purple-500/50 text-base"
                    required
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-8 py-4 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white transition-all disabled:opacity-50 whitespace-nowrap"
                  >
                    {submitting ? '...' : 'Submit'}
                  </button>
                </div>
                {error && <p className="text-red-400 text-sm mt-2 text-center">{error}</p>}
                <p className="text-white/40 text-sm mt-3 text-center">
                  Tag @shreddingsassy + submit here for <span className="text-purple-400">10 bonus GRIT</span>
                </p>
              </form>
            )}
          </div>
        </section>

        {/* Rewards */}
        <section className="max-w-4xl mx-auto px-4 md:px-6 py-6">
          <h2 className="text-xl font-bold text-white text-center mb-6">Rewards</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="card-premium rounded-xl p-5 text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 flex items-center justify-center">
                <svg className="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-1">Tag to Enter</h3>
              <p className="text-white/40 text-sm">Just tag us — you&apos;re in</p>
            </div>

            <div className="card-premium rounded-xl p-5 text-center border border-purple-500/20">
              <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-gradient-to-br from-purple-500/30 to-purple-600/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-1">Make the Cut</h3>
              <p className="text-purple-400 font-bold">100 GRIT</p>
              <p className="text-white/40 text-xs mt-1">3-5 clips chosen monthly</p>
            </div>

            <div className="card-premium rounded-xl p-5 text-center border border-gold/20 bg-gradient-to-br from-gold/5 to-transparent">
              <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-gradient-to-br from-gold/30 to-gold/10 flex items-center justify-center">
                <svg className="w-7 h-7 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-1">Monthly Winners</h3>
              <p className="text-gold font-bold">500 GRIT + Hat</p>
              <p className="text-white/40 text-xs mt-1">Hat box packed with goodies</p>
            </div>
          </div>
          <p className="text-white/40 text-sm text-center mt-4">
            <span className="text-purple-400 font-semibold">Two winners each month</span> — one from X, one from Instagram.
          </p>
          <p className="text-white/30 text-xs text-center mt-2">
            Judged by Shredding Sassy team. Winners announced on socials.
          </p>
        </section>

        {/* What Counts as Shredding */}
        <section className="max-w-4xl mx-auto px-4 md:px-6 py-6">
          <h2 className="text-lg font-bold text-white text-center mb-4">What Counts as Shredding?</h2>
          <div className="flex flex-wrap justify-center gap-2 md:gap-3">
            {[
              { icon: '🛹', label: 'Skate' },
              { icon: '🏄', label: 'Surf' },
              { icon: '🏂', label: 'Snow' },
              { icon: '🚴', label: 'Bike' },
              { icon: '🧗', label: 'Climb' },
              { icon: '🏎️', label: 'Motorsport' },
              { icon: '🥾', label: 'Hiking' },
              { icon: '🏋️', label: 'Gym' },
              { icon: '🏃', label: 'Fitness' },
              { icon: '🧘', label: 'Health' },
              { icon: '🎸', label: 'Shred' },
              { icon: '📹', label: 'Film' },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur rounded-full border border-white/10"
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-white/70 text-sm font-medium">{item.label}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-white/40 text-sm mt-4">
            If you&apos;re going hard at your thing, we want to see it.
          </p>
        </section>

        {/* Last Month's Highlights - Embedded Video */}
        <section className="max-w-4xl mx-auto px-4 md:px-6 py-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="text-2xl">🎬</span>
            <h2 className="text-xl font-bold text-white">Last Month&apos;s Compilation</h2>
          </div>

          {/* Winners compilation video */}
          <div className="relative aspect-square max-w-md mx-auto rounded-xl overflow-hidden bg-black/50">
            <video
              controls
              playsInline
              preload="metadata"
              poster="/stills/shred-1.jpg"
              className="w-full h-full object-cover"
            >
              <source src="/videos/shred-winners.mp4" type="video/mp4" />
            </video>
          </div>
        </section>

        {/* Your Submissions */}
        {submissions.length > 0 && (
          <section className="max-w-4xl mx-auto px-4 md:px-6 py-8">
            <div className="card-premium rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4">Your Submissions</h3>
              <div className="space-y-3">
                {submissions.slice(0, 5).map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <a
                      href={sub.content_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/60 hover:text-white truncate flex-1 mr-4 text-sm"
                    >
                      {sub.content_url}
                    </a>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs ${
                        sub.status === 'approved' ? 'text-green-400' :
                        sub.status === 'rejected' ? 'text-red-400' :
                        'text-yellow-400'
                      }`}>
                        {sub.status}
                      </span>
                      {sub.status === 'approved' && sub.grit_awarded > 0 && (
                        <span className="text-green-400 text-xs">+{sub.grit_awarded}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* What is GRIT - For newcomers at the bottom */}
        <section className="max-w-4xl mx-auto px-4 md:px-6 py-8">
          <div className="card-premium rounded-xl p-6 text-center">
            <h3 className="text-white font-semibold mb-2">What is GRIT?</h3>
            <p className="text-white/50 text-sm mb-3 max-w-lg mx-auto">
              Our loyalty points. Earn by creating content and shopping. Convert to $SHAKA tokens during periodic windows.
            </p>
            <Link href="/" className="text-purple-400 text-sm hover:underline">
              Learn more →
            </Link>
          </div>
        </section>
      </div>

      <Footer />
    </main>
  );
}
