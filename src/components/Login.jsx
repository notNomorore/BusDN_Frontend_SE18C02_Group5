import React, { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import api from '../utils/api';
import { loginUser } from '../services/authService';

const OTP_RESEND_SECONDS = 60;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?\d{9,15}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const FIREBASE_SCRIPT_URLS = [
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js'
];
const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCk3qOQnxRP9Lphy-aPUDF1e0VUSs6Fs9U',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'busdn-se18c02.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'busdn-se18c02',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'busdn-se18c02.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '24020218217',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:24020218217:web:7653e48a118ddaa633cdf8',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-4HZF53NLNW'
};
const API_ORIGIN = (import.meta.env.VITE_API_URL || `http://localhost:${import.meta.env.VITE_API_PORT || '3000'}`).replace(/\/$/, '');

const loadExternalScript = (src) => new Promise((resolve, reject) => {
  const existingScript = document.querySelector(`script[src="${src}"]`);
  if (existingScript) {
    if (existingScript.dataset.loaded === 'true') {
      resolve();
      return;
    }
    existingScript.addEventListener('load', resolve, { once: true });
    existingScript.addEventListener('error', reject, { once: true });
    return;
  }

  const script = document.createElement('script');
  script.src = src;
  script.async = true;
  script.onload = () => {
    script.dataset.loaded = 'true';
    resolve();
  };
  script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
  document.body.appendChild(script);
});

const normalizeAuthMessage = (message, fallback) => {
  const rawMessage = String(message || '');
  const normalized = rawMessage.toLowerCase();
  if (!normalized) return fallback;

  if (normalized.includes('otp')) {
    if (normalized.includes('expired')) return 'Expired OTP. Please request a new code.';
    if (normalized.includes('invalid')) return 'Invalid OTP. Please try again.';
    return 'Invalid or expired OTP. Please try again or request a new code.';
  }
  if (normalized.includes('already exists') && normalized.includes('email')) return 'Email already exists.';
  if (normalized.includes('already exists') && normalized.includes('phone')) return 'Phone number already exists.';
  if (normalized.includes('server')) return 'Server error. Please try again.';

  return rawMessage || fallback;
};

const maskPhone = (phone) => {
  if (!phone) return '';
  const visibleTail = phone.slice(-3);
  const maskedHead = phone.slice(0, Math.max(phone.length - 3, 0)).replace(/\d/g, '*');
  return `${maskedHead}${visibleTail}`;
};

