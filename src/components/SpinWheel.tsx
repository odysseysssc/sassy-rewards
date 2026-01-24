'use client';

import { useState, useEffect } from 'react';
import { PRIZE_TIERS } from '@/lib/constants';

type SpinWheelProps = {
  isSpinning: boolean;
  onSpinComplete?: (prize: string) => void;
};

const SEGMENTS = [
  { label: PRIZE_TIERS.COMMON.label, color: PRIZE_TIERS.COMMON.color, tier: 'COMMON' },
  { label: PRIZE_TIERS.UNCOMMON.label, color: PRIZE_TIERS.UNCOMMON.color, tier: 'UNCOMMON' },
  { label: PRIZE_TIERS.COMMON.label, color: PRIZE_TIERS.COMMON.color, tier: 'COMMON' },
  { label: PRIZE_TIERS.RARE.label, color: PRIZE_TIERS.RARE.color, tier: 'RARE' },
  { label: PRIZE_TIERS.COMMON.label, color: PRIZE_TIERS.COMMON.color, tier: 'COMMON' },
  { label: PRIZE_TIERS.UNCOMMON.label, color: PRIZE_TIERS.UNCOMMON.color, tier: 'UNCOMMON' },
  { label: PRIZE_TIERS.COMMON.label, color: PRIZE_TIERS.COMMON.color, tier: 'COMMON' },
  { label: PRIZE_TIERS.UNCOMMON.label, color: PRIZE_TIERS.UNCOMMON.color, tier: 'UNCOMMON' },
];

function selectWeightedPrize(): { index: number; prize: string; tier: string } {
  const random = Math.random() * 100;
  let tier: keyof typeof PRIZE_TIERS;

  if (random < PRIZE_TIERS.RARE.weight) {
    tier = 'RARE';
  } else if (random < PRIZE_TIERS.RARE.weight + PRIZE_TIERS.UNCOMMON.weight) {
    tier = 'UNCOMMON';
  } else {
    tier = 'COMMON';
  }

  // Find a segment with this tier
  const matchingIndices = SEGMENTS
    .map((s, i) => ({ segment: s, index: i }))
    .filter(({ segment }) => segment.tier === tier)
    .map(({ index }) => index);

  const selectedIndex = matchingIndices[Math.floor(Math.random() * matchingIndices.length)];

  return {
    index: selectedIndex,
    prize: SEGMENTS[selectedIndex].label,
    tier: SEGMENTS[selectedIndex].tier,
  };
}

export function SpinWheel({ isSpinning, onSpinComplete }: SpinWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<{ prize: string; tier: string } | null>(null);

  useEffect(() => {
    if (isSpinning) {
      const { index, prize, tier } = selectWeightedPrize();

      // Calculate rotation to land on the selected segment
      const segmentAngle = 360 / SEGMENTS.length;
      const targetAngle = 360 - (index * segmentAngle) - (segmentAngle / 2);
      const fullRotations = 5 * 360; // 5 full rotations
      const finalRotation = fullRotations + targetAngle + (Math.random() * 20 - 10);

      setRotation(finalRotation);
      setResult({ prize, tier });

      // Call onSpinComplete after animation
      const timeout = setTimeout(() => {
        onSpinComplete?.(prize);
      }, 4000);

      return () => clearTimeout(timeout);
    }
  }, [isSpinning, onSpinComplete]);

  return (
    <div className="relative w-72 h-72 md:w-96 md:h-96 mx-auto">
      {/* Pointer */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
        <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[25px] border-t-gold drop-shadow-lg" />
      </div>

      {/* Wheel */}
      <div
        className="w-full h-full rounded-full border-4 border-gold/30 overflow-hidden shadow-2xl transition-transform"
        style={{
          transform: `rotate(${rotation}deg)`,
          transitionDuration: isSpinning ? '4s' : '0s',
          transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.3, 1)',
        }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {SEGMENTS.map((segment, i) => {
            const angle = 360 / SEGMENTS.length;
            const startAngle = i * angle - 90;
            const endAngle = (i + 1) * angle - 90;

            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;

            const x1 = 50 + 50 * Math.cos(startRad);
            const y1 = 50 + 50 * Math.sin(startRad);
            const x2 = 50 + 50 * Math.cos(endRad);
            const y2 = 50 + 50 * Math.sin(endRad);

            const largeArc = angle > 180 ? 1 : 0;

            const path = `M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`;

            // Text position
            const midAngle = startAngle + angle / 2;
            const midRad = (midAngle * Math.PI) / 180;
            const textX = 50 + 30 * Math.cos(midRad);
            const textY = 50 + 30 * Math.sin(midRad);

            return (
              <g key={i}>
                <path
                  d={path}
                  fill={i % 2 === 0 ? 'rgba(40, 6, 70, 0.9)' : 'rgba(26, 3, 48, 0.9)'}
                  stroke="rgba(250, 204, 21, 0.2)"
                  strokeWidth="0.5"
                />
                <text
                  x={textX}
                  y={textY}
                  fill={segment.color}
                  fontSize="4"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${midAngle + 90}, ${textX}, ${textY})`}
                >
                  {segment.label.split(' ')[0]}
                </text>
              </g>
            );
          })}
          {/* Center circle */}
          <circle cx="50" cy="50" r="8" fill="#280646" stroke="#FACC15" strokeWidth="1" />
          <text x="50" y="50" fill="#FACC15" fontSize="4" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
            SPIN
          </text>
        </svg>
      </div>

      {/* Result display */}
      {result && !isSpinning && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="card-premium rounded-xl px-6 py-4 glow-gold-intense">
            <div className="text-center">
              <div className="text-sm text-white/50 mb-1">You won:</div>
              <div className="text-xl font-bold" style={{ color: PRIZE_TIERS[result.tier as keyof typeof PRIZE_TIERS].color }}>
                {result.prize}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
