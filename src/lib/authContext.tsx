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
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const login = async (email: string, password: string) => {
    await api.login(email, password);
    const userData = await api.getMe();
    setUser(userData);
  };

  const register = async (payload: RegisterPayload) => {
    const data = await api.register(payload);
    setUser(data.user);
  };

  const logout = () => {
    api.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const userData = await api.getMe();
      setUser(userData);
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
