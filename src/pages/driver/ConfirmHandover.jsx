import React, { useState, useEffect } from 'react';
import { FaCheckCircle, FaBus, FaClipboardCheck } from 'react-icons/fa';
import api from '../../utils/api';
import { useDialog } from '../../context/DialogContext';

const checklist = [
    { id: 'vehicle', label: 'Đã kiểm tra xe (lốp, đèn, phanh)' },
    { id: 'device', label: 'Thiết bị GPS/camera hoạt động' },
    { id: 'cleanliness', label: 'Xe sạch sẽ, ghế ngồi nguyên vẹn' },
    { id: 'fuel', label: 'Nhiên liệu đủ cho hành trình' },
    { id: 'docs', label: 'Đầy đủ giấy tờ xe, đăng kiểm' },
];

const ConfirmHandover = () => {
    const { showAlert, showConfirm } = useDialog();
    const [checks, setChecks] = useState({});
    const [todaySchedule, setSched] = useState(null);
    const [confirmed, setConfirmed] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const done = localStorage.getItem('handoverConfirmed');
        if (done === 'true') setConfirmed(true);
        api.get('/api/driver/schedule').then(res => {
            if (res.data.ok) {
                const today = new Date().toISOString().split('T')[0];
                setSched(res.data.schedules.find(s => s.date?.substring(0, 10) === today) || null);
            }
        }).catch(() => { });
    }, []);

    const toggle = (id) => setChecks(prev => ({ ...prev, [id]: !prev[id] }));
    const allChecked = checklist.every(c => checks[c.id]);

    const handleConfirm = () => {
        if (!allChecked) { showAlert('Vui lòng hoàn thành toàn bộ checklist trước khi xác nhận', 'Chưa đủ'); return; }
        showConfirm('Xác nhận nhận xe và bắt đầu ca trực?', async () => {
            setSaving(true);
            try {
                await api.post('/api/driver/confirm-handover', { scheduleId: todaySchedule?._id });
            } catch (err) { console.error('Handover API error:', err); }
            setConfirmed(true);
            localStorage.setItem('handoverConfirmed', 'true');
            showAlert('Đã xác nhận nhận xe. Chúc chuyến đi an toàn!', 'Thành công');
            setSaving(false);
        });
    };

    if (confirmed) return (
        <div className="max-w-md mx-auto text-center py-16 space-y-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-4xl">✅</div>
            <h2 className="text-2xl font-bold text-green-700">Đã xác nhận nhận xe</h2>
            <p className="text-gray-500">Ca trực hôm nay đã bắt đầu. Lái xe an toàn!</p>
            <button onClick={() => { setConfirmed(false); localStorage.removeItem('handoverConfirmed'); setChecks({}); }}
                className="text-sm text-gray-400 underline">Đặt lại</button>
        </div>
    );

    return (
        <div className="max-w-lg mx-auto space-y-6">
            <div className="pb-4 border-b border-gray-200">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FaClipboardCheck className="text-[#23a983]" /> Xác nhận nhận xe đầu ca
                </h1>
                <p className="text-gray-500 text-sm mt-1">Kiểm tra thiết bị và xe trước khi bắt đầu chạy</p>
            </div>

            {/* Bus info */}
            {todaySchedule && (
                <div className="bg-[#f0fdf9] border border-[#23a983]/30 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <FaBus className="text-[#23a983] text-2xl" />
                        <div>
                            <p className="font-bold text-gray-800">{todaySchedule.busId?.licensePlate || 'Biển số chưa gán'}</p>
                            <p className="text-sm text-gray-500">Tuyến {todaySchedule.routeId?.routeNumber} · Ca {todaySchedule.shiftTime?.start}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Checklist */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-black space-y-3">
                <p className="font-semibold text-gray-700 mb-3">Checklist kiểm tra xe</p>
                {checklist.map(item => (
                    <label key={item.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all
                            ${checks[item.id] ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                            ${checks[item.id] ? 'border-green-500 bg-green-500' : 'border-gray-400'}`}>
                            {checks[item.id] && <span className="text-white text-xs">✓</span>}
                        </div>
                        <input type="checkbox" checked={!!checks[item.id]} onChange={() => toggle(item.id)} className="hidden" />
                        <span className={`text-sm font-medium ${checks[item.id] ? 'text-green-700 line-through' : 'text-gray-700'}`}>
                            {item.label}
                        </span>
                    </label>
                ))}
            </div>

            <div className="flex items-center justify-between text-sm text-gray-500 bg-gray-50 rounded-xl p-3">
                <span>Đã hoàn thành</span>
                <span className="font-bold text-[#23a983]">{checklist.filter(c => checks[c.id]).length}/{checklist.length}</span>
            </div>

            <button onClick={handleConfirm} disabled={!allChecked || saving}
                className="w-full bg-[#23a983] hover:bg-[#1a8a6a] text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow disabled:opacity-40">
                <FaCheckCircle /> {saving ? 'Đang xác nhận...' : 'Xác nhận nhận xe'}
            </button>
        </div>
    );
};

export default ConfirmHandover;
