// Real backend-backed auth service (JWT). Keeps the same call signatures the
// UI already relies on, so no page changes are required.
import api, { apiError, setToken, getToken } from './apiClient';

export const authService = {
  async signUp(payload) {
    try {
      const { data } = await api.post('/auth/register', {
        fullName: payload.fullName,
        username: payload.username,
        email: payload.email,
        password: payload.password,
        phone: payload.phone || '',
        country: payload.country || '',
        accountType: payload.accountType,
        profilePhoto: payload.profilePhoto || '',
      });
      setToken(data.token);
      return data.user;
    } catch (e) {
      throw new Error(apiError(e));
    }
  },

  async login({ identifier, password }) {
    try {
      const { data } = await api.post('/auth/login', { identifier, password });
      setToken(data.token);
      return data.user;
    } catch (e) {
      throw new Error(apiError(e));
    }
  },

  async logout() {
    setToken('');
  },

  // Async session hydration against the backend.
  async fetchCurrentUser() {
    if (!getToken()) return null;
    try {
      const { data } = await api.get('/auth/me');
      return data;
    } catch {
      setToken('');
      return null;
    }
  },

  async updateProfile(_userId, patch) {
    try {
      const { data } = await api.put('/auth/me', patch);
      return data;
    } catch (e) {
      throw new Error(apiError(e));
    }
  },

  async requestPasswordReset(email) {
    try {
      await api.post('/auth/forgot-password', { email });
      return { ok: true };
    } catch (e) {
      throw new Error(apiError(e));
    }
  },
};

// Utility: compute profile completion %
export function computeProfileCompletion(user) {
  if (!user) return 0;
  const checks = [
    !!user.fullName,
    !!user.username,
    !!user.email,
    !!user.phone,
    !!user.country,
    !!user.profilePhoto,
    (user.skills && user.skills.length > 0) || (user.services && user.services.length > 0) || !!(user.company && user.company.name),
    !!user.accountType,
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}
