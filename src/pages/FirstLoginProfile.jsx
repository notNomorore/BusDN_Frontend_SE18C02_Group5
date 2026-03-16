import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUserCircle, FaPhone, FaUserTie, FaArrowRight } from 'react-icons/fa';
import AuthContext from '../context/AuthContext';
import api from '../utils/api';
import { useDialog } from '../context/DialogContext';

const FirstLoginProfile = () => {
    const { token, userRole, setIsFirstLogin } = useContext(AuthContext);
    const { showAlert } = useDialog();
    const navigate = useNavigate();

    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!token) {
            navigate('/');
            return;
        }

        const fetchProfile = async () => {
            try {
                const res = await api.get('/api/user/profile');
                if (res.data.ok && res.data.user) {
                    const user = res.data.user;
                    setFullName(user.fullName || '');
                    setPhone(user.phone || '');
                }
            } catch (err) {
                console.error('Error loading profile for first-login:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [token, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!fullName.trim() || !phone.trim()) {
            showAlert('Vui lòng điền đầy đủ Họ tên và Số điện thoại.', 'Thiếu thông tin');
            return;
        }

        setSaving(true);
        try {
            const res = await api.post('/api/user/update-profile', {
                fullName: fullName.trim(),
                phone: phone.trim(),
            });
            if (res.data.ok) {
                showAlert('Đã lưu hồ sơ cá nhân. Chúc bạn một ca làm việc an toàn!', 'Thành công');
                // Đánh dấu đã qua bước first-login để UX thống nhất
                setIsFirstLogin(false);

                if (userRole === 'DRIVER') {
                    navigate('/driver/schedule');
                } else if (userRole === 'CONDUCTOR') {
                    navigate('/conductor/schedule');
                } else if (userRole === 'ADMIN' || userRole === 'STAFF') {
                    navigate('/admin/dashboard');
                } else {
                    navigate('/profile');
                }
            } else {
                showAlert(res.data.message || 'Không thể cập nhật hồ sơ.', 'Lỗi');
            }
        } catch (err) {
            console.error(err);
            showAlert(err.response?.data?.message || 'Lỗi server khi cập nhật hồ sơ.', 'Lỗi');
        } finally {
            setSaving(false);
        }
    };

    if (!token) return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 flex items-center justify-center px-4">
            <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col md:flex-row">
                {/* Left side: intro */}
                <div className="md:w-1/2 bg-[#023047] text-white p-8 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                                <FaUserTie className="text-2xl text-emerald-300" />
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.15em] text-emerald-200 font-semibold">
                                    Bước 2 · Hoàn thiện hồ sơ
                                </p>
                                <h1 className="text-2xl font-bold leading-tight">
                                    Hồ sơ tài xế / phụ xe
                                </h1>
                            </div>
                        </div>
                        <p className="text-sm text-emerald-50/90 mb-6">
                            Để trung tâm điều hành và hành khách liên hệ dễ dàng hơn, vui lòng kiểm tra lại
                            họ tên và số điện thoại của bạn. Thao tác này chỉ diễn ra ở lần đăng nhập đầu tiên.
                        </p>
                        <ul className="space-y-2 text-sm">
                            <li className="flex gap-2">
                                <span className="text-emerald-300 mt-0.5">✔</span>
                                <span>Cập nhật nhanh thông tin liên hệ cá nhân.</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-emerald-300 mt-0.5">✔</span>
                                <span>Giúp điều phối liên lạc kịp thời khi có sự cố.</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-emerald-300 mt-0.5">✔</span>
                                <span>Có thể chỉnh sửa lại trong trang Hồ sơ bất kỳ lúc nào.</span>
                            </li>
                        </ul>
                    </div>
                    <p className="mt-6 text-xs text-emerald-100/80">
                        Dữ liệu được bảo mật theo chính sách nội bộ, chỉ sử dụng cho vận hành và chăm sóc khách hàng.
                    </p>
                </div>

                {/* Right side: form */}
                <div className="md:w-1/2 p-8 bg-white text-gray-800">
                    <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
                        <FaUserCircle className="text-[#23a983]" />
                        Thông tin cá nhân
                    </h2>
                    <p className="text-xs text-gray-500 mb-6">
                        Vui lòng kiểm tra và cập nhật nếu có thay đổi.
                    </p>

                    {loading ? (
                        <p className="text-center text-gray-400 py-10 text-sm">Đang tải hồ sơ...</p>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Họ và tên <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        required
                                        placeholder="VD: Nguyễn Văn A"
                                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 pr-10 focus:ring-2 focus:ring-[#23a983] outline-none text-gray-800 bg-white"
                                    />
                                    <FaUserTie className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Số điện thoại liên hệ <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        required
                                        placeholder="VD: 0905 123 456"
                                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 pr-10 focus:ring-2 focus:ring-[#23a983] outline-none text-gray-800 bg-white"
                                    />
                                    <FaPhone className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300" />
                                </div>
                                <p className="mt-1 text-[11px] text-gray-400">
                                    Trung tâm điều hành sẽ dùng số này để liên hệ khi cần thiết.
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full mt-2 bg-[#23a983] hover:bg-[#1a8a6a] text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-md text-sm disabled:opacity-60"
                            >
                                {saving ? (
                                    'Đang lưu...'
                                ) : (
                                    <>
                                        Hoàn tất & vào hệ thống
                                        <FaArrowRight />
                                    </>
                                )}
                            </button>

                            <p className="text-[11px] text-gray-400 text-center mt-2">
                                Bạn vẫn có thể chỉnh sửa lại thông tin này trong mục Hồ sơ cá nhân sau này.
                            </p>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FirstLoginProfile;

