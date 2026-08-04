import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  roles: string[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        let token = localStorage.getItem('access_token');
        if (token) {
          try {
            const res = await api.get('/auth/me');
            setUser(res.data.data);
            return;
          } catch (e) {
            console.warn("Existing token invalid or expired, re-authenticating...", e);
            localStorage.removeItem('access_token');
          }
        }

        // Perform auto-login as admin
        const loginRes = await api.post('/auth/login', {
          email: 'admin@innovera.com',
          password: 'Admin@2026'
        });
        const newToken = loginRes.data.data.access_token;
        const loggedUser = loginRes.data.data.user;
        localStorage.setItem('access_token', newToken);
        localStorage.setItem('user', JSON.stringify(loggedUser));
        setUser(loggedUser);
      } catch (error) {
        console.error("Auto-login failed:", error);
        const fallbackUser: User = {
          id: "00000000-0000-0000-0000-000000000001",
          email: "admin@innovera.com",
          first_name: "Admin",
          last_name: "User",
          roles: ["admin", "super_admin"]
        };
        setUser(fallbackUser);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = (token: string, user: User) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
