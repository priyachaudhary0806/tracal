import axios from 'axios';
import Cookies from 'js-cookie';

// Determine base URL for API calls.
// If NEXT_PUBLIC_API_URL is defined (e.g., production), use it.
// Otherwise fall back to a relative '/api' so the request works when the
// frontend and backend share the same origin (common during local dev).
const baseURL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : '/api';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: automatically attach Authorization: Bearer <token>
// from cookies in browser environments if not already manually provided.
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      try {
        const token = Cookies.get('token');
        if (token && !config.headers.Authorization) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch {
        // Silently continue if cookies cannot be accessed
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
