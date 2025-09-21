'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useRef } from 'react';
import { GridPattern } from '@/components/ui/grid-pattern';
import { cn } from '@/lib/utils';

gsap.registerPlugin(ScrollTrigger);

export default function CTA() {
  const containerRef = useRef(null);

  useGSAP(
    () => {
      gsap.from('.cta-content', {
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 80%',
        },
        opacity: 0,
        filter: 'blur(10px)',
        y: 50,
        stagger: 0.2,
        duration: 1,
        ease: 'power3.out',
      });
    },
    { scope: containerRef }
  );

  return (
    <section
      ref={containerRef}
      className="relative py-24 md:py-32 overflow-hidden bg-[#030303]"
    >
      <GridPattern
        width={30}
        height={30}
        x={-1}
        y={-1}
        className={cn(
          'fill-purple-500/10 stroke-purple-500/20',
          '[mask-image:radial-gradient(500px_circle_at_center,white,transparent)]'
        )}
      />

      <div className="max-w-3xl px-4 mx-auto text-center glowing-card-container">
        <div className="glow-layer"></div>

        <div className="relative z-10 p-8 md:p-12 rounded-3xl bg-black/40 backdrop-blur-xl border border-white/10">
          <h2 className="cta-content text-3xl font-bold text-white md:text-4xl">
            Ready to See What&apos;s{' '}
            <span className="text-purple-500">Happening</span>?
          </h2>

          <p className="cta-content max-w-xl mx-auto mt-4 text-white/70">
            From the bustling streets of Lagos to the quiet corners of your
            neighborhood, discover and share what&apos;s happening right now.
            Your community is waiting.
          </p>
          <div className="cta-content mt-8">
            <Link
              href="/map"
              className="inline-flex items-center justify-center px-8 py-3 text-lg font-semibold text-black transition-all duration-300 bg-purple-950 rounded-lg hover:bg-purple-900 hover:scale-105"
            >
              <span className="text-purple-200"> Explore the Live Map</span>{' '}
              <ArrowRight className="w-5 h-5 ml-2 text-purple-200" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
