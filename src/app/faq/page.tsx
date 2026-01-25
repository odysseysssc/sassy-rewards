'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'What is GRIT?',
    answer: 'GRIT is the Shredding Sassy points system. Earn GRIT by shopping on our store and creating content about the brand. GRIT can be used to enter the daily Pin Wheel for enamel pins, and converts to $SHAKA during periodic conversion windows.',
  },
  {
    question: 'How do I earn GRIT?',
    answer: 'Two ways: 1) Shop at shreddingsassy.com — earn 10 GRIT per $1 spent (link your email in Profile to receive GRIT from purchases). 2) Create content — post about Shredding Sassy, tag @shreddingsassy, submit the link, and earn GRIT when approved.',
  },
  {
    question: 'How much GRIT do I earn per content submission?',
    answer: 'Base rewards vary by content type: Photo posts (25), Short videos under 60s (150), X threads or articles (100), Hosting X Spaces (100), Unboxing or styling videos (300), Long-form videos 3+ minutes (400). These base amounts are then multiplied based on views: under 1k (1x), 1k-5k (1.5x), 5k-20k (2x), 20k+ (2.5x). View multipliers apply to all content except X Spaces.',
  },
  {
    question: 'What content should I submit?',
    answer: 'We want content about Shredding Sassy — wearing the gear, unboxing pickups, sharing the story. This includes lifestyle photos, videos, X threads, hosting Spaces, articles, and reviews. Tag @shreddingsassy and make sure your content is public. The more people see it, the more you earn.',
  },
  {
    question: 'What is Shred the Feed?',
    answer: 'Shred the Feed is our action sports content competition — skating, surfing, snowboarding, BMX, skiing. Show us your shred. Shredding Sassy gear is not required, but visible gear earns bonus points.',
  },
  {
    question: 'What can I do with GRIT?',
    answer: 'Enter the daily Pin Wheel (10 GRIT per entry) for a chance to win collectible enamel pins. During periodic conversion windows, you can also swap GRIT for $SHAKA tokens.',
  },
  {
    question: 'What is the Pin Wheel?',
    answer: 'A daily raffle where you spend 10 GRIT to enter. Every day at 8pm UTC, the wheel spins and a winner is picked. Winners are notified in Discord and receive an exclusive enamel pin shipped to their address.',
  },
  {
    question: 'What is $SHAKA?',
    answer: '$SHAKA is the Shredding Sassy token on Base blockchain. During conversion windows, you can swap your GRIT for $SHAKA. It represents ownership in the Shredding Sassy community.',
  },
  {
    question: 'How long does content review take?',
    answer: 'We review all submissions within 48-72 hours. You can submit one piece of content per day.',
  },
  {
    question: 'How do I connect my accounts?',
    answer: 'Go to your Profile page to connect your wallet, Discord, and email. Connecting your email is important if you shop on our store — it ensures you receive GRIT from purchases.',
  },
  {
    question: 'How do I get my pin if I win?',
    answer: 'Make sure your shipping address is saved in your Profile before entering the Pin Wheel. When you win, we ship your enamel pin to the address on file.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <main className="min-h-screen">
      <Header />

      <section className="max-w-3xl mx-auto px-4 md:px-6 lg:px-12 py-16 md:py-20">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-white/50">
            Everything you need to know about GRIT, rewards, and Shredding Sassy
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="card-premium rounded-xl overflow-hidden"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
              >
                <span className="text-white font-medium pr-4">{faq.question}</span>
                <svg
                  className={`w-5 h-5 text-gold flex-shrink-0 transition-transform ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {openIndex === index && (
                <div className="px-6 pb-4">
                  <p className="text-white/60 leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-white/40 text-sm mb-4">
            Still have questions?
          </p>
          <a
            href="https://discord.gg/sassy"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-block px-6 py-3 rounded-lg font-bold"
          >
            Join our Discord
          </a>
        </div>
      </section>

      <Footer />
    </main>
  );
}
