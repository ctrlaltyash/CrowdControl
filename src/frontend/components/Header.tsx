import { useEffect, useRef } from 'react';
import { Menu, X, ShieldAlert, Cpu } from 'lucide-react';
import gsap from 'gsap';

interface HeaderProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onMenuToggle: () => void;
  isMenuOpen: boolean;
}

const HEADER_TABS = [
  { id: 'canvas', label: 'Sim Canvas' },
  { id: 'formulas', label: 'Math Engine' },
  { id: 'analytics', label: 'Telemetry' },
  { id: 'alerts', label: 'Threats' },
  { id: 'export', label: 'Data Dump' },
];

export const Header: React.FC<HeaderProps> = ({ activeSection, onSectionChange, onMenuToggle, isMenuOpen }) => {
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (headerRef.current) {
        gsap.fromTo(
          headerRef.current,
          { y: -100, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }
        );
      }
    }, headerRef);
    
    return () => ctx.revert();
  }, []);

  return (
    <header
      data-header
      ref={headerRef}
      className="fixed top-0 left-0 right-0 z-50 border-b border-border-default bg-background-base/82 shadow-glass backdrop-blur-2xl"
    >
      <div className="max-w-screen-2xl mx-auto px-6 h-20 flex items-center justify-between">
        <div 
          className="flex items-center gap-4 cursor-pointer group"
          onClick={() => onSectionChange('hero')}
        >
          <div className="w-11 h-11 rounded-xl bg-white/[0.05] border border-border-default flex items-center justify-center group-hover:border-border-accent transition-colors shadow-accent">
            <ShieldAlert size={22} className="text-accent-bright" />
          </div>
          <div>
            <h1 className="text-xl font-display font-semibold text-foreground tracking-normal">
              Crowd<span className="text-accent-bright">Sim</span>
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-foreground-muted font-mono">
              v4.2 Engine
            </p>
          </div>
        </div>

        <nav className="hidden lg:flex items-center gap-1.5 bg-white/[0.04] p-1.5 rounded-xl border border-border-default shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          {HEADER_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onSectionChange(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeSection === tab.id 
                  ? 'bg-accent/[0.18] text-white shadow-[0_0_0_1px_rgba(94,106,210,0.28),0_8px_24px_rgba(94,106,210,0.14)]' 
                  : 'text-foreground-muted hover:text-foreground hover:bg-white/[0.05]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-neon-green bg-neon-green/10 px-3 py-1.5 rounded-lg border border-neon-green/20">
            <Cpu size={14} />
            System Online
          </div>
          
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-lg bg-white/[0.05] border border-border-default text-foreground hover:bg-white/[0.08] transition-colors"
            aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
    </header>
  );
};
