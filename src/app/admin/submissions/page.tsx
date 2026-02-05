'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

interface Submission {
  id: string;
  user_id: string;
  platform: string;
  content_url: string;
  content_type: string;
  submission_type: 'general' | 'shred';
  status: 'pending' | 'approved' | 'rejected';
  grit_awarded: number;
  reward_type: string | null;
  view_count: number | null;
  review_note: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  users: {
    email: string;
    display_name: string | null;
  } | null;
}

interface ContentReward {
  label: string;
  base: number;
}

interface ViewMultiplier {
  min: number;
  max: number;
  multiplier: number;
  label: string;
}

interface PinWheelEntry {
  id: string;
  wallet_address: string;
  created_at: string;
  member_name: string | null;
}

interface ShippingAddress {
  name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
}

interface PinWheelWinner {
  id: string;
  wallet_address: string;
  identifier_full: string;
  identifier_type: 'wallet' | 'account_id';
  date_won: string;
  pin_won: string;
  member_name: string | null;
  user_email: string | null;
  shipped: boolean;
  shipping_address: ShippingAddress | null;
}

const ADMIN_EMAILS = ['josh@shreddingsassy.com', 'admin@shreddingsassy.com', 'josh@sassy.com'];
const ADMIN_WALLETS = ['0xa1922c47aa67c41b1c1e877e9919f5ef29c99373', '0x659a364365d5fb3f18f2c7b9e038d276ae255375', '0xbc14975811be665cb7b1fb51e972bdb6ae4c1029'];

// Helper to truncate email for display
function truncateEmail(email: string): string {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (local.length <= 6) return email;
  return `${local.slice(0, 6)}...@${domain}`;
}

