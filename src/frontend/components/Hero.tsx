/* ─────────────────────────────────────────────────────────────
   Hero Section Component - Landing Area with Premium Aesthetics
   ───────────────────────────────────────────────────────────── */

import { useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import gsap from 'gsap';

/**
 * Properties for the Hero component.
 */
interface HeroProps {
  /** Callback triggered when the 'Launch Simulation' call-to-action is activated. */
  onGetStarted?: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onGetStarted }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Animate hero elements on mount
    const timeline = gsap.timeline();

    // Fade in container
    timeline.fromTo(
      containerRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.8 }
    );

    // Animate title reveal
    if (titleRef.current) {
      gsap.fromTo(
        titleRef.current,
        { opacity: 0, y: 32 },
        { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' }
      );
    }

    // Animate subtitle
    if (subtitleRef.current) {
      gsap.fromTo(
        subtitleRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, delay: 0.5, ease: 'power3.out' }
      );
    }

    // Animate CTA button
    if (ctaRef.current) {
      gsap.fromTo(
        ctaRef.current,
        { opacity: 0, scale: 0.9 },
        { opacity: 1, scale: 1, duration: 0.6, delay: 0.7, ease: 'back.out' }
      );
    }
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-obsdian-950 via-obsdian-900 to-obsdian-950 overflow-hidden pt-16"
    >
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-electric/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-cyber/10 rounded-full blur-3xl"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Title */}
        <h1
          ref={titleRef}
          className="text-5xl sm:text-6xl lg:text-7xl font-black mb-6 leading-tight"
        >
          <span className="text-gradient-indigo">Crowd Safety</span>
          <span className="block text-text-primary">Redefined</span>
        </h1>

        {/* Subtitle */}
        <p
          ref={subtitleRef}
          className="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto mb-8 leading-relaxed"
        >
          Advanced fluid dynamics simulation with real-time risk assessment and
          AI-powered mitigation strategies for safer crowd management.
        </p>

        {/* Features Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-12 text-sm">
          <div className="bg-indigo-electric/10 border border-indigo-electric/30 rounded-lg p-3">
            <p className="font-semibold text-indigo-electric mb-1">Mathematical</p>
            <p className="text-text-muted">Physics-based simulation</p>
          </div>
          <div className="bg-cyan-cyber/10 border border-cyan-cyber/30 rounded-lg p-3">
            <p className="font-semibold text-cyan-cyber mb-1">Real-time</p>
            <p className="text-text-muted">Live analytics & alerts</p>
          </div>
          <div className="bg-emerald-math/10 border border-emerald-math/30 rounded-lg p-3">
            <p className="font-semibold text-emerald-math mb-1">Intelligent</p>
            <p className="text-text-muted">AI-driven prevention</p>
          </div>
        </div>

        {/* CTA Button */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            ref={ctaRef}
            onClick={onGetStarted}
            className="btn-primary flex items-center justify-center gap-2 text-lg px-8 py-4 group relative overflow-hidden"
          >
            <span>Launch Simulation</span>
            <ArrowRight
              size={20}
              className="group-hover:translate-x-2 transition-transform"
            />
          </button>
          <button className="btn-secondary flex items-center justify-center px-8 py-4 text-lg">
            View Documentation
          </button>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-text-muted uppercase tracking-widest">
              Scroll to explore
            </span>
            <div className="w-6 h-10 border border-indigo-glow/40 rounded-full flex items-center justify-center">
              <div className="w-1 h-2 bg-indigo-glow rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
