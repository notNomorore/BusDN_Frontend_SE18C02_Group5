import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiArrowRight, FiMail, FiPhone, FiShield } from 'react-icons/fi';
import AuthShell from '../../components/auth/AuthShell';
import RegistrationContactSummary from '../../components/auth/RegistrationContactSummary';
import api from '../../utils/api';
import {
  EMAIL_REGEX,
  PHONE_REGEX,
  getResponsePath,
  getServerMessage,
  loadRegistrationState,
  maskPhone,
  saveRegistrationState,
} from '../../services/registrationFlowService';
import { clearRecaptchaVerifier, requestPhoneOtp } from '../../utils/firebasePhoneAuth';

const RegisterStep2 = () => {
  const navigate = useNavigate();
  const recaptchaContainerRef = useRef(null);
  const recaptchaVerifierRef = useRef(null);
  const confirmationResultRef = useRef(null);
  const [registrationState, setRegistrationState] = useState(() => loadRegistrationState());
  const [contactValue, setContactValue] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [phoneStatus, setPhoneStatus] = useState('');
  const [phoneStatusTone, setPhoneStatusTone] = useState('success');
  const [phonePanelOpen, setPhonePanelOpen] = useState(false);
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [phoneSending, setPhoneSending] = useState(false);
  const [phoneVerifying, setPhoneVerifying] = useState(false);

  useEffect(() => {
    const currentState = loadRegistrationState();

    if (!currentState.fullName) {
      navigate('/register/step-1', { replace: true });
      return;
    }

    setRegistrationState(currentState);
    setContactValue(currentState.contactValue || '');
    setPhonePanelOpen(currentState.contactType === 'PHONE' && !currentState.phoneVerified);
  }, [navigate]);

  useEffect(() => () => {
    clearRecaptchaVerifier(recaptchaVerifierRef);
  }, []);

  const handleCheckContact = async (rawValue) => {
    const { data } = await api.post('/register-step2/check-contact', { contactValue: rawValue });
    if (!data?.ok) {
      throw new Error(data?.message || 'Contact value is invalid.');
    }
    return data;
  };

  const handleEmailFlow = async (event) => {
    event.preventDefault();
    const rawValue = contactValue.trim();

    if (!EMAIL_REGEX.test(rawValue)) {
      setError('Please enter a valid email address for the email flow.');
      return;
    }

    setEmailSubmitting(true);
    setError('');
    setMessage('');
    setPhoneStatus('');
    setPhoneStatusTone('success');

    try {
      const checked = await handleCheckContact(rawValue.toLowerCase());
      if (checked.contactType !== 'EMAIL') {
        throw new Error('This button only supports email. Use phone verification for phone numbers.');
      }

      const normalizedEmail = checked.normalized || rawValue.toLowerCase();
      const response = await api.post('/register-step2', { contactValue: normalizedEmail });
      const responsePath = getResponsePath(response);

      if (!responsePath.includes('/verify-otp')) {
        throw new Error('Unable to send OTP to email. Please try again.');
      }

      const nextState = saveRegistrationState({
        fullName: registrationState.fullName,
        contactType: 'EMAIL',
        contactValue: normalizedEmail,
        otpDestination: normalizedEmail,
        phoneVerified: false,
        contactVerified: false,
      });

      setRegistrationState(nextState);
      setMessage(`OTP sent to ${normalizedEmail}.`);
      navigate('/register/verify-otp?method=email');
    } catch (requestError) {
      setError(getServerMessage(requestError, 'Unable to continue with email verification.'));
    } finally {
      setEmailSubmitting(false);
    }
  };

  const handleSendPhoneOtp = async () => {
    const rawValue = contactValue.trim();

    if (!PHONE_REGEX.test(rawValue)) {
      setError('Please enter a valid phone number for the phone flow.');
      setPhonePanelOpen(true);
      return;
    }

    setPhoneSending(true);
    setError('');
    setMessage('');
    setPhoneStatus('');
    setPhoneStatusTone('success');
    setPhonePanelOpen(true);

    try {
      const checked = await handleCheckContact(rawValue);
      if (checked.contactType !== 'PHONE') {
        throw new Error('This button only supports phone verification.');
      }

      const normalizedPhone = checked.normalized || rawValue;
      confirmationResultRef.current = await requestPhoneOtp({
        phone: normalizedPhone,
        containerElement: recaptchaContainerRef.current,
        verifierRef: recaptchaVerifierRef,
      });

      const nextState = saveRegistrationState({
        fullName: registrationState.fullName,
        contactType: 'PHONE',
        contactValue: normalizedPhone,
        otpDestination: maskPhone(normalizedPhone),
        phoneVerified: false,
        contactVerified: false,
      });

      setRegistrationState(nextState);
      setContactValue(normalizedPhone);
      setPhoneStatus(`OTP sent to ${maskPhone(normalizedPhone)}.`);
      setPhoneStatusTone('success');
      setPhoneOtp('');
    } catch (requestError) {
      setPhoneStatus(getServerMessage(requestError, 'Unable to send phone OTP.'));
      setPhoneStatusTone('error');
    } finally {
      setPhoneSending(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!phoneOtp.trim()) {
      setPhoneStatus('Please enter the SMS OTP first.');
      setPhoneStatusTone('error');
      return;
    }

    if (!confirmationResultRef.current) {
      setPhoneStatus('Please send a phone OTP before verifying.');
      setPhoneStatusTone('error');
      return;
    }

    setPhoneVerifying(true);
    setError('');
    setMessage('');
    setPhoneStatus('');
    setPhoneStatusTone('success');

    try {
      const result = await confirmationResultRef.current.confirm(phoneOtp.trim());
      const verifiedPhone = result?.user?.phoneNumber || contactValue.trim();
      const firebaseUid = result?.user?.uid || null;

      const { data } = await api.post('/register-step2/phone-verify', {
        phone: verifiedPhone,
        firebaseUid,
      });

      if (!data?.ok) {
        throw new Error(data?.message || 'Phone verification could not be saved.');
      }

      const nextState = saveRegistrationState({
        fullName: registrationState.fullName,
        contactType: 'PHONE',
        contactValue: verifiedPhone,
        otpDestination: maskPhone(verifiedPhone),
        phoneVerified: true,
        contactVerified: false,
      });

      setRegistrationState(nextState);
      navigate('/register/verify-otp?method=phone');
    } catch (requestError) {
      setPhoneStatus(getServerMessage(requestError, 'Phone OTP is invalid or expired.'));
      setPhoneStatusTone('error');
    } finally {
      setPhoneVerifying(false);
    }
  };

  const displayedMethod = registrationState.contactType || 'AUTO';
  const displayedContact = registrationState.contactValue || 'Pending';

  return (
    <AuthShell
      badge="Registration"
      step={2}
      title="Step 2: Choose your contact method"
      description="Enter one contact value. The backend will detect email or phone and move you into the matching verification path."
      headerIcon={FiMail}
      footer={(
        <>
          <p className="text-xs font-medium text-[#426656]">
            Registering as <span className="font-bold text-[#001a0f]">{registrationState.fullName || 'Passenger'}</span>
          </p>
          <Link to="/register/step-1" className="auth-ghost-button no-underline">
            <FiArrowLeft className="text-base" />
            Back to step 1
          </Link>
        </>
      )}
    >
      {error ? <div className="auth-status-banner error">{error}</div> : null}
      {message ? <div className="auth-status-banner success">{message}</div> : null}

      <RegistrationContactSummary
        fullName={registrationState.fullName}
        contactValue={displayedContact}
        contactType={displayedMethod}
        eyebrow="Account contact"
      />

      <form onSubmit={handleEmailFlow} className="auth-form-card flex flex-col gap-5">
        <div className="space-y-2">
          <label htmlFor="contactValue" className="auth-label">Email or phone number</label>
          <input
            id="contactValue"
            type="text"
            value={contactValue}
            onChange={(event) => setContactValue(event.target.value)}
            placeholder="you@example.com or +8490..."
            autoComplete="email"
            className="auth-input"
            required
          />
        </div>

        <div className="grid gap-2 text-xs font-medium text-[#005234] sm:grid-cols-2">
          <div className="rounded-xl bg-[#ecf6f2] px-4 py-3">
            <span className="flex items-center gap-2 font-semibold text-[#001a0f]"><FiMail /> Email flow</span>
            <p className="mt-1.5 leading-5 text-[#466a5a]">Backend sends a 6-digit OTP and moves you to verification.</p>
          </div>
          <div className="rounded-xl bg-[#ecf6f2] px-4 py-3">
            <span className="flex items-center gap-2 font-semibold text-[#001a0f]"><FiPhone /> Phone flow</span>
            <p className="mt-1.5 leading-5 text-[#466a5a]">Firebase SMS runs first, then backend unlocks the next step.</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button type="submit" disabled={emailSubmitting || phoneSending || phoneVerifying} className="auth-primary-button">
            {emailSubmitting ? 'Sending email OTP...' : 'Continue with email'}
            <FiArrowRight className="text-base" />
          </button>
          <button
            type="button"
            onClick={handleSendPhoneOtp}
            disabled={emailSubmitting || phoneSending || phoneVerifying}
            className="auth-secondary-button"
          >
            {phoneSending ? 'Sending SMS...' : 'Verify phone number'}
          </button>
        </div>

        {phonePanelOpen ? (
          <div className="rounded-2xl border border-[#dbe5e1] bg-[#f7fbf9] p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#426656]">Phone verification</p>
                <h3 className="auth-headline mt-1 text-lg font-bold text-[#001a0f]">Confirm the SMS OTP</h3>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#c1e9d5] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#17503a]">
                <FiShield />
                Firebase
              </span>
            </div>

            <div ref={recaptchaContainerRef} className="mt-4 min-h-[78px]" />

            <div className="mt-4">
              <label htmlFor="phoneOtp" className="auth-label">SMS OTP</label>
              <input
                id="phoneOtp"
                type="text"
                value={phoneOtp}
                onChange={(event) => setPhoneOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter the code from SMS"
                className="auth-input text-center tracking-[0.35em]"
                maxLength={6}
              />
            </div>

            {phoneStatus ? <div className={`mt-3 auth-status-banner ${phoneStatusTone}`}>{phoneStatus}</div> : null}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleVerifyPhoneOtp}
                disabled={phoneSending || phoneVerifying}
                className="auth-primary-button"
              >
                {phoneVerifying ? 'Verifying...' : 'Confirm SMS OTP'}
              </button>
              <button
                type="button"
                onClick={handleSendPhoneOtp}
                disabled={phoneSending || emailSubmitting || phoneVerifying}
                className="auth-secondary-button"
              >
                {phoneSending ? 'Sending...' : 'Resend OTP'}
              </button>
            </div>
          </div>
        ) : null}
      </form>
    </AuthShell>
  );
};

export default RegisterStep2;
