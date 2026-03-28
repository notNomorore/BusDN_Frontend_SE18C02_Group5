const stripTrailingSlash = (value) => String(value || '').replace(/\/$/, '');

export const API_ORIGIN = stripTrailingSlash(
  import.meta.env.VITE_API_URL
  || `http://127.0.0.1:${import.meta.env.VITE_API_PORT || '3000'}`
);

export const REQUEST_BASE_URL = import.meta.env.PROD ? API_ORIGIN : '';
export const SOCKET_ORIGIN = import.meta.env.PROD
  ? stripTrailingSlash(import.meta.env.VITE_SOCKET_URL || API_ORIGIN)
  : '/';

export const buildApiUrl = (path = '') => {
  if (!path) {
    return REQUEST_BASE_URL;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${REQUEST_BASE_URL}${normalizedPath}`;
};
