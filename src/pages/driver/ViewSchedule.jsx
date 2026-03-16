import React, { useState, useEffect, useContext } from 'react';
import { FaCalendarAlt, FaBus, FaUser, FaClock, FaRoute } from 'react-icons/fa';
import api from '../../utils/api';
import AuthContext from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';

const ViewSchedule = () => {
    const { userId } = useContext(AuthContext);
    const { showAlert } = useDialog();
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('today'); // today | week

    useEffect(() => { fetchSchedule(); }, []);

    const fetchSchedule = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/driver/schedule');
            if (res.data.ok) setSchedules(res.data.schedules);
        } catch { showAlert('Lỗi tải lịch phân công', 'Lỗi'); }
        finally { setLoading(false); }
    };

    const today = new Date().toISOString().split('T')[0];
    const displayed = view === 'today'
        ? schedules.filter(s => s.date?.substring(0, 10) === today)
        : schedules.slice(0, 14); // last 2 weeks

    const upcomingToday = displayed.find(s => s.date?.substring(0, 10) === today);

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="pb-4 border-b border-gray-200">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FaCalendarAlt className="text-[#23a983]" /> Lịch phân công
                </h1>
                <p className="text-gray-500 text-sm mt-1">Lịch chạy được giao cho bạn</p>
            </div>

            {/* Today banner */}
            {upcomingToday && (
                <div className="bg-gradient-to-r from-[#23a983] to-[#1a8a6a] text-white rounded-2xl p-5 shadow-lg">
                    <p className="text-white/70 text-sm mb-1">Chuyến hôm nay</p>
                    <div className="flex items-center gap-3 mb-3">
                        <span className="bg-white/20 text-white px-3 py-1 rounded-full text-lg font-bold">
                            {upcomingToday.routeId?.routeNumber || '?'}
                        </span>
                        <span className="text-lg font-semibold">{upcomingToday.routeId?.name}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                        <div className="bg-white/10 rounded-xl p-3 text-center">
                            <FaClock className="mx-auto mb-1 opacity-70" />
                            <p className="font-bold">{upcomingToday.shiftTime?.start}</p>
                            <p className="opacity-70 text-xs">Xuất bến</p>
                        </div>
                        <div className="bg-white/10 rounded-xl p-3 text-center">
                            <FaBus className="mx-auto mb-1 opacity-70" />
                            <p className="font-bold">{upcomingToday.busId?.licensePlate || '—'}</p>
                            <p className="opacity-70 text-xs">Biển số xe</p>
                        </div>
                        <div className="bg-white/10 rounded-xl p-3 text-center">
                            <FaRoute className="mx-auto mb-1 opacity-70" />
                            <p className="font-bold">{upcomingToday.shiftTime?.end}</p>
                            <p className="opacity-70 text-xs">Kết thúc</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Toggle */}
            <div className="flex gap-2">
                {['today', 'week'].map(v => (
                    <button key={v} onClick={() => setView(v)}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all
                            ${view === v ? 'bg-[#23a983] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
                        {v === 'today' ? 'Hôm nay' : 'Tất cả lịch'}
                    </button>
                ))}
            </div>

            {/* Schedule list */}
            <div className="space-y-3">
                {loading ? (
                    <p className="text-center text-gray-400 py-8">Đang tải...</p>
                ) : displayed.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <FaCalendarAlt className="mx-auto text-4xl mb-3 opacity-30" />
                        <p>Không có lịch phân công{view === 'today' ? ' hôm nay' : ''}</p>
                    </div>
                ) : displayed.map(s => (
                    <div key={s._id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="bg-[#23a983] text-white px-2 py-0.5 rounded text-xs font-bold">
                                        {s.routeId?.routeNumber || '?'}
                                    </span>
                                    <span className="font-semibold text-gray-800">{s.routeId?.name}</span>
                                </div>
                                <p className="text-sm text-gray-500">
                                    {s.date ? new Date(s.date).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' }) : '—'}
                                </p>
                            </div>
                            <div className="text-right text-sm">
                                <p className="font-bold text-gray-800">{s.shiftTime?.start} – {s.shiftTime?.end}</p>
                                <p className="text-gray-400">{s.busId?.licensePlate || 'Chưa gán xe'}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ViewSchedule;
