import React, { useState, useEffect, useContext } from 'react';
import { FaIdCard, FaCheck, FaTimes, FaEye, FaDownload, FaFileAlt, FaEnvelope, FaPhone, FaUser, FaCalendarAlt, FaInfoCircle } from 'react-icons/fa';
import api from '../../utils/api';
import AuthContext from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';

const PRIORITY_DOCUMENTS = [
    { label: 'Mặt trước thẻ', field: 'idCardImageFront', icon: FaIdCard },
    { label: 'Mặt sau thẻ', field: 'idCardImageBack', icon: FaIdCard },
    { label: 'Minh chứng ưu tiên', field: 'proofImage', icon: FaFileAlt },
];

const STATUS_META = {
    pending: { label: 'Chờ duyệt', className: 'bg-amber-100 text-amber-700' },
    approved: { label: 'Đã duyệt', className: 'bg-emerald-100 text-emerald-700' },
    rejected: { label: 'Đã từ chối', className: 'bg-red-100 text-red-700' },
};

const DEFAULT_STATUS_META = { label: '--', className: 'bg-slate-100 text-slate-600' };

const getStatusMeta = (status) => STATUS_META[String(status || '').toLowerCase()] || DEFAULT_STATUS_META;

const getLocalDateInputValue = (date = new Date()) => {
    const value = new Date(date);
    const offsetMinutes = value.getTimezoneOffset();
    const local = new Date(value.getTime() - offsetMinutes * 60 * 1000);
    return local.toISOString().slice(0, 10);
};

const getPriorityFileUrl = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw) || raw.startsWith('/')) return raw;
    return `/uploads/priority/${raw}`;
};

const extractFileName = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const withoutQuery = raw.split('?')[0];
    return decodeURIComponent(withoutQuery.split('/').pop() || '');
};

