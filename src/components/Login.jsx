import React, { useContext, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CircularProgress from '@mui/material/CircularProgress';
import {
  FiArrowLeft,
  FiArrowRight,
  FiCheckCircle,
  FiEye,
  FiEyeOff,
  FiMail,
  FiRefreshCcw,
} from 'react-icons/fi';
import AuthContext from '../context/AuthContext';
import {
  loginUser,
  requestPasswordResetOtp,
  resetPassword as resetPasswordAccount,
  verifyPasswordResetOtp,
} from '../services/authService';
import { API_ORIGIN, buildApiUrl } from '../utils/runtimeConfig';

const GOOGLE_AUTH_URL = buildApiUrl('/auth/google');

const getOriginVariants = (origin) => {
  if (!origin) return [];
  try {
    const url = new URL(origin);
    const isLoopback = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    if (!isLoopback) return [url.origin];

    const altHostname = url.hostname === 'localhost' ? '127.0.0.1' : 'localhost';
    const altOrigin = `${url.protocol}//${altHostname}${url.port ? `:${url.port}` : ''}`;
    return [url.origin, altOrigin];
  } catch {
    return [origin];
  }
};

const GOOGLE_AUTH_ORIGINS = new Set([
  ...getOriginVariants(window.location.origin),
  ...getOriginVariants(API_ORIGIN),
].filter(Boolean));
const OTP_RESEND_SECONDS = 60;

const AUTH_VIEW = {
  LOGIN: 'login',
  FORGOT_EMAIL: 'forgot-email',
  FORGOT_OTP: 'forgot-otp',
  FORGOT_RESET: 'forgot-reset',
};

const PASSWORD_RULES = [
  { id: 'length', label: 'At least 8 characters', test: (value) => value.length >= 8 },
  { id: 'upper', label: 'Uppercase letter', test: (value) => /[A-Z]/.test(value) },
  { id: 'lower', label: 'Lowercase letter', test: (value) => /[a-z]/.test(value) },
  { id: 'number', label: 'One number', test: (value) => /\d/.test(value) },
  { id: 'special', label: 'One special character', test: (value) => /[@$!%*?&]/.test(value) },
];

const FORGOT_FLOW_COPY = {
  [AUTH_VIEW.FORGOT_EMAIL]: {
    badge: 'RECOVERY',
    title: 'Forgot your password?',
    description: 'Enter your registered email to receive a 6-digit OTP for password recovery.',
    stepLabel: 'Step 1 / 3',
  },
  [AUTH_VIEW.FORGOT_OTP]: {
    badge: 'VERIFY OTP',
    title: 'Verify your email',
    description: 'Enter the OTP sent to your inbox to continue resetting your password.',
    stepLabel: 'Step 2 / 3',
  },
  [AUTH_VIEW.FORGOT_RESET]: {
    badge: 'NEW PASSWORD',
    title: 'Create a new password',
    description: 'Your OTP has been verified. Set a new password for this account.',
    stepLabel: 'Step 3 / 3',
  },
};

const getRoleRedirectPath = (role) => {
  if (role === 'ADMIN' || role === 'STAFF') return '/admin/dashboard';
  if (role === 'DRIVER') return '/driver/schedule';
  if (role === 'CONDUCTOR') return '/conductor/schedule';
  return '/';
};

const isActivationRequired = (user = {}, status) => {
  const normalizedStatus = String(status || user?.status || '').toUpperCase();
  return normalizedStatus === 'INACTIVE'
    || normalizedStatus === 'PENDING_ACTIVATION'
    || !!user?.isFirstLogin;
};

const Login = ({ onClose }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useContext(AuthContext);

  const [view, setView] = useState(AUTH_VIEW.LOGIN);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotResetToken, setForgotResetToken] = useState('');
  const [forgotPassword, setForgotPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotResendCountdown, setForgotResendCountdown] = useState(0);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const isForgotFlow = view !== AUTH_VIEW.LOGIN;
  const currentForgotCopy = isForgotFlow ? FORGOT_FLOW_COPY[view] : null;
  const forgotPassedRules = PASSWORD_RULES.filter((rule) => rule.test(forgotPassword));
  const isForgotPasswordValid = forgotPassedRules.length === PASSWORD_RULES.length;
  const isForgotPasswordReady = isForgotPasswordValid
    && forgotConfirmPassword !== ''
    && forgotPassword === forgotConfirmPassword;

  useEffect(() => {
    if (searchParams.get('registered') === '1') {
      setMessage('Registration completed. Please sign in.');
      return;
    }

    if (searchParams.get('reset') === '1') {
      setMessage('Password reset completed. Please sign in.');
    }
  }, [searchParams]);

  useEffect(() => {
    if (forgotResendCountdown <= 0) return undefined;

    const timer = window.setTimeout(() => {
      setForgotResendCountdown((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [forgotResendCountdown]);

  const clearForgotSensitiveState = () => {
    setForgotOtp('');
    setForgotResetToken('');
    setForgotPassword('');
    setForgotConfirmPassword('');
    setForgotResendCountdown(0);
    setShowForgotPassword(false);
    setShowForgotConfirmPassword(false);
  };

  const returnToLogin = (nextMessage = '') => {
    setView(AUTH_VIEW.LOGIN);
    setError('');
    setMessage(nextMessage);
    clearForgotSensitiveState();
  };

  const openForgotPasswordFlow = () => {
    setView(AUTH_VIEW.FORGOT_EMAIL);
    setError('');
    setMessage('');
    clearForgotSensitiveState();
    setForgotEmail(identifier.includes('@') ? identifier.trim() : '');
  };

  const handleRegister = () => {
    if (onClose) onClose();
    navigate('/register/step-1');
  };

  const handleLogin = async () => {
    const data = await loginUser({ email: identifier.trim(), password });
    setMessage(data.message || 'Login successful.');

    if (!data.token) return;

    localStorage.setItem('token', data.token);
    const activationRequired = isActivationRequired(data.user, data.status);
    login(
      data.token,
      data.user?.id,
      data.user?.role,
      data.user?.isFirstLogin,
      data.status || data.user?.status || null,
      activationRequired,
    );

    if (onClose) onClose();

    window.setTimeout(() => {
      const role = data.user?.role;

      if (activationRequired) {
        window.location.href = '/activate-account';
        return;
      }

      const redirectPath = getRoleRedirectPath(role);
      if (redirectPath === '/') {
        navigate('/');
        return;
      }

      window.location.href = redirectPath;
    }, 100);
  };

  const openGoogleAuthPopup = () => new Promise((resolve, reject) => {
    const popup = window.open(
      GOOGLE_AUTH_URL,
      'busdn-google-auth',
      'width=520,height=680,left=200,top=80',
    );

    if (!popup) {
      reject(new Error('Google sign-in popup was blocked.'));
      return;
    }

    const cleanup = () => {
      window.removeEventListener('message', handleMessage);
      window.clearInterval(closeWatcher);
    };

    const handleMessage = (event) => {
      if (!GOOGLE_AUTH_ORIGINS.has(event.origin)) return;
      if (!event.data || event.data.source !== 'busdn-google-auth') return;

      cleanup();

      if (event.data.status === 'success') {
        resolve(event.data);
        return;
      }

      reject(new Error(event.data.error || 'Google authentication failed.'));
    };

    const closeWatcher = window.setInterval(() => {
      if (!popup.closed) return;
      cleanup();
      reject(new Error('Google sign-in was cancelled.'));
    }, 500);

    window.addEventListener('message', handleMessage);
  });

  const handleGoogleAuth = async () => {
    setError('');
    setMessage('');
    setGoogleLoading(true);

    try {
      const result = await openGoogleAuthPopup();
      const token = result?.token;
      const user = result?.user;

      if (!token || !user) {
        throw new Error('Google authentication failed.');
      }

      localStorage.setItem('token', token);
      login(token, user.id, user.role, user.isFirstLogin, user.status || null, isActivationRequired(user));

      if (onClose) onClose();

      const redirectPath = result.redirectTo || getRoleRedirectPath(user.role);
      if (redirectPath === '/') {
        navigate('/');
        return;
      }

      window.location.href = redirectPath;
    } catch (requestError) {
      setError(requestError.message || 'Google authentication failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (!identifier.trim() || !password) {
        throw new Error('Please enter your email or phone and password.');
      }

      await handleLogin();
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotEmailSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    const normalizedEmail = forgotEmail.trim().toLowerCase();

    try {
      if (!normalizedEmail) {
        throw new Error('Please enter your registered email.');
      }

      const data = await requestPasswordResetOtp(normalizedEmail);
      setForgotEmail(normalizedEmail);
      setView(AUTH_VIEW.FORGOT_OTP);
      setForgotResendCountdown(data.cooldownSeconds || OTP_RESEND_SECONDS);
      setMessage(data.message || 'OTP sent. Please check your email.');
    } catch (requestError) {
      const cooldownSeconds = requestError.response?.data?.cooldownSeconds || 0;
      if (cooldownSeconds > 0) {
        setForgotEmail(normalizedEmail);
        setView(AUTH_VIEW.FORGOT_OTP);
        setForgotResendCountdown(cooldownSeconds);
        setMessage(requestError.response?.data?.message || `Please wait ${cooldownSeconds}s before requesting another OTP.`);
        return;
      }

      setError(requestError.response?.data?.message || requestError.message || 'Unable to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotOtpSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const normalizedOtp = forgotOtp.trim();
      if (!normalizedOtp) {
        throw new Error('Please enter the OTP sent to your email.');
      }

      const data = await verifyPasswordResetOtp({
        email: forgotEmail,
        otp: normalizedOtp,
      });

      setForgotOtp(normalizedOtp);
      setForgotResetToken(data.resetToken || '');
      setView(AUTH_VIEW.FORGOT_RESET);
      setMessage('OTP verified. You can now create a new password.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to verify OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendForgotOtp = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const data = await requestPasswordResetOtp(forgotEmail);
      setForgotOtp('');
      setForgotResetToken('');
      setForgotResendCountdown(data.cooldownSeconds || OTP_RESEND_SECONDS);
      setMessage(data.message || 'A new OTP has been sent.');
    } catch (requestError) {
      const cooldownSeconds = requestError.response?.data?.cooldownSeconds || 0;
      if (cooldownSeconds > 0) {
        setForgotResendCountdown(cooldownSeconds);
      }
      setError(requestError.response?.data?.message || requestError.message || 'Unable to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotResetSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (!isForgotPasswordReady) {
        throw new Error('Please enter a valid password and confirm it correctly.');
      }

      await resetPasswordAccount({
        email: forgotEmail,
        resetToken: forgotResetToken,
        newPassword: forgotPassword,
      });

      setIdentifier(forgotEmail);
      setPassword('');
      returnToLogin('Password reset completed. Please sign in.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const renderForgotPasswordRules = () => (
    <div className="grid grid-cols-2 gap-2">
      {PASSWORD_RULES.map((rule) => {
        const passed = rule.test(forgotPassword);
        return (
          <div
            key={rule.id}
            className={`flex items-start gap-2 text-[11px] font-medium leading-4 ${passed ? 'text-[#005234]' : 'text-[#717974]'}`}
          >
            <FiCheckCircle className={`mt-0.5 shrink-0 ${passed ? 'text-[#2ba471]' : 'text-[#c1c8c3]'}`} />
            <span>{rule.label}</span>
          </div>
        );
      })}
    </div>
  );

  const renderLoginForm = () => (
    <>
      <div className="space-y-1.5">
        <span className="inline-flex rounded-full bg-[#2ba471]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#005234]">
          BusDN Account
        </span>
        <h2 className="auth-headline text-[1.9rem] font-extrabold tracking-tight text-[#001a0f]">Welcome back</h2>
        <p className="text-sm leading-5 text-[#426656]">
          Sign in with your email or phone to continue using BusDN.
        </p>
      </div>

      <form onSubmit={handleLoginSubmit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <label htmlFor="identifier" className="auth-label">
            Email or phone
          </label>
          <input
            id="identifier"
            type="text"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="you@example.com or +8490..."
            className="auth-input mt-0 border-[#dbe5e1]/80 bg-[#ecf6f2] focus:border-[#2ba471]"
            autoComplete="username"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="auth-label">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              className="auth-input mt-0 border-[#dbe5e1]/80 bg-[#ecf6f2] pr-14 focus:border-[#2ba471]"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#426656] transition hover:text-[#001a0f]"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <FiEyeOff className="text-lg" /> : <FiEye className="text-lg" />}
            </button>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={openForgotPasswordFlow}
              className="text-xs font-bold text-[#005234] transition hover:underline"
            >
              Forgot password?
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || googleLoading}
          className="auth-primary-button h-12 w-full"
        >
          {loading ? (
            <span className="inline-flex items-center justify-center">
              <CircularProgress size={20} color="inherit" />
            </span>
          ) : (
            <>
              <span>Sign In</span>
              <FiArrowRight className="text-base" />
            </>
          )}
        </button>
      </form>

      <div className="my-4 flex items-center gap-4 py-1 text-[10px] font-bold uppercase tracking-[0.28em] text-[#426656]">
        <div className="h-px flex-1 bg-[#dbe5e1]" />
        <span>Or</span>
        <div className="h-px flex-1 bg-[#dbe5e1]" />
      </div>

      <button
        type="button"
        onClick={handleGoogleAuth}
        disabled={loading || googleLoading}
        className="auth-secondary-button h-12 w-full border-[#dbe5e1]"
      >
        {googleLoading ? (
          <span className="inline-flex items-center justify-center">
            <CircularProgress size={20} color="inherit" />
          </span>
        ) : (
          <>
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09A6.96 6.96 0 0 1 5.49 12c0-.73.13-1.43.35-2.09V7.07H2.18A11.94 11.94 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l4.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span>Continue with Google</span>
          </>
        )}
      </button>

      <div className="mt-4 rounded-xl bg-[#ecf6f2] p-4 text-center">
        <p className="text-xs font-medium text-[#426656]">Need a passenger account?</p>
        <button
          type="button"
          onClick={handleRegister}
          className="mt-1 text-xs font-bold text-[#005234] transition hover:underline"
        >
          Start the 4-step registration flow
        </button>
      </div>
    </>
  );

  const renderForgotEmailForm = () => (
    <form onSubmit={handleForgotEmailSubmit} className="mt-6 space-y-4">
      <div className="space-y-2">
        <label htmlFor="forgot-email" className="auth-label">
          Registered email
        </label>
        <div className="relative">
          <FiMail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#426656]" />
          <input
            id="forgot-email"
            type="email"
            value={forgotEmail}
            onChange={(event) => setForgotEmail(event.target.value)}
            placeholder="you@example.com"
            className="auth-input mt-0 border-[#dbe5e1]/80 bg-[#ecf6f2] pl-12 focus:border-[#2ba471]"
            autoComplete="email"
            required
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="auth-primary-button h-12 w-full"
      >
        {loading ? (
          <span className="inline-flex items-center justify-center">
            <CircularProgress size={20} color="inherit" />
          </span>
        ) : (
          <>
            <span>Send OTP</span>
            <FiArrowRight className="text-base" />
          </>
        )}
      </button>

      <button
        type="button"
        onClick={() => returnToLogin()}
        className="auth-ghost-button w-full justify-center py-1"
      >
        <FiArrowLeft className="text-base" />
        Back to sign in
      </button>
    </form>
  );

  const renderForgotOtpForm = () => (
    <>
      <div className="mt-5 rounded-xl bg-[#ecf6f2] p-3 text-sm text-[#426656]">
        OTP was sent to <span className="font-bold text-[#001a0f]">{forgotEmail}</span>.
      </div>

      <form onSubmit={handleForgotOtpSubmit} className="mt-4 space-y-4">
        <div className="space-y-2">
          <label htmlFor="forgot-otp" className="auth-label">
            OTP code
          </label>
          <input
            id="forgot-otp"
            type="text"
            value={forgotOtp}
            onChange={(event) => setForgotOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            inputMode="numeric"
            autoComplete="one-time-code"
            className="auth-input mt-0 border-[#dbe5e1]/80 bg-[#ecf6f2] text-center tracking-[0.45em] focus:border-[#2ba471]"
            required
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            disabled={loading}
            className="auth-primary-button h-12 flex-1"
          >
            {loading ? (
              <span className="inline-flex items-center justify-center">
                <CircularProgress size={20} color="inherit" />
              </span>
            ) : (
              <>
                <span>Verify OTP</span>
                <FiArrowRight className="text-base" />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleResendForgotOtp}
            disabled={loading || forgotResendCountdown > 0}
            className="auth-secondary-button h-12 flex-1 border-[#dbe5e1]"
          >
            <FiRefreshCcw className="text-base" />
            {forgotResendCountdown > 0 ? `Resend in ${forgotResendCountdown}s` : 'Resend OTP'}
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            setView(AUTH_VIEW.FORGOT_EMAIL);
            setError('');
            setMessage('');
            setForgotOtp('');
          }}
          className="auth-ghost-button w-full justify-center py-1"
        >
          <FiArrowLeft className="text-base" />
          Change email
        </button>
      </form>
    </>
  );

  const renderForgotResetForm = () => (
    <form onSubmit={handleForgotResetSubmit} className="mt-6 space-y-4">
      <div className="rounded-xl bg-[#ecf6f2] p-3 text-sm text-[#426656]">
        Password will be updated for <span className="font-bold text-[#001a0f]">{forgotEmail}</span>.
      </div>

      <div className="space-y-2">
        <label htmlFor="forgot-password" className="auth-label">
          New password
        </label>
        <div className="relative">
          <input
            id="forgot-password"
            type={showForgotPassword ? 'text' : 'password'}
            value={forgotPassword}
            onChange={(event) => setForgotPassword(event.target.value)}
            placeholder="Create a strong password"
            className="auth-input mt-0 border-[#dbe5e1]/80 bg-[#ecf6f2] pr-14 focus:border-[#2ba471]"
            autoComplete="new-password"
            required
          />
          <button
            type="button"
            onClick={() => setShowForgotPassword((current) => !current)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#426656] transition hover:text-[#001a0f]"
            aria-label={showForgotPassword ? 'Hide new password' : 'Show new password'}
          >
            {showForgotPassword ? <FiEyeOff className="text-lg" /> : <FiEye className="text-lg" />}
          </button>
        </div>
      </div>

      {renderForgotPasswordRules()}

      <div className="space-y-2">
        <label htmlFor="forgot-confirm-password" className="auth-label">
          Confirm password
        </label>
        <div className="relative">
          <input
            id="forgot-confirm-password"
            type={showForgotConfirmPassword ? 'text' : 'password'}
            value={forgotConfirmPassword}
            onChange={(event) => setForgotConfirmPassword(event.target.value)}
            placeholder="Re-enter your new password"
            className="auth-input mt-0 border-[#dbe5e1]/80 bg-[#ecf6f2] pr-14 focus:border-[#2ba471]"
            autoComplete="new-password"
            required
          />
          <button
            type="button"
            onClick={() => setShowForgotConfirmPassword((current) => !current)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#426656] transition hover:text-[#001a0f]"
            aria-label={showForgotConfirmPassword ? 'Hide confirmed password' : 'Show confirmed password'}
          >
            {showForgotConfirmPassword ? <FiEyeOff className="text-lg" /> : <FiEye className="text-lg" />}
          </button>
        </div>
        {forgotConfirmPassword && forgotPassword !== forgotConfirmPassword ? (
          <p className="text-xs font-medium text-[#93000a]">Passwords do not match.</p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={loading || !isForgotPasswordReady}
        className="auth-primary-button h-12 w-full"
      >
        {loading ? (
          <span className="inline-flex items-center justify-center">
            <CircularProgress size={20} color="inherit" />
          </span>
        ) : (
          <>
            <span>Update password</span>
            <FiArrowRight className="text-base" />
          </>
        )}
      </button>

      <button
        type="button"
        onClick={() => {
          setView(AUTH_VIEW.FORGOT_OTP);
          setError('');
          setMessage('');
          setForgotPassword('');
          setForgotConfirmPassword('');
          setShowForgotPassword(false);
          setShowForgotConfirmPassword(false);
        }}
        className="auth-ghost-button w-full justify-center py-1"
      >
        <FiArrowLeft className="text-base" />
        Back to OTP step
      </button>
    </form>
  );

  const renderForgotFlow = () => (
    <>
      <div className="space-y-2">
        <span className="inline-flex rounded-full bg-[#2ba471]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#005234]">
          {currentForgotCopy.badge}
        </span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#426656]">
            {currentForgotCopy.stepLabel}
          </p>
          <h2 className="auth-headline mt-1.5 text-[1.9rem] font-extrabold tracking-tight text-[#001a0f]">
            {currentForgotCopy.title}
          </h2>
        </div>
        <p className="text-sm leading-5 text-[#426656]">
          {currentForgotCopy.description}
        </p>
      </div>

      {view === AUTH_VIEW.FORGOT_EMAIL ? renderForgotEmailForm() : null}
      {view === AUTH_VIEW.FORGOT_OTP ? renderForgotOtpForm() : null}
      {view === AUTH_VIEW.FORGOT_RESET ? renderForgotResetForm() : null}
    </>
  );

  return (
    <div className="w-full max-w-[29rem]">
      <div className="rounded-[1.75rem] bg-white px-6 py-6 shadow-[0_32px_64px_-16px_rgba(0,26,15,0.08)] sm:px-8 sm:py-7">
        {error ? (
          <div className="auth-status-banner error mb-4">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="auth-status-banner success mb-4">
            {message}
          </div>
        ) : null}

        {isForgotFlow ? renderForgotFlow() : renderLoginForm()}
      </div>
    </div>
  );
};

export default Login;
