import React, { useState, useEffect } from 'react';
import { FaPlay, FaStop, FaCheck, FaBus } from 'react-icons/fa';
import api from '../../utils/api';
import { useDialog } from '../../context/DialogContext';

// Driver: Start Trip / Finish Trip combined page
const TripControl = () => {
    const { showAlert, showConfirm } = useDialog();
    const [todaySchedule, setTodaySchedule] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tripState, setTripState] = useState('idle'); // idle | started | finished
    const [startTime, setStartTime] = useState(null);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { fetchToday(); }, []);

    const fetchToday = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/driver/schedule');
            if (res.data.ok) {
                const today = new Date().toISOString().split('T')[0];
                const sched = res.data.schedules.find(s => s.date?.substring(0, 10) === today);
                setTodaySchedule(sched || null);

                // Sync state from DB — DB is source of truth, overrides localStorage
                if (sched?.actualEnd) {
                    setTripState('finished');
                    setStartTime(sched.actualStart);
                    localStorage.setItem('tripState', 'finished');
                } else if (sched?.actualStart) {
                    setTripState('started');
                    setStartTime(sched.actualStart);
                    localStorage.setItem('tripState', 'started');
                    localStorage.setItem('tripStartTime', sched.actualStart);
                } else {
                    // Only use localStorage if DB has no actual times yet
                    const saved = localStorage.getItem('tripState');
                    const savedStart = localStorage.getItem('tripStartTime');
                    if (saved) setTripState(saved);
                    if (savedStart) setStartTime(savedStart);
                }
            }
        } catch { showAlert('Lỗi tải lịch hôm nay', 'Lỗi'); }
        finally { setLoading(false); }
    };

    const handleStart = () => {
        showConfirm('Xác nhận bắt đầu chuyến đi? GPS sẽ được kích hoạt.', async () => {
            const now = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            setStartTime(now);
            setTripState('started');
            localStorage.setItem('tripState', 'started');
            localStorage.setItem('tripStartTime', now);
            if (todaySchedule) {
                try { await api.patch(`/api/admin/schedules/${todaySchedule._id}/log`, { actualStart: now }); }
                catch (err) { console.error('Start trip error:', err); }
            }
            showAlert(`Chuyến đã bắt đầu lúc ${now}`, 'Thông báo');
        });
    };

    const handleFinish = () => {
        showConfirm('Kết thúc chuyến? GPS sẽ tắt và ca sẽ được chốt.', async () => {
            const now = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            setTripState('finished');
            localStorage.setItem('tripState', 'finished');
            if (todaySchedule) {
                try { await api.patch(`/api/admin/schedules/${todaySchedule._id}/log`, { actualEnd: now }); }
                catch (err) { console.error('Finish trip error:', err); }
            }
            showAlert(`Chuyến đã kết thúc lúc ${now}. Cảm ơn!`, 'Hoàn thành');
        });
    };

    // Reset only allowed if DB does NOT have actualEnd (i.e. not truly finished)
    const handleReset = () => {
        if (todaySchedule?.actualEnd) {
            showAlert('Chuyến hôm nay đã kết thúc và được chốt sổ. Không thể bắt đầu lại.', 'Đã chốt ca');
            return;
        }
        setTripState('idle');
        setStartTime(null);
        localStorage.removeItem('tripState');
        localStorage.removeItem('tripStartTime');
    };

    return (
        <div className="max-w-md mx-auto space-y-6">
            <div className="pb-4 border-b border-gray-200">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FaBus className="text-[#23a983]" /> Điều khiển chuyến xe
                </h1>
                <p className="text-gray-500 text-sm mt-1">Bắt đầu / Kết thúc chuyến hôm nay</p>
            </div>

            {/* Today's trip info */}
            {loading ? (
                <p className="text-center text-gray-400">Đang tải...</p>
            ) : todaySchedule ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Chuyến hôm nay</p>
                    <div className="flex items-center gap-3 mb-3">
                        <span className="bg-[#23a983] text-white px-3 py-1 rounded-lg font-bold text-lg">
                            {todaySchedule.routeId?.routeNumber}
                        </span>
                        <div>
                            <p className="font-semibold text-gray-800">{todaySchedule.routeId?.name}</p>
                            <p className="text-sm text-gray-500">
                                {todaySchedule.shiftTime?.start} – {todaySchedule.shiftTime?.end}
                                {' · '}{todaySchedule.busId?.licensePlate || 'Chưa gán xe'}
                            </p>
                        </div>
                    </div>
                    {startTime && <p className="text-sm text-green-600 font-medium">🕐 Bắt đầu lúc {startTime}</p>}
                </div>
            ) : (
                <div className="bg-gray-50 rounded-2xl p-6 text-center border border-gray-100">
                    <p className="text-gray-400">Không có chuyến nào hôm nay</p>
                </div>
            )}

            {/* Status indicator */}
            <div className={`rounded-2xl p-5 text-center font-bold text-lg
                ${tripState === 'idle' ? 'bg-gray-100 text-gray-600' :
                    tripState === 'started' ? 'bg-green-50 text-green-700 border border-green-200' :
                        'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                {tripState === 'idle' && 'Chưa bắt đầu'}
                {tripState === 'started' && '🟢 Đang chạy'}
                {tripState === 'finished' && '✅ Đã hoàn thành'}
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
                {tripState === 'idle' && (
                    <button onClick={handleStart} disabled={!todaySchedule}
                        className="w-full bg-[#23a983] hover:bg-[#1a8a6a] text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg disabled:opacity-40">
                        <FaPlay /> Bắt đầu chuyến
                    </button>
                )}
                {tripState === 'started' && (
                    <button onClick={handleFinish}
                        className="w-full bg-red-500 hover:bg-red-600 text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg">
                        <FaStop /> Kết thúc chuyến
                    </button>
                )}
                {tripState === 'finished' && (
                    <div className="space-y-2">
                        {todaySchedule?.actualEnd ? (
                            // DB-confirmed done → locked, cannot restart
                            <div className="w-full bg-gray-100 text-gray-500 py-3 rounded-2xl font-semibold text-center border border-gray-200">
                                🔒 Ca đã chốt — không thể bắt đầu lại
                            </div>
                        ) : (
                            // Only in-memory finished (e.g. page refresh edge case)
                            <button onClick={handleReset}
                                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-2xl font-semibold flex items-center justify-center gap-2">
                                <FaCheck /> Chuyến mới
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TripControl;
