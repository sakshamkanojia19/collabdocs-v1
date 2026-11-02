import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, KeyRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { clearAuthError, loginUser } from '../store/authSlice';
import { prefetchWorkspace } from '../lib/prefetch';
import AuthShell from '../components/auth/AuthShell';
import {
  Field,
  FormAlert,
  PasswordInput,
  SubmitButton
} from '../components/auth/AuthControls';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const getErrorMessage = (error) =>
  error?.error || error?.message || error?.msg || error?.errors?.[0]?.msg || null;

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

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
    if (!validate()) return;
    dispatch(loginUser({ email: email.trim(), password }));
  };

  // Clearing on edit keeps a stale failure from sitting under a corrected field.
  const onFieldChange = (setter, key) => (event) => {
    setter(event.target.value);
    if (fieldErrors[key]) setFieldErrors((current) => ({ ...current, [key]: undefined }));
    if (serverError) dispatch(clearAuthError());
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
            <KeyRound className="size-3" /> Passwords stored as one-way hashes
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3" /> Signed sessions
          </span>
        </div>
      }
    >
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

            <SubmitButton pending={submitting} pendingLabel="Signing you in…">
              Log in
            </SubmitButton>

            <div className="flex justify-end pt-1">
              <Link
                to="/forgot-password"
                className="text-caption font-semibold text-foreground underline underline-offset-4 transition-colors duration-control hover:text-primary"
              >
                Trouble logging in?
              </Link>
            </div>
          </form>
        </div>
    </AuthShell>
  );
};

export default LoginPage;
