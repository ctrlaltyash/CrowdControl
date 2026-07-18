import { useEffect, useRef } from 'react';
import { Menu, X, ShieldAlert, Cpu } from 'lucide-react';
import gsap from 'gsap';

/**
 * Properties for the Header component.
 */
interface HeaderProps {
  /** Callback invoked when the user selects a different application section. */
  onSectionChange: (section: string) => void;
  /** Callback invoked to toggle the visibility of the primary navigation menu. */
  onMenuToggle: () => void;
  /** Indicates whether the primary navigation menu is currently visible. */
  isMenuOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onSectionChange, onMenuToggle, isMenuOpen }) => {
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
      <div className="mx-auto flex h-20 max-w-screen-2xl items-center justify-between px-4 sm:px-6">
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => onSectionChange('canvas')}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border-default bg-white/[0.05] shadow-accent transition-colors group-hover:border-border-accent">
            <ShieldAlert size={20} className="text-accent-bright" />
          </div>
          <div>
            <h1 className="text-lg font-display font-semibold text-foreground tracking-normal">
              Crowd<span className="text-accent-bright">Sim</span>
            </h1>
            <p className="text-[9px] uppercase tracking-[0.32em] text-foreground-muted font-mono">
              Operational UI
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 rounded-lg border border-neon-green/20 bg-neon-green/10 px-3 py-1.5 text-[11px] font-mono text-neon-green">
            <Cpu size={14} />
            System Online
          </div>

          <button
            onClick={onMenuToggle}
            className="h-10 w-10 rounded-lg border border-border-default bg-white/[0.05] p-2 text-foreground transition-colors hover:bg-white/[0.08]"
            aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
};