// Helper to truncate wallet for display
function truncateWallet(wallet: string): string {
  if (!wallet) return '';
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

// Content embed component for previewing submissions
function ContentEmbed({ url, platform }: { url: string; platform: string }) {
  const twitterRef = useRef<HTMLDivElement>(null);
  const [twitterLoading, setTwitterLoading] = useState(true);

  // Extract IDs from URLs
  const getYouTubeId = (urlStr: string) => {
    const match = urlStr.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    return match?.[1];
  };

  const getTweetId = (urlStr: string) => {
    const match = urlStr.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);
    return match?.[1];
  };

  const getTikTokId = (urlStr: string) => {
    const match = urlStr.match(/tiktok\.com\/@[\w.-]+\/video\/(\d+)/);
    return match?.[1];
  };

  // Load and render Twitter embed
  useEffect(() => {
    if (platform !== 'twitter' || !twitterRef.current) return;

    const tweetId = getTweetId(url);
    if (!tweetId) return;

    const container = twitterRef.current;

    // Clear any previous content
    container.innerHTML = '';
    setTwitterLoading(true);

    // Type for Twitter widgets
    type TwitterWidgets = {
      widgets: {
        createTweet: (
          tweetId: string,
          container: HTMLElement,
          options?: Record<string, unknown>
        ) => Promise<HTMLElement | undefined>;
      };
    };

    const renderTweet = (twttr: TwitterWidgets) => {
      twttr.widgets.createTweet(tweetId, container, {
        theme: 'dark',
        conversation: 'none',
        width: 450,
      }).then(() => {
        setTwitterLoading(false);
      }).catch(() => {
        setTwitterLoading(false);
        container.innerHTML = '<p class="text-white/50 text-sm">Failed to load tweet</p>';
      });
    };

    // Check if Twitter script is already loaded
    const win = window as Window & { twttr?: TwitterWidgets };
    if (win.twttr?.widgets) {
      renderTweet(win.twttr);
    } else {
      // Load the script
      const script = document.createElement('script');
      script.src = 'https://platform.twitter.com/widgets.js';
      script.async = true;
      script.onload = () => {
        if (win.twttr?.widgets) {
          renderTweet(win.twttr);
        }
      };
      document.body.appendChild(script);
    }
  }, [platform, url]);

  // YouTube embed
  if (platform === 'youtube') {
    const videoId = getYouTubeId(url);
    if (videoId) {
      return (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          className="w-full aspect-video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }
  }

  // Twitter/X embed
  if (platform === 'twitter') {
    const tweetId = getTweetId(url);
    if (tweetId) {
      return (
        <div className="p-4 min-h-[200px]">
          {twitterLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            </div>
          )}
          <div ref={twitterRef} />
        </div>
      );
    }
  }

  // TikTok embed
  if (platform === 'tiktok') {
    const videoId = getTikTokId(url);
    if (videoId) {
      return (
        <iframe
          src={`https://www.tiktok.com/embed/v2/${videoId}`}
          className="w-full min-h-[500px]"
          allowFullScreen
        />
      );
    }
  }

  // Instagram - can't easily embed, show link
  if (platform === 'instagram') {
    return (
      <div className="p-6 text-center">
        <p className="text-white/50 text-sm mb-3">Instagram embeds require login. Open externally to view.</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary inline-block px-4 py-2 rounded-lg text-sm"
        >
          View on Instagram
        </a>
      </div>
    );
  }

  // Fallback - show link
  return (
    <div className="p-6 text-center">
      <p className="text-white/50 text-sm mb-3">Preview not available for this platform.</p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary inline-block px-4 py-2 rounded-lg text-sm"
      >
        Open Link
      </a>
    </div>
  );
}

export default function AdminSubmissions() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [contentRewards, setContentRewards] = useState<Record<string, ContentReward>>({});
  const [viewMultipliers, setViewMultipliers] = useState<ViewMultiplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'submissions' | 'pinwheel'>('submissions');
  const [activeTab, setActiveTab] = useState<'general' | 'shred'>('general');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  // STF specific filters
  const [stfPlatformFilter, setStfPlatformFilter] = useState<'all' | 'twitter' | 'instagram'>('all');
  const [stfMonthFilter, setStfMonthFilter] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Extra GRIT award modal
  const [awardingExtraGrit, setAwardingExtraGrit] = useState<Submission | null>(null);
  const [extraGritAmount, setExtraGritAmount] = useState(0);
  const [extraGritNote, setExtraGritNote] = useState('');
  const [submittingExtraGrit, setSubmittingExtraGrit] = useState(false);

  // Pin Wheel state
  const [pinWheelTab, setPinWheelTab] = useState<'entries' | 'winners'>('entries');
  const [pinWheelEntries, setPinWheelEntries] = useState<PinWheelEntry[]>([]);
  const [pinWheelWinners, setPinWheelWinners] = useState<PinWheelWinner[]>([]);
  const [pinWheelLoading, setPinWheelLoading] = useState(false);
  const [viewingWinner, setViewingWinner] = useState<PinWheelWinner | null>(null);
  const [togglingShipped, setTogglingShipped] = useState<string | null>(null);

  // Review modal state
  const [reviewingSubmission, setReviewingSubmission] = useState<Submission | null>(null);
  const [selectedRewardType, setSelectedRewardType] = useState('');
  const [viewCount, setViewCount] = useState('');
  const [calculatedGrit, setCalculatedGrit] = useState(0);
  const [reviewNote, setReviewNote] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Check if user is admin by email or wallet
  const userEmail = session?.user?.email?.toLowerCase();
  const userWallet = session?.user?.wallet?.toLowerCase();
  const isAdmin = (userEmail && ADMIN_EMAILS.includes(userEmail)) ||
                  (userWallet && ADMIN_WALLETS.includes(userWallet));

  const fetchSubmissions = useCallback(async () => {
    try {
      let url = `/api/admin/submissions?status=${statusFilter}&type=${activeTab}`;

      // Add STF-specific filters for approved tab
      if (activeTab === 'shred' && statusFilter === 'approved') {
        url += `&month=${stfMonthFilter}`;
        if (stfPlatformFilter !== 'all') {
          url += `&platform=${stfPlatformFilter}`;
        }
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions || []);
        setContentRewards(data.contentRewards || {});
        setViewMultipliers(data.viewMultipliers || []);
      } else if (res.status === 401) {
        router.push('/');
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, activeTab, stfMonthFilter, stfPlatformFilter, router]);

  // Award extra GRIT to an approved submission
  const handleAwardExtraGrit = async () => {
    if (!awardingExtraGrit || extraGritAmount <= 0) return;
    setSubmittingExtraGrit(true);

    try {
      const res = await fetch(`/api/admin/submissions/${awardingExtraGrit.id}/award-grit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: extraGritAmount,
          note: extraGritNote,
        }),
      });

      if (res.ok) {
        setAwardingExtraGrit(null);
        setExtraGritAmount(0);
        setExtraGritNote('');
        fetchSubmissions();
      }
    } catch (error) {
      console.error('Error awarding extra GRIT:', error);
    } finally {
      setSubmittingExtraGrit(false);
    }
  };

  const fetchPinWheelData = useCallback(async () => {
    setPinWheelLoading(true);
    try {
      const [entriesRes, winnersRes] = await Promise.all([
        fetch('/api/admin/pinwheel-entries'),
        fetch('/api/admin/pinwheel-winners'),
      ]);

      if (entriesRes.ok) {
        const data = await entriesRes.json();
        setPinWheelEntries(data.entries || []);
      }
      if (winnersRes.ok) {
        const data = await winnersRes.json();
        setPinWheelWinners(data.winners || []);
      }
    } catch (error) {
      console.error('Error fetching pin wheel data:', error);
    } finally {
      setPinWheelLoading(false);
    }
  }, []);

  const toggleShipped = async (winnerId: string, currentShipped: boolean) => {
    setTogglingShipped(winnerId);
    try {
      const res = await fetch('/api/admin/pinwheel-winners', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winnerId, shipped: !currentShipped }),
      });

      if (res.ok) {
        // Update local state
        setPinWheelWinners(winners =>
          winners.map(w =>
            w.id === winnerId ? { ...w, shipped: !currentShipped } : w
          )
        );
      }
    } catch (error) {
      console.error('Error toggling shipped:', error);
    } finally {
      setTogglingShipped(null);
    }
  };

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (!session?.user || !isAdmin) {
      router.push('/');
      return;
    }
    if (activeSection === 'submissions') {
      fetchSubmissions();
    } else {
      fetchPinWheelData();
    }
  }, [session, sessionStatus, isAdmin, router, fetchSubmissions, fetchPinWheelData, activeSection]);

  // Calculate GRIT when reward type or view count changes
  useEffect(() => {
    if (!selectedRewardType || !contentRewards[selectedRewardType]) {
      setCalculatedGrit(0);
      return;
    }

    const base = contentRewards[selectedRewardType].base;
    const views = parseInt(viewCount) || 0;

    // X Spaces don't get multipliers
    if (selectedRewardType === 'space') {
      setCalculatedGrit(base);
      return;
    }

    const multiplier = viewMultipliers.find(m => views >= m.min && views <= m.max);
    setCalculatedGrit(Math.round(base * (multiplier?.multiplier || 1)));
  }, [selectedRewardType, viewCount, contentRewards, viewMultipliers]);

  const handleReview = (submission: Submission) => {
    setReviewingSubmission(submission);
    setSelectedRewardType(submission.reward_type || '');
    setViewCount(submission.view_count?.toString() || '');
    setReviewNote(submission.review_note || '');
    // Default to 10 GRIT for STF submissions (submission bonus)
    const defaultGrit = submission.submission_type === 'shred' && !submission.grit_awarded ? 10 : (submission.grit_awarded || 0);
    setCalculatedGrit(defaultGrit);
  };

  const handleApprove = async () => {
    if (!reviewingSubmission) return;
    setSubmittingReview(true);

    try {
      const res = await fetch(`/api/admin/submissions/${reviewingSubmission.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'approved',
          gritAwarded: calculatedGrit,
          rewardType: selectedRewardType,
          viewCount: parseInt(viewCount) || null,
          reviewNote,
        }),
      });

      if (res.ok) {
        setReviewingSubmission(null);
        fetchSubmissions();
      }
    } catch (error) {
      console.error('Error approving submission:', error);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleReject = async () => {
    if (!reviewingSubmission) return;
    setSubmittingReview(true);

    try {
      const res = await fetch(`/api/admin/submissions/${reviewingSubmission.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'rejected',
          reviewNote,
        }),
      });

      if (res.ok) {
        setReviewingSubmission(null);
        fetchSubmissions();
      }
    } catch (error) {
      console.error('Error rejecting submission:', error);
    } finally {
      setSubmittingReview(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (sessionStatus === 'loading' || loading) {
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

  if (!isAdmin) {
    return null;
  }

  return (
    <main className="min-h-screen">
      <Header />

      <section className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <h1 className="text-3xl font-bold text-white mb-6">Admin Dashboard</h1>

        {/* Main Section Tabs */}
        <div className="flex gap-2 mb-6 border-b border-white/10 pb-4">
          <button
            onClick={() => setActiveSection('submissions')}
            className={`px-5 py-2.5 rounded-lg font-semibold transition-colors ${
              activeSection === 'submissions'
                ? 'bg-gold text-purple-darker'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            Submissions
          </button>
          <button
            onClick={() => setActiveSection('pinwheel')}
            className={`px-5 py-2.5 rounded-lg font-semibold transition-colors ${
              activeSection === 'pinwheel'
                ? 'bg-gold text-purple-darker'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            Pin Wheel
          </button>
        </div>

        {/* Submissions Section */}
        {activeSection === 'submissions' && (
          <>
        {/* Sub Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'general'
                ? 'bg-blue-500 text-white'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            General Content
          </button>
          <button
            onClick={() => setActiveTab('shred')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'shred'
                ? 'bg-purple-500 text-white'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            Shred the Feed
          </button>
        </div>

        {/* Status Filter */}
        <div className="flex flex-wrap gap-2 mb-4">
          {(['pending', 'approved', 'rejected', 'all'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-white/20 text-white'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* STF Approved Filters - Month & Platform */}
        {activeTab === 'shred' && statusFilter === 'approved' && (
          <div className="flex flex-wrap gap-4 mb-6 p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
            <div>
              <label className="text-white/50 text-xs block mb-1">Month</label>
              <input
                type="month"
                value={stfMonthFilter}
                onChange={(e) => setStfMonthFilter(e.target.value)}
                className="px-3 py-1.5 bg-purple-darker border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-gold/50"
              />
            </div>
            <div>
              <label className="text-white/50 text-xs block mb-1">Platform</label>
              <div className="flex gap-2">
                {(['all', 'twitter', 'instagram'] as const).map((platform) => (
                  <button
                    key={platform}
                    onClick={() => setStfPlatformFilter(platform)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      stfPlatformFilter === platform
                        ? platform === 'twitter' ? 'bg-blue-500 text-white' :
                          platform === 'instagram' ? 'bg-pink-500 text-white' :
                          'bg-white/20 text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    {platform === 'twitter' ? 'X / Twitter' : platform === 'instagram' ? 'Instagram' : 'All'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-end">
              <p className="text-white/40 text-xs">
                Showing {submissions.length} entries for {new Date(stfMonthFilter + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        )}

        {/* Submissions List */}
        <div className="card-premium rounded-xl overflow-hidden">
          {submissions.length === 0 ? (
            <div className="p-8 text-center text-white/50">
              No {statusFilter === 'all' ? '' : statusFilter} submissions found.
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-white/50 text-sm font-medium px-4 py-3">Date</th>
                  <th className="text-left text-white/50 text-sm font-medium px-4 py-3">User</th>
                  <th className="text-left text-white/50 text-sm font-medium px-4 py-3">Platform</th>
                  <th className="text-left text-white/50 text-sm font-medium px-4 py-3">Content</th>
                  <th className="text-left text-white/50 text-sm font-medium px-4 py-3">Status</th>
                  <th className="text-left text-white/50 text-sm font-medium px-4 py-3">GRIT</th>
                  <th className="text-right text-white/50 text-sm font-medium px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => (
                  <tr key={sub.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="text-white/70 text-sm px-4 py-3">
                      {formatDate(sub.submitted_at)}
                    </td>
                    <td className="text-white text-sm px-4 py-3">
                      {sub.users?.display_name || (
                        sub.users?.email ? truncateEmail(sub.users.email) : 'Unknown'
                      )}
                    </td>
                    <td className="text-white/70 text-sm px-4 py-3 capitalize">
                      {sub.platform}
                    </td>
                    <td className="text-sm px-4 py-3">
                      <a
                        href={sub.content_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gold hover:underline truncate block max-w-[300px]"
                      >
                        {sub.content_url}
                      </a>
                    </td>
                    <td className="text-sm px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        sub.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                        sub.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="text-white text-sm px-4 py-3 font-medium">
                      {sub.grit_awarded > 0 ? `+${sub.grit_awarded}` : '-'}
                    </td>
                    <td className="text-right px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleReview(sub)}
                          className="text-gold text-sm hover:underline"
                        >
                          Review
                        </button>
                        {activeTab === 'shred' && sub.status === 'approved' && (
                          <button
                            onClick={() => {
                              setAwardingExtraGrit(sub);
                              setExtraGritAmount(0);
                              setExtraGritNote('');
                            }}
                            className="text-green-400 text-sm hover:underline"
                          >
                            +GRIT
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
          </>
        )}

        {/* Pin Wheel Section */}
        {activeSection === 'pinwheel' && (
          <>
            {/* Sub Tabs */}
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setPinWheelTab('entries')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  pinWheelTab === 'entries'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                Today&apos;s Entries ({pinWheelEntries.length})
              </button>
              <button
                onClick={() => setPinWheelTab('winners')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  pinWheelTab === 'winners'
                    ? 'bg-green-500 text-white'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                Winners ({pinWheelWinners.length})
              </button>
            </div>

            {pinWheelLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-10 h-10 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
              </div>
            ) : pinWheelTab === 'entries' ? (
              /* Entries Table */
              <div className="card-premium rounded-xl overflow-hidden">
                {pinWheelEntries.length === 0 ? (
                  <div className="p-8 text-center text-white/50">
                    No entries yet today.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[500px]">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left text-white/50 text-sm font-medium px-4 py-3">Time</th>
                          <th className="text-left text-white/50 text-sm font-medium px-4 py-3">User</th>
                          <th className="text-left text-white/50 text-sm font-medium px-4 py-3">Wallet</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pinWheelEntries.map((entry) => (
                          <tr key={entry.id} className="border-b border-white/5 hover:bg-white/5">
                            <td className="text-white/70 text-sm px-4 py-3">
                              {new Date(entry.created_at).toLocaleTimeString()}
                            </td>
                            <td className="text-white text-sm px-4 py-3">
                              {entry.member_name || '-'}
                            </td>
                            <td className="text-white/50 text-sm px-4 py-3 font-mono">
                              {truncateWallet(entry.wallet_address)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              /* Winners Table */
              <div className="card-premium rounded-xl overflow-hidden">
                {pinWheelWinners.length === 0 ? (
                  <div className="p-8 text-center text-white/50">
                    No winners yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left text-white/50 text-sm font-medium px-4 py-3">Date</th>
                          <th className="text-left text-white/50 text-sm font-medium px-4 py-3">User</th>
                          <th className="text-left text-white/50 text-sm font-medium px-4 py-3">Wallet</th>
                          <th className="text-left text-white/50 text-sm font-medium px-4 py-3">Prize</th>
                          <th className="text-left text-white/50 text-sm font-medium px-4 py-3">Shipped</th>
                          <th className="text-right text-white/50 text-sm font-medium px-4 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pinWheelWinners.map((winner) => (
                          <tr key={winner.id} className="border-b border-white/5 hover:bg-white/5">
                            <td className="text-white/70 text-sm px-4 py-3">
                              {new Date(winner.date_won).toLocaleDateString()}
                            </td>
                            <td className="text-white text-sm px-4 py-3">
                              {winner.member_name || winner.user_email || '-'}
                            </td>
                            <td className="text-white/50 text-sm px-4 py-3 font-mono">
                              {winner.identifier_type === 'wallet'
                                ? truncateWallet(winner.wallet_address)
                                : `ID: ${winner.wallet_address.slice(0, 8)}...`}
                            </td>
                            <td className="text-gold text-sm px-4 py-3 font-medium">
                              {winner.pin_won}
                            </td>
                            <td className="text-sm px-4 py-3">
                              <button
                                onClick={() => toggleShipped(winner.id, winner.shipped)}
                                disabled={togglingShipped === winner.id}
                                className={`px-2 py-1 rounded-full text-xs cursor-pointer hover:opacity-80 transition-opacity ${
                                  winner.shipped
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-yellow-500/20 text-yellow-400'
                                } ${togglingShipped === winner.id ? 'opacity-50' : ''}`}
                              >
                                {togglingShipped === winner.id ? '...' : winner.shipped ? 'Shipped' : 'Pending'}
                              </button>
                            </td>
                            <td className="text-right px-4 py-3">
                              <button
                                onClick={() => setViewingWinner(winner)}
                                className="text-gold text-sm hover:underline"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* Review Modal */}
      {reviewingSubmission && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="card-premium rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-4">Review Submission</h2>

            {/* Content Embed */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-white/50 text-sm">Content Preview</label>
                <a
                  href={reviewingSubmission.content_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold text-xs hover:underline"
                >
                  Open in new tab →
                </a>
              </div>
              <div className="bg-black/30 rounded-lg overflow-hidden">
                <ContentEmbed url={reviewingSubmission.content_url} platform={reviewingSubmission.platform} />
              </div>
            </div>

            {/* User */}
            <div className="mb-4">
              <label className="text-white/50 text-sm block mb-1">Submitted by</label>
              <p className="text-white">
                {reviewingSubmission.users?.display_name || (
                  reviewingSubmission.users?.email ? truncateEmail(reviewingSubmission.users.email) : 'Unknown'
                )}
              </p>
              {reviewingSubmission.users?.display_name && reviewingSubmission.users?.email && (
                <p className="text-white/40 text-xs">{truncateEmail(reviewingSubmission.users.email)}</p>
              )}
            </div>

            {/* Platform */}
            <div className="mb-4">
              <label className="text-white/50 text-sm block mb-1">Platform (auto-detected)</label>
              <p className="text-white capitalize">{reviewingSubmission.platform}</p>
            </div>

            {/* Reward Type Selection - Only for general submissions */}
            {activeTab === 'general' && (
              <>
                <div className="mb-4">
                  <label className="text-white/50 text-sm block mb-2">Content Type</label>
                  <select
                    value={selectedRewardType}
                    onChange={(e) => setSelectedRewardType(e.target.value)}
                    className="w-full px-3 py-2 bg-purple-darker border border-white/20 rounded-lg text-white focus:outline-none focus:border-gold/50 [&>option]:bg-purple-darker [&>option]:text-white"
                  >
                    <option value="" className="bg-purple-darker text-white">Select type...</option>
                    {Object.entries(contentRewards).map(([key, reward]) => (
                      <option key={key} value={key} className="bg-purple-darker text-white">
                        {reward.label} ({reward.base} base)
                      </option>
                    ))}
                  </select>
                </div>

                {/* View Count */}
                <div className="mb-4">
                  <label className="text-white/50 text-sm block mb-2">View Count</label>
                  <input
                    type="number"
                    value={viewCount}
                    onChange={(e) => setViewCount(e.target.value)}
                    placeholder="Enter view count"
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-gold/50"
                  />
                  <p className="text-white/30 text-xs mt-1">
                    Multipliers: 1k-5k (1.5x), 5k-20k (2x), 20k+ (2.5x)
                  </p>
                </div>

                {/* Calculated GRIT */}
                <div className="mb-4 p-4 bg-gold/10 rounded-lg">
                  <label className="text-white/50 text-sm block mb-1">Calculated GRIT</label>
                  <p className="text-3xl font-bold text-gold">{calculatedGrit}</p>
                </div>
              </>
            )}

            {/* Shred the Feed - manual GRIT entry */}
            {activeTab === 'shred' && (
              <div className="mb-4">
                <label className="text-white/50 text-sm block mb-2">GRIT to Award</label>
                <input
                  type="number"
                  value={calculatedGrit}
                  onChange={(e) => setCalculatedGrit(parseInt(e.target.value) || 0)}
                  placeholder="Enter GRIT amount"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-gold/50"
                />
                <p className="text-white/30 text-xs mt-1">
                  10 for submission bonus, 100 for making the cut, 500 for monthly winner
                </p>
              </div>
            )}

            {/* Review Note */}
            <div className="mb-6">
              <label className="text-white/50 text-sm block mb-2">Review Note (optional)</label>
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Add a note..."
                rows={2}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-gold/50 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleApprove}
                disabled={submittingReview || (activeTab === 'general' && !selectedRewardType)}
                className="flex-1 bg-green-600 hover:bg-green-500 text-white px-4 py-3 rounded-lg font-semibold disabled:opacity-50 transition-colors"
              >
                {submittingReview ? '...' : 'Approve'}
              </button>
              <button
                onClick={handleReject}
                disabled={submittingReview}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white px-4 py-3 rounded-lg font-semibold disabled:opacity-50 transition-colors"
              >
                {submittingReview ? '...' : 'Reject'}
              </button>
              <button
                onClick={() => setReviewingSubmission(null)}
                className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Award Extra GRIT Modal */}
      {awardingExtraGrit && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="card-premium rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-white mb-4">Award Extra GRIT</h2>

            <div className="mb-4">
              <label className="text-white/50 text-sm block mb-1">Submission</label>
              <a
                href={awardingExtraGrit.content_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold hover:underline text-sm truncate block"
              >
                {awardingExtraGrit.content_url}
              </a>
              <p className="text-white/40 text-xs mt-1">
                By: {awardingExtraGrit.users?.display_name || awardingExtraGrit.users?.email || 'Unknown'}
              </p>
              <p className="text-white/40 text-xs">
                Already awarded: {awardingExtraGrit.grit_awarded} GRIT
              </p>
            </div>

            <div className="mb-4">
              <label className="text-white/50 text-sm block mb-2">Extra GRIT Amount</label>
              <input
                type="number"
                value={extraGritAmount || ''}
                onChange={(e) => setExtraGritAmount(parseInt(e.target.value) || 0)}
                placeholder="Enter amount"
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-gold/50"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setExtraGritAmount(100)}
                  className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg"
                >
                  +100 (Made the cut)
                </button>
                <button
                  onClick={() => setExtraGritAmount(500)}
                  className="px-3 py-1 bg-gold/20 hover:bg-gold/30 text-gold text-xs rounded-lg"
                >
                  +500 (Monthly winner)
                </button>
              </div>
            </div>

            <div className="mb-6">
              <label className="text-white/50 text-sm block mb-2">Note (optional)</label>
              <input
                type="text"
                value={extraGritNote}
                onChange={(e) => setExtraGritNote(e.target.value)}
                placeholder="e.g., January compilation winner"
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-gold/50"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAwardExtraGrit}
                disabled={submittingExtraGrit || extraGritAmount <= 0}
                className="flex-1 bg-green-600 hover:bg-green-500 text-white px-4 py-3 rounded-lg font-semibold disabled:opacity-50 transition-colors"
              >
                {submittingExtraGrit ? '...' : `Award ${extraGritAmount} GRIT`}
              </button>
              <button
                onClick={() => setAwardingExtraGrit(null)}
                className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Winner Details Modal */}
      {viewingWinner && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="card-premium rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-white mb-4">Winner Details</h2>

            <div className="space-y-4">
              <div>
                <label className="text-white/50 text-sm block mb-1">Date Won</label>
                <p className="text-white">{new Date(viewingWinner.date_won).toLocaleDateString()}</p>
              </div>

              <div>
                <label className="text-white/50 text-sm block mb-1">Winner</label>
                <p className="text-white">{viewingWinner.member_name || 'Unknown'}</p>
                {viewingWinner.user_email && (
                  <p className="text-white/70 text-sm">{viewingWinner.user_email}</p>
                )}
                <p className="text-white/40 text-xs font-mono break-all">
                  {viewingWinner.identifier_type === 'wallet' ? 'Wallet: ' : 'Account ID: '}
                  {viewingWinner.identifier_full || viewingWinner.wallet_address}
                </p>
              </div>

              <div>
                <label className="text-white/50 text-sm block mb-1">Prize</label>
                <p className="text-gold font-semibold">{viewingWinner.pin_won}</p>
              </div>

              <div>
                <label className="text-white/50 text-sm block mb-1">Status</label>
                <button
                  onClick={() => toggleShipped(viewingWinner.id, viewingWinner.shipped)}
                  disabled={togglingShipped === viewingWinner.id}
                  className={`px-3 py-1.5 rounded-full text-sm cursor-pointer hover:opacity-80 transition-opacity ${
                    viewingWinner.shipped
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}
                >
                  {togglingShipped === viewingWinner.id ? '...' : viewingWinner.shipped ? 'Shipped' : 'Pending - Click to mark shipped'}
                </button>
              </div>

              <div>
                <label className="text-white/50 text-sm block mb-1">Shipping Address</label>
                {viewingWinner.shipping_address ? (
                  <div className="bg-white/5 rounded-lg p-3 text-sm">
                    <p className="text-white">{viewingWinner.shipping_address.name}</p>
                    <p className="text-white/70">{viewingWinner.shipping_address.address}</p>
                    <p className="text-white/70">
                      {viewingWinner.shipping_address.city}, {viewingWinner.shipping_address.state} {viewingWinner.shipping_address.zip}
                    </p>
                    <p className="text-white/70">{viewingWinner.shipping_address.country}</p>
                  </div>
                ) : (
                  <p className="text-white/40 text-sm">No shipping address on file</p>
                )}
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => setViewingWinner(null)}
                className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}
