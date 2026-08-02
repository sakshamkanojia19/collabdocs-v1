/**
 * Perceived-speed helpers for the authentication entry point.
 *
 * Signing in is a hard navigation between two code-split halves of the app. Doing
 * the work while the user is still typing means the workspace is already parsed by
 * the time credentials are accepted.
 */

let workspacePrefetched = false;

const whenIdle = (callback) => {
  if (typeof window === 'undefined') return;
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(callback, { timeout: 2000 });
  } else {
    window.setTimeout(callback, 300);
  }
};

/** Warms the chunks a successful sign-in immediately navigates into. */
export const prefetchWorkspace = () => {
  if (workspacePrefetched) return;
  workspacePrefetched = true;

  whenIdle(() => {
    import('../components/layout/WorkspaceShell').catch(() => {});
    import('../pages/Dashboard').catch(() => {});
  });
};

/**
 * Opens the connection to the API before the first credentialed request, so DNS,
 * TLS, and TCP are not paid for at submit time.
 */
export const preconnectApi = () => {
  if (typeof document === 'undefined') return;

  const target = import.meta.env.VITE_APP_BACKEND_URL;
  if (!target) return;

  let origin;
  try {
    origin = new URL(target, window.location.href).origin;
  } catch {
    return;
  }
  if (origin === window.location.origin) return;

  ['preconnect', 'dns-prefetch'].forEach((rel) => {
    if (document.head.querySelector(`link[rel="${rel}"][href="${origin}"]`)) return;
    const link = document.createElement('link');
    link.rel = rel;
    link.href = origin;
    if (rel === 'preconnect') link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
};
