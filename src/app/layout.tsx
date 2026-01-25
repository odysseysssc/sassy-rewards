import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rewards | Shredding Sassy",
  description: "Earn GRIT points and get rewarded for being part of the Shredding Sassy community.",
  openGraph: {
    title: "Rewards | Shredding Sassy",
    description: "Earn GRIT points and get rewarded for being part of the Shredding Sassy community.",
    images: [
      {
        url: "https://rewards.shreddingsassy.com/og-image.jpg",
        width: 1200,
        height: 1200,
        alt: "Shredding Sassy - Share the Shaka",
      },
    ],
    siteName: "Shredding Sassy Rewards",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rewards | Shredding Sassy",
    description: "Earn GRIT points and get rewarded for being part of the Shredding Sassy community.",
    images: ["https://rewards.shreddingsassy.com/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
