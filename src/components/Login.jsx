import React, { useContext, useState } from 'react';
import { Login_Api, Register_API } from '../utils/constant';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import api from '../utils/api';

const Login = ({ onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isOtp, setIsOtp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [number, setNumber] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleForgotPassword = () => {
    if (onClose) onClose();
    navigate('/forgot-password');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsLoading(true);

    try {
      if (isLogin) {
        // Login Flow
        const { data } = await api.post(Login_Api, { email, password });
        setMessage(data.message);
        if (data.token) {
          localStorage.setItem('token', data.token);
          login(data.token, data.user?.id, data.user?.role);

          if (onClose) onClose();

          console.log("Login user info:", data.user);
          console.log("Setting role to:", data.user?.role);

          setTimeout(() => {
            console.log("Executing redirect logic. Current role:", data.user?.role);
            if (data.user?.role === 'ADMIN' || data.user?.role === 'STAFF') {
              console.log("Redirecting to /admin/dashboard via window.location.href");
              window.location.href = '/admin/dashboard';
            } else {
              console.log("Redirecting to /profile via navigate");
              navigate('/profile');
            }
          }, 100);
        }
      } else if (!isOtp) {
        // Registration Flow (Step 1)
        const { data } = await api.post(Register_API, {
          fullName: name,
          email,
          phone: number,
          password
        });
        setMessage(data.message);
        setIsOtp(true); // Switch to OTP view
      } else {
        // OTP Verification (Step 2)
        const { data } = await api.post('/api/auth/verify-otp', {
          email,
          otp
        });
        setMessage(data.message);
        // After successful verification, user still needs to login
        setIsLogin(true);
        setIsOtp(false);
        setPassword('');
      }
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center px-2 bg-opacity-60 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8"
      >
        <h2 className="text-2xl font-bold text-center text-[#101828]">Welcome to BusDN</h2>
        <p className="text-center text-gray-500 mb-6">Your journey starts here</p>

        {!isOtp && (
          <div className="flex mb-6 border border-transparent rounded-lg overflow-hidden text-sm font-semibold">
            <button
              type="button"
              onClick={() => { setIsLogin(true); setMessage(''); }}
              className={`w-1/2 py-2 cursor-pointer ${isLogin ? 'bg-gray-200 text-[#101828]' : 'bg-white text-gray-400'
                }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setMessage(''); }}
              className={`w-1/2 py-2 cursor-pointer ${!isLogin ? 'bg-gray-200 text-[#101828]' : 'bg-white text-gray-400'
                }`}
            >
              Sign Up
            </button>
          </div>
        )}

        {!isOtp ? (
          <>
            {!isLogin && (
              <>
                <label className="font-medium text-black">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Your name"
                  className="w-full mt-1 mb-4 px-4 py-2 border rounded-md text-gray-500 border-gray-300 shadow focus:outline-[#23a983]"
                />
              </>
            )}

            <label className="font-medium text-black">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full mt-1 mb-4 px-4 py-2 border rounded-md text-gray-500 border-gray-300 shadow focus:outline-[#23a983]"
            />

            {!isLogin && (
              <>
                <label className="font-medium text-black">Phone</label>
                <input
                  type="tel"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  required
                  placeholder="Phone number"
                  className="w-full mt-1 mb-4 px-4 py-2 border rounded-md text-gray-500 border-gray-300 shadow focus:outline-[#23a983]"
                />
              </>
            )}

            <label className="font-medium text-black">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              className="w-full mt-1 mb-1 px-4 py-2 border rounded-md text-gray-500 border-gray-300 shadow focus:outline-[#23a983]"
            />
            {isLogin && (
              <div className="flex justify-end mb-4">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-[#23a983] hover:underline font-medium focus:outline-none"
                >
                  Forgot password?
                </button>
              </div>
            )}
            {!isLogin && <div className="mb-4"></div>}
          </>
        ) : (
          <>
            <label className="font-medium text-black">OTP Code</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              placeholder="Enter 6-digit OTP"
              className="w-full mt-1 mb-4 px-4 py-2 border rounded-md text-gray-500 border-gray-300 shadow focus:outline-[#23a983] text-center tracking-[0.5em] font-bold"
              maxLength={6}
            />
          </>
        )}

        <button
          type="submit"
          className="w-full bg-gradient-to-r from-[#23a983] to-[#1ac0a2] text-white font-semibold py-2 rounded-md shadow hover:brightness-110"
        >
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <CircularProgress size={24} color="inherit" />
            </Box>
          ) : isOtp ? (
            'Verify OTP'
          ) : isLogin ? (
            'Sign In'
          ) : (
            'Sign Up'
          )}
        </button>

        {message && (
          <p className={`text-sm text-center mt-3 ${message.toLowerCase().includes('success') || message.toLowerCase().includes('sent') ? 'text-green-500' : 'text-red-500'}`}>{message}</p>
        )}

        {!isOtp && (
          <div className="text-center mt-4 text-sm text-gray-600">
            {isLogin ? 'Don’t have an account?' : 'Already have an account?'}{' '}
            <span
              onClick={() => { setIsLogin(!isLogin); setMessage(''); }}
              className="text-[#23a983] cursor-pointer hover:underline font-medium"
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </span>
          </div>
        )}
      </form>
    </div>
  );
};

export default Login;
