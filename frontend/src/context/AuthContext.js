import { createContext, useState, useContext, useCallback, useEffect, useRef } from 'react';
import API from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  const refreshTimerRef = useRef(null);

  const login = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', userData.token);
    setUser(userData);
  };

  const logout = useCallback(() => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const { data } = await API.get('/auth/me');
      const updatedUser = { ...data, token };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      return updatedUser;
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
      }
    }
  }, [logout]);

  // ── Auto-refresh token every 6 days ──────────────────────────────
  // Token expires in 7 days — refresh at 6 days to stay ahead
  const startTokenRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);

    const SIX_DAYS = 6 * 24 * 60 * 60 * 1000;

    refreshTimerRef.current = setInterval(async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const { data } = await API.post('/auth/refresh');
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const updatedUser = { ...currentUser, token: data.token };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        localStorage.setItem('token', data.token);
        setUser(updatedUser);
        console.log('JWT token refreshed successfully');
      } catch (err) {
        console.warn('Token refresh failed:', err.message);
        if (err.response?.status === 401) {
          logout();
        }
      }
    }, SIX_DAYS);
  }, [logout]);

  // ── Session expiry warning ────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      // Decode token payload to check expiry
      const payload    = JSON.parse(atob(token.split('.')[1]));
      const expiresAt  = payload.exp * 1000;
      const now        = Date.now();
      const timeLeft   = expiresAt - now;
      const WARNING_MS = 30 * 60 * 1000; // warn 30 minutes before expiry

      if (timeLeft < WARNING_MS && timeLeft > 0) {
        console.warn('Session expires soon — refreshing token');
        // Refresh immediately if less than 30 minutes remain
        API.post('/auth/refresh')
          .then(({ data }) => {
            const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
            const updatedUser = { ...currentUser, token: data.token };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            localStorage.setItem('token', data.token);
            setUser(updatedUser);
          })
          .catch(() => logout());
      }

      if (timeLeft <= 0) {
        // Token already expired
        logout();
        return;
      }

    } catch {
      // Token is malformed
      logout();
      return;
    }

    // Start the 6-day refresh cycle
    startTokenRefresh();

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [user?._id]);

  // ── Refresh user data on app load ────────────────────────────────
  useEffect(() => {
    if (user) refreshUser();
  }, []);

  window.__auth__ = { user, refreshUser };

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);