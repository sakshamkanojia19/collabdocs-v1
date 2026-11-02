import { useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Renders a product mockup at its true desktop size, then scales it down to
 * fit the container — so small screens see the same "screenshot" instead of a
 * reflowed, cramped layout. The mockup is decorative, so it is hidden from
 * assistive tech and made inert.
 */
const ScaledFrame = ({ width = 1200, height = 720, className, children }) => {
  const ref = useRef(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const update = () => setScale(Math.min(1, element.clientWidth / width));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [width]);

  return (
    <div
      ref={ref}
      className={cn('relative w-full overflow-hidden', className)}
      style={{ height: height * scale }}
    >
      <div
        aria-hidden="true"
        inert
        className="pointer-events-none absolute left-0 top-0 origin-top-left select-none"
        style={{ width, height, transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
};

export default ScaledFrame;
