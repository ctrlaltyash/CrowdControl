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
  const ctaRef = useRef<HTMLButtonElement>(null);

  // GSAP animation hook. This is what gives us the buttery entrance.
  // It's literally giving main character energy.
  useEffect(() => {
    const ctx = gsap.context(() => {
      const timeline = gsap.timeline();

      // Fade in the container, it's lookin' clean.
      timeline.fromTo(
        containerRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.5 }
      );

      // Slide up the title with some swagger. Total rizz.
      if (titleRef.current) {
        timeline.fromTo(
          titleRef.current,
          { opacity: 0, y: 40 },
          { opacity: 1, y: 0, duration: 0.8, ease: 'back.out(1.5)' }
        );
      }

      // Subtitle sneaks in right after. It's lowkey important.
      if (subtitleRef.current) {
        timeline.fromTo(
          subtitleRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' },
          '-=0.6' // Offset so it overlaps the title animation
        );
      }

      // The CTA button pops in. Click it or u mid.
      if (ctaRef.current) {
        timeline.fromTo(
          ctaRef.current,
          { opacity: 0, scale: 0.8 },
          { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(2)' },
          '-=0.2'
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
      className="relative w-full min-h-screen flex flex-col items-center justify-center overflow-hidden pt-20"
    >
      {/* Background glow orbs because solid colors are mid */}
      {/* These colors are lowkey fire. */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[20%] left-[20%] w-[500px] h-[500px] bg-neon-pink/10 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[10%] right-[15%] w-[600px] h-[600px] bg-neon-cyan/10 rounded-full blur-[150px] mix-blend-screen" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* The big boy title. It's the main attraction. */}
        <h1
          ref={titleRef}
          className="text-6xl sm:text-7xl lg:text-8xl font-display font-black tracking-tighter mb-8 text-white drop-shadow-2xl"
        >
          Predict.<br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-pink via-neon-purple to-neon-cyan animate-shimmer">
            Prevent. Protect.
          </span>
        </h1>

        {/* The lore / explanation. Don't skip dis part. */}
        <p
          ref={subtitleRef}
          className="text-lg sm:text-2xl text-gray-400 max-w-3xl mx-auto mb-12 font-medium leading-relaxed"
        >
          High-fidelity fluid dynamics engine for real-time crowd safety telemetry. 
          Identify crush vectors before they happen with our predictive AI mitigation matrix.
          DIs is the future of infrastructure safety.
        </p>

        {/* Call to Actions. Choose your fighter. */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <button
            ref={ctaRef}
            onClick={onGetStarted}
            className="btn-neon-pink text-lg px-20 py-5 flex items-center gap-5 w-full sm:w-auto"
          >
            <Sparkles size={30} />
            Initialize Engine
          </button>
          
          <button className="btn-ghost text-lg px-20 py-5 flex items-center gap-5 w-full sm:w-auto">
            <Terminal size={24} />
            View Docs
          </button>
        </div>
      </div>
      
      {/* Scroll hint at the bottom. Keep it movin'. */}
      <div className="absolute bottom-12 text-gray-500 text-sm font-semibold tracking-widest uppercase flex flex-col items-center gap-3 animate-bounce">
        <span>System Ready</span>
        <div className="w-1 h-8 bg-gradient-to-b from-neon-cyan to-transparent rounded-full" />
      </div>
    </section>
  );
};

