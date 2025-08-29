'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Badge } from '../ui/badge';
import { AnimatedBeam } from "../magicui/animated-beam";
import { Circle } from './Circle';
import gsap from 'gsap';
import {
  Lightbulb, MapPinIcon, UsersIcon, Siren,
  Globe, ShieldCheck, MessageSquare, TimerIcon, Zap
} from 'lucide-react';

// Utility: Responsive hook
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkSize = () => setIsMobile(window.innerWidth < 640);
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);
  return isMobile;
};

export const Features: React.FC = () => {
  const featureRefs = useRef<HTMLDivElement[]>([]);
  const isMobile = useIsMobile();

  // Responsive center points
  const centerX = isMobile ? 160 : 225;
  const centerY = isMobile ? 150 : 175;
  const verticalSpacing = isMobile ? 90 : 125;
  const iconSize = isMobile ? 24 : 30;
  // const px1 = isMobile ? -25 : -19

  const icons = [
    { Icon: Lightbulb, color: 'text-yellow-400', x: centerX - 120, y: centerY - verticalSpacing, px: isMobile ? -25 : -19, py: isMobile ? -20 : -20 },
    { Icon: UsersIcon, color: 'text-teal-400', x: centerX - 120, y: centerY, px: isMobile ? -32 : -31, py: isMobile ? 0 : 5 },
    { Icon: TimerIcon, color: 'text-red-400', x: centerX - 120, y: centerY + verticalSpacing, px: isMobile ? -24 : -26, py: isMobile ? 20 : 27 },
    { Icon: Siren, color: 'text-purple-400', x: centerX + 120, y: centerY - verticalSpacing, px: isMobile ? 25 : 35, py: isMobile ? -20 : -20 },
    { Icon: MessageSquare, color: 'text-blue-400', x: centerX + 120, y: centerY, px: isMobile ? 32 : 47, py: isMobile ? 0 : 5 },
    { Icon: Globe, color: 'text-green-400', x: centerX + 120, y: centerY + verticalSpacing, px: isMobile ? 25 : 42, py: isMobile ? 20 : 27 },
  ];

  useEffect(() => {
    featureRefs.current.forEach((el, index) => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          delay: index * 0.2,
          ease: 'power3.out',
        }
      );
    });
  }, []);

  const features = [
    {
      Icon: ShieldCheck,
      color: 'text-blue-400',
      title: 'Truly Anonymous',
      description: 'No accounts, no tracking. Secured by the blockchain.',
    },
    {
      Icon: MapPinIcon,
      color: 'text-purple-400',
      title: 'Hyperlocal Focus',
      description: "Filter out the noise. See what's relevant to your immediate area.",
    },
    {
      Icon: Zap,
      color: 'text-green-400',
      title: 'Real-Time & Unfiltered',
      description: 'Get live updates as they happen from your community.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col justify-end bg-black text-white relative overflow-hidden">
      {/* Background gradient */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 25% 50%, rgba(255, 0, 255, 0.3), transparent 50%)',
        }}
      />
      <div className="container mx-auto px-4 sm:px-6 pb-16 pt-20 sm:pt-28">
        {/* Heading */}
        <div className="text-center mb-10">
          <Badge variant="outline" className="mb-4 bg-white text-gray-900 rounded-full px-3 py-2 text-sm sm:text-md">
            Core Features
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">The Hyperlocal Information Hub</h2>
          <p className="text-gray-400 text-sm sm:text-base">
            GistPin brings together anonymous, real-world events and conversations into a single, interactive map.
          </p>
        </div>

        {/* Grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Left: Animated Beam Hub */}
          <div className="flex justify-center items-center w-full">
            <div className="relative w-[320px] sm:w-[400px] md:w-[450px] h-[320px] sm:h-[400px] md:h-[450px]">
              <Circle
                x={centerX}
                y={centerY}
                className="text-white w-16 h-16 sm:w-20 sm:h-20 text-sm font-bold"
              >
                <img src="gistPin-header-logo.png" alt="Gistpin Icon" className="w-full h-full object-contain" />
              </Circle>

              {icons.map(({ Icon, color, x, y, px, py }, index) => (
                <React.Fragment key={index}>
                  <AnimatedBeam startX={centerX} startY={centerY} endX={x} endY={y} px={px} py={py} />
                  <Circle x={x} y={y} className="bg-gray-900 w-10 h-10 sm:w-12 sm:h-12 border-white">
                    <Icon size={iconSize} className={color} />
                  </Circle>
                </React.Fragment>
              ))}
            </div>
          </div>


          {/* Right: Feature Cards */}
          <div className="space-y-6 w-full">
            {features.map((feature, index) => (
              <div
                key={index}
                ref={(el) => {
                  if (el) featureRefs.current[index] = el;
                }}
                className="p-4 sm:p-6 bg-neutral-950 backdrop-blur-md rounded-lg shadow-lg border border-gray-700/50"
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
                    <feature.Icon size={20} className={feature.color} />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold">{feature.title}</h3>
                    <p className="mt-1 text-gray-400 text-sm sm:text-base">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
