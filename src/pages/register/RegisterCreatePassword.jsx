import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiArrowRight, FiCheckCircle, FiEye, FiEyeOff, FiLock } from 'react-icons/fi';
import AuthShell from '../../components/auth/AuthShell';
import RegistrationContactSummary from '../../components/auth/RegistrationContactSummary';
import api from '../../utils/api';
import {
  PASSWORD_RULES,
  clearRegistrationState,
  extractHtmlErrorMessage,
  getResponsePath,
  getServerMessage,
  isRegistrationSessionExpiredPath,
  loadRegistrationState,
} from '../../services/registrationFlowService';

const RegisterCreatePassword = () => {
  const navigate = useNavigate();
  const [registrationState, setRegistrationState] = useState(() => loadRegistrationState());
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const currentState = loadRegistrationState();

    if (!currentState.fullName || !currentState.contactValue) {
      navigate('/register/step-1', { replace: true });
      return;
    }

    setRegistrationState(currentState);
  }, [navigate]);

  const passedRules = PASSWORD_RULES.filter((rule) => rule.test(password));
  const allRulesPassed = passedRules.length === PASSWORD_RULES.length;
  const passwordMatches = confirmPassword !== '' && password === confirmPassword;

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!allRulesPassed) {
      setError('Password does not meet all required rules.');
      return;
    }

    if (!passwordMatches) {
      setError('Confirm password must match.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await api.post('/create-password', {
        password,
        confirmPassword,
      });

      const responsePath = getResponsePath(response);

      if (responsePath.includes('/login')) {
        clearRegistrationState();
        navigate('/login?registered=1', { replace: true });
        return;
      }

      if (isRegistrationSessionExpiredPath(responsePath)) {
        clearRegistrationState();
        navigate('/register/step-1', { replace: true });
        throw new Error('Registration session expired. Please start again.');
      }

      throw new Error(extractHtmlErrorMessage(response.data) || 'Unable to create the account.');
    } catch (requestError) {
      setError(getServerMessage(requestError, 'Unable to create the account.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      badge="Registration"
      step={4}
      title="Step 4: Create your password"
      description="Set the final password for your passenger account. The account is created only after backend approval."
      headerIcon={FiLock}
      footer={(
        <>
          <p className="text-xs font-medium text-[#426656]">
            Creating account for <span className="font-bold text-[#001a0f]">{registrationState.fullName}</span>
          </p>
          <Link
            to={`/register/verify-otp?method=${registrationState.contactType === 'PHONE' ? 'phone' : 'email'}`}
            className="auth-ghost-button no-underline"
          >
            <FiArrowLeft className="text-base" />
            Back to OTP step
          </Link>
        </>
      )}
    >
      {error ? <div className="auth-status-banner error">{error}</div> : null}

      <div className="relative">
        <div className="pointer-events-none absolute right-0 top-0 p-4 opacity-[0.06]">
          <FiLock className="text-[84px]" />
        </div>
        <RegistrationContactSummary
          fullName={registrationState.fullName}
          contactValue={registrationState.contactValue}
          contactType={registrationState.contactType}
          eyebrow="Verified destination"
        />
      </div>

      <form onSubmit={handleSubmit} className="auth-form-card flex flex-col gap-5">
        <div className="space-y-2">
          <label htmlFor="password" className="auth-label">New password</label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Create a strong password"
              className="auth-input pr-12"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#426656] transition hover:text-[#001a0f]"
            >
              {showPassword ? <FiEyeOff className="text-lg" /> : <FiEye className="text-lg" />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {PASSWORD_RULES.map((rule) => {
            const passed = rule.test(password);

            return (
              <div
                key={rule.id}
                className={`flex items-center gap-2 text-xs font-medium ${
                  passed ? 'text-[#005234]' : 'text-[#717974]'
                }`}
              >
                <FiCheckCircle className={`shrink-0 text-sm ${passed ? 'text-[#2ba471]' : 'text-[#c1c8c3]'}`} />
                <span className="leading-4">{rule.label}</span>
              </div>
            );
          })}
        </div>

        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="auth-label">Confirm password</label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Re-enter your password"
              className={`auth-input pr-12 ${confirmPassword && !passwordMatches ? 'border-[#f2b8b5]' : ''}`}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((current) => !current)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#426656] transition hover:text-[#001a0f]"
            >
              {showConfirmPassword ? <FiEyeOff className="text-lg" /> : <FiEye className="text-lg" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || !allRulesPassed || !passwordMatches}
          className="auth-primary-button w-full"
        >
          {submitting ? 'Creating account...' : 'Complete registration'}
          <FiArrowRight className="text-base" />
        </button>
      </form>
    </AuthShell>
  );
};

export default RegisterCreatePassword;
