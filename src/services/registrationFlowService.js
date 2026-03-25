export const OTP_RESEND_SECONDS = 60;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^\+?\d{9,15}$/;
export const REGISTRATION_STORAGE_KEY = 'busdn:registration-flow';

export const REGISTRATION_STEPS = [
  {
    id: 1,
    title: 'Thong tin ca nhan',
    description: 'Nhap ho va ten de bat dau.',
  },
  {
    id: 2,
    title: 'Lien he',
    description: 'Chon email hoac so dien thoai.',
  },
  {
    id: 3,
    title: 'Xac thuc',
    description: 'Nhap OTP hoac xac nhan so dien thoai.',
  },
  {
    id: 4,
    title: 'Tao mat khau',
    description: 'Hoan tat tai khoan hanh khach.',
  },
];

export const PASSWORD_RULES = [
  { id: 'length', label: 'At least 8 characters', test: (value) => value.length >= 8 },
  { id: 'upper', label: 'At least 1 uppercase letter', test: (value) => /[A-Z]/.test(value) },
  { id: 'lower', label: 'At least 1 lowercase letter', test: (value) => /[a-z]/.test(value) },
  { id: 'number', label: 'At least 1 number', test: (value) => /\d/.test(value) },
  { id: 'special', label: 'At least 1 special character (@$!%*?&)', test: (value) => /[@$!%*?&]/.test(value) },
];

const DEFAULT_FLOW_STATE = {
  fullName: '',
  contactType: '',
  contactValue: '',
  otpDestination: '',
  phoneVerified: false,
  contactVerified: false,
};

export const loadRegistrationState = () => {
  if (typeof window === 'undefined') return DEFAULT_FLOW_STATE;

  try {
    const raw = window.sessionStorage.getItem(REGISTRATION_STORAGE_KEY);
    if (!raw) return DEFAULT_FLOW_STATE;
    return { ...DEFAULT_FLOW_STATE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_FLOW_STATE;
  }
};

export const saveRegistrationState = (patch) => {
  if (typeof window === 'undefined') return { ...DEFAULT_FLOW_STATE, ...patch };

  const nextState = { ...loadRegistrationState(), ...patch };
  window.sessionStorage.setItem(REGISTRATION_STORAGE_KEY, JSON.stringify(nextState));
  return nextState;
};

export const clearRegistrationState = () => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(REGISTRATION_STORAGE_KEY);
};

export const getResponseUrl = (response) => response?.request?.responseURL || '';

export const getResponsePath = (response) => {
  const responseUrl = getResponseUrl(response);
  if (!responseUrl) return '';

  try {
    return new URL(responseUrl).pathname;
  } catch {
    return responseUrl;
  }
};

export const extractHtmlErrorMessage = (payload) => {
  if (typeof payload !== 'string' || !payload.trim().startsWith('<')) return '';

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(payload, 'text/html');
    const selectors = ['.auth-alert.error', '.alert.error', '.auth-alert', '.alert'];

    for (const selector of selectors) {
      const element = doc.querySelector(selector);
      const message = element?.textContent?.trim();
      if (message) return message;
    }
  } catch {
    return '';
  }

  return '';
};

export const getServerMessage = (error, fallback) => {
  const htmlMessage = extractHtmlErrorMessage(error?.response?.data);
  if (htmlMessage) return htmlMessage;

  const dataMessage = error?.response?.data?.message;
  if (dataMessage) return dataMessage;

  const directMessage = error?.message;
  if (directMessage) return directMessage;

  return fallback;
};

export const isRegistrationSessionExpiredPath = (path) => (
  path.includes('/register-step1')
  || path.includes('/register-step2')
);

export const maskPhone = (phone) => {
  if (!phone) return '';

  const visibleTail = phone.slice(-3);
  const maskedHead = phone
    .slice(0, Math.max(phone.length - 3, 0))
    .replace(/\d/g, '*');

  return `${maskedHead}${visibleTail}`;
};
