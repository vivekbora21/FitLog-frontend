'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from './api';
import { User } from './types';

interface RegisterPayload {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Keeps the server's per-user timezone (used for every "today" boundary: plan day
// numbering, nutrition date, exercise-calorie attribution) in sync with the browser's
// actual timezone. Best-effort and silent — never blocks sign-in if it fails.
function syncDeviceTimezone(userData: User) {
  try {
    const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (deviceTimezone && deviceTimezone !== userData.profile?.timezone) {
      api.updateMe({ profile: { timezone: deviceTimezone } }).catch(() => {});
    }
  } catch {
    // Never let timezone detection itself break sign-in.
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const login = async (email: string, password: string): Promise<User> => {
    await api.login(email, password);
    const userData = await api.getMe();
    setUser(userData);
    syncDeviceTimezone(userData);
    return userData;
  };

  const register = async (payload: RegisterPayload): Promise<User> => {
    await api.register(payload);
    const userData = await api.getMe();
    setUser(userData);
    syncDeviceTimezone(userData);
    return userData;
  };

  const logout = () => {
    api.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const userData = await api.getMe();
      setUser(userData);
      syncDeviceTimezone(userData);
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  useEffect(() => {
    async function bootstrap() {
      if (api.getToken()) {
        try {
          const userData = await api.getMe();
          setUser(userData);
          syncDeviceTimezone(userData);
        } catch (err) {
          api.logout();
        }
      }
      setLoading(false);
    }
    bootstrap();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
