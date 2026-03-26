import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import CircularProgress from '@mui/material/CircularProgress';
import { MdOutlineMail } from "react-icons/md";
import { LuLock } from "react-icons/lu";

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [step, setStep] = useState(1); // 1: Request OTP, 2: Reset Password
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleRequestOtp = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');
        setError('');

        try {
            const normalizedEmail = email.trim().toLowerCase();
            const { data } = await api.post('/api/auth/forgot-password', { email: normalizedEmail });
            setMessage(data.message || 'OTP sent to your email.');
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.message || 'Error connecting to server.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');
        setError('');

        try {
            const { data } = await api.post('/api/auth/reset-password', {
                email: email.trim().toLowerCase(),
                otp: otp.trim(),
                newPassword
            });
            setMessage(data.message || 'Password reset successfully! Redirecting to login...');
            setTimeout(() => {
                navigate('/login?reset=1');
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Error connecting to server.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className='flex justify-center items-center h-screen bg-[#f5fefa] px-4'>
            <div className='bg-white shadow-2xl p-8 rounded-xl w-full max-w-md border border-gray-100'>
                <div className='text-center mb-6'>
                    <h2 className='text-3xl font-bold text-gray-800 mb-2'>
                        {step === 1 ? 'Forgot Password?' : 'Reset Password'}
                    </h2>
                    <p className='text-gray-500'>
                        {step === 1
                            ? "Enter your registered email to receive an OTP."
                            : "Enter the OTP sent to your email and your new password."}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium border border-red-100">
                        {error}
                    </div>
                )}

                {message && (
                    <div className="bg-green-50 text-green-700 p-3 rounded-lg mb-4 text-sm font-medium border border-green-100">
                        {message}
                    </div>
                )}

                {step === 1 ? (
                    <form onSubmit={handleRequestOtp} className='flex flex-col gap-4'>
                        <div>
                            <label className='font-semibold text-gray-700 block mb-1'>Email Address</label>
                            <div className="relative">
                                <MdOutlineMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    className='w-full pl-10 pr-4 py-2.5 border border-gray-300 focus:border-[#23a983] outline-none rounded-lg'
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className='bg-[#23a983] mt-2 text-white font-semibold flex justify-center items-center py-2.5 rounded-lg hover:bg-[#1db179] transition-colors disabled:opacity-70'
                        >
                            {isLoading ? <CircularProgress size={24} style={{ color: 'white' }} /> : 'Send OTP'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleResetPassword} className='flex flex-col gap-4'>
                        <div>
                            <label className='font-semibold text-gray-700 block mb-1'>OTP Code</label>
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                placeholder="Enter 6-digit OTP"
                                className='w-full px-4 py-2.5 border border-gray-300 focus:border-[#23a983] outline-none rounded-lg tracking-widest text-center'
                                maxLength={6}
                                required
                            />
                        </div>

                        <div>
                            <label className='font-semibold text-gray-700 block mb-1'>New Password</label>
                            <div className="relative">
                                <LuLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    className='w-full pl-10 pr-4 py-2.5 border border-gray-300 focus:border-[#23a983] outline-none rounded-lg'
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className='bg-[#23a983] mt-2 text-white font-semibold flex justify-center items-center py-2.5 rounded-lg hover:bg-[#1db179] transition-colors disabled:opacity-70'
                        >
                            {isLoading ? <CircularProgress size={24} style={{ color: 'white' }} /> : 'Reset Password'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            className='bg-transparent text-[#23a983] font-semibold text-sm hover:underline mt-2'
                        >
                            Resend OTP
                        </button>
                    </form>
                )}

                <div className='mt-6 text-center text-sm font-medium'>
                    Remembered your password? <Link to="/login" className='text-[#23a983] hover:underline cursor-pointer'>Sign In</Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
