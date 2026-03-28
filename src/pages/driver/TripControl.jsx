import React, { useEffect, useRef, useState } from 'react';
import { FaBus, FaCheck, FaPlay, FaSatelliteDish, FaStop } from 'react-icons/fa';
import api from '../../utils/api';
import { useDialog } from '../../context/DialogContext';

const GPS_OPTIONS = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 0,
};
const GPS_HEARTBEAT_MS = 5000;

const TripControl = () => {
    const { showAlert, showConfirm } = useDialog();
    const [todaySchedule, setTodaySchedule] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tripState, setTripState] = useState('idle');
    const [startTime, setStartTime] = useState(null);
    const [gpsStatus, setGpsStatus] = useState('idle');
    const [gpsMessage, setGpsMessage] = useState('Chưa kích hoạt GPS');
    const watchIdRef = useRef(null);
    const heartbeatRef = useRef(null);
    const scheduleRef = useRef(null);
    const lastCoordsRef = useRef(null);
    const lastSentAtRef = useRef(0);

    useEffect(() => {
        scheduleRef.current = todaySchedule;
    }, [todaySchedule]);

    const stopGpsWatch = () => {
        if (watchIdRef.current !== null && navigator.geolocation) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        if (heartbeatRef.current !== null) {
            window.clearInterval(heartbeatRef.current);
            heartbeatRef.current = null;
        }
    };

    const syncFromSchedule = (sched) => {
        if (sched?.actualEnd) {
            setTripState('finished');
            setStartTime(sched.actualStart || null);
            setGpsStatus('stopped');
            setGpsMessage('Đã tắt GPS và chốt ca');
            localStorage.setItem('tripState', 'finished');
            localStorage.removeItem('tripStartTime');
            stopGpsWatch();
            return;
        }

        if (sched?.actualStart) {
            setTripState('started');
            setStartTime(sched.actualStart);
            setGpsStatus('tracking');
            setGpsMessage('Đang gửi vị trí xe');
            localStorage.setItem('tripState', 'started');
            localStorage.setItem('tripStartTime', sched.actualStart);
            return;
        }

        setTripState('idle');
        setStartTime(null);
        setGpsStatus('idle');
        setGpsMessage('Chưa kích hoạt GPS');
        localStorage.removeItem('tripState');
        localStorage.removeItem('tripStartTime');
        stopGpsWatch();
    };

    const fetchToday = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/driver/schedule');
            if (res.data.ok) {
                const today = new Date().toISOString().split('T')[0];
                const sched = res.data.schedules.find((item) => item.date?.substring(0, 10) === today) || null;
                setTodaySchedule(sched);
                syncFromSchedule(sched);
            }
        } catch (error) {
            console.error('Fetch today schedule error:', error);
            showAlert('Lỗi tải lịch hôm nay', 'Lỗi');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchToday();
        return () => stopGpsWatch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const sendTrackingLocation = async (coords, scheduleId, { force = false } = {}) => {
        const targetScheduleId = scheduleId || scheduleRef.current?._id;
        if (!targetScheduleId) return;
        const now = Date.now();
        if (!force && now - lastSentAtRef.current < 1500) return;

        await api.post('/api/driver/tracking/location', {
            scheduleId: targetScheduleId,
            lat: coords.latitude,
            lng: coords.longitude,
            accuracy: coords.accuracy,
            speed: coords.speed,
            heading: coords.heading,
        });
        lastSentAtRef.current = now;
    };

    const startGpsWatch = (scheduleId) => {
        if (!navigator.geolocation) {
            setGpsStatus('error');
            setGpsMessage('Trình duyệt không hỗ trợ GPS');
            showAlert('Thiết bị/trình duyệt không hỗ trợ GPS', 'Lỗi GPS');
            return;
        }

        stopGpsWatch();
        setGpsStatus('tracking');
        setGpsMessage('Đang gửi vị trí xe');

        watchIdRef.current = navigator.geolocation.watchPosition(
            async (position) => {
                try {
                    lastCoordsRef.current = position.coords;
                    await sendTrackingLocation(position.coords, scheduleId);
                    setGpsStatus('tracking');
                    setGpsMessage('Đang gửi vị trí xe');
                } catch (error) {
                    console.error('Tracking update error:', error);
                    setGpsStatus('error');
                    setGpsMessage('Gửi GPS thất bại, đang chờ cập nhật tiếp');
                }
            },
            (error) => {
                console.error('GPS watch error:', error);
                setGpsStatus('error');
                if (error.code === 1) {
                    setGpsMessage('GPS bị từ chối quyền truy cập');
                } else if (error.code === 2) {
                    setGpsMessage('Không lấy được vị trí hiện tại');
                } else {
                    setGpsMessage('GPS timeout hoặc bị gián đoạn');
                }
            },
            GPS_OPTIONS
        );

        heartbeatRef.current = window.setInterval(async () => {
            if (!navigator.geolocation) return;

            try {
                const latestPosition = await requestCurrentPosition();
                lastCoordsRef.current = latestPosition.coords;
                await sendTrackingLocation(latestPosition.coords, scheduleId, { force: true });
                setGpsStatus('tracking');
                setGpsMessage('Đang gửi vị trí xe liên tục');
            } catch (error) {
                console.error('GPS heartbeat error:', error);
            }
        }, GPS_HEARTBEAT_MS);
    };

    useEffect(() => {
        if (tripState === 'started' && todaySchedule?._id) {
            startGpsWatch(todaySchedule._id);
        } else if (tripState !== 'started') {
            stopGpsWatch();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tripState, todaySchedule?._id]);

    const requestCurrentPosition = () => new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('unsupported'));
            return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, GPS_OPTIONS);
    });

    const handleStart = () => {
        showConfirm('Xác nhận bắt đầu chuyến đi? Hệ thống sẽ xin quyền GPS và gửi vị trí xe real-time.', async () => {
            if (!todaySchedule?._id) {
                showAlert('Không tìm thấy chuyến hôm nay', 'Lỗi');
                return;
            }

            setGpsStatus('requesting');
            setGpsMessage('Đang xin quyền GPS');

            let position;
            try {
                position = await requestCurrentPosition();
            } catch (error) {
                console.error('GPS permission error:', error);
                setGpsStatus('error');
                setGpsMessage('Chưa được cấp quyền GPS');
                showAlert('Cần cấp quyền truy cập vị trí để bắt đầu chuyến', 'Quyền GPS');
                return;
            }

            try {
                const res = await api.post('/api/driver/start-trip', { scheduleId: todaySchedule._id });
                if (!res.data?.ok) throw new Error('start_failed');

                const schedule = res.data?.schedule || todaySchedule;
                setTodaySchedule(schedule);
                setStartTime(schedule.actualStart || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
                setTripState('started');
                localStorage.setItem('tripState', 'started');
                localStorage.setItem('tripStartTime', schedule.actualStart || '');

                await sendTrackingLocation(position.coords, schedule._id || todaySchedule._id);
                startGpsWatch(schedule._id || todaySchedule._id);
                showAlert(`Chuyến đã bắt đầu lúc ${schedule.actualStart || '--:--'}`, 'Thông báo');
            } catch (error) {
                console.error('Start trip error:', error);
                setGpsStatus('error');
                setGpsMessage('Không thể bắt đầu chuyến');
                showAlert(error?.response?.data?.message || 'Không thể bắt đầu chuyến. Vui lòng thử lại.', 'Lỗi');
            }
        });
    };

    const handleFinish = () => {
        showConfirm('Kết thúc chuyến? GPS sẽ tắt và hệ thống sẽ chốt ca.', async () => {
            const now = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            stopGpsWatch();

            if (todaySchedule?._id) {
                try {
                    const res = await api.post('/api/driver/finish-trip', {
                        scheduleId: todaySchedule._id,
                        actualEnd: now,
                    });
                    const schedule = res.data?.schedule || { ...todaySchedule, actualEnd: now };
                    setTodaySchedule(schedule);
                    syncFromSchedule(schedule);
                } catch (error) {
                    console.error('Finish trip error:', error);
                    showAlert(error?.response?.data?.message || 'Không thể kết thúc chuyến. Vui lòng thử lại.', 'Lỗi');
                    if (tripState === 'started' && todaySchedule?._id) {
                        startGpsWatch(todaySchedule._id);
                    }
                    return;
                }
            } else {
                setTripState('finished');
            }

            setGpsStatus('stopped');
            setGpsMessage('Đã tắt GPS và chốt ca');
            showAlert(`Chuyến đã kết thúc lúc ${now}. Cảm ơn!`, 'Hoàn thành');
        });
    };

    const handleReset = () => {
        if (todaySchedule?.actualEnd) {
            showAlert('Chuyến hôm nay đã kết thúc và được chốt sổ. Không thể bắt đầu lại.', 'Đã chốt ca');
            return;
        }
        setTripState('idle');
        setStartTime(null);
        setGpsStatus('idle');
        setGpsMessage('Chưa kích hoạt GPS');
        localStorage.removeItem('tripState');
        localStorage.removeItem('tripStartTime');
        stopGpsWatch();
    };

    const gpsTone = gpsStatus === 'tracking'
        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        : gpsStatus === 'error'
            ? 'bg-red-50 text-red-700 border border-red-200'
            : gpsStatus === 'requesting'
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-slate-50 text-slate-600 border border-slate-200';

    return (
        <div className="max-w-md mx-auto space-y-6">
            <div className="pb-4 border-b border-gray-200">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FaBus className="text-[#23a983]" /> Điều khiển chuyến xe
                </h1>
                <p className="text-gray-500 text-sm mt-1">Bắt đầu / Kết thúc chuyến hôm nay và gửi GPS real-time</p>
            </div>

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
                                {todaySchedule.shiftTime?.start} - {todaySchedule.shiftTime?.end}
                                {' · '}{todaySchedule.busId?.licensePlate || 'Chưa gán xe'}
                            </p>
                        </div>
                    </div>
                    {startTime ? (
                        <p className="text-sm text-green-600 font-medium">Bắt đầu lúc {startTime}</p>
                    ) : null}
                </div>
            ) : (
                <div className="bg-gray-50 rounded-2xl p-6 text-center border border-gray-100">
                    <p className="text-gray-400">Không có chuyến nào hôm nay</p>
                </div>
            )}

            <div className={`rounded-2xl p-5 text-center font-bold text-lg
                ${tripState === 'idle' ? 'bg-gray-100 text-gray-600' :
                    tripState === 'started' ? 'bg-green-50 text-green-700 border border-green-200' :
                        'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                {tripState === 'idle' && 'Chưa bắt đầu'}
                {tripState === 'started' && 'Đang chạy'}
                {tripState === 'finished' && 'Đã hoàn thành'}
            </div>

            <div className={`rounded-2xl p-4 ${gpsTone}`}>
                <div className="flex items-center gap-3">
                    <FaSatelliteDish className="text-lg" />
                    <div>
                        <p className="text-sm font-bold">Trạng thái GPS</p>
                        <p className="text-xs mt-1">{gpsMessage}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                {tripState === 'idle' && (
                    <button
                        onClick={handleStart}
                        disabled={!todaySchedule}
                        className="w-full bg-[#23a983] hover:bg-[#1a8a6a] text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg disabled:opacity-40"
                    >
                        <FaPlay /> Bắt đầu chuyến
                    </button>
                )}
                {tripState === 'started' && (
                    <button
                        onClick={handleFinish}
                        className="w-full bg-red-500 hover:bg-red-600 text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg"
                    >
                        <FaStop /> Kết thúc chuyến
                    </button>
                )}
                {tripState === 'finished' && (
                    <div className="space-y-2">
                        {todaySchedule?.actualEnd ? (
                            <div className="w-full bg-gray-100 text-gray-500 py-3 rounded-2xl font-semibold text-center border border-gray-200">
                                Ca đã chốt - không thể bắt đầu lại
                            </div>
                        ) : (
                            <button
                                onClick={handleReset}
                                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-2xl font-semibold flex items-center justify-center gap-2"
                            >
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
