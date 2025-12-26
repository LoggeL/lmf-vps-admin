import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface AuthState {
  loading: boolean;
  authenticated: boolean;
  needsSetup: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    loading: true,
    authenticated: false,
    needsSetup: false
  });

  const checkAuth = async () => {
    try {
      const status = await api.getAuthStatus();
      setState({
        loading: false,
        authenticated: status.authenticated,
        needsSetup: status.needsSetup
      });
    } catch {
      setState({ loading: false, authenticated: false, needsSetup: true });
    }
  };

  useEffect(() => {
    checkAuth();
    
    // Periodically check auth status to catch expired sessions
    const interval = setInterval(checkAuth, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const login = async (password: string) => {
    await api.login(password);
    setState(s => ({ ...s, authenticated: true }));
  };

  const setup = async (password: string) => {
    await api.setup(password);
    setState(s => ({ ...s, authenticated: true, needsSetup: false }));
  };

  const logout = async () => {
    await api.logout();
    setState(s => ({ ...s, authenticated: false }));
  };

  return { ...state, login, setup, logout, checkAuth };
}
