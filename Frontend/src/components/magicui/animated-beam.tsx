'use client';

import React, { useRef, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';

interface AnimatedBeamProps {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  px: number;
  py:number
}

export const AnimatedBeam: React.FC<AnimatedBeamProps> = ({
  startX,
  startY,
  endX,
  endY,
  px,
  py
}) => {
  const controls = useAnimation();
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    controls.start({
      pathLength: [0, 1],
      transition: {
        duration: 2,
        ease: 'easeInOut',
        repeat: Infinity,
        repeatType: 'reverse' as const,
      },
    });
  }, [controls]);

  const midX = (startX + endX) /2;
  const midY = (startY + endY) /2;

  const pathD = `M${startX + px},${startY + py} Q${midX},${midY - 50} ${endX},${endY}`;

  return (
    <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
      <motion.path
        ref={pathRef}
        d={pathD}
        stroke="url(#gradient)"
        strokeWidth="2"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={controls}
      />
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{ stopColor: '#3B82F6', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#10B981', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
    </svg>
  );
};