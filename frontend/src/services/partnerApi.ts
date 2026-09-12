import axios from 'axios';

const getBaseURL = () => {
  const isLocalHost = typeof window !== 'undefined'
    && ['localhost', '127.0.0.1'].includes(window.location.hostname);

  // Local partner testing must go through Vite's proxy so it never depends
  // on a stale deployment URL or browser CORS state.
  if (isLocalHost) return '/api/v1';

  if (import.meta.env.VITE_API_URL) {
    const configuredUrl = import.meta.env.VITE_API_URL.trim();
    const url = /^https?:\/\//i.test(configuredUrl)
      ? configuredUrl
      : `${import.meta.env.PROD ? 'https' : 'http'}://${configuredUrl}`;
    const normalizedUrl = url.replace(/\/+$/, '');
    return normalizedUrl.endsWith('/api/v1') ? normalizedUrl : `${normalizedUrl}/api/v1`;
  }
  // Use the Vite dev proxy locally and the same-origin API in production.
  // This keeps the partner workspace independent from browser CORS/network quirks.
  return '/api/v1';
};

/** Dedicated client: it never reads or writes the platform admin session. */
const partnerApi = axios.create({
  baseURL: getBaseURL(),
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

partnerApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('partner_access_token') || sessionStorage.getItem('partner_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

partnerApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('partner_access_token');
      localStorage.removeItem('partner_user');
      sessionStorage.removeItem('partner_access_token');
      sessionStorage.removeItem('partner_user');
    }
    return Promise.reject(error);
  },
);

export default partnerApi;
