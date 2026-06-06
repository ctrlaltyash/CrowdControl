/* ─────────────────────────────────────────────────────────────
   Header Component - Premium Navigation & Branding
   ───────────────────────────────────────────────────────────── */

import { useEffect, useRef } from 'react';
import { Menu, X, Settings, Bell } from 'lucide-react';
import gsap from 'gsap';
import { setupButtonRipple, setupMagneticHover } from '../utils/gsapAnimations';

interface HeaderProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onMenuToggle: () => void;
  isMenuOpen: boolean;
}

const HEADER_TABS = [
  { id: 'canvas', label: 'Simulation' },
  { id: 'formulas', label: 'Formulas' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'export', label: 'Export' },
];

export const Header: React.FC<HeaderProps> = ({ activeSection, onSectionChange, onMenuToggle, isMenuOpen }) => {
  const headerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (headerRef.current) {
      gsap.fromTo(
        headerRef.current,
        { y: -120, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }
      );
    }
  }, []);

  useEffect(() => {
    const cleanups: Array<() => void> = [];

    buttonRefs.current.forEach((button) => {
      if (!button) return;
      setupButtonRipple(button);
      const cleanup = setupMagneticHover(button, 16);
      cleanups.push(cleanup);
    });

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return (
    <header
      data-header
      ref={headerRef}
      className="fixed top-0 left-0 right-0 z-50 border-b border-indigo-glow/15 bg-obsdian-950/85 backdrop-blur-xl shadow-glow-lg"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-3xl bg-gradient-to-br from-indigo-electric to-cyan-cyber shadow-glow-lg flex items-center justify-center text-sm font-extrabold text-white">
              CS
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">CrowdSim</p>
              <p className="text-xs text-text-muted">Stampede Prevention & Safety Analytics</p>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-2">
            {HEADER_TABS.map((tab, index) => (
              <button
                key={tab.id}
                ref={(el) => { buttonRefs.current[index] = el; }}
                onClick={() => onSectionChange(tab.id)}
                className={`nav-pill ${activeSection === tab.id ? 'bg-cyan-cyber/15 border-cyan-cyber/40 text-cyan-cyber' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button
              ref={(el) => { buttonRefs.current[HEADER_TABS.length] = el; }}
              className="btn-icon"
              aria-label="Notifications"
            >
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 shadow-glow" />
            </button>

            <button
              ref={(el) => { buttonRefs.current[HEADER_TABS.length + 1] = el; }}
              className="btn-icon hidden sm:flex"
              aria-label="Settings"
            >
              <Settings size={18} />
            </button>

            <button
              onClick={onMenuToggle}
              className="btn-icon lg:hidden"
              aria-label="Toggle navigation"
            >
              {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
