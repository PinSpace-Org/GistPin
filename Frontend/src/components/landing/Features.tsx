'use client';

import React, { useEffect, useRef } from 'react';
import { Badge } from '../ui/badge';
import { AnimatedBeam } from "../magicui/animated-beam";
import { Circle } from './Circle';
import gsap from 'gsap';
import { Lightbulb, MapPinIcon, UsersIcon, Siren, Globe, ShieldCheck, MessageSquare, TimerIcon, Zap } from 'lucide-react';

export const Features: React.FC = () => {
  const featureRefs = useRef<HTMLDivElement[]>([]);
  const centerX = 225; // Center position (adjust based on container width)
  const centerY = 175;
  const verticalSpacing = 125;
  const iconSize = 30; // Size for small icons

  const icons = [
    { Icon: Lightbulb, color: 'text-yellow-400', x: centerX - 150, y: centerY - verticalSpacing,px:-18,py:-25 },
    { Icon: UsersIcon, color: 'text-teal-400', x: centerX - 150, y: centerY,px:-32,py:0 },
    { Icon: TimerIcon, color: 'text-red-400', x: centerX - 150, y: centerY + verticalSpacing,px:-25,py:25 },
    { Icon: Siren, color: 'text-purple-400', x: centerX + 150, y: centerY - verticalSpacing,px:24,py:-25 },
    { Icon: MessageSquare, color: 'text-blue-400', x: centerX + 150, y: centerY,px:39,py:0 },
    { Icon: Globe, color: 'text-green-400', x: centerX + 150, y: centerY + verticalSpacing,px:33,py:25 },
  ];

  // Calculate positions for each icon

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
    <div className="min-h-screen flex flex-col justify-end bg-black text-white relative overflow-hidden align-middle">
      {/* Subtle radial gradient behind the hub */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: 'radial-gradient(circle at 25% 50%, rgba(255, 0, 255, 0.3), transparent 50%)',
        }}
      />
      <div className="container mx-auto px-4 pb-16 mt-29">
        <div className="text-center mb-8">
          <Badge variant="outline" className="mb-4 bg-white text-gray-900 rounded-full px-3 py-2 text-md">
            Core Features
          </Badge>
          <h2 className="text-3xl font-bold mb-2">The Hyperlocal Information Hub</h2>
          <p className="text-gray-400">
            GistPin brings together anonymous, real-world events and conversations into a single, interactive map.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 align-middle">
          {/* Left Column: Radial Hub with Beams */}
          <div className="relative h-90 lg:h-auto lg:w-auto">
            {/* Central Circle */}
            <Circle
              x={centerX}
              y={centerY}
              className="text-white w-18 h-18 text-lg font-bold"
            >
              <img src="gistPin-header-logo.png" alt="Gistpin Icon" />
            </Circle>

            {/* Surrounding Icons and Beams */}
            {icons.map(({ Icon, color, x, y, px, py }, index) => (
              <React.Fragment key={index}>
                <AnimatedBeam startX={centerX} startY={centerY} endX={x} endY={y} px={px} py={py} />
                <Circle x={x} y={y} className="bg-gray-900 w-10 h-10 border-white">
                  <Icon size={iconSize} className={color} />
                </Circle>
              </React.Fragment>
            ))}
          </div>

          {/* Right Column: Feature Cards */}
          <div className="space-y-6 w-full">
            {features.map((feature, index) => (
              <div
                key={index}
                ref={(el) => {
                  if (el) featureRefs.current[index] = el;
                }}
                className="p-4 bg-neutral-950 backdrop-blur-md rounded-lg shadow-lg border border-gray-700/50"
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
                    <feature.Icon size={20} className={feature.color} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{feature.title}</h3>
                    <p className="mt-1 text-gray-400">{feature.description}</p>
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