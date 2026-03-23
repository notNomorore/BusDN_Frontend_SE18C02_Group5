import { createContext, useState, useEffect } from 'react';
import React from 'react'
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('authorization') || null);
  const [userId, setUserId] = useState(localStorage.getItem('userId') || null);
  const [userRole, setUserRole] = useState(localStorage.getItem('userRole') || null);
  const [isFirstLogin, setIsFirstLogin] = useState(localStorage.getItem('isFirstLogin') === 'true');
  const [userStatus, setUserStatus] = useState(localStorage.getItem('userStatus') || null);
  const [activationRequired, setActivationRequired] = useState(localStorage.getItem('activationRequired') === 'true');


  const login = (newToken, newUser, role, firstLogin = false, status = null, requiresActivation = false) => {
    localStorage.setItem('authorization', newToken);
    localStorage.setItem('userId', newUser);
    localStorage.setItem('isFirstLogin', firstLogin ? 'true' : 'false');
    if (status) {
      localStorage.setItem('userStatus', status);
      setUserStatus(status);
    } else {
      localStorage.removeItem('userStatus');
      setUserStatus(null);
    }
    localStorage.setItem('activationRequired', requiresActivation ? 'true' : 'false');
    setActivationRequired(!!requiresActivation);
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
    localStorage.removeItem('userStatus');
    localStorage.removeItem('activationRequired');
    setToken('');
    setUserId(null);
    setUserRole(null);
    setIsFirstLogin(false);
    setUserStatus(null);
    setActivationRequired(false);
  };

  const completeActivation = () => {
    localStorage.setItem('activationRequired', 'false');
    localStorage.setItem('isFirstLogin', 'false');
    localStorage.setItem('userStatus', 'ACTIVE');
    setActivationRequired(false);
    setIsFirstLogin(false);
    setUserStatus('ACTIVE');
  };

  useEffect(() => {
    const handleStorage = () => {
      setToken(localStorage.getItem('authorization'));
      setUserId(localStorage.getItem('userId'));
      setUserRole(localStorage.getItem('userRole'));
      setIsFirstLogin(localStorage.getItem('isFirstLogin') === 'true');
      setUserStatus(localStorage.getItem('userStatus'));
      setActivationRequired(localStorage.getItem('activationRequired') === 'true');
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <AuthContext.Provider value={{ token, userId, userRole, isFirstLogin, userStatus, activationRequired, setIsFirstLogin, setUserStatus, setActivationRequired, login, logout, completeActivation }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
