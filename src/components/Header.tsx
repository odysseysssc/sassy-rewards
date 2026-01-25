'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useAccount, useDisconnect } from 'wagmi';
import { useEffect, useState } from 'react';
import { truncateWallet } from '@/lib/drip';

const ADMIN_EMAILS = ['josh@shreddingsassy.com', 'admin@shreddingsassy.com', 'josh@sassy.com'];
const ADMIN_WALLETS = ['0xa1922c47aa67c41b1c1e877e9919f5ef29c99373', '0x659a364365d5fb3f18f2c7b9e038d276ae255375'];

export function Header() {
  const { data: session } = useSession();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [gritBalance, setGritBalance] = useState<number | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Check if user is admin by email or wallet
  const userEmail = session?.user?.email?.toLowerCase();
  const userWallet = (session?.user?.wallet || address)?.toLowerCase();
  const isAdmin = (userEmail && ADMIN_EMAILS.includes(userEmail)) ||
                  (userWallet && ADMIN_WALLETS.includes(userWallet));

  // Determine login status - session exists or wallet connected
  const isLoggedIn = !!session?.user || isConnected;

  // Get display identifier based on auth type
  const displayIdentifier = session?.user?.email
    ? truncateEmail(session.user.email)
    : session?.user?.wallet
    ? truncateWallet(session.user.wallet)
    : address
    ? truncateWallet(address)
    : null;

  useEffect(() => {
    async function fetchGrit() {
      if (!isLoggedIn) {
        setGritBalance(null);
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
          }
        }
      } catch (error) {
        console.error('Error fetching GRIT:', error);
      }
    }

    fetchGrit();
  }, [isLoggedIn, session, address]);

  const handleLogout = async () => {
    disconnect();
    await signOut({ redirect: false });
    setShowMenu(false);
    window.location.href = '/';
  };

  return (
    <header className="w-full border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-12 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="relative w-32 h-12 md:w-40 md:h-14">
          <Image
            src="/images/logo.png"
            alt="Shredding Sassy"
            fill
            className="object-contain object-left"
            priority
          />
        </Link>

        {/* Nav Links */}
        {isLoggedIn && (
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="text-white hover:text-gold text-base font-semibold transition-colors"
            >
              Home
            </Link>
            <Link
              href="/submit"
              className="text-white hover:text-gold text-base font-semibold transition-colors"
            >
              Submit Content
            </Link>
            <Link
              href="/raffle"
              className="text-white hover:text-gold text-base font-semibold transition-colors"
            >
              Pin Wheel
            </Link>
            <div className="relative">
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="flex items-center gap-1 text-white hover:text-gold text-base font-semibold transition-colors"
              >
                More
                <svg
                  className={`w-4 h-4 transition-transform ${showMoreMenu ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showMoreMenu && (
                <div className="absolute left-0 mt-2 w-48 card-premium rounded-lg py-2 z-50">
                  <Link
                    href="/shred-the-feed"
                    onClick={() => setShowMoreMenu(false)}
                    className="block px-4 py-2 text-white/70 hover:text-white hover:bg-white/5 transition-colors text-sm"
                  >
                    Shred the Feed
                  </Link>
                  <Link
                    href="/faq"
                    onClick={() => setShowMoreMenu(false)}
                    className="block px-4 py-2 text-white/70 hover:text-white hover:bg-white/5 transition-colors text-sm"
                  >
                    FAQs
                  </Link>
                  <a
                    href="https://shreddingsassy.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowMoreMenu(false)}
                    className="block px-4 py-2 text-white/70 hover:text-white hover:bg-white/5 transition-colors text-sm"
                  >
                    Shop →
                  </a>
                  <Link
                    href="/profile"
                    onClick={() => setShowMoreMenu(false)}
                    className="block px-4 py-2 text-white/70 hover:text-white hover:bg-white/5 transition-colors text-sm"
                  >
                    Profile
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin/submissions"
                      onClick={() => setShowMoreMenu(false)}
                      className="block px-4 py-2 text-gold hover:text-gold hover:bg-gold/10 transition-colors text-sm font-medium"
                    >
                      Admin
                    </Link>
                  )}
                </div>
              )}
            </div>
          </nav>
        )}

        {/* Right Side - Auth & Mobile Menu */}
        <div className="flex items-center gap-3">
          {/* Mobile Hamburger */}
          {isLoggedIn && (
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 text-white/70 hover:text-white transition-colors"
              aria-label="Toggle menu"
            >
              {showMobileMenu ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          )}

          {isLoggedIn ? (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-3 card-premium rounded-lg px-4 py-2 hover:border-gold/40 transition-all"
              >
                {gritBalance !== null && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg font-bold gradient-text">
                      {gritBalance.toLocaleString()}
                    </span>
                    <span className="text-white/40 text-xs">GRIT</span>
                  </div>
                )}
                <span className="hidden md:inline text-white/60 text-sm font-mono">
                  {displayIdentifier}
                </span>
                <svg
                  className={`hidden md:block w-4 h-4 text-white/40 transition-transform ${showMenu ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 card-premium rounded-lg py-2 z-50">
                  <Link
                    href="/profile"
                    onClick={() => setShowMenu(false)}
                    className="block w-full text-left px-4 py-2 text-white/70 hover:text-white hover:bg-white/5 transition-colors text-sm"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-white/70 hover:text-white hover:bg-white/5 transition-colors text-sm"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/signin"
              className="btn-primary px-5 py-2.5 rounded-lg text-sm font-semibold"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Nav Menu */}
      {isLoggedIn && showMobileMenu && (
        <div className="md:hidden border-t border-white/5 bg-purple-darker">
          <nav className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-1">
            <Link
              href="/"
              onClick={() => setShowMobileMenu(false)}
              className="text-white hover:text-gold py-3 px-2 text-base font-semibold transition-colors border-b border-white/5"
            >
              Home
            </Link>
            <Link
              href="/submit"
              onClick={() => setShowMobileMenu(false)}
              className="text-white hover:text-gold py-3 px-2 text-base font-semibold transition-colors border-b border-white/5"
            >
              Submit Content
            </Link>
            <Link
              href="/raffle"
              onClick={() => setShowMobileMenu(false)}
              className="text-white hover:text-gold py-3 px-2 text-base font-semibold transition-colors border-b border-white/5"
            >
              Pin Wheel
            </Link>
            <Link
              href="/shred-the-feed"
              onClick={() => setShowMobileMenu(false)}
              className="text-white hover:text-gold py-3 px-2 text-base font-semibold transition-colors border-b border-white/5"
            >
              Shred the Feed
            </Link>
            <Link
              href="/faq"
              onClick={() => setShowMobileMenu(false)}
              className="text-white hover:text-gold py-3 px-2 text-base font-semibold transition-colors border-b border-white/5"
            >
              FAQs
            </Link>
            <a
              href="https://shreddingsassy.com"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setShowMobileMenu(false)}
              className="text-white hover:text-gold py-3 px-2 text-base font-semibold transition-colors border-b border-white/5"
            >
              Shop →
            </a>
            <Link
              href="/profile"
              onClick={() => setShowMobileMenu(false)}
              className="text-white hover:text-gold py-3 px-2 text-base font-semibold transition-colors border-b border-white/5"
            >
              Profile
            </Link>
            {isAdmin && (
              <Link
                href="/admin/submissions"
                onClick={() => setShowMobileMenu(false)}
                className="text-gold py-3 px-2 text-base font-semibold transition-colors border-b border-white/5"
              >
                Admin
              </Link>
            )}
            <button
              onClick={() => {
                setShowMobileMenu(false);
                handleLogout();
              }}
              className="text-white/60 hover:text-white py-3 px-2 text-base font-semibold transition-colors text-left"
            >
              Disconnect
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}

// Helper to truncate email for display
function truncateEmail(email: string): string {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (local.length <= 4) return email;
  return `${local.slice(0, 4)}...@${domain}`;
}
