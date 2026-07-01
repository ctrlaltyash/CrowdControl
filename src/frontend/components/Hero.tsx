import { useEffect, useRef } from 'react';
import { ArrowRight, Sparkles, Terminal } from 'lucide-react';
import gsap from 'gsap';
import heroImage from '../assets/hero.png';

interface HeroProps {
  onGetStarted?: () => void;
  onExploreModel?: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onGetStarted, onExploreModel }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const ctaContainerRef = useRef<HTMLDivElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const timeline = gsap.timeline();

      timeline.fromTo(
        containerRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.8 }
      );

      // Slide up the title with some swagger. Total rizz.
      if (titleRef.current) {
        timeline.fromTo(
          titleRef.current,
          { opacity: 0, y: 32 },
          { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out' }
        );
      }

      if (subtitleRef.current) {
        timeline.fromTo(
          subtitleRef.current,
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out' },
          '-=0.62'
        );
      }

      if (ctaContainerRef.current) {
        timeline.fromTo(
          ctaContainerRef.current,
          { opacity: 0, scale: 0.95 },
          { opacity: 1, scale: 1, duration: 0.6, ease: 'expo.out' },
          '-=0.36'
        );
      }

      if (visualRef.current) {
        timeline.fromTo(
          visualRef.current,
          { opacity: 0, y: 24, scale: 0.96 },
          { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'expo.out' },
          '-=0.5'
        );
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const hero = containerRef.current;
    if (!hero || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const updateParallax = () => {
      const progress = Math.min(window.scrollY / Math.max(hero.offsetHeight * 0.52, 1), 1);
      gsap.set(hero, {
        opacity: 1 - progress * 0.34,
        scale: 1 - progress * 0.035,
        y: progress * 64,
      });
    };

    updateParallax();
    window.addEventListener('scroll', updateParallax, { passive: true });
    return () => window.removeEventListener('scroll', updateParallax);
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative w-full min-h-screen overflow-hidden pt-32 pb-20"
    >
      <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
        <div className="mb-5">
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.34em] text-accent-bright bg-accent/10 px-5 py-2 rounded-full border border-border-accent shadow-[0_0_40px_rgba(94,106,210,0.12)]">
            Predictive Safety Engine
          </span>
        </div>

        <h1
          ref={titleRef}
          className="text-5xl sm:text-6xl lg:text-8xl font-display font-semibold mb-8 gradient-heading leading-none"
        >
          CrowdSim
        </h1>

        <p
          ref={subtitleRef}
          className="text-base sm:text-lg lg:text-xl text-foreground-muted max-w-3xl mx-auto mb-12 font-normal leading-relaxed"
        >
          High-fidelity fluid dynamics for real-time crowd safety telemetry. 
          <span className="gradient-accent-text font-semibold"> Predict pressure, expose risk, and test mitigations </span>
          before bottlenecks become critical.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4" ref={ctaContainerRef}>
          <button
            onClick={onGetStarted}
            className="btn-neon-cyan text-base px-8 py-4 min-w-[220px]"
          >
            <Sparkles size={20} />
            Open Dashboard
            <ArrowRight size={18} />
          </button>
          
          <button
            className="btn-ghost text-base px-8 py-4 min-w-[220px]"
            onClick={onExploreModel}
          >
            <Terminal size={20} />
            Review Model
          </button>
        </div>

        <div
          ref={visualRef}
          className="pointer-events-none relative mx-auto mt-16 w-full max-w-4xl"
          aria-hidden="true"
        >
          <div className="absolute inset-x-10 top-20 h-28 rounded-full bg-accent/20 blur-[95px]" />
          <div className="relative mx-auto flex h-52 w-52 items-center justify-center sm:h-64 sm:w-64">
            <img
              src={heroImage}
              alt=""
              className="h-full w-full object-contain drop-shadow-[0_24px_70px_rgba(94,106,210,0.26)]"
            />
          </div>
          <div className="mx-auto -mt-8 grid max-w-3xl grid-cols-3 gap-3 text-left">
            {[
              ['Density', 'Fluid heatmap'],
              ['Risk', 'Pressure index'],
              ['Defense', 'AI barriers'],
            ].map(([label, value]) => (
              <div key={label} className="glass-card px-4 py-3">
                <p className="text-[10px] uppercase tracking-widest text-foreground-muted font-mono">{label}</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-foreground-muted text-[10px] font-mono font-bold tracking-[0.32em] uppercase flex flex-col items-center gap-4 opacity-70">
        <span>System Ready</span>
        <div className="w-px h-12 bg-gradient-to-b from-accent to-transparent rounded-full" />
      </div>
    </section>
  );
};
