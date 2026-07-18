/* ─────────────────────────────────────────────────────────────
   Formula Showcase Component - Mathematical Beauty Display
   ───────────────────────────────────────────────────────────── */

import { useEffect, useRef } from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import gsap from 'gsap';
import { FORMULAS } from '../utils/mockData';
import 'katex/dist/katex.min.css';

interface FormulaShowcaseProps {
  title?: string;
  subtitle?: string;
}

export const FormulaShowcase: React.FC<FormulaShowcaseProps> = ({
  title = 'Mathematical Framework',
  subtitle = 'Core equations powering our simulation engine',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    // Animate container on mount
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }
    );
  }, []);

  useEffect(() => {
    // Stagger cards animation
    gsap.to(cardsRef.current, {
      opacity: 1,
      y: 0,
      duration: 0.6,
      stagger: 0.1,
      ease: 'back.out',
    });
  }, []);

  useEffect(() => {
    // Setup basic hover state for each card
    cardsRef.current.forEach((card) => {
      if (card) {
        card.addEventListener('mouseenter', () => card.classList.add('hovered'));
        card.addEventListener('mouseleave', () => card.classList.remove('hovered'));
      }
    });
  }, []);

  return (
    <section
      ref={containerRef}
      className="w-full bg-gradient-to-b from-obsdian-900 to-obsdian-950 py-16 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-center animate-fadeInDown">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gradient-indigo">
            {title}
          </h2>
          <p className="text-text-secondary max-w-2xl mx-auto">{subtitle}</p>
        </div>

        {/* Formula Cards Grid - Responsive Flex Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FORMULAS.map((formula, index) => (
            <div
              key={formula.id}
              ref={(el) => { cardsRef.current[index] = el; }}
              className="card-premium p-6 h-full flex flex-col cursor-pointer group overflow-hidden"
            >
              {/* Category Badge */}
              <div className="flex items-center gap-2 mb-4">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                    formula.category === 'fluid-dynamics'
                      ? 'bg-indigo-electric/20 text-indigo-electric'
                      : formula.category === 'risk-assessment'
                      ? 'bg-red-500/20 text-red-400'
                      : formula.category === 'mitigation'
                      ? 'bg-emerald-math/20 text-emerald-math'
                      : 'bg-cyan-cyber/20 text-cyan-cyber'
                  }`}
                >
                  {formula.category.replace('-', ' ')}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-lg font-semibold text-text-primary mb-4 group-hover:text-indigo-glow transition-colors">
                {formula.title}
              </h3>

              {/* Formula Display */}
              <div className="bg-obsdian-900/50 rounded-lg p-4 mb-4 overflow-x-auto border border-indigo-glow/10 flex-grow">
                <div className="text-center min-w-max">
                  <BlockMath>{formula.latex}</BlockMath>
                </div>
              </div>

              {/* Main Description */}
              <p className="text-sm text-text-secondary mb-4">{formula.description}</p>

              {/* Variables (Hidden, Shown on Hover) */}
              <div
                data-explanation
                className="opacity-0 translate-y-2 transition-all bg-indigo-electric/10 rounded-lg p-3 border border-indigo-glow/20 text-xs space-y-2"
              >
                <p className="font-semibold text-indigo-glow mb-2">Variables:</p>
                {formula.variables && formula.variables.length > 0 ? (
                  <div className="space-y-1">
                    {formula.variables.map((variable, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-indigo-glow font-semibold min-w-fit">
                          <InlineMath>{variable.symbol}</InlineMath>
                        </span>
                        <span className="text-text-secondary">{variable.meaning}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-text-muted italic">{formula.explanation}</p>
                )}
              </div>

              {/* Explanation (Always visible) */}
              <div className="mt-4 p-3 bg-emerald-math/5 rounded-lg border border-emerald-math/20">
                <p className="text-xs text-text-secondary italic">
                  {formula.explanation}
                </p>
              </div>

              {/* Hover Indicator */}
              <div className="mt-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs text-indigo-glow font-semibold tracking-wider">
                  HOVER FOR DETAILS ↑
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center">
          <p className="text-text-muted text-sm">
            These equations form the mathematical foundation of our crowd dynamics
            simulation and safety analytics platform.
          </p>
        </div>
      </div>
    </section>
  );
};
