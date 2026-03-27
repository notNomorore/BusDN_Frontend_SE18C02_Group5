import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FiArrowLeft, FiArrowRight, FiCheckCircle, FiShield } from 'react-icons/fi';
import AuthShell from '../../components/auth/AuthShell';
import RegistrationContactSummary from '../../components/auth/RegistrationContactSummary';
import api from '../../utils/api';
import {
  OTP_RESEND_SECONDS,
  clearRegistrationState,
  extractHtmlErrorMessage,
  getResponsePath,
  getServerMessage,
  isRegistrationSessionExpiredPath,
  loadRegistrationState,
  saveRegistrationState,
} from '../../services/registrationFlowService';

const RegisterVerifyOtp = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [registrationState, setRegistrationState] = useState(() => loadRegistrationState());
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const method = searchParams.get('method') || (registrationState.contactType === 'PHONE' ? 'phone' : 'email');
  const isPhoneFlow = method === 'phone' || registrationState.contactType === 'PHONE';

  useEffect(() => {
    const currentState = loadRegistrationState();

    if (!currentState.fullName || !currentState.contactValue) {
      navigate('/register/step-1', { replace: true });
      return;
    }

    setRegistrationState(currentState);
  }, [navigate]);

  useEffect(() => {
    if (resendCountdown <= 0) return undefined;

    const timer = window.setTimeout(() => {
      setResendCountdown((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [resendCountdown]);

  const moveToPasswordStep = () => {
    const nextState = saveRegistrationState({ contactVerified: true });
    setRegistrationState(nextState);
    navigate('/register/create-password');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      if (!isPhoneFlow && !otp.trim()) {
        throw new Error('Please enter the OTP code.');
      }

      const response = await api.post('/verify-otp', {
        email: registrationState.contactValue,
        otp: isPhoneFlow ? 'PHONE_VERIFIED' : otp.trim(),
        type: isPhoneFlow ? 'registration-phone' : 'registration',
      });

      const responsePath = getResponsePath(response);

      if (responsePath.includes('/create-password')) {
        moveToPasswordStep();
        return;
      }

      if (isRegistrationSessionExpiredPath(responsePath)) {
        clearRegistrationState();
        navigate('/register/step-1', { replace: true });
        throw new Error('Registration session expired. Please start again.');
      }

      throw new Error(extractHtmlErrorMessage(response.data) || 'OTP verification failed.');
    } catch (requestError) {
      setError(getServerMessage(requestError, 'Unable to verify OTP.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    setResending(true);
    setError('');
    setMessage('');

    try {
      const { data } = await api.post('/resend-otp', { type: 'registration' });

      if (!data?.success) {
        throw new Error(data?.message || 'Unable to resend OTP.');
      }

      setMessage(data.message || `OTP resent to ${registrationState.contactValue}.`);
      setResendCountdown(data.cooldownSeconds || OTP_RESEND_SECONDS);
    } catch (requestError) {
      const cooldownSeconds = requestError.response?.data?.cooldownSeconds || 0;
      if (cooldownSeconds > 0) {
        setResendCountdown(cooldownSeconds);
      }
      setError(getServerMessage(requestError, 'Unable to resend OTP.'));
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell
      badge="Registration"
      step={3}
      title="Step 3: Verify your contact"
      description={isPhoneFlow
        ? 'Phone verification is already complete in Firebase. Confirm once more so backend and frontend stay aligned.'
        : 'Enter the 6-digit OTP sent from the backend registration session.'}
      headerIcon={FiShield}
      footer={(
        <>
          <p className="text-xs font-medium text-[#426656]">
            Destination: <span className="font-bold text-[#001a0f]">{registrationState.otpDestination || registrationState.contactValue}</span>
          </p>
          <Link to="/register/step-2" className="auth-ghost-button no-underline">
            <FiArrowLeft className="text-base" />
            Back to step 2
          </Link>
        </>
      )}
    >
      {error ? <div className="auth-status-banner error">{error}</div> : null}
      {message ? <div className="auth-status-banner success">{message}</div> : null}

      <RegistrationContactSummary
        fullName={registrationState.fullName}
        contactValue={registrationState.contactValue}
        contactType={registrationState.contactType || (isPhoneFlow ? 'PHONE' : 'EMAIL')}
        eyebrow="Verification contact"
      />

      <form onSubmit={handleSubmit} className="auth-form-card flex flex-col gap-5">
        {!isPhoneFlow ? (
          <>
            <div className="space-y-2">
              <label htmlFor="otp" className="auth-label">OTP code</label>
              <input
                id="otp"
                type="text"
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit OTP"
                className="auth-input text-center tracking-[0.35em]"
                maxLength={6}
                required
              />
            </div>

            <div className="grid gap-2 text-xs font-medium text-[#005234] sm:grid-cols-2">
              <div className="rounded-xl bg-[#ecf6f2] px-4 py-3">OTP codes stay valid for 10 minutes.</div>
              <div className="rounded-xl bg-[#ecf6f2] px-4 py-3">Use resend here if the code expires.</div>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-[#dbe5e1] bg-[#ecf6f2] p-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#c1e9d5] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#17503a]">
              <FiCheckCircle />
              Phone verified
            </span>
            <h3 className="auth-headline mt-3 text-xl font-bold text-[#001a0f]">
              Firebase SMS confirmation is complete.
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#466a5a]">
              One more confirmation here will keep the frontend flow aligned with the backend route before account creation.
            </p>
          </div>
        )}

        <div className={`grid gap-3 ${!isPhoneFlow ? 'sm:grid-cols-2' : ''}`}>
          <button type="submit" disabled={submitting} className="auth-primary-button">
            {submitting ? 'Verifying...' : isPhoneFlow ? 'Continue to password step' : 'Verify OTP'}
            <FiArrowRight className="text-base" />
          </button>

          {!isPhoneFlow ? (
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resending || resendCountdown > 0}
              className="auth-secondary-button"
            >
              {resending ? 'Resending...' : resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend OTP'}
            </button>
          ) : null}
        </div>
      </form>
    </AuthShell>
  );
};

export default RegisterVerifyOtp;
