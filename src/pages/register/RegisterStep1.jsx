import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiArrowRight, FiUser } from 'react-icons/fi';
import AuthShell from '../../components/auth/AuthShell';
import api from '../../utils/api';
import {
  clearRegistrationState,
  getServerMessage,
  loadRegistrationState,
  saveRegistrationState,
} from '../../services/registrationFlowService';

const RegisterStep1 = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const currentState = loadRegistrationState();
    setFullName(currentState.fullName || '');
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedName = fullName.trim();

    if (!trimmedName) {
      setError('Please enter your full name.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await api.post('/register-step1', { fullName: trimmedName });
      clearRegistrationState();
      saveRegistrationState({ fullName: trimmedName });
      navigate('/register/step-2');
    } catch (requestError) {
      setError(getServerMessage(requestError, 'Unable to start registration. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      badge="Registration"
      step={1}
      title="Step 1: Personal details"
      description="Start with the full name that will be used for your passenger account."
      headerIcon={FiUser}
      footer={(
        <>
          <p className="text-xs font-medium text-[#426656]">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-[#005234] hover:text-[#003120]">
              Sign in
            </Link>
          </p>
          <Link to="/" className="auth-ghost-button no-underline">
            <FiArrowLeft className="text-base" />
            Back to home
          </Link>
        </>
      )}
    >
      {error ? <div className="auth-status-banner error">{error}</div> : null}

      <div className="auth-surface-card relative overflow-hidden">
        <div className="absolute right-0 top-0 p-4 opacity-5">
          <FiUser className="text-[84px]" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#426656]">Profile</span>
            <span className="mt-1 text-sm font-semibold text-[#001a0f]">{fullName || 'Pending'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#426656]">Contact</span>
            <span className="mt-1 text-sm font-semibold text-[#001a0f]">Choose in step 2</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#426656]">Method</span>
            <span className="mt-1 text-sm font-semibold text-[#001a0f]">Email or phone</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="auth-form-card flex flex-col gap-5">
        <div className="space-y-2">
          <label htmlFor="fullName" className="auth-label">Full name</label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Nguyen Van A"
            autoComplete="name"
            className="auth-input"
            required
          />
        </div>

        <div className="rounded-xl bg-[#ecf6f2] px-4 py-3 text-xs font-medium leading-5 text-[#005234]">
          This step stores `fullName` before moving into contact verification.
        </div>

        <button type="submit" disabled={submitting} className="auth-primary-button w-full">
          {submitting ? 'Saving...' : 'Continue to contact step'}
          <FiArrowRight className="text-base" />
        </button>
      </form>
    </AuthShell>
  );
};

export default RegisterStep1;
