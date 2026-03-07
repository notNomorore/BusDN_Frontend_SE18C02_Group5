import { createContext, useState, useEffect } from 'react';
import React from 'react'
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('authorization') || null);
  const [userId, setUserId] = useState(localStorage.getItem('userId') || null);
  const [userRole, setUserRole] = useState(localStorage.getItem('userRole') || null);


  const login = (newToken, newUser, role) => {
    localStorage.setItem('authorization', newToken);
    localStorage.setItem('userId', newUser);
    if (role) {
      localStorage.setItem('userRole', role);
      setUserRole(role);
    }
    setToken(newToken);
    setUserId(newUser);
  }

  const logout = () => {
    localStorage.removeItem('authorization');
    localStorage.removeItem('userId');
    localStorage.removeItem('userRole');
    setToken('');
    setUserId(null);
    setUserRole(null);
  };

  useEffect(() => {
    const handleStorage = () => {
      setToken(localStorage.getItem('authorization'));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <AuthContext.Provider value={{ token, userId, userRole, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;