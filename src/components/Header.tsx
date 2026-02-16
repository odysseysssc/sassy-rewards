'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useAccount, useDisconnect } from 'wagmi';
import { useEffect, useState } from 'react';
import { truncateWallet } from '@/lib/drip';

const ADMIN_EMAILS = ['josh@shreddingsassy.com', 'admin@shreddingsassy.com', 'josh@sassy.com'];
const ADMIN_WALLETS = ['0xa1922c47aa67c41b1c1e877e9919f5ef29c99373', '0x659a364365d5fb3f18f2c7b9e038d276ae255375', '0xbc14975811be665cb7b1fb51e972bdb6ae4c1029'];

export function Header() {
  const { data: session } = useSession();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [gritBalance, setGritBalance] = useState<number | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [linkedWallet, setLinkedWallet] = useState<string | null>(null);

  // Fetch linked wallet from credentials if not in session
  useEffect(() => {
    async function fetchLinkedWallet() {
      if (!session?.user?.id || session?.user?.wallet) return;

      try {
        const res = await fetch('/api/account/credentials?type=wallet');
        if (res.ok) {
          const data = await res.json();
          if (data.credentials?.[0]?.identifier) {
            setLinkedWallet(data.credentials[0].identifier.toLowerCase());
          }
        }
      } catch (error) {
        console.error('Error fetching linked wallet:', error);
      }
    }

    fetchLinkedWallet();
  }, [session?.user?.id, session?.user?.wallet]);

  // Check if user is admin by email or wallet (from session, wagmi, or linked credentials)
  const userEmail = session?.user?.email?.toLowerCase();
  const userWallet = (session?.user?.wallet || address || linkedWallet)?.toLowerCase();
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

        {/* Nav Links - Desktop */}
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
            <Link
              href="/shred-the-feed"
              className="text-white hover:text-gold text-base font-semibold transition-colors"
            >
              Shred the Feed
            </Link>
            {isAdmin && (
              <Link
                href="/admin/submissions"
                className="text-gold hover:text-gold/80 text-base font-semibold transition-colors"
              >
                Admin
              </Link>
            )}
          </nav>
        )}

        {/* Right Side - Auth & Mobile Menu */}
        <div className="flex items-center gap-3">
          {/* Mobile Hamburger - Always visible on mobile */}
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

      {/* Mobile Nav Menu - Drawer */}
      {showMobileMenu && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowMobileMenu(false)}
          />
          {/* Drawer */}
          <div className="md:hidden fixed top-20 left-4 right-4 card-premium rounded-2xl z-50 overflow-hidden">
            <nav className="p-4 flex flex-col">
              {/* Main Links */}
              <a
                href="https://shreddingsassy.com"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowMobileMenu(false)}
                className="text-white hover:text-gold py-4 text-lg font-semibold transition-colors"
              >
                Store
              </a>
              {isLoggedIn ? (
                <Link
                  href="/profile"
                  onClick={() => setShowMobileMenu(false)}
                  className="text-white hover:text-gold py-4 text-lg font-semibold transition-colors"
                >
                  Profile
                </Link>
              ) : (
                <Link
                  href="/signin"
                  onClick={() => setShowMobileMenu(false)}
                  className="text-gold py-4 text-lg font-semibold transition-colors"
                >
                  Sign In
                </Link>
              )}
              <Link
                href="/faq"
                onClick={() => setShowMobileMenu(false)}
                className="text-white hover:text-gold py-4 text-lg font-semibold transition-colors"
              >
                FAQs
              </Link>
              {isAdmin && (
                <Link
                  href="/admin/submissions"
                  onClick={() => setShowMobileMenu(false)}
                  className="text-gold py-4 text-lg font-semibold transition-colors"
                >
                  Admin
                </Link>
              )}

              {/* Divider */}
              <div className="border-t border-white/10 my-2" />

              {/* Social Links */}
              <a
                href="https://x.com/ShredSassy"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-3 text-white hover:text-gold py-4 text-lg font-semibold transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                X
              </a>
              <a
                href="https://instagram.com/shreddingsassy"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-3 text-white hover:text-gold py-4 text-lg font-semibold transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                Instagram
              </a>
              <a
                href="https://discord.gg/shreddingsassy"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-3 text-white hover:text-gold py-4 text-lg font-semibold transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                </svg>
                Discord
              </a>
            </nav>
          </div>
        </>
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
