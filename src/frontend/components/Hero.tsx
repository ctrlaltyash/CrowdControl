// Fr fr, this is the main landing page of the app. Gotta make a good impression.
// Lowkey importing all the cool stuff we need for this vibe.
import { useEffect, useRef } from 'react';
import { Sparkles, Terminal } from 'lucide-react';
import gsap from 'gsap';

// Defining our props interface, no cap.
interface HeroProps {
  onGetStarted?: () => void;
}

// This is the main Hero component, it's the GOAT of landing sections.
export const Hero: React.FC<HeroProps> = ({ onGetStarted }) => {
  // Using refs to grab these elements later for some sick animations.
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const ctaContainerRef = useRef<HTMLDivElement>(null);

  // GSAP animation hook. This is what gives us the buttery entrance.
  // It's literally giving main character energy.
  useEffect(() => {
    const ctx = gsap.context(() => {
      const timeline = gsap.timeline();

      // Fade in the container, it's lookin' clean.
      timeline.fromTo(
        containerRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.8 }
      );

      // Slide up the title with some swagger. Total rizz.
      if (titleRef.current) {
        timeline.fromTo(
          titleRef.current,
          { opacity: 0, y: 60 },
          { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out' }
        );
      }

      // Subtitle sneaks in right after. It's lowkey important.
      if (subtitleRef.current) {
        timeline.fromTo(
          subtitleRef.current,
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 1, ease: 'power3.out' },
          '-=0.8'
        );
      }

      // The CTA button pops in. Click it or u mid.
      if (ctaContainerRef.current) {
        timeline.fromTo(
          ctaContainerRef.current,
          { opacity: 0, scale: 0.95 },
          { opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.7)' },
          '-=0.4'
        );
      }
    }, containerRef);

    // Clean up the animations so we don't have a messy state. Sus.
    return () => ctx.revert();
  }, []);

  return (
    // The main section wrapper. It's huge.
    <section
      ref={containerRef}
      className="relative w-full min-h-screen flex flex-col items-center justify-center overflow-hidden pt-32 pb-20"
    >
      {/* Background glow orbs because solid colors are mid */}
      {/* These colors are lowkey fire. */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[800px] h-[800px] bg-neon-pink/10 rounded-full blur-[160px] mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-15%] right-[-5%] w-[900px] h-[900px] bg-neon-cyan/10 rounded-full blur-[180px] mix-blend-screen animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute top-[30%] right-[10%] w-[400px] h-[400px] bg-neon-purple/5 rounded-full blur-[120px] mix-blend-screen" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-8 text-center">
        {/* The big boy title. It's the main attraction. */}
        <div className="mb-4">
           <span className="text-[10px] font-black uppercase tracking-[0.5em] text-neon-cyan bg-neon-cyan/10 px-6 py-2 rounded-full border border-neon-cyan/20">
             Next-Gen Safety Protocol
           </span>
        </div>
        <h1
          ref={titleRef}
          className="text-7xl sm:text-8xl lg:text-9xl font-display font-black tracking-[-0.04em] mb-12 text-white leading-[0.9]"
        >
          Predict.<br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-pink via-neon-purple to-neon-cyan animate-shimmer bg-[length:200%_auto]">
            Mitigate. Protect.
          </span>
        </h1>

        {/* The lore / explanation. Don't skip dis part. */}
        <p
          ref={subtitleRef}
          className="text-xl sm:text-2xl text-gray-400 max-w-3xl mx-auto mb-20 font-medium leading-relaxed tracking-tight"
        >
          High-fidelity fluid dynamics engine for real-time crowd safety telemetry. 
          Identify crush vectors before they happen with our predictive AI mitigation matrix.
        </p>

        {/* Call to Actions. Choose your fighter. */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-8" ref={ctaContainerRef}>
          <button
            onClick={onGetStarted}
            className="btn-neon-pink text-lg px-12 py-6 min-w-[280px]"
          >
            <Sparkles size={24} />
            Initialize Engine
          </button>
          
          <button className="btn-ghost text-lg px-12 py-6 min-w-[280px]">
            <Terminal size={24} />
            View Documentation
          </button>
        </div>
      </div>
      
      {/* Scroll hint at the bottom. Keep it movin'. */}
      <div className="absolute bottom-16 text-gray-600 text-[10px] font-black tracking-[0.4em] uppercase flex flex-col items-center gap-6 opacity-50">
        <span>System Ready</span>
        <div className="w-[1px] h-16 bg-gradient-to-b from-neon-cyan to-transparent rounded-full" />
      </div>
    </section>
  );
};

