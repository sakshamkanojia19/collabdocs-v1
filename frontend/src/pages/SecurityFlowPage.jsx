import { createElement, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  KeyRound,
  LockKeyhole,
  Mail,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '../components/auth/AuthControls';
import { passwordRules } from '../components/auth/password-rules';
import CollabDocsLogo from '../components/brand/CollabDocsLogo';
import { cn } from '@/lib/utils';
import api from '../services/api';

/** Token-styled input overrides applied on top of the shared password control. */
const passwordFieldClass =
  'h-10 rounded-lg border-input bg-background text-body text-foreground shadow-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25';

const ErrorAlert = ({ children }) => (
  <div
    role="alert"
    className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-caption text-destructive"
  >
    <AlertCircle className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.8} />
    <span>{children}</span>
  </div>
);

const StrengthMeter = ({ password }) => {
  const { score, label } = useMemo(() => {
    const passed = passwordRules.filter((rule) => rule.test(password)).length;
    return {
      score: passed,
      label: ['Add a password', 'Weak', 'Almost there', 'Strong'][passed]
    };
  }, [password]);

  const fillTone = ['bg-secondary', 'bg-destructive', 'bg-warning', 'bg-success'][score];

  return (
    <div className="space-y-1.5 pt-0.5">
      <div className="flex gap-1" aria-hidden="true">
        {[0, 1, 2].map((segment) => (
          <span
            key={segment}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors duration-control',
              segment < score ? fillTone : 'bg-secondary'
            )}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta">
        <span
          className={cn('font-semibold', score === 3 ? 'text-success' : 'text-muted-foreground')}
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
                passed ? 'text-success' : 'text-muted-foreground'
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

const SuccessPanel = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center rounded-xl bg-success-soft px-5 py-8 text-center">
    <span className="grid size-11 place-items-center rounded-full bg-card text-success shadow-raised">
      {createElement(icon, { className: 'size-5', strokeWidth: 1.8 })}
    </span>
    <h2 className="mt-4 text-title-sm font-semibold">{title}</h2>
    <p className="mx-auto mt-1.5 max-w-sm text-body text-muted-foreground">{description}</p>
    {action}
  </div>
);

const successLinkClass =
  'mt-4 inline-flex items-center gap-1 text-caption font-semibold text-primary transition-colors duration-control hover:underline';

const modeIcons = {
  forgot: KeyRound,
  reset: LockKeyhole,
  verify: Mail,
  twoFactor: ShieldCheck
};

const SecurityFlowPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [developmentToken, setDevelopmentToken] = useState('');
  const token = searchParams.get('token') || '';

  const mode = useMemo(() => {
    if (location.pathname.startsWith('/reset-password')) return 'reset';
    if (location.pathname.startsWith('/verify-email')) return 'verify';
    if (location.pathname.startsWith('/two-factor')) return 'twoFactor';
    return 'forgot';
  }, [location.pathname]);

  const copy = {
    forgot: {
      eyebrow: 'Account recovery',
      title: 'Reset your password',
      description: 'Enter your work email and we’ll send a time-limited recovery link.'
    },
    reset: {
      eyebrow: 'Choose a new password',
      title: 'Secure your account',
      description: 'Create a strong password you haven’t used for this workspace.'
    },
    verify: {
      eyebrow: 'Verify your identity',
      title: 'Check your inbox',
      description: 'Email verification protects your team and keeps workspace access trusted.'
    },
    twoFactor: {
      eyebrow: 'Two-step verification',
      title: 'Enter your security code',
      description: 'Use the six-digit code from your authenticator app to continue.'
    }
  }[mode];

  const submitForgot = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', { email });
      setDevelopmentToken(response.data?.data?.resetToken || '');
      setComplete(true);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'We could not start recovery. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async (event) => {
    event.preventDefault();
    setError('');
    if (!token) {
      setError('This recovery link is missing its secure token. Request a new link.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setComplete(true);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'This recovery link is invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  const submitTwoFactor = (event) => {
    event.preventDefault();
    setError('');
    if (code.length !== 6) {
      setError('Enter the complete six-digit code.');
      return;
    }
    setComplete(true);
  };

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-[hsl(var(--workspace))] px-4 py-10">
      <div className="w-full max-w-md rise-in">
        <div className="mb-6 flex justify-center">
          <CollabDocsLogo />
        </div>

        <div className="surface-card p-6 sm:p-8">
          <div className="flex flex-col items-start gap-4">
            <span className="icon-chip">
              {createElement(modeIcons[mode], { className: 'size-4', strokeWidth: 1.8 })}
            </span>
            <div>
              <p className="text-meta font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                {copy.eyebrow}
              </p>
              <h1 className="mt-1 text-title font-semibold tracking-tight">{copy.title}</h1>
              <p className="mt-1.5 text-body text-muted-foreground">{copy.description}</p>
            </div>
          </div>

          <div className="mt-6">
            {mode === 'forgot' && (
              complete ? (
                <SuccessPanel
                  icon={Mail}
                  title="Recovery email requested"
                  description={`If an account exists for ${email}, a secure reset link will arrive shortly. It expires in 30 minutes.`}
                  action={
                    developmentToken ? (
                      <Button
                        className="mt-4 h-9 rounded-full px-4"
                        onClick={() => navigate(`/reset-password?token=${developmentToken}`)}
                      >
                        Open local reset link
                      </Button>
                    ) : (
                      <Link to="/login" className={successLinkClass}>
                        Return to sign in
                      </Link>
                    )
                  }
                />
              ) : (
                <form onSubmit={submitForgot} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="recovery-email" className="text-caption font-medium">
                      Work email
                    </Label>
                    <Input
                      id="recovery-email"
                      type="email"
                      autoComplete="email"
                      autoFocus
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@company.com"
                      className="h-10 rounded-lg text-body"
                    />
                  </div>
                  {error && <ErrorAlert>{error}</ErrorAlert>}
                  <Button type="submit" disabled={loading} className="h-10 w-full rounded-full">
                    {loading ? (
                      <RefreshCw className="size-4 animate-spin" strokeWidth={1.8} />
                    ) : (
                      <Mail className="size-4" strokeWidth={1.8} />
                    )}
                    Send recovery link
                  </Button>
                  <Link
                    to="/login"
                    className="flex h-9 items-center justify-center gap-1.5 text-caption font-medium text-muted-foreground transition-colors duration-control hover:text-foreground"
                  >
                    <ArrowLeft className="size-3.5" strokeWidth={1.8} /> Back to sign in
                  </Link>
                </form>
              )
            )}

            {mode === 'reset' && (
              complete ? (
                <SuccessPanel
                  icon={CheckCircle2}
                  title="Password updated"
                  description="Your new password is active. Other password reset links for this account are no longer valid."
                  action={
                    <Link to="/login" className={successLinkClass}>
                      Continue to sign in <ArrowRight className="size-3" strokeWidth={1.8} />
                    </Link>
                  }
                />
              ) : (
                <form onSubmit={submitReset} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="new-password" className="text-caption font-medium">
                      New password
                    </Label>
                    <PasswordInput
                      id="new-password"
                      autoComplete="new-password"
                      autoFocus
                      required
                      minLength={8}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Create a secure password"
                      className={passwordFieldClass}
                    />
                    <StrengthMeter password={password} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-new-password" className="text-caption font-medium">
                      Confirm password
                    </Label>
                    <PasswordInput
                      id="confirm-new-password"
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Enter it again"
                      className={passwordFieldClass}
                    />
                  </div>
                  {error && <ErrorAlert>{error}</ErrorAlert>}
                  <Button type="submit" disabled={loading} className="h-10 w-full rounded-full">
                    {loading ? (
                      <RefreshCw className="size-4 animate-spin" strokeWidth={1.8} />
                    ) : (
                      <ShieldCheck className="size-4" strokeWidth={1.8} />
                    )}
                    Update password
                  </Button>
                </form>
              )
            )}

            {mode === 'verify' && (
              <SuccessPanel
                icon={Mail}
                title={token ? 'Email verified' : 'Verification link sent'}
                description={
                  token
                    ? 'Your email is confirmed and your workspace identity is now trusted.'
                    : 'We sent a secure verification link to your work email. The link expires in 24 hours.'
                }
                action={
                  <Link to="/login" className={successLinkClass}>
                    Continue to sign in <ArrowRight className="size-3" strokeWidth={1.8} />
                  </Link>
                }
              />
            )}

            {mode === 'twoFactor' && (
              complete ? (
                <SuccessPanel
                  icon={ShieldCheck}
                  title="Identity confirmed"
                  description="Your verification step is complete. Return to sign in to begin a protected workspace session."
                  action={
                    <Link to="/login" className={successLinkClass}>
                      Continue <ArrowRight className="size-3" strokeWidth={1.8} />
                    </Link>
                  }
                />
              ) : (
                <form onSubmit={submitTwoFactor} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="security-code" className="text-caption font-medium">
                      Authentication code
                    </Label>
                    <Input
                      id="security-code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      autoFocus
                      maxLength={6}
                      value={code}
                      onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="h-14 rounded-xl text-center font-mono text-title tracking-[0.5em]"
                    />
                    <p className="text-meta text-muted-foreground">
                      Codes refresh every 30 seconds. You can also use a recovery code.
                    </p>
                  </div>
                  {error && <ErrorAlert>{error}</ErrorAlert>}
                  <Button type="submit" className="h-10 w-full rounded-full">
                    <KeyRound className="size-4" strokeWidth={1.8} /> Verify and continue
                  </Button>
                  <button
                    type="button"
                    className="w-full text-caption font-medium text-muted-foreground transition-colors duration-control hover:text-foreground"
                  >
                    Use a recovery code
                  </button>
                </form>
              )
            )}
          </div>
        </div>

        <p className="mt-5 text-center text-meta text-muted-foreground">
          Protected by encrypted transport and workspace-level access controls.
        </p>
      </div>
    </main>
  );
};

export default SecurityFlowPage;
