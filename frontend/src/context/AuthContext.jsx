import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

const initialToken = localStorage.getItem('agri_token') || null;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(initialToken);
  const [loading, setLoading] = useState(true);

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('agri_token');
  };

  const login = (userData, userToken) => {
    let actualUser = userData;
    let actualToken = userToken;
    if (typeof userData === 'string' && typeof userToken === 'object') {
      actualUser = userToken;
      actualToken = userData;
    }
    setUser(actualUser);
    setToken(actualToken);
    if (actualToken) {
      localStorage.setItem('agri_token', actualToken);
    }
  };

  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me');
        if (res.data.success) {
          setUser(res.data.user);
        } else {
          logout();
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
        logout();
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
