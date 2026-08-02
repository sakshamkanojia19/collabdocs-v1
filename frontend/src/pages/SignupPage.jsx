import { useEffect, useRef, useState } from 'react';
import { ShieldCheck, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clearAuthError, registerUser } from '../store/authSlice';
import { prefetchWorkspace } from '../lib/prefetch';
import AuthShell from '../components/auth/AuthShell';
import {
  AuthDivider,
  Field,
  FormAlert,
  FormNotice,
  PasswordInput,
  PasswordStrength,
  SocialButtons,
  SubmitButton
} from '../components/auth/AuthControls';
import { isStrongPassword } from '../components/auth/password-rules';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const getErrorMessage = (error) =>
  error?.error || error?.message || error?.msg || error?.errors?.[0]?.msg || null;

const SignupPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [notice, setNotice] = useState('');

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { submitting, isAuthenticated, error } = useSelector((state) => state.auth);
  const nameRef = useRef(null);
  const serverError = getErrorMessage(error);

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    prefetchWorkspace();
    nameRef.current?.focus();
  }, []);

  const validate = () => {
    const next = {};
    if (!name.trim()) next.name = 'Tell us what to call you.';
    if (!email.trim()) next.email = 'Enter your work email.';
    else if (!EMAIL_PATTERN.test(email.trim())) next.email = 'That email address looks incomplete.';
    if (!isStrongPassword(password)) next.password = 'Meet all three password requirements.';
    if (password !== confirmPassword) next.confirmPassword = 'These passwords do not match.';
    if (!acceptedTerms) next.terms = 'Accept the Terms and Privacy Policy to continue.';
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setNotice('');
    if (!validate()) return;
    dispatch(registerUser({ name: name.trim(), email: email.trim(), password }));
  };

  const onFieldChange = (setter, key) => (event) => {
    setter(event.target.value);
    if (fieldErrors[key]) setFieldErrors((current) => ({ ...current, [key]: undefined }));
    if (serverError) dispatch(clearAuthError());
  };

  return (
    <AuthShell
      title="Create your account."
      description={
        <>
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-primary underline underline-offset-4 transition-colors duration-control hover:text-primary/80"
          >
            Log in
          </Link>
        </>
      }
      footer={
        <div className="flex items-center justify-center gap-5 text-meta font-medium text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Sparkles className="size-3" /> Free to start
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="size-3" /> No card required
          </span>
        </div>
      }
    >
      <div className="auth-enter">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              ref={nameRef}
              id="name"
              label="Full name"
              type="text"
              autoComplete="name"
              enterKeyHint="next"
              placeholder="Alex Morgan"
              value={name}
              onChange={onFieldChange(setName, 'name')}
              error={fieldErrors.name}
              disabled={submitting}
            />
            <Field
              id="email"
              label="Work email"
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
          </div>

          <Field id="password" label="Password" error={fieldErrors.password}>
            {({ id, errorId, invalid }) => (
              <PasswordInput
                id={id}
                autoComplete="new-password"
                enterKeyHint="next"
                placeholder="Create a secure password"
                value={password}
                onChange={onFieldChange(setPassword, 'password')}
                error={invalid}
                describedBy={invalid ? errorId : undefined}
                disabled={submitting}
              />
            )}
          </Field>
          <PasswordStrength password={password} />

          <Field id="confirmPassword" label="Confirm password" error={fieldErrors.confirmPassword}>
            {({ id, errorId, invalid }) => (
              <PasswordInput
                id={id}
                autoComplete="new-password"
                enterKeyHint="go"
                placeholder="Enter it again"
                value={confirmPassword}
                onChange={onFieldChange(setConfirmPassword, 'confirmPassword')}
                error={invalid}
                describedBy={invalid ? errorId : undefined}
                disabled={submitting}
              />
            )}
          </Field>

          <div className="space-y-1.5">
            <label className="flex cursor-pointer items-start gap-2.5 text-caption text-muted-foreground">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => {
                  setAcceptedTerms(event.target.checked);
                  if (fieldErrors.terms) {
                    setFieldErrors((current) => ({ ...current, terms: undefined }));
                  }
                }}
                className="auth-checkbox mt-0.5"
                disabled={submitting}
              />
              <span>
                I agree to the{' '}
                <a href="/terms" className="font-semibold text-foreground hover:underline">
                  Terms
                </a>{' '}
                and{' '}
                <a href="/privacy" className="font-semibold text-foreground hover:underline">
                  Privacy Policy
                </a>
                .
              </span>
            </label>
            {fieldErrors.terms && (
              <p role="alert" className="text-caption text-destructive">
                {fieldErrors.terms}
              </p>
            )}
          </div>

          {serverError && <FormAlert>{serverError}</FormAlert>}
          {notice && <FormNotice>{notice}</FormNotice>}

          <SubmitButton pending={submitting} pendingLabel="Creating your workspace…">
            Create account
          </SubmitButton>
        </form>

        <div className="my-6">
          <AuthDivider>Or sign up with</AuthDivider>
        </div>

        <SocialButtons
          disabled={submitting}
          onUnavailable={() =>
            setNotice('Single sign-on can be connected once your workspace exists.')
          }
        />
      </div>
    </AuthShell>
  );
};

export default SignupPage;
