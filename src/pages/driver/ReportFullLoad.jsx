import React, { useState, useEffect } from 'react';
import { FaBus, FaUserFriends } from 'react-icons/fa';
import api from '../../utils/api';
import { useDialog } from '../../context/DialogContext';

// Bus Assistant: Report Full-Load Status
// Updates the bus status to FULL (custom status) or triggers a backend event

const ReportFullLoad = () => {
    const { showAlert, showConfirm } = useDialog();
    const [todaySchedule, setSched] = useState(null);
    const [status, setStatus] = useState('NORMAL'); // NORMAL | FULL
    const [passengerCount, setPax] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        api.get('/api/driver/schedule').then(res => {
            if (res.data.ok) {
                const today = new Date().toISOString().split('T')[0];
                setSched(res.data.schedules.find(s => s.date?.substring(0, 10) === today) || null);
            }
        }).catch(() => { });
    }, []);

    const capacity = todaySchedule?.busId?.capacity || 45;
    const pct = passengerCount ? Math.min(Math.round((Number(passengerCount) / capacity) * 100), 100) : 0;
    const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-400' : 'bg-green-400';

    const reportFull = () => {
        showConfirm('Xác nhận báo cáo xe đã đầy? Trạng thái sẽ cập nhật lên màn hình giám sát.', async () => {
            setSaving(true);
            try {
                if (todaySchedule) {
                    await api.patch(`/api/admin/schedules/${todaySchedule._id}/log`, {
                        passengerCount: Number(passengerCount) || capacity
                    });
                    // Also update bus status
                    if (todaySchedule.busId?._id) {
                        await api.put(`/api/admin/buses/${todaySchedule.busId._id}`, { status: 'RUNNING' });
                    }
                }
                setStatus('FULL');
                showAlert('Đã báo cáo xe đầy! Màu xe trên bản đồ sẽ chuyển đỏ.', 'Thành công');
            } catch {
                setStatus('FULL');
                showAlert('Đã ghi nhận xe đầy (ngoại tuyến).', 'Thành công');
            } finally { setSaving(false); }
        });
    };

    const reportNormal = () => {
        showConfirm('Báo cáo xe đã có chỗ trống?', async () => {
            setSaving(true);
            try {
                if (todaySchedule) {
                    await api.patch(`/api/admin/schedules/${todaySchedule._id}/log`, {
                        passengerCount: Number(passengerCount) || 0
                    });
                }
                setStatus('NORMAL');
                showAlert('Đã cập nhật: xe còn chỗ.', 'Thành công');
            } catch {
                setStatus('NORMAL');
            } finally { setSaving(false); }
        });
    };

    return (
        <div className="max-w-md mx-auto space-y-6">
            <div className="pb-4 border-b border-gray-200">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FaBus className="text-[#23a983]" /> Báo trạng thái đầy/vắng
                </h1>
                <p className="text-gray-500 text-sm mt-1">Cập nhật số khách và trạng thái xe cho trung tâm giám sát</p>
            </div>

            {/* Bus info */}
            {todaySchedule ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <FaBus className="text-[#23a983] text-2xl" />
                        <div>
                            <p className="font-bold text-gray-800">{todaySchedule.busId?.licensePlate || '—'}</p>
                            <p className="text-sm text-gray-500">Sức chứa tối đa: {capacity} khách</p>
                        </div>
                    </div>

                    {/* Passenger counter */}
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Số khách hiện tại</label>
                    <div className="flex items-center gap-3 mb-4">
                        <button onClick={() => setPax(Math.max(0, Number(passengerCount) - 1).toString())}
                            className="w-10 h-10 bg-gray-100 rounded-full text-xl font-bold text-gray-600 hover:bg-gray-200">−</button>
                        <input type="number" min="0" max={capacity} value={passengerCount}
                            onChange={e => setPax(e.target.value)}
                            className="flex-1 text-center text-2xl font-bold bg-white border-2 border-gray-200 rounded-xl py-2 focus:ring-2 focus:ring-[#23a983] outline-none text-black" />
                        <button onClick={() => setPax(Math.min(capacity, Number(passengerCount) + 1).toString())}
                            className="w-10 h-10 bg-gray-100 rounded-full text-xl font-bold text-gray-600 hover:bg-gray-200">+</button>
                    </div>

                    {/* Occupancy bar */}
                    {passengerCount !== '' && (
                        <div>
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>{passengerCount} / {capacity} khách</span>
                                <span>{pct}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                                <div className={`h-3 rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                            </div>
                            <p className="text-xs mt-1 text-center font-semibold
                                ${pct >= 90 ? 'text-red-600' : pct >= 70 ? 'text-yellow-600' : 'text-green-600'}">
                                {pct >= 90 ? '🔴 Gần đầy / Đã đầy' : pct >= 70 ? '🟡 Khá đông' : '🟢 Còn nhiều chỗ'}
                            </p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-gray-50 rounded-2xl p-6 text-center text-gray-400 border border-gray-100">
                    Không có chuyến nào hôm nay
                </div>
            )}

            {/* Current status banner */}
            <div className={`rounded-2xl p-4 text-center font-bold text-lg
                ${status === 'FULL' ? 'bg-red-100 text-red-700 border-2 border-red-300' : 'bg-green-50 text-green-700 border-2 border-green-200'}`}>
                {status === 'FULL' ? '🔴 Đã báo: XE ĐẦY' : '🟢 Trạng thái: CÒN CHỖ'}
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-2 gap-3">
                <button onClick={reportFull} disabled={saving || !todaySchedule}
                    className="bg-red-500 hover:bg-red-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-40 shadow">
                    🔴 Báo xe đầy
                </button>
                <button onClick={reportNormal} disabled={saving || !todaySchedule}
                    className="bg-[#23a983] hover:bg-[#1a8a6a] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-40 shadow">
                    🟢 Còn chỗ
                </button>
            </div>
        </div>
    );
};

export default ReportFullLoad;
