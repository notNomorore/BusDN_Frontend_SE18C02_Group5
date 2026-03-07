import React, { useState, useEffect, useContext } from 'react';
import { FaIdCard, FaCheck, FaTimes, FaEye } from 'react-icons/fa';
import api from '../../utils/api';
import AuthContext from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';

const AdminPriorityProfiles = () => {
    const { showAlert } = useDialog();
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('pending');
    const { token } = useContext(AuthContext);

    const [selectedProfile, setSelectedProfile] = useState(null);
    const [actionType, setActionType] = useState(null); // 'approve' or 'reject'
    const [expiryDate, setExpiryDate] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchProfiles();
    }, [statusFilter]);

    const fetchProfiles = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/api/admin/priority-profiles?status=${statusFilter}`);
            if (res.data.ok) {
                setProfiles(res.data.profiles);
            }
        } catch (err) {
            console.error('Error fetching priority profiles:', err);
        } finally {
            setLoading(false);
        }
    };

    const getMinExpiryDateString = () => {
        const d = new Date();
        d.setFullYear(d.getFullYear() + 2);
        return d.toISOString().split('T')[0];
    };

    const openModal = (profile, type) => {
        setSelectedProfile(profile);
        setActionType(type);
        if (type === 'approve') {
            setExpiryDate(getMinExpiryDateString());
        } else {
            setRejectionReason('');
        }
    };

    const closeModal = () => {
        setSelectedProfile(null);
        setActionType(null);
    };

    const submitAction = async () => {
        try {
            setProcessing(true);
            if (actionType === 'approve') {
                if (!expiryDate) return showAlert('Vui lòng chọn ngày hết hạn', 'Thông báo');
                await api.post(`/api/admin/priority-profiles/${selectedProfile._id}/approve`, { expiryDate });
                showAlert('Duyệt hồ sơ thành công', 'Thành công');
            } else if (actionType === 'reject') {
                if (!rejectionReason.trim()) return showAlert('Vui lòng nhập lý do từ chối', 'Thông báo');
                await api.post(`/api/admin/priority-profiles/${selectedProfile._id}/reject`, { rejectionReason });
                showAlert('Từ chối hồ sơ thành công', 'Thành công');
            }
            closeModal();
            fetchProfiles(); // Refresh list
        } catch (err) {
            showAlert(err.response?.data?.message || err.response?.data?.error || 'Lỗi xử lý hồ sơ', 'Lỗi');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b border-gray-200">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FaIdCard className="text-[#23a983]" /> Duyệt hồ sơ ưu tiên
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Kiểm tra và phê duyệt yêu cầu thẻ ưu tiên của HK</p>
                </div>
                <div className="flex gap-2 mt-4 md:mt-0 bg-white p-1 rounded-lg border border-gray-200">
                    <button
                        onClick={() => setStatusFilter('pending')}
                        className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${statusFilter === 'pending' ? 'bg-[#23a983] text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        Chờ duyệt
                    </button>
                    <button
                        onClick={() => setStatusFilter('approved')}
                        className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${statusFilter === 'approved' ? 'bg-[#23a983] text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        Đã duyệt
                    </button>
                    <button
                        onClick={() => setStatusFilter('rejected')}
                        className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${statusFilter === 'rejected' ? 'bg-[#23a983] text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        Đã từ chối
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto text-black">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider">
                                <th className="px-6 py-3 font-semibold">Khách hàng</th>
                                <th className="px-6 py-3 font-semibold">Loại ưu tiên</th>
                                <th className="px-6 py-3 font-semibold">Trạng thái</th>
                                <th className="px-6 py-3 font-semibold">Ngày nộp</th>
                                <th className="px-6 py-3 font-semibold text-center">Xử lý</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {profiles.length === 0 && !loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-10 text-center text-gray-500">Khống có hồ sơ nào.</td>
                                </tr>
                            ) : (
                                profiles.map((profile) => (
                                    <tr key={profile._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-gray-800">{profile.userId?.fullName || 'N/A'}</p>
                                            <p className="text-xs text-gray-500">{profile.userId?.email || profile.userId?.phone || 'N/A'}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="bg-blue-50 border border-blue-200 text-blue-800 px-3 py-1 rounded-full text-xs font-bold uppercase">
                                                {profile.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${profile.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                profile.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                    'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {profile.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-gray-600">{new Date(profile.createdAt).toLocaleDateString('vi-VN')}</p>
                                        </td>
                                        <td className="px-6 py-4 text-center flex justify-center gap-2">
                                            {/* We simulate 'View' opening the modal too for now, or just showing actions */}
                                            {profile.status === 'pending' ? (
                                                <>
                                                    <button
                                                        onClick={() => openModal(profile, 'approve')}
                                                        className="bg-green-500 text-white px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-green-600 flex items-center gap-1"
                                                    >
                                                        <FaCheck /> Duyệt
                                                    </button>
                                                    <button
                                                        onClick={() => openModal(profile, 'reject')}
                                                        className="bg-red-500 text-white px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-red-600 flex items-center gap-1"
                                                    >
                                                        <FaTimes /> Từ chối
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => showAlert('Chức năng xem chi tiết sẽ được cập nhật sau', 'Thông báo')}
                                                    className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-blue-100 flex items-center gap-1"
                                                >
                                                    <FaEye /> Xem
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Action Modals */}
            {selectedProfile && actionType && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 text-black">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className={`px-6 py-4 border-b flex justify-between items-center ${actionType === 'approve' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                            <h3 className={`font-bold text-lg ${actionType === 'approve' ? 'text-green-800' : 'text-red-800'}`}>
                                {actionType === 'approve' ? 'Phê duyệt hồ sơ' : 'Từ chối hồ sơ'}
                            </h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-600 mb-4">
                                Khách hàng: <strong>{selectedProfile.userId?.fullName}</strong>
                            </p>

                            {actionType === 'approve' ? (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Ngày hết hạn (ít nhất 2 năm)</label>
                                    <input
                                        type="date"
                                        value={expiryDate}
                                        min={getMinExpiryDateString()}
                                        onChange={(e) => setExpiryDate(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 bg-white focus:ring-green-500 outline-none"
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Lý do từ chối</label>
                                    <textarea
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        rows="4"
                                        placeholder="Nhập lý do để thông báo cho khách hàng..."
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 bg-white focus:ring-red-500 outline-none"
                                    ></textarea>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={closeModal} className="px-5 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold">Hủy</button>
                                <button
                                    onClick={submitAction}
                                    disabled={processing}
                                    className={`px-5 py-2 text-white rounded-lg font-semibold disabled:opacity-50 ${actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                                >
                                    {processing ? 'Đang xử lý...' : 'Xác nhận'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPriorityProfiles;
