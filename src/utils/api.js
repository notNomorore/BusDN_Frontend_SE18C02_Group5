import axios from 'axios';

// The proxy in vite.config.js handles routing /api to localhost:3000
const api = axios.create({
    baseURL: '/',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Important for session cookies
});

// Add a request interceptor to inject the token if we use JWT instead of sessions
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('authorization') || localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        }
        if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
            if (typeof config.headers?.setContentType === 'function') {
                config.headers.setContentType(undefined);
            } else if (config.headers) {
                delete config.headers['Content-Type'];
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
