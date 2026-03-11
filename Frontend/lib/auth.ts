import axios from 'axios';

const normalizeApiBase = (url: string) => {
    const trimmed = url.replace(/\/+$/, '');
    return trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`;
};

const API_BASE_URL = normalizeApiBase(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1');

// In-memory token storage
let accessToken: string | null = null;
let refreshTimeoutId: NodeJS.Timeout | null = null;

export const setAccessToken = (token: string, expiresIn: number) => {
    accessToken = token;
    // Schedule refresh 60 seconds before expiry
    const refreshTime = Math.max(0, (expiresIn - 60) * 1000);

    if (refreshTimeoutId) clearTimeout(refreshTimeoutId);
    refreshTimeoutId = setTimeout(refreshAccessToken, refreshTime);
};

export const getAccessToken = () => accessToken;

export const clearTokens = () => {
    accessToken = null;
    if (refreshTimeoutId) clearTimeout(refreshTimeoutId);
    refreshTimeoutId = null;
    // Let the backend clear the HTTP-only cookie
};

export const refreshAccessToken = async () => {
    try {
        const response = await axios.post(
            `${API_BASE_URL}/auth/refresh`,
            {},
            { withCredentials: true } // Send cookies (refresh token)
        );

        setAccessToken(response.data.access_token, response.data.expires_in);
        return response.data.access_token;
    } catch (error) {
        clearTokens();
        // Redirect to login if in browser
        if (typeof window !== 'undefined') {
            window.location.href = '/login?expired=true';
        }
        throw error;
    }
};
