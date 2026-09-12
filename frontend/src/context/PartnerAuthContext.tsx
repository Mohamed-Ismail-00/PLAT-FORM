import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export interface PartnerUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  partner_slug: 'elswedy';
  partner_role: 'partner_admin' | 'partner_viewer';
}

interface PartnerAuthContextValue {
  user: PartnerUser | null;
  loading: boolean;
  login: (token: string, user: PartnerUser, rememberMe?: boolean) => void;
  logout: () => void;
}

const PartnerAuthContext = createContext<PartnerAuthContextValue | undefined>(undefined);

const clearPartnerSession = () => {
  localStorage.removeItem('partner_access_token');
  localStorage.removeItem('partner_user');
  sessionStorage.removeItem('partner_access_token');
  sessionStorage.removeItem('partner_user');
};

export const PartnerAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<PartnerUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storage = localStorage.getItem('partner_access_token') && localStorage.getItem('partner_user')
        ? localStorage
        : sessionStorage;
      const storedUser = storage.getItem('partner_user');
      const token = storage.getItem('partner_access_token');
      setUser(storedUser && token ? JSON.parse(storedUser) as PartnerUser : null);
    } catch {
      clearPartnerSession();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = (token: string, loggedUser: PartnerUser, rememberMe = false) => {
    clearPartnerSession();
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('partner_access_token', token);
    storage.setItem('partner_user', JSON.stringify(loggedUser));
    setUser(loggedUser);
  };

  const logout = () => {
    clearPartnerSession();
    setUser(null);
  };

  return (
    <PartnerAuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </PartnerAuthContext.Provider>
  );
};

export const usePartnerAuth = () => {
  const context = useContext(PartnerAuthContext);
  if (!context) throw new Error('usePartnerAuth must be used within PartnerAuthProvider');
  return context;
};
