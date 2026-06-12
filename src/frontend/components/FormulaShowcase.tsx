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
      ease: 'back.out(1.5)',
    });
  }, []);

  return (
    <section ref={containerRef} className="w-full">
      <div className="max-w-7xl mx-auto">
        
        <div className="mb-12 text-center">
          <h2 className="text-4xl font-display font-black mb-4 text-white drop-shadow-lg">
            The <span className="text-neon-cyan">Math</span> Engine
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            We didn't just guess these crowd physics. This is the raw Laplace and risk calculus running under the hood. Respect the math.
          </p>
        </div>

        {/* CSS Grid is clutch for responsive layouts */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {FORMULAS.map((formula, index) => (
            <div
              key={formula.id}
              ref={(el) => { cardsRef.current[index] = el; }}
              className="glass-card p-6 h-full flex flex-col group opacity-0 translate-y-6 hover:-translate-y-2 transition-transform duration-300"
            >
              {/* Top badge to show what category of math we're flexing */}
              <div className="mb-6">
                <span
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${
                    formula.category === 'fluid-dynamics'
                      ? 'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/30'
                      : formula.category === 'risk-assessment'
                      ? 'bg-hazard-crit/10 text-hazard-crit border-hazard-crit/30'
                      : formula.category === 'mitigation'
                      ? 'bg-neon-pink/10 text-neon-pink border-neon-pink/30'
                      : 'bg-neon-green/10 text-neon-green border-neon-green/30'
                  }`}
                >
                  {formula.category.replace('-', ' ')}
                </span>
              </div>

              <h3 className="text-xl font-display font-bold text-white mb-4 group-hover:text-neon-cyan transition-colors">
                {formula.title}
              </h3>

              {/* The actual math flex. KaTeX renders it beautifully. */}
              <div className="bg-void-950 rounded-xl p-6 mb-6 overflow-x-auto border border-white/5 shadow-inner flex-grow flex items-center justify-center">
                <div className="text-white text-lg">
                  <BlockMath>{formula.latex}</BlockMath>
                </div>
              </div>

              <p className="text-sm text-gray-300 mb-6 font-medium leading-relaxed">
                {formula.description}
              </p>

              {/* Variable legend so we aren't completely leaving non-math majors in the dark */}
              <div className="mt-auto bg-void-900/50 p-4 rounded-xl border border-white/5">
                <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-3 font-bold">Variables</p>
                {formula.variables && formula.variables.length > 0 ? (
                  <div className="space-y-2">
                    {formula.variables.map((variable, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-xs">
                        <span className="text-neon-pink font-bold bg-void-950 px-2 py-0.5 rounded border border-white/5">
                          <InlineMath>{variable.symbol}</InlineMath>
                        </span>
                        <span className="text-gray-400">{variable.meaning}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-xs italic">{formula.explanation}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
