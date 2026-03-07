import React, { useState, useEffect } from 'react';
import { FaBus, FaPlus, FaWrench, FaCheckCircle, FaSpinner, FaEdit, FaRoute } from 'react-icons/fa';
import api from '../../utils/api';
import { useDialog } from '../../context/DialogContext';

const statusConfig = {
    READY: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Sẵn sàng', icon: <FaCheckCircle className="text-green-500" /> },
    RUNNING: { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Đang chạy', icon: <FaSpinner className="text-blue-500 animate-spin" /> },
    MAINTENANCE: { color: 'bg-red-100 text-red-800 border-red-200', label: 'Bảo dưỡng', icon: <FaWrench className="text-red-500" /> },
};

const emptyForm = { licensePlate: '', brand: '', capacity: 45, status: 'READY' };

const FleetStatus = () => {
    const { showAlert } = useDialog();
    const [buses, setBuses] = useState([]);
    const [todaySchedules, setToday] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const todayStr = new Date().toISOString().split('T')[0];
            const [busRes, schedRes] = await Promise.all([
                api.get('/api/admin/buses'),
                api.get('/api/admin/schedules')
            ]);
            if (busRes.data.ok) setBuses(busRes.data.buses);
            if (schedRes.data.ok) {
                setToday(schedRes.data.schedules.filter(s => s.date && s.date.substring(0, 10) === todayStr));
            }
        } catch { showAlert('Lỗi khi tải danh sách xe', 'Lỗi'); }
        finally { setLoading(false); }
    };

    // Return today's schedule for a given bus
    const getTodaySchedule = (busId) =>
        todaySchedules.find(s => s.busId?._id === busId || s.busId === busId);

    const openModal = (bus = null) => {
        setEditingId(bus ? bus._id : null);
        setForm(bus
            ? { licensePlate: bus.licensePlate, brand: bus.brand || '', capacity: bus.capacity, status: bus.status }
            : emptyForm
        );
        setShowModal(true);
    };

    const closeModal = () => { setShowModal(false); setEditingId(null); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = editingId
                ? await api.put(`/api/admin/buses/${editingId}`, form)
                : await api.post('/api/admin/buses/create', form);
            if (res.data.ok) {
                showAlert(editingId ? 'Cập nhật xe thành công' : 'Thêm xe thành công', 'Thành công');
                closeModal();
                fetchData();
            }
        } catch (err) {
            showAlert(err.response?.data?.message || 'Lỗi lưu thông tin xe', 'Lỗi');
        } finally { setSaving(false); }
    };

    const stats = {
        total: buses.length,
        ready: buses.filter(b => b.status === 'READY').length,
        running: buses.filter(b => b.status === 'RUNNING').length,
        maintenance: buses.filter(b => b.status === 'MAINTENANCE').length,
        assigned: todaySchedules.filter(s => s.busId).length,
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b border-gray-200">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FaBus className="text-[#23a983]" /> Giám sát đội xe
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Trạng thái và phân công chuyến của toàn bộ xe hôm nay</p>
                </div>
                <button onClick={() => openModal()}
                    className="mt-4 md:mt-0 bg-[#23a983] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#1bbd8f] flex items-center gap-2">
                    <FaPlus /> Thêm xe
                </button>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                    { label: 'Tổng xe', value: stats.total, color: 'bg-gray-50  border-gray-200', text: 'text-gray-700' },
                    { label: 'Sẵn sàng', value: stats.ready, color: 'bg-green-50 border-green-200', text: 'text-green-700' },
                    { label: 'Đang chạy', value: stats.running, color: 'bg-blue-50  border-blue-200', text: 'text-blue-700' },
                    { label: 'Bảo dưỡng', value: stats.maintenance, color: 'bg-red-50   border-red-200', text: 'text-red-700' },
                    { label: 'Có chuyến hôm nay', value: stats.assigned, color: 'bg-purple-50 border-purple-200', text: 'text-purple-700' },
                ].map(s => (
                    <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
                        <p className={`text-3xl font-bold ${s.text}`}>{s.value}</p>
                        <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Bus table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden text-black">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b">
                                <th className="px-5 py-3 font-semibold">Biển số</th>
                                <th className="px-5 py-3 font-semibold">Hãng</th>
                                <th className="px-5 py-3 font-semibold">Sức chứa</th>
                                <th className="px-5 py-3 font-semibold">Trạng thái</th>
                                <th className="px-5 py-3 font-semibold">Chuyến hôm nay</th>
                                <th className="px-5 py-3 font-semibold">Đầy/Vắng</th>
                                <th className="px-5 py-3 font-semibold text-center">Tác vụ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan="7" className="py-10 text-center text-gray-400">Đang tải...</td></tr>
                            ) : buses.length === 0 ? (
                                <tr><td colSpan="7" className="py-10 text-center text-gray-400">Chưa có xe nào được đăng ký</td></tr>
                            ) : buses.map(bus => {
                                const cfg = statusConfig[bus.status] || statusConfig.READY;
                                const sched = getTodaySchedule(bus._id);
                                const pax = sched?.passengerCount || 0;
                                const cap = bus.capacity || 1;
                                const pct = Math.min(Math.round((pax / cap) * 100), 100);
                                const barColor = pct >= 90 ? 'bg-red-400' : pct >= 60 ? 'bg-yellow-400' : 'bg-green-400';

                                return (
                                    <tr key={bus._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-5 py-4 font-semibold text-gray-800">{bus.licensePlate}</td>
                                        <td className="px-5 py-4 text-gray-600">{bus.brand || '—'}</td>
                                        <td className="px-5 py-4 text-gray-600">{bus.capacity} chỗ</td>
                                        <td className="px-5 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full border ${cfg.color}`}>
                                                {cfg.icon} {cfg.label}
                                            </span>
                                        </td>
                                        {/* Today's route */}
                                        <td className="px-5 py-4">
                                            {sched ? (
                                                <div>
                                                    <span className="bg-[#23a983] text-white px-2 py-0.5 rounded text-xs font-bold">
                                                        {sched.routeId?.routeNumber || '?'}
                                                    </span>
                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                        {sched.shiftTime?.start} – {sched.shiftTime?.end}
                                                    </p>
                                                    {sched.driverId && (
                                                        <p className="text-xs text-gray-400">{sched.driverId.fullName}</p>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="italic text-gray-400 text-xs">Không có chuyến</span>
                                            )}
                                        </td>
                                        {/* Occupancy bar */}
                                        <td className="px-5 py-4 w-36">
                                            {sched ? (
                                                <div>
                                                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                        <span>{pax} khách</span>
                                                        <span>{pct}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                                        <div className={`h-2 rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                                                    </div>
                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                        {pct >= 90 ? '🔴 Gần đầy' : pct >= 60 ? '🟡 Khá đông' : '🟢 Còn chỗ'}
                                                    </p>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-300">—</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <button onClick={() => openModal(bus)} className="p-2 bg-blue-50 text-blue-500 hover:text-blue-700 rounded-md"><FaEdit /></button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 text-black">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-800">{editingId ? 'Sửa thông tin xe' : 'Thêm xe mới'}</h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Biển số xe *</label>
                                <input required value={form.licensePlate} onChange={e => setForm({ ...form, licensePlate: e.target.value })}
                                    placeholder="VD: 43B-123.45" className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#23a983] outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Hãng xe</label>
                                    <input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })}
                                        placeholder="Thaco, Daewoo..." className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#23a983] outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Sức chứa</label>
                                    <input type="number" min="1" value={form.capacity} onChange={e => setForm({ ...form, capacity: Number(e.target.value) })}
                                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#23a983] outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Trạng thái</label>
                                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#23a983] outline-none">
                                    <option value="READY">Sẵn sàng</option>
                                    <option value="RUNNING">Đang chạy</option>
                                    <option value="MAINTENANCE">Bảo dưỡng</option>
                                </select>
                            </div>
                            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                                <button type="button" onClick={closeModal} className="px-5 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold">Hủy</button>
                                <button type="submit" disabled={saving} className="px-5 py-2 bg-[#23a983] hover:bg-[#1bbd8f] text-white rounded-lg font-semibold disabled:opacity-50">
                                    {saving ? 'Đang lưu...' : editingId ? 'Lưu cập nhật' : 'Thêm xe'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FleetStatus;
