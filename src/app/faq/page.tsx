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
    answer: 'GRIT is the points system for Shredding Sassy. You earn GRIT by purchasing products from our store and creating content featuring Shredding Sassy gear. The more you participate, the more GRIT you earn.',
  },
  {
    question: 'How do I earn GRIT?',
    answer: 'There are two main ways to earn GRIT: 1) Shop at shreddingsassy.com and earn 10 GRIT for every $1 spent. 2) Create content featuring Shredding Sassy products, submit it for review, and earn GRIT when approved.',
  },
  {
    question: 'What can I do with GRIT?',
    answer: 'GRIT unlocks rewards like the daily Pin Wheel spin where you can win collectible enamel pins. Periodically, we also open conversion windows where you can swap GRIT for $SHAKA, our brand coin.',
  },
  {
    question: 'What is the Pin Wheel?',
    answer: 'The Pin Wheel is a daily raffle where GRIT holders can spend 10 GRIT to enter for a chance to win exclusive Shredding Sassy enamel pins. The draw happens every day at 8pm UTC.',
  },
  {
    question: 'What is SHAKA?',
    answer: 'SHAKA is the Shredding Sassy brand coin on the Base blockchain. During conversion windows, you can swap your GRIT for $SHAKA tokens. SHAKA represents ownership in the Shredding Sassy community.',
  },
  {
    question: 'What content should I submit?',
    answer: 'We love seeing Shredding Sassy gear in action! This includes lifestyle photos, unboxing videos, product reviews, and action sports footage. Make sure Shredding Sassy products are clearly visible and the content is original.',
  },
  {
    question: 'What is Shred the Feed?',
    answer: 'Shred the Feed is our competition specifically for action sports content. If you are skating, surfing, snowboarding, or doing any action sport in Shredding Sassy gear, submit it to Shred the Feed for a chance at bigger rewards.',
  },
  {
    question: 'How long does content review take?',
    answer: 'We review all submissions within 48-72 hours. You will be notified when your submission is approved or if we need any additional information.',
  },
  {
    question: 'How do I connect my wallet?',
    answer: 'Go to your Profile page and click "Connect" next to the Wallet section. You can connect any Ethereum-compatible wallet like MetaMask or Rainbow.',
  },
  {
    question: 'How do I get my enamel pin if I win?',
    answer: 'Make sure your shipping address is saved in your Profile. When you win a Pin Wheel spin, we will ship your enamel pin to the address on file.',
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
