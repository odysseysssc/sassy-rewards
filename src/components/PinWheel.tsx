'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { PINS } from '@/lib/constants';

type PinWheelProps = {
  targetSegment?: number | null;
  isSpinning: boolean;
  onSpinComplete?: () => void;
  autoPlay?: boolean;
};

const SEGMENT_COUNT = PINS.length; // 19
const SEGMENT_ANGLE = 360 / SEGMENT_COUNT;

export function PinWheel({ targetSegment, isSpinning, onSpinComplete, autoPlay = false }: PinWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [spinCount, setSpinCount] = useState(0);

  const spinToSegment = useCallback((segmentIndex: number, spinNum: number) => {
    // Reset to 0 first (no transition)
    setIsAnimating(false);
    setRotation(0);

    // Then animate to target after a brief delay
    setTimeout(() => {
      const targetAngle = segmentIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
      const fullRotations = 5 * 360;
      const finalRotation = fullRotations + (360 - targetAngle);

      setIsAnimating(true);
      setRotation(finalRotation);

      // Call completion after animation
      setTimeout(() => {
        onSpinComplete?.();
      }, 5000);
    }, 50);
  }, [onSpinComplete]);

  useEffect(() => {
    if (isSpinning && targetSegment !== null && targetSegment !== undefined) {
      spinToSegment(targetSegment, spinCount);
    }
  }, [isSpinning, targetSegment, spinToSegment, spinCount]);

  // Auto-play replay on mount and repeat
  useEffect(() => {
    if (autoPlay && targetSegment !== null && targetSegment !== undefined) {
      const startSpin = () => {
        spinToSegment(targetSegment, spinCount);
      };

      // Initial spin after short delay
      const initialTimer = setTimeout(startSpin, 500);

      // Repeat every 8 seconds (5s spin + 3s pause)
      const repeatInterval = setInterval(() => {
        setSpinCount(c => c + 1);
      }, 8000);

      return () => {
        clearTimeout(initialTimer);
        clearInterval(repeatInterval);
      };
    }
  }, [autoPlay, targetSegment, spinToSegment, spinCount]);

  return (
    <div className="relative w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] md:w-[380px] md:h-[380px] lg:w-[420px] lg:h-[420px] mx-auto">
      {/* Pointer */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
        <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-gold drop-shadow-lg" />
      </div>

      {/* Outer glow ring */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-gold/20 via-purple-500/20 to-gold/20 blur-xl" />

      {/* Wheel Container */}
      <div
        className="relative w-full h-full"
        style={{
          transform: `rotate(${rotation}deg)`,
          transitionDuration: isAnimating ? '5s' : '0s',
          transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.3, 1)',
        }}
      >
        {/* Wheel segments */}
        <div className="absolute inset-0 rounded-full border-4 border-gold/40 overflow-hidden shadow-2xl">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {PINS.map((pin, i) => {
              const startAngle = i * SEGMENT_ANGLE - 90;
              const endAngle = (i + 1) * SEGMENT_ANGLE - 90;

              const startRad = (startAngle * Math.PI) / 180;
              const endRad = (endAngle * Math.PI) / 180;

              const x1 = 50 + 50 * Math.cos(startRad);
              const y1 = 50 + 50 * Math.sin(startRad);
              const x2 = 50 + 50 * Math.cos(endRad);
              const y2 = 50 + 50 * Math.sin(endRad);

              const largeArc = SEGMENT_ANGLE > 180 ? 1 : 0;
              const path = `M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`;

              // Alternate colors
              const bgColor = i % 2 === 0
                ? 'rgba(40, 6, 70, 0.95)'
                : 'rgba(60, 10, 90, 0.95)';

              return (
                <path
                  key={i}
                  d={path}
                  fill={bgColor}
                  stroke="rgba(250, 204, 21, 0.3)"
                  strokeWidth="0.3"
                />
              );
            })}
            {/* Center circle */}
            <circle cx="50" cy="50" r="12" fill="#1a0330" stroke="#FACC15" strokeWidth="0.5" />
            <circle cx="50" cy="50" r="8" fill="#280646" stroke="#FACC15" strokeWidth="0.3" />
          </svg>
        </div>

        {/* Pin images - separate layer */}
        {PINS.map((pin, i) => {
          const midAngle = i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
          const midRad = ((midAngle - 90) * Math.PI) / 180;
          // Position images closer to edge (40% from center = 80% of radius)
          const radius = 40;
          const imgX = 50 + radius * Math.cos(midRad);
          const imgY = 50 + radius * Math.sin(midRad);

          return (
            <div
              key={pin.name}
              className="absolute w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 lg:w-11 lg:h-11 group/pin cursor-pointer"
              style={{
                left: `${imgX}%`,
                top: `${imgY}%`,
                transform: `translate(-50%, -50%) rotate(${midAngle}deg)`,
              }}
              title={pin.name}
            >
              <Image
                src={pin.image}
                alt={pin.name}
                fill
                className="object-contain"
                sizes="56px"
              />
              {/* Tooltip */}
              <div
                className="absolute left-1/2 -bottom-8 -translate-x-1/2 opacity-0 group-hover/pin:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap"
                style={{ transform: `translateX(-50%) rotate(${-midAngle}deg)` }}
              >
                <div className="bg-black/90 text-white text-xs px-2 py-1 rounded">
                  {pin.name}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
