import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaLock, FaEye, FaEyeSlash, FaCheckCircle } from 'react-icons/fa';
import api from '../utils/api';
import AuthContext from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';

const rules = [
    { id: 'length', label: 'Ít nhất 8 ký tự', test: (p) => p.length >= 8 },
    { id: 'upper', label: 'Ít nhất 1 chữ hoa', test: (p) => /[A-Z]/.test(p) },
    { id: 'lower', label: 'Ít nhất 1 chữ thường', test: (p) => /[a-z]/.test(p) },
    { id: 'number', label: 'Ít nhất 1 chữ số', test: (p) => /\d/.test(p) },
    { id: 'special', label: 'Ít nhất 1 ký tự đặc biệt', test: (p) => /[@$!%*?&]/.test(p) },
];

const CreatePassword = () => {
    const { userRole } = useContext(AuthContext);
    const { showAlert } = useDialog();
    const navigate = useNavigate();

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [showCf, setShowCf] = useState(false);
    const [loading, setLoading] = useState(false);
    const [focused, setFocused] = useState(false);

    const passedRules = rules.filter(r => r.test(password));
    const allValid = passedRules.length === rules.length && password === confirm && confirm !== '';

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!allValid) return;
        setLoading(true);
        try {
            const res = await api.post('/api/user/change-password', {
                oldPassword: null,   // first-login: server skips old pw check
                newPassword: password,
                isFirstLogin: true
            });
            if (res.data.ok) {
                showAlert('Đã tạo mật khẩu thành công! Chào mừng bạn.', 'Thành công');
                // Sau khi đổi mật khẩu lần đầu, ưu tiên hoàn thiện hồ sơ cá nhân
                if (userRole === 'DRIVER' || userRole === 'CONDUCTOR') {
                    navigate('/first-login/profile');
                } else if (userRole === 'ADMIN' || userRole === 'STAFF') {
                    navigate('/admin/dashboard');
                } else {
                    navigate('/profile');
                }
            } else {
                showAlert(res.data.message || 'Lỗi tạo mật khẩu.', 'Lỗi');
            }
        } catch (err) {
            showAlert(err.response?.data?.message || 'Lỗi server.', 'Lỗi');
        } finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 px-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-[#23a983] to-[#1a8a6a] px-8 py-6 text-white">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                            <FaLock className="text-white text-lg" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">Tạo mật khẩu mới</h1>
                            <p className="text-white/80 text-sm">Lần đầu đăng nhập — vui lòng đặt mật khẩu cá nhân</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
                    {/* Password */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Mật khẩu mới</label>
                        <div className="relative">
                            <input
                                type={showPw ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                onFocus={() => setFocused(true)}
                                required
                                placeholder="Nhập mật khẩu..."
                                className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-12 focus:ring-2 focus:ring-[#23a983] outline-none text-gray-800"
                            />
                            <button type="button" onClick={() => setShowPw(!showPw)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                {showPw ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                        {/* Rules checklist */}
                        {focused && (
                            <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-100 space-y-1.5">
                                {rules.map(r => {
                                    const ok = r.test(password);
                                    return (
                                        <div key={r.id} className={`flex items-center gap-2 text-sm ${ok ? 'text-green-600 font-semibold' : 'text-gray-500'}`}>
                                            <FaCheckCircle className={ok ? 'text-green-500' : 'text-gray-300'} />
                                            {r.label}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Confirm */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Xác nhận mật khẩu</label>
                        <div className="relative">
                            <input
                                type={showCf ? 'text' : 'password'}
                                value={confirm}
                                onChange={e => setConfirm(e.target.value)}
                                required
                                placeholder="Nhập lại mật khẩu..."
                                className={`w-full border rounded-xl px-4 py-3 pr-12 focus:ring-2 focus:ring-[#23a983] outline-none text-gray-800
                                    ${confirm && password !== confirm ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                            />
                            <button type="button" onClick={() => setShowCf(!showCf)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                {showCf ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                        {confirm && password !== confirm && (
                            <p className="text-red-500 text-xs mt-1">Mật khẩu không khớp</p>
                        )}
                        {confirm && password === confirm && passedRules.length === rules.length && (
                            <p className="text-green-600 text-xs mt-1 flex items-center gap-1"><FaCheckCircle /> Mật khẩu hợp lệ</p>
                        )}
                    </div>

                    <button type="submit" disabled={!allValid || loading}
                        className="w-full bg-[#23a983] hover:bg-[#1a8a6a] text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        {loading ? 'Đang lưu...' : 'Hoàn tất & Đăng nhập'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CreatePassword;
