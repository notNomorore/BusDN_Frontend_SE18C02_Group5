import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { FaTicketAlt, FaWallet } from 'react-icons/fa';
import CircularProgress from '@mui/material/CircularProgress';
import api from '../utils/api';
import AuthContext from '../context/AuthContext';

function localISODate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function estimateSingleTicketPrice(monthlyPassPrice) {
  const m = Number(monthlyPassPrice) || 0;
  return Math.max(5000, Math.round(m > 0 ? m / 30 : 7000));
}

function formatScheduleLabel(s) {
  const dep = s.departureTime || s.shiftTime?.start || '—';
  const plate = s.busId?.licensePlate || 'Chưa gán xe';
  const rt = s.routeId?.routeNumber ? `Tuyến ${s.routeId.routeNumber}` : 'Chuyến';
  return `${dep} · ${rt} · ${plate}`;
}

const BuyTripTicket = () => {
  const { token, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [schedules, setSchedules] = useState([]);
  const [myTickets, setMyTickets] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [lastTicket, setLastTicket] = useState(null);

  const [routeId, setRouteId] = useState('');
  const [dateStr, setDateStr] = useState(localISODate());
  const [scheduleId, setScheduleId] = useState('');
  const [seatLabel, setSeatLabel] = useState('');

  const selectedRoute = useMemo(
    () => routes.find((r) => String(r.id) === String(routeId)),
    [routes, routeId]
  );
  const estPrice = selectedRoute ? estimateSingleTicketPrice(selectedRoute.monthlyPassPrice) : null;

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rRes, wRes, tRes] = await Promise.all([
        api.get('/api/routes'),
        api.get('/api/user/wallet'),
        api.get('/api/user/trip-tickets')
      ]);
      if (rRes.data?.ok) setRoutes(rRes.data.routes || []);
      if (wRes.data?.ok) setWalletBalance(Number(wRes.data.walletBalance) || 0);
      if (tRes.data?.ok) setMyTickets(tRes.data.tickets || []);
    } catch (e) {
      console.error(e);
      setError(e.response?.data?.message || 'Không tải được dữ liệu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }
    loadInitial();
  }, [token, navigate, loadInitial]);

  useEffect(() => {
    if (!routeId || !dateStr || !token) {
      setSchedules([]);
      setScheduleId('');
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingSchedules(true);
      setScheduleId('');
      setError(null);
      try {
        const res = await api.get('/api/schedules/for-booking', {
          params: { routeId, date: dateStr }
        });
        if (cancelled) return;
        if (res.data?.ok) {
          setSchedules(res.data.schedules || []);
        } else {
          setSchedules([]);
        }
      } catch (e) {
        if (!cancelled) {
          setSchedules([]);
          setError(e.response?.data?.message || 'Không tải được lịch chuyến.');
        }
      } finally {
        if (!cancelled) setLoadingSchedules(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [routeId, dateStr, token]);

  const handlePurchase = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!scheduleId) {
      setError('Vui lòng chọn chuyến.');
      return;
    }
    const seat = String(seatLabel || '').trim().toUpperCase();
    if (!seat) {
      setError('Nhập mã ghế (ví dụ A1, 12).');
      return;
    }
    setPurchasing(true);
    try {
      const res = await api.post('/api/tickets/purchase', { scheduleId, seatLabel: seat });
      if (res.data?.ok && res.data.ticket) {
        setLastTicket(res.data.ticket);
        setSuccess(res.data.message || 'Mua vé thành công.');
        if (typeof res.data.newBalance === 'number') setWalletBalance(res.data.newBalance);
        setSeatLabel('');
        const tRes = await api.get('/api/user/trip-tickets');
        if (tRes.data?.ok) setMyTickets(tRes.data.tickets || []);
      } else {
        setError(res.data?.message || 'Mua vé thất bại.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi mua vé.');
    } finally {
      setPurchasing(false);
    }
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <CircularProgress style={{ color: '#23a983' }} />
      </div>
    );
  }

  return (
    <div className="bg-[#f5fefa] min-h-full py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <motion.div initial="hidden" animate="visible" variants={fadeInUp} className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
              <FaTicketAlt className="text-[#23a983]" />
              Mua vé lẻ theo chuyến
            </h1>
            <p className="text-gray-500 mt-1">Chọn tuyến, ngày và chuyến — thanh toán bằng ví, nhận mã QR lên xe.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="self-start px-4 py-2 border border-[#23a983] text-[#23a983] rounded-lg hover:bg-green-50 font-semibold text-sm"
          >
            Về hồ sơ / ví
          </button>
        </motion.div>

        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 text-red-700 rounded">{error}</div>
        )}
        {success && (
          <div className="mb-4 bg-green-50 border-l-4 border-[#23a983] p-4 text-green-800 rounded">{success}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="lg:col-span-1 space-y-4">
            <div className="bg-gradient-to-br from-[#1b8c6c] to-[#23a983] text-white rounded-2xl p-6 shadow-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-green-100 text-xs font-semibold uppercase tracking-wider">Số dư ví</p>
                  <p className="text-3xl font-bold mt-1">{walletBalance.toLocaleString('vi-VN')} đ</p>
                  <p className="mt-3 text-green-50 text-sm">{user?.fullName || 'Hành khách'}</p>
                </div>
                <FaWallet className="text-4xl text-green-100 opacity-80" />
              </div>
            </div>
            {estPrice != null && (
              <div className="bg-white rounded-xl border border-gray-100 p-4 text-sm text-gray-600 shadow-sm">
                <strong className="text-gray-800">Giá vé lẻ ước tính:</strong>{' '}
                <span className="text-[#23a983] font-bold">{estPrice.toLocaleString('vi-VN')} đ</span>
                <span className="block mt-1 text-xs text-gray-400">Cùng công thức với hệ thống thanh toán (tối thiểu 5.000đ).</span>
              </div>
            )}
          </motion.div>

          <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="lg:col-span-2 bg-white rounded-2xl shadow-md border border-gray-100 p-6 md:p-8">
            <form onSubmit={handlePurchase} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tuyến</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#23a983] focus:border-transparent outline-none"
                  value={routeId}
                  onChange={(e) => setRouteId(e.target.value)}
                  required
                >
                  <option value="">— Chọn tuyến —</option>
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.routeNumber} — {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Ngày đi</label>
                <input
                  type="date"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#23a983] focus:border-transparent outline-none"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Chuyến</label>
                {loadingSchedules ? (
                  <div className="flex items-center gap-2 text-gray-500 py-2">
                    <CircularProgress size={22} style={{ color: '#23a983' }} />
                    Đang tải lịch…
                  </div>
                ) : (
                  <select
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#23a983] focus:border-transparent outline-none"
                    value={scheduleId}
                    onChange={(e) => setScheduleId(e.target.value)}
                    required
                    disabled={!routeId}
                  >
                    <option value="">— Chọn chuyến —</option>
                    {schedules.map((s) => (
                      <option key={s._id} value={s._id}>
                        {formatScheduleLabel(s)}
                      </option>
                    ))}
                  </select>
                )}
                {routeId && !loadingSchedules && schedules.length === 0 && (
                  <p className="text-sm text-amber-700 mt-2">Không có chuyến khả dụng trong ngày này.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Ghế</label>
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 uppercase focus:ring-2 focus:ring-[#23a983] focus:border-transparent outline-none"
                  placeholder="Ví dụ: A1, 12"
                  value={seatLabel}
                  onChange={(e) => setSeatLabel(e.target.value)}
                  maxLength={8}
                />
              </div>
              <button
                type="submit"
                disabled={purchasing || !scheduleId}
                className="w-full py-3 rounded-xl bg-[#23a983] text-white font-bold hover:bg-[#1b8c6c] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {purchasing ? 'Đang xử lý…' : 'Thanh toán & lấy vé'}
              </button>
            </form>

            {lastTicket?.qrCode && (
              <div className="mt-8 pt-8 border-t border-gray-100 text-center">
                <p className="text-sm font-semibold text-gray-700 mb-3">Mã QR vé của bạn</p>
                <div className="inline-block p-4 bg-white border-2 border-[#23a983]/30 rounded-2xl shadow-inner">
                  <QRCodeSVG value={lastTicket.qrCode} size={200} level="M" includeMargin />
                </div>
                <p className="mt-3 font-mono text-sm text-gray-600 break-all">{lastTicket.qrCode}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Ghế {lastTicket.seatLabel} · Đưa mã này cho phụ xe quét khi lên xe.
                </p>
              </div>
            )}
          </motion.div>
        </div>

        {myTickets.length > 0 && (
          <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="mt-10 bg-white rounded-2xl shadow-md border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Vé lẻ gần đây</h2>
            <ul className="divide-y divide-gray-100">
              {myTickets.map((t) => (
                <li key={t._id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
                  <div>
                    <span className="font-semibold text-gray-800">
                      {t.routeId?.routeNumber ? `Tuyến ${t.routeId.routeNumber}` : 'Vé'} · Ghế {t.seatLabel}
                    </span>
                    <span className="block text-gray-500">
                      {t.status === 'USED' ? 'Đã sử dụng' : t.status === 'CANCELLED' ? 'Đã hủy' : 'Hợp lệ'} ·{' '}
                      {(t.pricePaid || 0).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                  <code className="text-xs bg-gray-50 px-2 py-1 rounded text-gray-700 break-all max-w-full sm:max-w-xs">
                    {t.qrCode}
                  </code>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default BuyTripTicket;
