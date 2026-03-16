import React, { useState, useEffect } from 'react';
import { FaClipboardList, FaEdit, FaSave, FaTimes, FaMoneyBillWave, FaUsers } from 'react-icons/fa';
import api from '../../utils/api';
import { useDialog } from '../../context/DialogContext';

const TripLogs = () => {
    const { showAlert } = useDialog();
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ from: '', to: '' });
    const [editingId, setEditingId] = useState(null);
    const [logForm, setLogForm] = useState({ actualStart: '', actualEnd: '', passengerCount: 0, revenue: 0, notes: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchLogs(); }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/admin/schedules');
            if (res.data.ok) setSchedules(res.data.schedules);
        } catch { showAlert('Lỗi khi tải nhật ký chuyến xe', 'Lỗi'); }
        finally { setLoading(false); }
    };

    const openEdit = (s) => {
        setEditingId(s._id);
        setLogForm({
            actualStart: s.actualStart || s.shiftTime?.start || '',
            actualEnd: s.actualEnd || s.shiftTime?.end || '',
            passengerCount: s.passengerCount || 0,
            revenue: s.revenue || 0,
            notes: s.notes || ''
        });
    };

    const saveLog = async (id) => {
        setSaving(true);
        try {
            const res = await api.patch(`/api/admin/schedules/${id}/log`, logForm);
            if (res.data.ok) {
                showAlert('Đã cập nhật nhật ký chuyến', 'Thành công');
                setEditingId(null);
                fetchLogs();
            }
        } catch { showAlert('Lỗi cập nhật nhật ký', 'Lỗi'); }
        finally { setSaving(false); }
    };

    const filtered = schedules.filter(s => {
        const d = s.date ? s.date.substring(0, 10) : '';
        if (filter.from && d < filter.from) return false;
        if (filter.to && d > filter.to) return false;
        return true;
    });

    const totalRevenue = filtered.reduce((sum, s) => sum + (s.revenue || 0), 0);
    const totalPassengers = filtered.reduce((sum, s) => sum + (s.passengerCount || 0), 0);

    const getStatusBadge = (s) => {
        // Priority: actual times logged by driver take precedence
        if (s.actualEnd) return { color: 'bg-green-100 text-green-800', label: 'Hoàn thành' };
        if (s.actualStart) return { color: 'bg-blue-100  text-blue-800', label: 'Đang chạy' };

        // Fallback: use date vs today
        const today = new Date().toISOString().split('T')[0];
        const d = s.date ? s.date.substring(0, 10) : '';
        if (d < today) return { color: 'bg-green-100 text-green-800', label: 'Hoàn thành' };
        if (d === today) return { color: 'bg-yellow-100 text-yellow-800', label: 'Chưa bắt đầu' };
        return { color: 'bg-gray-100 text-gray-600', label: 'Sắp tới' };
    };

    return (
        <div className="space-y-6">
            <div className="pb-4 border-b border-gray-200">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FaClipboardList className="text-[#23a983]" /> Nhật ký vận hành chuyến xe
                </h1>
                <p className="text-gray-500 text-sm mt-1">Giờ thực tế, số khách và doanh thu từng chuyến</p>
            </div>

            {/* Filter bar */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-wrap gap-4 items-end text-black">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Từ ngày</label>
                    <input type="date" value={filter.from} onChange={e => setFilter({ ...filter, from: e.target.value })}
                        className="bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#23a983] outline-none" />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Đến ngày</label>
                    <input type="date" value={filter.to} onChange={e => setFilter({ ...filter, to: e.target.value })}
                        className="bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#23a983] outline-none" />
                </div>
                <button onClick={() => setFilter({ from: '', to: '' })} className="px-4 py-2 text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold">
                    Xóa lọc
                </button>

                {/* Summary cards */}
                <div className="ml-auto flex gap-4">
                    <div className="bg-[#f0fdf9] border border-[#23a983] rounded-xl px-5 py-3 text-center">
                        <p className="text-xl font-bold text-[#23a983]">{totalPassengers.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">Tổng lượt khách</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 text-center">
                        <p className="text-xl font-bold text-blue-600">{totalRevenue.toLocaleString()}₫</p>
                        <p className="text-xs text-gray-500">Tổng doanh thu</p>
                    </div>
                </div>
            </div>

            {/* Log table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden text-black">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b">
                                <th className="px-4 py-3 font-semibold">Ngày</th>
                                <th className="px-4 py-3 font-semibold">Giờ kế hoạch</th>
                                <th className="px-4 py-3 font-semibold">Giờ thực tế</th>
                                <th className="px-4 py-3 font-semibold">Tuyến</th>
                                <th className="px-4 py-3 font-semibold">Xe / Tài xế</th>
                                <th className="px-4 py-3 font-semibold text-center">Khách</th>
                                <th className="px-4 py-3 font-semibold text-right">Doanh thu</th>
                                <th className="px-4 py-3 font-semibold">Trạng thái</th>
                                <th className="px-4 py-3 font-semibold text-center">Ghi log</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan="9" className="py-10 text-center text-gray-400">Đang tải...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan="9" className="py-10 text-center text-gray-400">Không tìm thấy nhật ký nào</td></tr>
                            ) : filtered.map(s => {
                                const badge = getStatusBadge(s);
                                const isEditing = editingId === s._id;
                                return (
                                    <tr key={s._id} className={`hover:bg-gray-50 transition-colors ${isEditing ? 'bg-blue-50' : ''}`}>
                                        <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">
                                            {s.date ? new Date(s.date).toLocaleDateString('vi-VN') : '—'}
                                        </td>
                                        {/* Planned times */}
                                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                                            {s.shiftTime?.start || '—'} – {s.shiftTime?.end || '—'}
                                        </td>
                                        {/* Actual times — editable */}
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {isEditing ? (
                                                <div className="flex gap-1 items-center">
                                                    <input type="time" value={logForm.actualStart}
                                                        onChange={e => setLogForm({ ...logForm, actualStart: e.target.value })}
                                                        className="bg-white border border-blue-300 rounded px-2 py-1 text-xs w-24 outline-none" />
                                                    <span className="text-gray-400">–</span>
                                                    <input type="time" value={logForm.actualEnd}
                                                        onChange={e => setLogForm({ ...logForm, actualEnd: e.target.value })}
                                                        className="bg-white border border-blue-300 rounded px-2 py-1 text-xs w-24 outline-none" />
                                                </div>
                                            ) : (
                                                <span className={s.actualStart ? 'text-gray-800 font-medium' : 'italic text-gray-400'}>
                                                    {s.actualStart ? `${s.actualStart} – ${s.actualEnd || '?'}` : 'Chưa ghi'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="bg-[#23a983] text-white px-2 py-0.5 rounded text-xs font-bold">
                                                {s.routeId?.routeNumber || '?'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                            <p className="font-medium">{s.busId?.licensePlate || <span className="italic text-gray-400">Chưa gán</span>}</p>
                                            <p className="text-xs text-gray-400">{s.driverId?.fullName || 'Chưa có tài xế'}</p>
                                        </td>
                                        {/* Passenger count */}
                                        <td className="px-4 py-3 text-center">
                                            {isEditing ? (
                                                <input type="number" min="0" value={logForm.passengerCount}
                                                    onChange={e => setLogForm({ ...logForm, passengerCount: e.target.value })}
                                                    className="bg-white border border-blue-300 rounded px-2 py-1 text-xs w-16 text-center outline-none" />
                                            ) : (
                                                <span className={s.passengerCount > 0 ? 'font-semibold text-gray-800' : 'text-gray-400'}>
                                                    {s.passengerCount > 0 ? s.passengerCount : '—'}
                                                </span>
                                            )}
                                        </td>
                                        {/* Revenue */}
                                        <td className="px-4 py-3 text-right">
                                            {isEditing ? (
                                                <input type="number" min="0" step="1000" value={logForm.revenue}
                                                    onChange={e => setLogForm({ ...logForm, revenue: e.target.value })}
                                                    className="bg-white border border-blue-300 rounded px-2 py-1 text-xs w-24 text-right outline-none" />
                                            ) : (
                                                <span className={s.revenue > 0 ? 'font-semibold text-green-700' : 'text-gray-400'}>
                                                    {s.revenue > 0 ? `${s.revenue.toLocaleString()}₫` : '—'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${badge.color}`}>{badge.label}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {isEditing ? (
                                                <div className="flex gap-1 justify-center">
                                                    <button onClick={() => saveLog(s._id)} disabled={saving}
                                                        className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded text-xs disabled:opacity-50"><FaSave /></button>
                                                    <button onClick={() => setEditingId(null)} className="p-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-xs"><FaTimes /></button>
                                                </div>
                                            ) : (
                                                <button onClick={() => openEdit(s)} className="p-1.5 bg-blue-50 text-blue-500 hover:text-blue-700 rounded">
                                                    <FaEdit />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-3 bg-gray-50 border-t text-sm text-gray-500">
                    Hiển thị {filtered.length} / {schedules.length} chuyến
                </div>
            </div>
        </div>
    );
};

export default TripLogs;
