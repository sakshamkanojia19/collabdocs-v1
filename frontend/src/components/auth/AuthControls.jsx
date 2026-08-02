import { forwardRef, useId, useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, Check, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { passwordRules } from './password-rules';

export const FieldError = ({ children, id }) => (
  <p id={id} role="alert" className="flex items-start gap-1.5 text-caption text-destructive">
    <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
    <span>{children}</span>
  </p>
);

/** Page-level failure, announced and visually distinct from per-field errors. */
export const FormAlert = ({ children }) => (
  <div
    role="alert"
    className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-caption text-destructive"
  >
    <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
    <span>{children}</span>
  </div>
);

export const FormNotice = ({ children, tone = 'info' }) => (
  <p
    role="status"
    className={cn(
      'rounded-xl border px-3 py-2.5 text-caption',
      tone === 'warning'
        ? 'border-warning/30 bg-warning-soft text-warning'
        : 'border-info/30 bg-info-soft text-info'
    )}
  >
    {children}
  </p>
);

/**
 * A labelled field that owns its own error wiring. Keeping `aria-invalid` and
 * `aria-describedby` here means every screen cannot forget to connect them.
 */
export const Field = forwardRef(
  ({ label, error, hint, action, children, id: providedId, ...props }, ref) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;

    return (
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={id} className="auth-label">
            {label}
          </label>
          {action}
        </div>

        {children ? (
          children({ id, errorId, hintId, invalid: Boolean(error) })
        ) : (
          <Input
            ref={ref}
            id={id}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? errorId : hint ? hintId : undefined}
            className={cn('auth-input', error && 'auth-input-error')}
            {...props}
          />
        )}

        {error ? (
          <FieldError id={errorId}>{error}</FieldError>
        ) : hint ? (
          <p id={hintId} className="text-meta text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </div>
    );
  }
);
Field.displayName = 'Field';

/**
 * Password entry with visibility toggle and Caps Lock detection — the single most
 * common cause of a failed sign-in that the user cannot see.
 */
export const PasswordInput = forwardRef(
  ({ className, error, describedBy, id, onBlur, ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    const [capsLock, setCapsLock] = useState(false);

    const trackCapsLock = (event) => {
      if (typeof event.getModifierState === 'function') {
        setCapsLock(event.getModifierState('CapsLock'));
      }
    };

    return (
      <div className="space-y-1.5">
        <div className="relative">
          <Input
            ref={ref}
            id={id}
            type={visible ? 'text' : 'password'}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={describedBy}
            onKeyUp={trackCapsLock}
            onKeyDown={trackCapsLock}
            onBlur={(event) => {
              setCapsLock(false);
              onBlur?.(event);
            }}
            className={cn('auth-input pr-11', error && 'auth-input-error', className)}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors duration-control hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            aria-label={visible ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>

        {capsLock && (
          <p className="flex items-center gap-1.5 text-meta font-medium text-warning" role="status">
            <AlertCircle className="size-3" /> Caps Lock is on
          </p>
        )}
      </div>
    );
  }
);
PasswordInput.displayName = 'PasswordInput';

/**
 * Primary action that owns its own pending state, so the form it belongs to is
 * never replaced by a full-page spinner.
 */
export const SubmitButton = ({ pending, pendingLabel, children, className, ...props }) => (
  <button
    type="submit"
    disabled={pending}
    aria-busy={pending || undefined}
    className={cn('auth-primary-button group', className)}
    {...props}
  >
    {pending ? (
      <>
        <Loader2 className="mr-2 size-4 animate-spin" />
        {pendingLabel || 'Working…'}
      </>
    ) : (
      <>
        {children}
        <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-0.5" />
      </>
    )}
  </button>
);

export const SocialButtons = ({ onUnavailable, disabled }) => (
  <div className="grid grid-cols-2 gap-2.5">
    <button type="button" onClick={onUnavailable} disabled={disabled} className="auth-secondary-button">
      <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.8Z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.96-1.08 7.94-2.92l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.09A12 12 0 0 0 12 24Z"
        />
        <path
          fill="#FBBC05"
          d="M5.29 14.28a7.2 7.2 0 0 1 0-4.56v-3.1H1.28a12 12 0 0 0 0 10.76l4.01-3.1Z"
        />
        <path
          fill="#EA4335"
          d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.23 0 12 0A12 12 0 0 0 1.28 6.62l4.01 3.1C6.23 6.88 8.88 4.77 12 4.77Z"
        />
      </svg>
      Google
    </button>
    <button type="button" onClick={onUnavailable} disabled={disabled} className="auth-secondary-button">
      <span className="grid size-4 grid-cols-2 gap-px overflow-hidden rounded-[2px]">
        <i className="bg-[#f25022]" />
        <i className="bg-[#7fba00]" />
        <i className="bg-[#00a4ef]" />
        <i className="bg-[#ffb900]" />
      </span>
      Microsoft
    </button>
  </div>
);

export const AuthDivider = ({ children = 'or continue with email' }) => (
  <div className="flex items-center gap-3 py-1">
    <span className="h-px flex-1 bg-border" />
    <span className="text-meta font-medium uppercase tracking-[0.11em] text-muted-foreground">
      {children}
    </span>
    <span className="h-px flex-1 bg-border" />
  </div>
);

export const PasswordStrength = ({ password }) => {
  const { score, tone, label } = useMemo(() => {
    const passed = passwordRules.filter((rule) => rule.test(password)).length;
    return {
      score: passed,
      tone: ['bg-secondary', 'bg-destructive', 'bg-warning', 'bg-success'][passed],
      label: ['Add a password', 'Weak', 'Almost there', 'Strong'][passed]
    };
  }, [password]);

  return (
    <div className="space-y-2 pt-0.5">
      <div className="flex gap-1" aria-hidden="true">
        {[0, 1, 2].map((segment) => (
          <span
            key={segment}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors duration-control',
              segment < score ? tone : 'bg-secondary'
            )}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta">
        <span
          className={cn(
            'font-semibold',
            score === 3 ? 'text-success' : score === 0 ? 'text-muted-foreground' : 'text-foreground'
          )}
          aria-live="polite"
        >
          {label}
        </span>
        {passwordRules.map((rule) => {
          const passed = rule.test(password);
          return (
            <span
              key={rule.label}
              className={cn(
                'inline-flex items-center gap-1',
                passed ? 'text-success' : 'text-muted-foreground/70'
              )}
            >
              {passed ? (
                <Check className="size-2.5" />
              ) : (
                <span className="size-1 rounded-full bg-current" />
              )}
              {rule.label}
            </span>
          );
        })}
      </div>
    </div>
  );
};
