/* ─────────────────────────────────────────────────────────────
   GSAP Animation Utilities - High-Performance Animation Engine
   ───────────────────────────────────────────────────────────── */

import gsap from 'gsap';

export const animatePageLoad = (targets: HTMLElement[]) => {
  const timeline = gsap.timeline();

  timeline
    .to('body', {
      duration: 0.8,
      background: 'radial-gradient(circle at 20% 15%, rgba(0, 217, 255, 0.12), transparent 18%), radial-gradient(circle at 80% 10%, rgba(99, 102, 241, 0.1), transparent 20%), radial-gradient(circle at 60% 90%, rgba(16, 185, 129, 0.06), transparent 18%)',
      ease: 'power2.inOut',
    }, 0)
    .to(
      targets,
      {
        duration: 0.6,
        opacity: 1,
        y: 0,
        stagger: 0.1,
        ease: 'back.out',
      },
      0.2
    );

  return timeline;
};

export const setupCardHoverAnimation = (card: HTMLElement) => {
  card.addEventListener('mouseenter', () => {
    gsap.to(card, {
      duration: 0.3,
      scale: 1.02,
      y: -6,
      boxShadow: '0 24px 60px rgba(0, 217, 255, 0.16)',
      ease: 'power2.out',
    });
  });

  card.addEventListener('mouseleave', () => {
    gsap.to(card, {
      duration: 0.3,
      scale: 1,
      y: 0,
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.16)',
      ease: 'power2.out',
    });
  });
};

export const setupMagneticHover = (element: HTMLElement, strength = 18) => {
  const handleMove = (event: MouseEvent) => {
    const rect = element.getBoundingClientRect();
    const offsetX = event.clientX - rect.left - rect.width / 2;
    const offsetY = event.clientY - rect.top - rect.height / 2;
    const x = Math.max(Math.min(offsetX / 4, strength), -strength);
    const y = Math.max(Math.min(offsetY / 4, strength), -strength);

    gsap.to(element, {
      x,
      y,
      duration: 0.35,
      ease: 'power3.out',
    });
  };

  const handleLeave = () => {
    gsap.to(element, {
      x: 0,
      y: 0,
      duration: 0.35,
      ease: 'power3.out',
    });
  };

  element.addEventListener('mousemove', handleMove);
  element.addEventListener('mouseleave', handleLeave);

  return () => {
    element.removeEventListener('mousemove', handleMove);
    element.removeEventListener('mouseleave', handleLeave);
  };
};

export const setupButtonRipple = (button: HTMLElement) => {
  button.addEventListener('click', (e: MouseEvent) => {
    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ripple = document.createElement('span');
    ripple.style.position = 'absolute';
    ripple.style.pointerEvents = 'none';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.style.width = '0';
    ripple.style.height = '0';
    ripple.style.borderRadius = '50%';
    ripple.style.backgroundColor = 'rgba(255, 255, 255, 0.35)';

    button.style.position = 'relative';
    button.style.overflow = 'hidden';
    button.appendChild(ripple);

    gsap.to(ripple, {
      duration: 0.6,
      width: '300px',
      height: '300px',
      left: x - 150,
      top: y - 150,
      opacity: 0,
      ease: 'power2.out',
      onComplete: () => ripple.remove(),
    });
  });
};