const AdminPriorityProfiles = () => {
    const { showAlert } = useDialog();
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('pending');
    const { token } = useContext(AuthContext);

    const [selectedProfile, setSelectedProfile] = useState(null);
    const [actionType, setActionType] = useState(null); // 'approve' or 'reject'
    const [detailProfile, setDetailProfile] = useState(null);
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
        return getLocalDateInputValue(d);
    };

    const openModal = (profile, type) => {
        setSelectedProfile(profile);
        setActionType(type);
        setDetailProfile(null);
        if (type === 'approve') {
            setExpiryDate(getMinExpiryDateString());
        } else {
            setRejectionReason('');
        }
    };

    const openDetail = (profile) => {
        setDetailProfile(profile);
        setSelectedProfile(null);
        setActionType(null);
    };

    const closeModal = () => {
        setSelectedProfile(null);
        setActionType(null);
    };

    const closeDetail = () => {
        setDetailProfile(null);
    };

    const openPriorityFile = (value) => {
        const url = getPriorityFileUrl(value);
        if (!url) return;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const downloadPriorityFile = (value, fallbackName = '') => {
        const url = getPriorityFileUrl(value);
        if (!url) return;

        const link = document.createElement('a');
        link.href = url;
        link.download = fallbackName || extractFileName(url) || 'priority-file';
        document.body.appendChild(link);
        link.click();
        link.remove();
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
                                    <td colSpan="5" className="px-6 py-10 text-center text-gray-500">Không có hồ sơ nào.</td>
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
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-wrap justify-center gap-2">
                                                <button
                                                    onClick={() => openDetail(profile)}
                                                    className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-100"
                                                >
                                                    <FaEye /> Xem
                                                </button>
                                                {profile.status === 'pending' ? (
                                                    <>
                                                        <button
                                                            onClick={() => openModal(profile, 'approve')}
                                                            className="inline-flex items-center gap-1 rounded-md bg-green-500 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-green-600"
                                                        >
                                                            <FaCheck /> Duyệt
                                                        </button>
                                                        <button
                                                            onClick={() => openModal(profile, 'reject')}
                                                            className="inline-flex items-center gap-1 rounded-md bg-red-500 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-600"
                                                        >
                                                            <FaTimes /> Từ chối
                                                        </button>
                                                    </>
                                                ) : null}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {detailProfile ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6 text-black">
                    <div className="flex w-full max-w-6xl max-h-[90vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Chi tiết hồ sơ ưu tiên</p>
                                <h3 className="mt-2 text-2xl font-black text-slate-900">
                                    {detailProfile.userId?.fullName || 'Khách hàng'}
                                </h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    {detailProfile.userId?.email || detailProfile.userId?.phone || 'Không có thông tin liên hệ'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeDetail}
                                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
                                aria-label="Đóng"
                            >
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,5fr)]">
                                <section className="rounded-2xl border border-slate-100 bg-slate-50 p-5 shadow-sm">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Thông tin hồ sơ</p>
                                            <h4 className="mt-1 text-lg font-black text-slate-900">Tổng quan nhanh</h4>
                                        </div>
                                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getStatusMeta(detailProfile.status).className}`}>
                                            {getStatusMeta(detailProfile.status).label}
                                        </span>
                                    </div>

                                    <div className="mt-4 grid grid-cols-2 gap-3">
                                        {[
                                            { label: 'Khách hàng', value: detailProfile.userId?.fullName || 'N/A', icon: FaUser },
                                            { label: 'Liên hệ', value: detailProfile.userId?.email || detailProfile.userId?.phone || '--', icon: detailProfile.userId?.email ? FaEnvelope : FaPhone },
                                            { label: 'Loại ưu tiên', value: detailProfile.category || 'N/A', icon: FaIdCard },
                                            { label: 'Số thẻ', value: detailProfile.idNumber || 'N/A', icon: FaIdCard },
                                            { label: 'Ngày nộp', value: detailProfile.createdAt ? new Date(detailProfile.createdAt).toLocaleDateString('vi-VN') : '--', icon: FaCalendarAlt },
                                            { label: 'Ngày hết hạn', value: detailProfile.expiryDate ? new Date(detailProfile.expiryDate).toLocaleDateString('vi-VN') : '--', icon: FaCalendarAlt },
                                        ].map(({ label, value, icon: Icon }) => (
                                            <div key={label} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                                                    <Icon className="text-slate-400" />
                                                    <span>{label}</span>
                                                </div>
                                                <p className="mt-3 break-words text-sm font-black text-slate-900">{value}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {detailProfile.rejectionReason ? (
                                        <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4">
                                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-red-500">
                                                <FaInfoCircle />
                                                Lý do từ chối
                                            </div>
                                            <p className="mt-2 text-sm leading-6 text-red-700">{detailProfile.rejectionReason}</p>
                                        </div>
                                    ) : null}
                                </section>

                                <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Tài liệu đã nộp</p>
                                            <h4 className="mt-1 text-lg font-black text-slate-900">Xem hoặc tải lại từng ảnh minh chứng</h4>
                                        </div>
                                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                                            3 tài liệu
                                        </span>
                                    </div>

                                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                        {PRIORITY_DOCUMENTS.map(({ label, field, icon: Icon }) => {
                                            const fileValue = detailProfile?.[field];
                                            const fileUrl = getPriorityFileUrl(fileValue);
                                            const fileName = extractFileName(fileValue);
                                            const hasFile = Boolean(fileUrl);

                                            return (
                                                <div key={field} className="flex h-full flex-col rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                                                    <div className="flex items-start gap-3">
                                                        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                                                            <Icon className="text-lg" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">{label}</p>
                                                            <p className="mt-2 break-words text-sm font-medium leading-6 text-slate-700">
                                                                {fileName || 'Chưa có file'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 flex flex-wrap gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => openPriorityFile(fileValue)}
                                                            disabled={!hasFile}
                                                            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold transition ${
                                                                hasFile
                                                                    ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                                                                    : 'cursor-not-allowed bg-slate-200 text-slate-400'
                                                            }`}
                                                        >
                                                            <FaEye />
                                                            Xem
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => downloadPriorityFile(fileValue, fileName)}
                                                            disabled={!hasFile}
                                                            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-bold transition ${
                                                                hasFile
                                                                    ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                                                                    : 'cursor-not-allowed border-slate-200 bg-white text-slate-300'
                                                            }`}
                                                        >
                                                            <FaDownload />
                                                            Tải xuống
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}

            {/* Action Modals */}
            {selectedProfile && actionType && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 text-black">
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
