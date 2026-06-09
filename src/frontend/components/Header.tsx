// This is our navbar. Floating at the top, keeping us grounded.
import { useEffect, useRef } from 'react';
import { Menu, X, ShieldAlert, Cpu } from 'lucide-react';
import gsap from 'gsap';

interface HeaderProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onMenuToggle: () => void;
  isMenuOpen: boolean;
}

// Hardcoding the routes. Array mapping > repeating code.
const HEADER_TABS = [
  { id: 'canvas', label: 'Sim Canvas' },
  { id: 'formulas', label: 'Math Engine' },
  { id: 'analytics', label: 'Telemetry' },
  { id: 'alerts', label: 'Threats' },
  { id: 'export', label: 'Data Dump' },
];

export const Header: React.FC<HeaderProps> = ({ activeSection, onSectionChange, onMenuToggle, isMenuOpen }) => {
  const headerRef = useRef<HTMLDivElement>(null);

  // Smooth drop-in animation when the app loads
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
      className="fixed top-0 left-0 right-0 z-50 bg-void-950/80 backdrop-blur-2xl border-b border-white/5 shadow-glass"
    >
      <div className="max-w-screen-2xl mx-auto px-6 h-20 flex items-center justify-between">
        
        {/* Brand Logo Area */}
        <div 
          className="flex items-center gap-4 cursor-pointer group"
          onClick={() => onSectionChange('hero')}
        >
          <div className="w-12 h-12 rounded-xl bg-void-900 border border-white/10 flex items-center justify-center group-hover:border-neon-cyan transition-colors shadow-glow-cyan">
            <ShieldAlert size={24} className="text-neon-cyan" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-white tracking-wide">
              Crowd<span className="text-neon-cyan">Sim</span>
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-mono">
              v4.2 Engine
            </p>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-2 bg-void-900/50 p-1.5 rounded-2xl border border-white/5">
          {HEADER_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onSectionChange(tab.id)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeSection === tab.id 
                  ? 'bg-neon-pink/20 text-neon-pink shadow-glow-pink' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Right side controls */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-neon-green bg-neon-green/10 px-3 py-1.5 rounded-lg border border-neon-green/20">
            <Cpu size={14} />
            System Online
          </div>
          
          {/* Mobile hamburger menu */}
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-xl bg-void-900 border border-white/10 text-white"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        
      </div>
    </header>
  );
};
