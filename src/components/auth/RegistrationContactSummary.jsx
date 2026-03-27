import React from 'react';

const METHOD_LABELS = {
  EMAIL: 'Email',
  PHONE: 'Phone',
  AUTO: 'Auto',
};

const getTextValue = (value, fallback) => {
  const normalized = String(value || '').trim();
  return normalized || fallback;
};

const getMethodLabel = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  return METHOD_LABELS[normalized] || getTextValue(value, 'Pending');
};

const SummaryField = ({ label, value, valueClassName = '' }) => (
  <div className="min-w-0 rounded-2xl border border-[#dbe5e1] bg-white/75 px-4 py-3">
    <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#426656]">{label}</span>
    <p className={`mt-1.5 text-sm font-semibold text-[#001a0f] ${valueClassName}`}>{value}</p>
  </div>
);

const RegistrationContactSummary = ({
  fullName,
  contactValue,
  contactType,
  eyebrow = 'Verification contact',
}) => {
  return (
    <div className="auth-surface-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#426656]">{eyebrow}</span>
          <p className="mt-1 text-xs leading-5 text-[#466a5a]">
            Review the destination before continuing to the next registration step.
          </p>
        </div>

        <div className="min-w-[9rem] rounded-2xl border border-[#cfe3da] bg-[#f7fcfa] px-4 py-3 text-left sm:text-right">
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#426656]">Method</span>
          <div className="mt-2 inline-flex rounded-full bg-[#c1e9d5] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#17503a]">
            {getMethodLabel(contactType)}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <SummaryField label="Name" value={getTextValue(fullName, 'Passenger')} />
        <SummaryField
          label="Contact"
          value={getTextValue(contactValue, 'Pending')}
          valueClassName="break-all leading-6"
        />
      </div>
    </div>
  );
};

export default RegistrationContactSummary;
