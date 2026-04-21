// ============================================
// Auth Context — wraps auth service for React tree
// ============================================

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getApiStatus, sessionEvents } from '../services/sheets';
import { getUserByEmail } from '../config/team';
import type { GoogleUser } from '../services/auth';

interface ApiStatus {
  connected: boolean;
  authenticated: boolean;
}

interface AuthContextValue {
  user: GoogleUser | null;
  apiStatus: ApiStatus;
  login: (userData: GoogleUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<GoogleUser | null>(() => {
    const saved = localStorage.getItem('user_email');
    if (saved) {
      const team = getUserByEmail(saved);
      if (team) {
        return {
          email: saved,
          name: team.name,
          picture: '',
          domain: 'gazaskygeeks.com',
          role: team.role,
          isAuthorized: true,
        };
      }
    }
    return null;
  });
  const [apiStatus, setApiStatus] = useState<ApiStatus>(getApiStatus());

  useEffect(() => {
    const handleSessionEvent = () => setApiStatus(getApiStatus());
    sessionEvents.addEventListener('session-expired', handleSessionEvent);
    window.addEventListener('focus', handleSessionEvent);
    return () => {
      sessionEvents.removeEventListener('session-expired', handleSessionEvent);
      window.removeEventListener('focus', handleSessionEvent);
    };
  }, []);

  const login = useCallback((userData: GoogleUser) => {
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('user_email');
    localStorage.removeItem('google_token');
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('token_expiry');
    localStorage.removeItem('user_role');
  }, []);

  return (
    <AuthContext.Provider value={{ user, apiStatus, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider');
  return ctx;
}
