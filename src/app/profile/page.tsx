'use client';

import { useSession, signIn } from 'next-auth/react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useEffect, useState, useCallback } from 'react';
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
  submission_type?: 'general' | 'shred';
}

interface ShippingAddress {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

interface ConnectedCredential {
  type: 'wallet' | 'discord';
  identifier: string;
  displayName?: string;
}

export default function Profile() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();

  const [gritBalance, setGritBalance] = useState<number | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  // Email connection state
  const [emailInput, setEmailInput] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Shipping address state
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'United States',
  });
  const [addressLoading, setAddressLoading] = useState(true);
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressSaved, setAddressSaved] = useState(false);
  const [addressError, setAddressError] = useState('');
  const [showAddressForm, setShowAddressForm] = useState(false);

  // Connected credentials state
  const [connectedCredentials, setConnectedCredentials] = useState<ConnectedCredential[]>([]);
  const [walletLinking, setWalletLinking] = useState(false);
  const [walletLinkError, setWalletLinkError] = useState('');

  // Display name state
  const [displayName, setDisplayName] = useState('');
  const [savedDisplayName, setSavedDisplayName] = useState('');
  const [displayNameLoading, setDisplayNameLoading] = useState(true);
  const [displayNameSaving, setDisplayNameSaving] = useState(false);
  const [displayNameSaved, setDisplayNameSaved] = useState(false);
  const [displayNameError, setDisplayNameError] = useState('');
  const [editingDisplayName, setEditingDisplayName] = useState(false);

  // Determine login status
  const isLoggedIn = !!session?.user || isConnected;

  // Get display values
  const displayEmail = session?.user?.email;
  const displayWallet = session?.user?.wallet || address;
  const hasWalletConnected = !!displayWallet || connectedCredentials.some(c => c.type === 'wallet');
  const hasDiscordConnected = !!session?.user?.discordId || connectedCredentials.some(c => c.type === 'discord');

  // Redirect if not logged in
  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (!isLoggedIn) {
      router.push('/signin');
    }
  }, [isLoggedIn, sessionStatus, router]);

  // Fetch display name
  const fetchDisplayName = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const res = await fetch('/api/account/display-name');
      if (res.ok) {
        const data = await res.json();
        setDisplayName(data.displayName || '');
        setSavedDisplayName(data.displayName || '');
      }
    } catch (error) {
      console.error('Error fetching display name:', error);
    } finally {
      setDisplayNameLoading(false);
    }
  }, [session?.user?.id]);

  // Fetch shipping address
  const fetchAddress = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const res = await fetch('/api/account/address');
      if (res.ok) {
        const data = await res.json();
        if (data.address) {
          setShippingAddress({
            name: data.address.name || '',
            address: data.address.address || '',
            city: data.address.city || '',
            state: data.address.state || '',
            zip: data.address.zip || '',
            country: data.address.country || 'United States',
          });
        }
      }
    } catch (error) {
      console.error('Error fetching address:', error);
    } finally {
      setAddressLoading(false);
    }
  }, [session?.user?.id]);

  // Fetch connected credentials
  const fetchCredentials = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      // Check for connected wallets
      const walletRes = await fetch('/api/account/credentials?type=wallet');
      const discordRes = await fetch('/api/account/credentials?type=discord');

      const credentials: ConnectedCredential[] = [];

      if (walletRes.ok) {
        const walletData = await walletRes.json();
        if (walletData.credentials) {
          walletData.credentials.forEach((c: { identifier: string }) => {
            credentials.push({ type: 'wallet', identifier: c.identifier });
          });
        }
      }

      if (discordRes.ok) {
        const discordData = await discordRes.json();
        if (discordData.credentials) {
          discordData.credentials.forEach((c: { identifier: string; display_name?: string }) => {
            credentials.push({ type: 'discord', identifier: c.identifier, displayName: c.display_name });
          });
        }
      }

      setConnectedCredentials(credentials);
    } catch (error) {
      console.error('Error fetching credentials:', error);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchDisplayName();
      fetchAddress();
      fetchCredentials();
    }
  }, [session?.user?.id, fetchDisplayName, fetchAddress, fetchCredentials]);

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

  // Handle display name save
  const handleSaveDisplayName = async (e: React.FormEvent) => {
    e.preventDefault();
    setDisplayNameSaving(true);
    setDisplayNameError('');
    setDisplayNameSaved(false);

    try {
      const res = await fetch('/api/account/display-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName }),
      });

      if (res.ok) {
        setSavedDisplayName(displayName);
        setEditingDisplayName(false);
        setDisplayNameSaved(true);
        setTimeout(() => setDisplayNameSaved(false), 3000);
      } else {
        const data = await res.json();
        setDisplayNameError(data.error || 'Failed to save display name');
      }
    } catch {
      setDisplayNameError('An error occurred. Please try again.');
    } finally {
      setDisplayNameSaving(false);
    }
  };

  // Handle shipping address save
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressSaving(true);
    setAddressError('');
    setAddressSaved(false);

    try {
      const res = await fetch('/api/account/address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shippingAddress),
      });

      if (res.ok) {
        setAddressSaved(true);
        setTimeout(() => setAddressSaved(false), 3000);
      } else {
        const data = await res.json();
        setAddressError(data.error || 'Failed to save address');
      }
    } catch {
      setAddressError('An error occurred. Please try again.');
    } finally {
      setAddressSaving(false);
    }
  };

  // Handle wallet connection for linking
  const handleConnectWallet = async () => {
    // First connect the wallet using wagmi
    const connector = connectors[0]; // Use first available connector
    if (connector) {
      connect({ connector });
    }
  };

  // Link wallet to account after connection
  useEffect(() => {
    const linkWallet = async () => {
      if (address && session?.user?.id && !hasWalletConnected && !walletLinking) {
        setWalletLinking(true);
        setWalletLinkError('');

        try {
          const res = await fetch('/api/account/connect-wallet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet: address }),
          });

          if (res.ok) {
            // Refresh credentials
            await fetchCredentials();
          } else {
            const data = await res.json();
            setWalletLinkError(data.error || 'Failed to link wallet');
            // Disconnect if linking failed
            disconnect();
          }
        } catch {
          setWalletLinkError('An error occurred. Please try again.');
          disconnect();
        } finally {
          setWalletLinking(false);
        }
      }
    };

    linkWallet();
  }, [address, session?.user?.id, hasWalletConnected, walletLinking, disconnect, fetchCredentials]);

  // Handle Discord connection
  const handleConnectDiscord = () => {
    // Use dedicated linking endpoint (not signIn which creates new session)
    window.location.href = '/api/auth/link-discord';
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

  // Check if address is saved
  const hasAddress = shippingAddress.name && shippingAddress.address && shippingAddress.city;
  const formattedAddress = hasAddress
    ? `${shippingAddress.address}, ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zip}`
    : null;

  return (
    <main className="min-h-screen">
      <Header />

      <section className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
        {/* GRIT Balance Hero */}
        <div className="card-premium rounded-2xl p-8 md:p-10 mb-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-gold/10 via-transparent to-gold/5" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-gold/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative text-center">
            {savedDisplayName && (
              <p className="text-2xl md:text-3xl font-bold text-white mb-4">
                Welcome, {savedDisplayName}
              </p>
            )}
            <p className="text-white/50 text-sm mb-3">Your GRIT Balance</p>
            {loading ? (
              <div className="w-10 h-10 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto" />
            ) : (
              <p className="text-6xl md:text-7xl font-black text-gold drop-shadow-[0_0_30px_rgba(212,175,55,0.4)]">
                {gritBalance?.toLocaleString() ?? 0}
              </p>
            )}
          </div>
        </div>

        {/* Connect Email Banner - Show when logged in without email */}
        {!displayEmail && isLoggedIn && (
          <div className="card-premium rounded-xl p-4 mb-4 border border-gold/20 bg-gold/5">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-white/70 text-sm">Link your email to earn GRIT from purchases on our store.</p>
              </div>
              {emailSent ? (
                <span className="text-green-400 text-sm">Check your inbox!</span>
              ) : (
                <form onSubmit={handleConnectEmail} className="flex gap-2">
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="your@email.com"
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:border-gold/50 w-48"
                    required
                  />
                  <button
                    type="submit"
                    disabled={emailLoading}
                    className="btn-primary px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                  >
                    {emailLoading ? '...' : 'Link'}
                  </button>
                </form>
              )}
            </div>
            {emailError && <p className="text-red-400 text-xs mt-2">{emailError}</p>}
          </div>
        )}

        {/* Two Column: Display Name + Connected Accounts */}
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          {/* Display Name */}
          <div className="card-premium rounded-xl p-5">
            <h3 className="text-white font-semibold mb-3">Display Name</h3>
            {displayNameLoading ? (
              <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            ) : savedDisplayName && !editingDisplayName ? (
              <div className="flex items-center justify-between">
                <span className="text-white">{savedDisplayName}</span>
                <button
                  onClick={() => setEditingDisplayName(true)}
                  className="text-gold text-sm hover:underline"
                >
                  Change
                </button>
              </div>
            ) : (
              <form onSubmit={handleSaveDisplayName} className="flex gap-2">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter display name"
                  maxLength={30}
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:border-gold/50"
                />
                <button
                  type="submit"
                  disabled={displayNameSaving || !displayName.trim()}
                  className="btn-primary px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  {displayNameSaving ? '...' : displayNameSaved ? '✓' : 'Save'}
                </button>
                {editingDisplayName && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDisplayName(false);
                      setDisplayName(savedDisplayName);
                    }}
                    className="text-white/50 text-sm hover:text-white px-2"
                  >
                    Cancel
                  </button>
                )}
              </form>
            )}
            {displayNameError && <p className="text-red-400 text-xs mt-2">{displayNameError}</p>}
            <p className="text-white/30 text-xs mt-2">Shown on leaderboard and prizes</p>
          </div>

          {/* Connected Accounts */}
          <div className="card-premium rounded-xl p-5">
            <h3 className="text-white font-semibold mb-3">Connected Accounts</h3>
            <div className="space-y-2">
              {/* Email */}
              {displayEmail && (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-white/70 truncate max-w-[150px]">{displayEmail}</span>
                  </div>
                  <span className="text-green-400 text-xs">✓</span>
                </div>
              )}

              {/* Wallet */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  {displayWallet ? (
                    <span className="text-white/70 font-mono text-xs">{truncateWallet(displayWallet)}</span>
                  ) : (
                    <span className="text-white/40">Wallet</span>
                  )}
                </div>
                {displayWallet ? (
                  <span className="text-green-400 text-xs">✓</span>
                ) : (
                  <button onClick={handleConnectWallet} disabled={walletLinking} className="text-gold text-xs hover:underline">
                    {walletLinking ? '...' : 'Connect'}
                  </button>
                )}
              </div>

              {/* Discord */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#5865F2]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                  </svg>
                  <span className="text-white/70">Discord</span>
                </div>
                {hasDiscordConnected ? (
                  <span className="text-green-400 text-xs">✓</span>
                ) : (
                  <button onClick={handleConnectDiscord} className="text-[#5865F2] text-xs hover:underline">
                    Connect
                  </button>
                )}
              </div>
            </div>
            {walletLinkError && <p className="text-red-400 text-xs mt-2">{walletLinkError}</p>}
          </div>
        </div>

        {/* Shipping Address - Collapsible */}
        <div className="card-premium rounded-xl p-5 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div>
                <h3 className="text-white font-semibold text-sm">Shipping Address</h3>
                {formattedAddress && !showAddressForm ? (
                  <p className="text-white/50 text-xs truncate max-w-xs">{formattedAddress}</p>
                ) : (
                  <p className="text-white/30 text-xs">For Pin Wheel prizes</p>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowAddressForm(!showAddressForm)}
              className="text-gold text-xs hover:underline"
            >
              {showAddressForm ? 'Cancel' : formattedAddress ? 'Edit' : 'Add'}
            </button>
          </div>

          {showAddressForm && !addressLoading && (
            <form onSubmit={handleSaveAddress} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={shippingAddress.name}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, name: e.target.value })}
                  placeholder="Full Name"
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:border-gold/50"
                  required
                />
                <input
                  type="text"
                  value={shippingAddress.country}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, country: e.target.value })}
                  placeholder="Country"
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:border-gold/50"
                />
              </div>
              <input
                type="text"
                value={shippingAddress.address}
                onChange={(e) => setShippingAddress({ ...shippingAddress, address: e.target.value })}
                placeholder="Street Address"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:border-gold/50"
                required
              />
              <div className="grid grid-cols-3 gap-3">
                <input
                  type="text"
                  value={shippingAddress.city}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                  placeholder="City"
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:border-gold/50"
                  required
                />
                <input
                  type="text"
                  value={shippingAddress.state}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                  placeholder="State"
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:border-gold/50"
                  required
                />
                <input
                  type="text"
                  value={shippingAddress.zip}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, zip: e.target.value })}
                  placeholder="ZIP"
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:border-gold/50"
                  required
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={addressSaving}
                  className="btn-primary px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  {addressSaving ? 'Saving...' : 'Save Address'}
                </button>
                {addressSaved && <span className="text-green-400 text-xs">Saved!</span>}
                {addressError && <span className="text-red-400 text-xs">{addressError}</span>}
              </div>
            </form>
          )}
        </div>

        {/* Recent Activity Section */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Submissions */}
          <div className="card-premium rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold">Recent Submissions</h3>
              <Link href="/submit" className="text-gold text-xs hover:underline">Submit New</Link>
            </div>
            {submissions.length > 0 ? (
              <div className="space-y-2">
                {submissions.slice(0, 4).map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-b-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <a
                          href={sub.content_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white/70 text-xs hover:text-white truncate"
                        >
                          {sub.content_url.replace(/https?:\/\/(www\.)?/, '').slice(0, 25)}...
                        </a>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          sub.submission_type === 'shred'
                            ? 'bg-purple-500/20 text-purple-400'
                            : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {sub.submission_type === 'shred' ? 'STF' : 'General'}
                        </span>
                      </div>
                      <p className="text-white/30 text-xs">{new Date(sub.submitted_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <StatusBadge status={sub.status} />
                      {sub.status === 'approved' && sub.grit_awarded > 0 && (
                        <span className="text-green-400 text-xs font-semibold">+{sub.grit_awarded}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/40 text-sm">No submissions yet</p>
            )}
          </div>

          {/* GRIT Activity */}
          <div className="card-premium rounded-xl p-5">
            <h3 className="text-white font-semibold mb-3">GRIT Activity</h3>
            {activity.length > 0 ? (
              <div className="space-y-2">
                {activity.slice(0, 4).map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-b-0">
                    <div>
                      <p className="text-white/70 text-xs">{item.action}</p>
                      <p className="text-white/30 text-xs">{new Date(item.date).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-xs font-semibold ${item.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {item.amount >= 0 ? '+' : ''}{item.amount}
                    </span>
                  </div>
                ))}
              </div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-white/40 text-sm mb-3">No activity yet</p>
                <Link href="/submit" className="btn-primary inline-block px-4 py-2 rounded-lg text-sm">
                  Start Earning
                </Link>
              </div>
            ) : (
              <p className="text-white/40 text-sm">No GRIT activity recorded</p>
            )}
          </div>
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
