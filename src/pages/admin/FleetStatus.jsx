import React, { useState, useEffect } from 'react';
import { FaBus, FaPlus, FaWrench, FaCheckCircle, FaSpinner, FaEdit } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useDialog } from '../../context/DialogContext';

const statusConfig = {
    READY: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Sẵn sàng', icon: <FaCheckCircle className="text-green-500" /> },
    RUNNING: { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Đang chạy', icon: <FaSpinner className="text-blue-500 animate-spin" /> },
    MAINTENANCE: { color: 'bg-red-100 text-red-800 border-red-200', label: 'Bảo dưỡng', icon: <FaWrench className="text-red-500" /> },
    ACTIVE: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Hoạt động', icon: <FaCheckCircle className="text-green-500" /> },
    INACTIVE: { color: 'bg-gray-100 text-gray-700 border-gray-200', label: 'Ngừng hoạt động', icon: <FaBus className="text-gray-500" /> }
};

const FleetStatus = () => {
    const navigate = useNavigate();
    const { showAlert } = useDialog();
    const [buses, setBuses] = useState([]);
    const [todaySchedules, setToday] = useState([]);
    const [loading, setLoading] = useState(true);

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
        } catch {
            showAlert('Lỗi khi tải danh sách xe', 'Lỗi');
        } finally {
            setLoading(false);
        }
    };

    const getTodaySchedule = (busId) =>
        todaySchedules.find(s => s.busId?._id === busId || s.busId === busId);

    const stats = {
        total: buses.length,
        ready: buses.filter(b => ['READY', 'ACTIVE'].includes(b.status)).length,
        running: buses.filter(b => b.status === 'RUNNING').length,
        maintenance: buses.filter(b => b.status === 'MAINTENANCE').length,
        assigned: todaySchedules.filter(s => s.busId).length,
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b border-gray-200">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FaBus className="text-[#23a983]" /> Giám sát đội xe
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Trạng thái và phân công chuyến của toàn bộ xe hôm nay</p>
                </div>
                <button
                    onClick={() => navigate('/admin/vehicles/new')}
                    className="mt-4 md:mt-0 bg-[#23a983] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#1bbd8f] flex items-center gap-2"
                >
                    <FaPlus /> Thêm xe
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                    { label: 'Tổng xe', value: stats.total, color: 'bg-gray-50 border-gray-200', text: 'text-gray-700' },
                    { label: 'Sẵn sàng', value: stats.ready, color: 'bg-green-50 border-green-200', text: 'text-green-700' },
                    { label: 'Đang chạy', value: stats.running, color: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
                    { label: 'Bảo dưỡng', value: stats.maintenance, color: 'bg-red-50 border-red-200', text: 'text-red-700' },
                    { label: 'Có chuyến hôm nay', value: stats.assigned, color: 'bg-purple-50 border-purple-200', text: 'text-purple-700' },
                ].map(s => (
                    <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
                        <p className={`text-3xl font-bold ${s.text}`}>{s.value}</p>
                        <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                    </div>
                ))}
            </div>

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
                                const cfg = statusConfig[bus.status] || statusConfig.INACTIVE;
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
                                                        {pct >= 90 ? 'Gần đầy' : pct >= 60 ? 'Khá đông' : 'Còn chỗ'}
                                                    </p>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-300">—</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <button
                                                onClick={() => navigate(`/admin/vehicles/${bus._id}/edit`)}
                                                className="p-2 bg-blue-50 text-blue-500 hover:text-blue-700 rounded-md"
                                            >
                                                <FaEdit />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default FleetStatus;
