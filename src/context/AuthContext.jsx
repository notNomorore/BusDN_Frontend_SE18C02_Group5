import { createContext, useState, useEffect } from 'react';
import React from 'react'
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('authorization') || null);
  const [userId, setUserId] = useState(localStorage.getItem('userId') || null);
  const [userRole, setUserRole] = useState(localStorage.getItem('userRole') || null);
  const [isFirstLogin, setIsFirstLogin] = useState(localStorage.getItem('isFirstLogin') === 'true');


  const login = (newToken, newUser, role, firstLogin = false) => {
    localStorage.setItem('authorization', newToken);
    localStorage.setItem('userId', newUser);
    localStorage.setItem('isFirstLogin', firstLogin ? 'true' : 'false');
    if (role) {
      localStorage.setItem('userRole', role);
      setUserRole(role);
    }
    setToken(newToken);
    setUserId(newUser);
    setIsFirstLogin(!!firstLogin);
  }

  const logout = () => {
    localStorage.removeItem('authorization');
    localStorage.removeItem('userId');
    localStorage.removeItem('userRole');
    localStorage.removeItem('isFirstLogin');
    setToken('');
    setUserId(null);
    setUserRole(null);
    setIsFirstLogin(false);
  };

  useEffect(() => {
    const handleStorage = () => {
      setToken(localStorage.getItem('authorization'));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <AuthContext.Provider value={{ token, userId, userRole, isFirstLogin, setIsFirstLogin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;