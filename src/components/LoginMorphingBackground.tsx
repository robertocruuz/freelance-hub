import { useEffect, useRef } from 'react';

const LoginMorphingBackground = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const interactiveRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const interactive = interactiveRef.current;

    if (!container || !interactive) return;

    let frameId = 0;
    let curX = 0;
    let curY = 0;
    let targetX = 0;
    let targetY = 0;

    const animate = () => {
      curX += (targetX - curX) / 18;
      curY += (targetY - curY) / 18;
      interactive.style.transform = `translate3d(${Math.round(curX)}px, ${Math.round(curY)}px, 0)`;
      frameId = window.requestAnimationFrame(animate);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const bounds = container.getBoundingClientRect();
      targetX = event.clientX - bounds.left - bounds.width / 2;
      targetY = event.clientY - bounds.top - bounds.height / 2;
    };

    const handlePointerLeave = () => {
      targetX = 0;
      targetY = 0;
    };

    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerleave', handlePointerLeave);
    frameId = window.requestAnimationFrame(animate);

    return () => {
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerleave', handlePointerLeave);
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <div ref={containerRef} className="login-morph-bg">
      <svg aria-hidden="true" className="login-morph-svg">
        <defs>
          <filter id="login-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="18" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 28 -12"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>

      <div className="login-morph-blobs">
        <div className="login-morph-blob login-morph-blob-1" />
        <div className="login-morph-blob login-morph-blob-2" />
        <div className="login-morph-blob login-morph-blob-3" />
        <div className="login-morph-blob login-morph-blob-4" />
        <div className="login-morph-blob login-morph-blob-5" />
        <div className="login-morph-blob login-morph-blob-6" />
        <div className="login-morph-blob login-morph-blob-7" />
        <div ref={interactiveRef} className="login-morph-interactive" />
      </div>
    </div>
  );
};

export default LoginMorphingBackground;
