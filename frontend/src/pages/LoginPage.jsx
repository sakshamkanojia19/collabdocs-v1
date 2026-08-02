import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, KeyRound, Mail } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { clearAuthError, loginUser } from '../store/authSlice';
import { prefetchWorkspace } from '../lib/prefetch';
import AuthShell from '../components/auth/AuthShell';
import {
  AuthDivider,
  Field,
  FormAlert,
  FormNotice,
  PasswordInput,
  SocialButtons,
  SubmitButton
} from '../components/auth/AuthControls';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const getErrorMessage = (error) =>
  error?.error || error?.message || error?.msg || error?.errors?.[0]?.msg || null;

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({});
  const [notice, setNotice] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { submitting, isAuthenticated, error } = useSelector((state) => state.auth);
  const emailRef = useRef(null);
  const serverError = getErrorMessage(error);

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  // The workspace chunks load while the user is still typing, so a successful
  // sign-in navigates without waiting on the network.
  useEffect(() => {
    prefetchWorkspace();
    emailRef.current?.focus();
  }, []);

  const validate = () => {
    const next = {};
    if (!email.trim()) next.email = 'Enter your work email.';
    else if (!EMAIL_PATTERN.test(email.trim())) next.email = 'That email address looks incomplete.';
    if (!password) next.password = 'Enter your password.';
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setNotice('');
    if (!validate()) return;
    dispatch(loginUser({ email: email.trim(), password, rememberDevice }));
  };

  // Clearing on edit keeps a stale failure from sitting under a corrected field.
  const onFieldChange = (setter, key) => (event) => {
    setter(event.target.value);
    if (fieldErrors[key]) setFieldErrors((current) => ({ ...current, [key]: undefined }));
    if (serverError) dispatch(clearAuthError());
  };

  const handleMagicLink = () => {
    if (!EMAIL_PATTERN.test(email.trim())) {
      setFieldErrors((current) => ({
        ...current,
        email: 'Enter your work email first, then request a sign-in link.'
      }));
      emailRef.current?.focus();
      return;
    }
    setNotice('');
    setMagicLinkSent(true);
  };

  return (
    <AuthShell
      title="Welcome back."
      description={
        <>
          New to CollabDocs?{' '}
          <Link
            to="/signup"
            className="font-semibold text-primary underline underline-offset-4 transition-colors duration-control hover:text-primary/80"
          >
            Sign up
          </Link>
        </>
      }
      footer={
        <div className="flex items-center justify-center gap-5 text-meta font-medium text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <KeyRound className="size-3" /> 2FA ready
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3" /> Session protected
          </span>
        </div>
      }
    >
      {magicLinkSent ? (
        <div className="auth-enter rounded-2xl border border-success/25 bg-success-soft/70 p-6 text-center">
          <span className="mx-auto grid size-11 place-items-center rounded-full bg-card text-success shadow-raised">
            <Mail className="size-5" />
          </span>
          <h2 className="mt-4 text-body-lg font-semibold">Check your inbox</h2>
          <p className="mt-1.5 text-caption text-muted-foreground">
            If <strong className="font-semibold text-foreground">{email}</strong> belongs to a
            workspace, a secure sign-in link will arrive shortly.
          </p>
          <button
            type="button"
            onClick={() => setMagicLinkSent(false)}
            className="mt-5 text-caption font-semibold text-primary transition-colors duration-control hover:text-primary/80"
          >
            Use password instead
          </button>
        </div>
      ) : (
        <div className="auth-enter">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Field
              ref={emailRef}
              id="email"
              label="Your email address"
              type="email"
              inputMode="email"
              autoComplete="username email"
              autoCapitalize="none"
              spellCheck="false"
              enterKeyHint="next"
              placeholder="you@company.com"
              value={email}
              onChange={onFieldChange(setEmail, 'email')}
              error={fieldErrors.email}
              disabled={submitting}
            />

            <Field id="password" label="Your password" error={fieldErrors.password}>
              {({ id, errorId, invalid }) => (
                <PasswordInput
                  id={id}
                  autoComplete="current-password"
                  enterKeyHint="go"
                  placeholder="Enter your password"
                  value={password}
                  onChange={onFieldChange(setPassword, 'password')}
                  error={invalid}
                  describedBy={invalid ? errorId : undefined}
                  disabled={submitting}
                />
              )}
            </Field>

            {serverError && <FormAlert>{serverError}</FormAlert>}
            {notice && <FormNotice tone="warning">{notice}</FormNotice>}

            <SubmitButton pending={submitting} pendingLabel="Signing you in…">
              Log in
            </SubmitButton>

            <div className="flex items-center justify-between gap-3 pt-1">
              <label className="flex w-fit cursor-pointer items-center gap-2.5 text-caption text-muted-foreground">
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(event) => setRememberDevice(event.target.checked)}
                  className="auth-checkbox"
                  disabled={submitting}
                />
                Remember me
              </label>
              <Link
                to="/forgot-password"
                className="text-caption font-semibold text-foreground underline underline-offset-4 transition-colors duration-control hover:text-primary"
              >
                Trouble logging in?
              </Link>
            </div>
          </form>

          <div className="my-6">
            <AuthDivider>Or log in with</AuthDivider>
          </div>

          <SocialButtons
            disabled={submitting}
            onUnavailable={() =>
              setNotice(
                'Single sign-on becomes available once your workspace administrator configures it.'
              )
            }
          />

          <button
            type="button"
            onClick={handleMagicLink}
            disabled={submitting}
            className="auth-ghost-button mt-4"
          >
            <Mail className="size-3.5" />
            Email me a sign-in link
          </button>
        </div>
      )}
    </AuthShell>
  );
};

export default LoginPage;
