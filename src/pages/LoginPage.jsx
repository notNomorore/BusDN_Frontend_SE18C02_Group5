import React from 'react';
import AuthShell from '../components/auth/AuthShell';
import Login from '../components/Login';

const LoginPage = () => (
  <AuthShell
    layout="split"
    badge="Sign In"
    sideTitle="Sign in to continue every BusDN trip from one place."
    sideDescription="Access ticket booking, profile updates, priority registration, and trip history without leaving the frontend app."
    showStepRail={false}
  >
    <Login />
  </AuthShell>
);

export default LoginPage;
