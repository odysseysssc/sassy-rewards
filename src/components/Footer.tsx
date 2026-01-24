import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-white/5 mt-20">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-12 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Links */}
          <div className="flex items-center gap-6 text-sm">
            <a
              href="https://shreddingsassy.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/50 hover:text-white transition-colors"
            >
              Main Site
            </a>
            <a
              href="https://discord.gg/sassy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/50 hover:text-white transition-colors"
            >
              Discord
            </a>
            <a
              href="https://x.com/shreddingsassy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/50 hover:text-white transition-colors"
            >
              X
            </a>
          </div>

          {/* Copyright */}
          <p className="text-white/30 text-sm">
            &copy; {new Date().getFullYear()} Shredding Sassy. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
