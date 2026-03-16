import React, { useEffect, useState } from 'react';
import { FaComments, FaFilter, FaPaperPlane } from 'react-icons/fa';
import api from '../../utils/api';
import { useDialog } from '../../context/DialogContext';

const statusOptions = [
    { value: 'ALL', label: 'Tất cả' },
    { value: 'NEW', label: 'Mới' },
    { value: 'IN_PROGRESS', label: 'Đang xử lý' },
    { value: 'RESPONDED', label: 'Đã trả lời' },
    { value: 'CLOSED', label: 'Đã đóng' },
];

const statusBadge = (status) => {
    switch (status) {
        case 'NEW':
            return 'bg-red-100 text-red-700';
        case 'IN_PROGRESS':
            return 'bg-yellow-100 text-yellow-700';
        case 'RESPONDED':
            return 'bg-blue-100 text-blue-700';
        case 'CLOSED':
            return 'bg-green-100 text-green-700';
        default:
            return 'bg-gray-100 text-gray-600';
    }
};

const AdminFeedback = () => {
    const { showAlert } = useDialog();

    const [feedback, setFeedback] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [selected, setSelected] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [replyStatus, setReplyStatus] = useState('RESPONDED');
    const [saving, setSaving] = useState(false);

    const fetchFeedback = async () => {
        setLoading(true);
        try {
            const params = {};
            if (statusFilter !== 'ALL') params.status = statusFilter;
            const res = await api.get('/api/admin/feedback', { params });
            if (res.data.ok) {
                setFeedback(res.data.feedback || []);
                if (res.data.feedback && res.data.feedback.length > 0 && !selected) {
                    setSelected(res.data.feedback[0]);
                    setReplyText(res.data.feedback[0].adminReply || '');
                    setReplyStatus(res.data.feedback[0].status || 'RESPONDED');
                }
            } else {
                showAlert(res.data.message || 'Không thể tải danh sách phản hồi', 'Lỗi');
            }
        } catch (err) {
            console.error(err);
            showAlert('Lỗi kết nối khi tải danh sách phản hồi', 'Lỗi');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFeedback();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter]);

    const handleSelect = (item) => {
        setSelected(item);
        setReplyText(item.adminReply || '');
        setReplyStatus(item.status || 'RESPONDED');
    };

    const handleSubmitReply = async () => {
        if (!selected) return;
        setSaving(true);
        try {
            const res = await api.post(`/api/admin/feedback/${selected._id}/reply`, {
                replyText,
                status: replyStatus,
            });
            if (res.data.ok) {
                showAlert('Đã cập nhật phản hồi', 'Thành công');
                setSelected(res.data.feedback);
                setFeedback((prev) =>
                    prev.map((f) => (f._id === res.data.feedback._id ? res.data.feedback : f))
                );
            } else {
                showAlert(res.data.message || 'Không thể cập nhật phản hồi', 'Lỗi');
            }
        } catch (err) {
            console.error(err);
            showAlert('Lỗi kết nối khi cập nhật phản hồi', 'Lỗi');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="pb-4 border-b border-gray-200 flex items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FaComments className="text-[#23a983]" /> Phản hồi & Khiếu nại khách hàng
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Trang xem và trả lời các phản hồi/đánh giá của khách hàng.
                    </p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <FaFilter className="text-gray-400" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-black focus:ring-2 focus:ring-[#23a983] outline-none"
                    >
                        {statusOptions.map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-black">
                {/* Danh sách phản hồi */}
                <div className="lg:col-span-1 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b bg-gray-50 flex justify-between items-center text-sm text-gray-600">
                        <span>
                            Tổng cộng{' '}
                            <strong>{feedback.length}</strong>{' '}
                            phản hồi
                        </span>
                        <button
                            onClick={fetchFeedback}
                            className="text-xs text-blue-600 hover:underline"
                        >
                            Tải lại
                        </button>
                    </div>
                    <div className="max-h-[480px] overflow-y-auto divide-y divide-gray-100">
                        {loading ? (
                            <div className="py-10 text-center text-gray-400 text-sm">
                                Đang tải danh sách...
                            </div>
                        ) : feedback.length === 0 ? (
                            <div className="py-10 text-center text-gray-400 text-sm">
                                Chưa có phản hồi nào.
                            </div>
                        ) : (
                            feedback.map((item) => (
                                <button
                                    key={item._id}
                                    onClick={() => handleSelect(item)}
                                    className={`w-full text-left px-4 py-3 flex flex-col gap-1 hover:bg-gray-50 transition-colors ${
                                        selected?._id === item._id ? 'bg-blue-50' : ''
                                    }`}
                                >
                                    <div className="flex justify-between items-center">
                                        <p className="font-semibold text-gray-800 truncate">
                                            {item.subject || 'Không có tiêu đề'}
                                        </p>
                                        <span
                                            className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadge(
                                                item.status
                                            )}`}
                                        >
                                            {item.status || 'N/A'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 truncate">
                                        {item.name || item.userId?.fullName || 'Khách ẩn danh'} •{' '}
                                        {item.email || item.userId?.email || '—'}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">
                                        {(item.message || '').slice(0, 80)}
                                        {item.message && item.message.length > 80 ? '…' : ''}
                                    </p>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Chi tiết + trả lời */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col min-h-[320px]">
                    {selected ? (
                        <>
                            <div className="px-5 py-4 border-b bg-gray-50 flex flex-col gap-1">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-800">
                                            {selected.subject || 'Không có tiêu đề'}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Khách:{' '}
                                            <strong>
                                                {selected.name || selected.userId?.fullName || 'Khách ẩn danh'}
                                            </strong>{' '}
                                            • {selected.email || selected.userId?.email || '—'} •{' '}
                                            {selected.phone || selected.userId?.phone || '—'}
                                        </p>
                                    </div>
                                    <div className="text-right text-xs text-gray-500">
                                        <p>
                                            {selected.createdAt
                                                ? new Date(selected.createdAt).toLocaleString('vi-VN')
                                                : ''}
                                        </p>
                                        <p className="mt-1">
                                            Trạng thái:{' '}
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadge(
                                                    selected.status
                                                )}`}
                                            >
                                                {selected.status}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                                {selected.rating && (
                                    <p className="text-xs text-yellow-600">
                                        Đánh giá: {'⭐'.repeat(selected.rating)}{' '}
                                        ({selected.rating}/5)
                                    </p>
                                )}
                            </div>

                            <div className="p-5 space-y-4 flex-1 flex flex-col">
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 mb-1">
                                        Nội dung phản hồi
                                    </p>
                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-800 whitespace-pre-line max-h-40 overflow-y-auto">
                                        {selected.message}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 flex-1">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-semibold text-gray-500">
                                            Trả lời cho khách hàng
                                        </label>
                                        <select
                                            value={replyStatus}
                                            onChange={(e) => setReplyStatus(e.target.value)}
                                            className="bg-white border border-gray-300 rounded-lg px-3 py-1 text-xs text-black focus:ring-2 focus:ring-[#23a983] outline-none"
                                        >
                                            {statusOptions
                                                .filter((o) => o.value !== 'ALL')
                                                .map((o) => (
                                                    <option key={o.value} value={o.value}>
                                                        {o.label}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>
                                    <textarea
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        rows={5}
                                        placeholder="Nhập nội dung phản hồi gửi cho khách hàng..."
                                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#23a983] outline-none resize-none flex-1"
                                    />
                                </div>
                            </div>

                            <div className="px-5 py-3 border-t bg-gray-50 flex justify-between items-center text-xs text-gray-500">
                                <div>
                                    {selected.repliedBy && (
                                        <p>
                                            Đã trả lời bởi{' '}
                                            <strong>{selected.repliedBy.fullName}</strong>{' '}
                                            {selected.repliedAt &&
                                                `lúc ${new Date(
                                                    selected.repliedAt
                                                ).toLocaleString('vi-VN')}`}
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={handleSubmitReply}
                                    disabled={saving}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#23a983] hover:bg-[#1a8a6a] text-white font-semibold text-xs disabled:opacity-60"
                                >
                                    <FaPaperPlane />
                                    {saving ? 'Đang lưu...' : 'Gửi phản hồi'}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                            Chọn một phản hồi ở danh sách bên trái để xem chi tiết.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminFeedback;

