import { useEffect, useState } from 'react';
import AuthShowcase from './AuthShowcase';
import CollabDocsLogo from '../brand/CollabDocsLogo';

const SHOWCASE_QUERY = '(min-width: 1024px)';

/**
 * Reads the breakpoint synchronously on the first render so the brand panel is
 * never mounted and then thrown away — on phones its markup is never created.
 */
const useShowcaseVisible = () => {
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(SHOWCASE_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const query = window.matchMedia(SHOWCASE_QUERY);
    const onChange = (event) => setVisible(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return visible;
};

/**
 * Wise-style auth layout: a bold brand panel on the left, and a calm centered
 * form column on the right — centered logo, display headline, and an inline
 * account-switch line (`description`) directly under it.
 */
const AuthShell = ({ eyebrow, title, description, children, footer }) => {
  const showcaseVisible = useShowcaseVisible();

  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="grid min-h-svh lg:grid-cols-[minmax(420px,0.9fr)_minmax(560px,1.1fr)]">
        {showcaseVisible && <AuthShowcase />}

        <section className="flex items-center justify-center px-5 py-10 sm:px-10">
          <div className="w-full max-w-[440px]">
            <div className="flex justify-center">
              <CollabDocsLogo />
            </div>

            {eyebrow && (
              <p className="mt-8 text-center text-meta font-semibold uppercase tracking-[0.18em] text-primary">
                {eyebrow}
              </p>
            )}

            <h1 className="mt-7 text-center text-title-lg font-bold tracking-tight sm:text-display">
              {title}
            </h1>

            {description && (
              <div className="mt-3 text-center text-body-lg text-muted-foreground">
                {description}
              </div>
            )}

            <div className="mt-8">{children}</div>

            <div className="mt-8 border-t border-border/70 pt-5">
              {footer || (
                <p className="text-center text-meta leading-4 text-muted-foreground">
                  Protected by encrypted transport and workspace-level access controls.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default AuthShell;
