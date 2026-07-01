// The math that makes the magic happen. Big brain energy only.
// If you don't know calculus, just smile and nod.
import { useEffect, useRef } from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import gsap from 'gsap';
import { FORMULAS } from '../utils/mockData';
import 'katex/dist/katex.min.css';

export const FormulaShowcase: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  // Pop in the container
  useEffect(() => {
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }
    );
  }, []);

  // Stagger the cards so they cascade in
  useEffect(() => {
    gsap.to(cardsRef.current, {
      opacity: 1,
      y: 0,
      duration: 0.6,
      stagger: 0.1,
      ease: 'expo.out',
    });
  }, []);

  return (
    <section ref={containerRef} className="w-full">
      <div className="max-w-7xl mx-auto">
        
        <div className="mb-16 text-center">
          <h2 className="text-4xl sm:text-5xl font-display font-semibold mb-6 gradient-heading tracking-tight">
            The <span className="gradient-accent-text">Core</span> Calculus
          </h2>
          <p className="text-foreground-muted max-w-2xl mx-auto text-lg font-normal leading-relaxed">
            Predictive analytics powered by high-fidelity fluid dynamics and nonlinear transport models.
          </p>
        </div>

        {/* CSS Grid is clutch for responsive layouts */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {FORMULAS.map((formula, index) => (
            <div
              key={formula.id}
              ref={(el) => { cardsRef.current[index] = el; }}
              className="glass-card p-8 h-full flex flex-col group opacity-0 translate-y-6 hover:-translate-y-1 transition-all duration-300"
            >
              {/* Top badge to show what category of math we're flexing */}
              <div className="mb-8">
                <span
                  className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.25em] border ${
                    formula.category === 'fluid-dynamics'
                      ? 'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/20'
                      : formula.category === 'risk-assessment'
                      ? 'bg-hazard-crit/10 text-hazard-crit border-hazard-crit/20'
                      : formula.category === 'mitigation'
                      ? 'bg-neon-pink/10 text-neon-pink border-neon-pink/20'
                      : 'bg-neon-green/10 text-neon-green border-neon-green/20'
                  }`}
                >
                  {formula.category.replace('-', ' ')}
                </span>
              </div>

              <h3 className="text-2xl font-display font-semibold text-white mb-6 group-hover:text-accent-bright transition-colors tracking-tight">
                {formula.title}
              </h3>

              {/* The actual math flex. KaTeX renders it beautifully. */}
              <div className="bg-background-deep rounded-2xl p-6 mb-8 overflow-x-auto border border-border-default shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] flex-grow flex items-center justify-center min-h-[140px]">
                <div className="text-white text-xl">
                  <BlockMath>{formula.latex}</BlockMath>
                </div>
              </div>

              <p className="text-sm text-foreground-muted mb-8 font-medium leading-relaxed">
                {formula.description}
              </p>

              {/* Variable legend */}
              <div className="mt-auto bg-background-base/60 p-5 rounded-2xl border border-border-default">
                <p className="text-[9px] uppercase tracking-[0.24em] text-foreground-muted mb-4 font-mono font-bold">Nomenclature</p>
                {formula.variables && formula.variables.length > 0 ? (
                  <div className="space-y-3">
                    {formula.variables.map((variable, idx) => (
                      <div key={idx} className="flex items-center gap-4 text-xs">
                        <span className="text-accent-bright font-black bg-background-base px-3 py-1 rounded-lg border border-border-default min-w-[40px] text-center">
                          <InlineMath>{variable.symbol}</InlineMath>
                        </span>
                        <span className="text-foreground-muted font-medium">{variable.meaning}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-foreground-muted text-xs italic">{formula.explanation}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