const getResponseUrl = (response) => response?.request?.responseURL || '';
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
  const [isLogin, setIsLogin] = useState(true);
  const [method, setMethod] = useState('email');
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const [otpDestination, setOtpDestination] = useState('');
  const recaptchaContainerRef = useRef(null);
  const recaptchaVerifierRef = useRef(null);
  const confirmationResultRef = useRef(null);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (isLogin || step !== 2 || resendCountdown <= 0) return undefined;

    const timer = window.setTimeout(() => {
      setResendCountdown((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [isLogin, step, resendCountdown]);

  useEffect(() => {
    if (isLogin || step !== 3) return undefined;

    const redirectTimer = window.setTimeout(() => {
      setIsLogin(true);
      setStep(1);
      setOtp('');
      setError('');
      setMessage('Registration completed. Please sign in.');
      setEmail(method === 'email' ? email : phone);
    }, 2500);

    return () => window.clearTimeout(redirectTimer);
  }, [email, isLogin, method, phone, step]);

  const resetRegisterFlow = () => {
    setMethod('email');
    setStep(1);
    setName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setConfirmPassword('');
    setOtp('');
    setOtpDestination('');
    setResendCountdown(0);
    setError('');
    setMessage('');
    confirmationResultRef.current = null;
  };

  const switchMode = (nextIsLogin) => {
    setIsLogin(nextIsLogin);
    setLoading(false);
    setError('');
    setMessage('');

    if (nextIsLogin) {
      setStep(1);
      setOtp('');
      setOtpDestination('');
      setResendCountdown(0);
    } else {
      resetRegisterFlow();
    }
  };

  const switchRegisterMethod = (nextMethod) => {
    setMethod(nextMethod);
    setError('');
    setMessage('');
    setOtp('');
    setOtpDestination('');
    setResendCountdown(0);
    confirmationResultRef.current = null;
  };

  const handleForgotPassword = () => {
    if (onClose) onClose();
    navigate('/forgot-password');
  };

  const handleLogin = async () => {
    const data = await loginUser({ email, password });
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
      activationRequired
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
      `${API_ORIGIN}/auth/google`,
      'busdn-google-auth',
      'width=520,height=680,left=200,top=80'
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
      if (event.origin !== API_ORIGIN) return;
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
    } catch (err) {
      setError(err.message || 'Google authentication failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const validateRegisterFields = () => {
    if (!name.trim()) return 'Name is required.';
    if (!PASSWORD_REGEX.test(password)) {
      return 'Password must be at least 8 characters and include uppercase, lowercase, number, and @$!%*?&.';
    }
    if (password !== confirmPassword) return 'Password and confirm password must match.';

    if (method === 'email' && !EMAIL_REGEX.test(email.trim())) {
      return 'Please enter a valid email address.';
    }
    if (method === 'phone' && !PHONE_REGEX.test(phone.trim())) {
      return 'Please enter a valid phone number.';
    }

    return '';
  };

  const initializeRegisterSession = async () => {
    await api.post('/register-step1', { fullName: name.trim() });
  };

  const checkContactAvailability = async (contactValue) => {
    const { data } = await api.post('/register-step2/check-contact', { contactValue });

    if (!data?.ok) {
      throw new Error(method === 'email' ? 'Email already exists.' : 'Phone number already exists.');
    }

    return data.normalized || contactValue;
  };

  const ensureFirebaseAuth = async () => {
    for (const scriptUrl of FIREBASE_SCRIPT_URLS) {
      await loadExternalScript(scriptUrl);
    }

    const firebase = window.firebase;
    if (!firebase) {
      throw new Error('Firebase SDK is unavailable.');
    }

    if (!firebase.apps.length) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }

    if (!recaptchaContainerRef.current) {
      throw new Error('Recaptcha container is unavailable.');
    }

    if (!recaptchaVerifierRef.current) {
      recaptchaVerifierRef.current = new firebase.auth.RecaptchaVerifier(recaptchaContainerRef.current, {
        size: 'normal'
      });
      await recaptchaVerifierRef.current.render();
    }

    return firebase.auth();
  };

  const sendPhoneOtp = async (normalizedPhone) => {
    const auth = await ensureFirebaseAuth();
    confirmationResultRef.current = await auth.signInWithPhoneNumber(normalizedPhone, recaptchaVerifierRef.current);
  };

  const startEmailRegistration = async () => {
    await initializeRegisterSession();
    const normalizedEmail = await checkContactAvailability(email.trim().toLowerCase());

    setEmail(normalizedEmail);
    await api.post('/register-step2', { contactValue: normalizedEmail });

    setOtpDestination(normalizedEmail);
    setMessage(`OTP sent to: ${normalizedEmail}`);
    setStep(2);
    setResendCountdown(OTP_RESEND_SECONDS);
  };

  const startPhoneRegistration = async () => {
    await initializeRegisterSession();
    const normalizedPhone = await checkContactAvailability(phone.trim());

    setPhone(normalizedPhone);
    await sendPhoneOtp(normalizedPhone);

    setOtpDestination(maskPhone(normalizedPhone));
    setMessage(`OTP sent to: ${maskPhone(normalizedPhone)}`);
    setStep(2);
    setResendCountdown(OTP_RESEND_SECONDS);
  };

  const finalizeAccountCreation = async () => {
    const createResponse = await api.post('/create-password', {
      password,
      confirmPassword
    });

    if (!getResponseUrl(createResponse).includes('/login')) {
      throw new Error('Unable to complete registration. Please try again.');
    }
  };

  const verifyEmailOtp = async () => {
    const verifyResponse = await api.post('/verify-otp', {
      email,
      otp,
      type: 'registration'
    });

    if (!getResponseUrl(verifyResponse).includes('/create-password')) {
      throw new Error('Invalid or expired OTP. Please try again or request a new code.');
    }

    await finalizeAccountCreation();
    setMessage('Registration successful. Redirecting to sign in.');
    setStep(3);
    setResendCountdown(0);
  };

  const verifyPhoneOtp = async () => {
    if (!confirmationResultRef.current) {
      throw new Error('Please request an OTP first.');
    }

    const result = await confirmationResultRef.current.confirm(otp);
    const verifiedPhone = result?.user?.phoneNumber || phone;
    const firebaseUid = result?.user?.uid || null;

    await api.post('/register-step2/phone-verify', {
      phone: verifiedPhone,
      firebaseUid
    });

    const verifyResponse = await api.post('/verify-otp', {
      email: verifiedPhone,
      otp,
      type: 'registration-phone'
    });

    if (!getResponseUrl(verifyResponse).includes('/create-password')) {
      throw new Error('Phone verification could not be completed.');
    }

    await finalizeAccountCreation();
    setMessage('Registration successful. Redirecting to sign in.');
    setStep(3);
    setResendCountdown(0);
  };

  const handleRegisterSubmit = async () => {
    const validationError = validateRegisterFields();
    if (validationError) {
      throw new Error(validationError);
    }

    if (method === 'email') {
      await startEmailRegistration();
      return;
    }

    await startPhoneRegistration();
  };

  const handleOtpVerification = async () => {
    if (!otp.trim()) {
      throw new Error('Please enter the OTP code.');
    }

    if (method === 'email') {
      await verifyEmailOtp();
      return;
    }

    await verifyPhoneOtp();
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError('');

    try {
      if (method === 'email') {
        await api.post('/resend-otp', { type: 'registration' });
        setMessage(`OTP sent to: ${otpDestination || email}`);
      } else {
        await sendPhoneOtp(phone);
        setMessage(`OTP sent to: ${maskPhone(phone)}`);
      }

      setResendCountdown(OTP_RESEND_SECONDS);
    } catch (err) {
      setError(normalizeAuthMessage(err.message || err.response?.data?.message, 'Unable to resend OTP. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (isLogin) {
        await handleLogin();
      } else if (step === 1) {
        await handleRegisterSubmit();
      } else if (step === 2) {
        await handleOtpVerification();
      }
    } catch (err) {
      setError(normalizeAuthMessage(err.response?.data?.message || err.message, 'An error occurred. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const submitLabel = isLogin
    ? 'Sign In'
    : step === 1
      ? 'Sign Up'
      : step === 2
        ? 'Verify OTP'
        : 'Redirecting...';

  return (
    <div className="flex items-center justify-center px-2 bg-opacity-60 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8"
      >
        <h2 className="text-2xl font-bold text-center text-[#101828]">Welcome to BusDN</h2>
        <p className="text-center text-gray-500 mb-6">Your journey starts here</p>

        {!isLogin && (
          <p className="text-xs text-center text-gray-400 mb-6">
            {step === 1 ? 'Step 1 of 3' : step === 2 ? 'Step 2 of 3' : 'Step 3 of 3'}
          </p>
        )}

        {step !== 2 && step !== 3 && (
          <div className="flex mb-6 border border-transparent rounded-lg overflow-hidden text-sm font-semibold">
            <button
              type="button"
              onClick={() => switchMode(true)}
              className={`w-1/2 py-2 cursor-pointer ${isLogin ? 'bg-gray-200 text-[#101828]' : 'bg-white text-gray-400'}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode(false)}
              className={`w-1/2 py-2 cursor-pointer ${!isLogin ? 'bg-gray-200 text-[#101828]' : 'bg-white text-gray-400'}`}
            >
              Sign Up
            </button>
          </div>
        )}

        {error && <p className="text-sm text-center mb-4 text-red-500">{error}</p>}
        {message && <p className="text-sm text-center mb-4 text-green-500">{message}</p>}

        {isLogin && (
          <>
            <label className="font-medium text-black">Email</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full mt-1 mb-4 px-4 py-2 border rounded-md text-gray-500 border-gray-300 shadow focus:outline-[#23a983]"
            />

            <label className="font-medium text-black">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              className="w-full mt-1 mb-1 px-4 py-2 border rounded-md text-gray-500 border-gray-300 shadow focus:outline-[#23a983]"
            />

            <div className="flex justify-end mb-4">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-[#23a983] hover:underline font-medium focus:outline-none"
              >
                Forgot password?
              </button>
            </div>
          </>
        )}

        {!isLogin && step === 1 && (
          <>
            <div className="flex mb-4 border border-transparent rounded-lg overflow-hidden text-sm font-semibold">
              <button
                type="button"
                onClick={() => switchRegisterMethod('email')}
                className={`w-1/2 py-2 cursor-pointer ${method === 'email' ? 'bg-gray-200 text-[#101828]' : 'bg-white text-gray-400'}`}
              >
                Register with Email
              </button>
              <button
                type="button"
                onClick={() => switchRegisterMethod('phone')}
                className={`w-1/2 py-2 cursor-pointer ${method === 'phone' ? 'bg-gray-200 text-[#101828]' : 'bg-white text-gray-400'}`}
              >
                Register with Phone
              </button>
            </div>

            <label className="font-medium text-black">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Your name"
              className="w-full mt-1 mb-4 px-4 py-2 border rounded-md text-gray-500 border-gray-300 shadow focus:outline-[#23a983]"
            />

            {method === 'email' ? (
              <>
                <label className="font-medium text-black">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full mt-1 mb-4 px-4 py-2 border rounded-md text-gray-500 border-gray-300 shadow focus:outline-[#23a983]"
                />
              </>
            ) : (
              <>
                <label className="font-medium text-black">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="+8490..."
                  className="w-full mt-1 mb-4 px-4 py-2 border rounded-md text-gray-500 border-gray-300 shadow focus:outline-[#23a983]"
                />
              </>
            )}

            <label className="font-medium text-black">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              className="w-full mt-1 mb-4 px-4 py-2 border rounded-md text-gray-500 border-gray-300 shadow focus:outline-[#23a983]"
            />

            <label className="font-medium text-black">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirm your password"
              className="w-full mt-1 mb-4 px-4 py-2 border rounded-md text-gray-500 border-gray-300 shadow focus:outline-[#23a983]"
            />

          </>
        )}

        {!isLogin && step === 2 && (
          <>
            <p className="text-sm text-center text-gray-500 mb-4">
              OTP sent to: <span className="font-semibold text-[#101828]">{otpDestination}</span>
            </p>

            <label className="font-medium text-black">OTP Code</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              placeholder="Enter 6-digit OTP"
              className="w-full mt-1 mb-4 px-4 py-2 border rounded-md text-gray-500 border-gray-300 shadow focus:outline-[#23a983] text-center tracking-[0.5em] font-bold"
              maxLength={6}
            />

            <div className="flex items-center justify-between mb-4 text-sm">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading || resendCountdown > 0}
                className={`font-medium ${loading || resendCountdown > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-[#23a983] hover:underline'}`}
              >
                Resend OTP
              </button>
              <span className="text-gray-500">
                {resendCountdown > 0 ? `Retry in ${resendCountdown}s` : 'You can request a new OTP now'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setStep(1);
                setOtp('');
                setError('');
                setMessage('');
                setOtpDestination('');
                setResendCountdown(0);
                confirmationResultRef.current = null;
              }}
              className="text-sm text-[#23a983] hover:underline font-medium mb-4"
            >
              Back to account details
            </button>
          </>
        )}

        {!isLogin && step === 3 && (
          <div className="text-center py-6">
            <p className="text-lg font-semibold text-[#101828] mb-2">Registration successful</p>
            <p className="text-sm text-gray-500">Your account has been verified. Redirecting to sign in.</p>
          </div>
        )}

        {!isLogin && method === 'phone' && step !== 3 && (
          <div ref={recaptchaContainerRef} className="mb-4" />
        )}

        <button
          type="submit"
          disabled={loading || googleLoading || (!isLogin && step === 3)}
          className="w-full bg-gradient-to-r from-[#23a983] to-[#1ac0a2] text-white font-semibold py-2 rounded-md shadow hover:brightness-110 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <CircularProgress size={24} color="inherit" />
            </Box>
          ) : (
            submitLabel
          )}
        </button>

        {step !== 2 && step !== 3 && (
          <>
            <div className="flex items-center my-4 text-sm text-gray-400">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="px-3">OR</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading || googleLoading}
              className="w-full border border-gray-300 text-[#101828] font-semibold py-2 rounded-md shadow hover:bg-gray-50 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {googleLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <CircularProgress size={24} color="inherit" />
                </Box>
              ) : (
                <>
                  <span className="text-base font-bold text-[#DB4437]">G</span>
                  <span>Continue with Google</span>
                </>
              )}
            </button>
          </>
        )}

        {step !== 2 && step !== 3 && (
          <div className="text-center mt-4 text-sm text-gray-600">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
            <span
              onClick={() => switchMode(!isLogin)}
              className="text-[#23a983] cursor-pointer hover:underline font-medium"
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </span>
          </div>
        )}
      </form>
    </div>
  );
};

export default Login;
