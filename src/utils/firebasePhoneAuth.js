const FIREBASE_SCRIPT_URLS = [
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
];

const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCk3qOQnxRP9Lphy-aPUDF1e0VUSs6Fs9U',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'busdn-se18c02.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'busdn-se18c02',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'busdn-se18c02.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '24020218217',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:24020218217:web:7653e48a118ddaa633cdf8',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-4HZF53NLNW',
};

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

export const ensureFirebasePhoneAuth = async (containerElement, verifierRef) => {
  if (!containerElement) {
    throw new Error('Recaptcha container is unavailable.');
  }

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

  if (!verifierRef.current) {
    verifierRef.current = new firebase.auth.RecaptchaVerifier(containerElement, {
      size: 'normal',
    });
    await verifierRef.current.render();
  }

  return firebase.auth();
};

export const requestPhoneOtp = async ({ phone, containerElement, verifierRef }) => {
  const auth = await ensureFirebasePhoneAuth(containerElement, verifierRef);
  return auth.signInWithPhoneNumber(phone, verifierRef.current);
};

export const clearRecaptchaVerifier = (verifierRef) => {
  try {
    verifierRef?.current?.clear?.();
  } catch {
    // Firebase recaptcha cleanup is best-effort only.
  }

  if (verifierRef) {
    verifierRef.current = null;
  }
};
