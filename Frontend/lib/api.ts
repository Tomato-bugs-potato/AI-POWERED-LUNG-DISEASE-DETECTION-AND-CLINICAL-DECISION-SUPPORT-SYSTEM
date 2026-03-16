import axios from 'axios';
import { getAccessToken, refreshAccessToken, clearTokens } from './auth';

const normalizeApiBase = (url: string) => {
    const trimmed = url.replace(/\/+$/, '');
    return trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`;
};

const API_BASE_URL = normalizeApiBase(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1');

const isPublicCasesRoute = () =>
    typeof window !== 'undefined' && window.location.pathname.startsWith('/doctor/cases');

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    (config) => {
        let token = getAccessToken();
        // Fallback: read from cookie if in-memory token is not set
        if (!token && typeof document !== 'undefined') {
            const match = document.cookie.match(/(?:^|;\s*)access_token=([^;]*)/);
            if (match) token = decodeURIComponent(match[1]);
        }
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Handle 401 Unauthorized
        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isPublicCasesRoute()) {
                return Promise.reject(error);
            }
            originalRequest._retry = true;

            try {
                const newAccessToken = await refreshAccessToken();
                if (originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                }
                return api(originalRequest); // Retry request with new token
            } catch (refreshError) {
                clearTokens();
                if (typeof window !== 'undefined') {
                    window.location.href = '/login?expired=true';
                }
                return Promise.reject(refreshError);
            }
        }

        // Handle 403 Forbidden
        if (error.response?.status === 403) {
            if (typeof window !== 'undefined') {
                const { toast } = await import('sonner');
                toast.error('Access Denied');
            }
        }

        // Handle 500 Internal Server Error
        if (error.response?.status === 500) {
            if (typeof window !== 'undefined') {
                const { toast } = await import('sonner');
                toast.error('Something went wrong. Please try again.');
            }
        }

        return Promise.reject(error);
    }
);

export default api;
