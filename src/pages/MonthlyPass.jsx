import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import AuthContext from '../context/AuthContext';
import { buildMonthlyPassDetailsPath } from '../utils/monthlyPass';

const PASS_TYPE = { SINGLE_ROUTE: 'SINGLE_ROUTE', INTER_ROUTE: 'INTER_ROUTE' };
const PAYMENT_METHOD = { VNPAY: 'VNPAY', MOMO: 'MOMO' };

const fmt = (n) => Number(n || 0).toLocaleString('vi-VN');
const getPassRouteId = (pass) => {
  if (!pass?.routeId) return '';
  if (typeof pass.routeId === 'object') return String(pass.routeId._id || '');
  return String(pass.routeId);
};

const StatusBadge = ({ status }) => {
  const styles = {
    ACTIVE: 'bg-[#b5efd1] text-[#001a0f]',
    EXPIRED: 'bg-[#dbe5e1] text-[#414844]',
    CANCELLED: 'bg-[#ffdad6] text-[#93000a]',
  };
  const labels = { ACTIVE: 'Đang dùng', EXPIRED: 'Hết hạn', CANCELLED: 'Đã huỷ' };
  return (
    <span className={`inline-block px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-widest ${styles[status] || styles.EXPIRED}`}>
      {labels[status] || status}
    </span>
  );
};

const MonthlyPass = () => {
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [pageData, setPageData] = useState({
    walletBalance: 0,
    priorityDiscountPercent: 0,
    priorityDiscountEligible: false,
    routes: [],
    myPasses: [],
    interRouteMonthlyPrice: 0,
  });

  const [passType, setPassType] = useState(PASS_TYPE.SINGLE_ROUTE);
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHOD.VNPAY);
  const [promoCode, setPromoCode] = useState('');
  const [promoResult, setPromoResult] = useState(null); // { applied, promoCode, promoDiscountAmount, message }
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    (async () => {
      try {
        const res = await api.get('/api/user/passes/monthly');
        if (res.data.ok) {
          setPageData({
            walletBalance: res.data.walletBalance || 0,
            priorityDiscountPercent: Number(res.data.priorityDiscountPercent || 0),
            priorityDiscountEligible: !!res.data.priorityDiscountEligible,
            routes: res.data.routes || [],
            myPasses: res.data.myPasses || [],
            interRouteMonthlyPrice: res.data.interRouteMonthlyPrice || 0,
          });
        }
      } catch {
        setError('Không thể tải dữ liệu vé tháng.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token, navigate]);

  useEffect(() => {
    const queryPassType = searchParams.get('passType');
    const queryRouteId = searchParams.get('routeId');
    const queryPaymentMethod = searchParams.get('paymentMethod');
    const queryMonth = Number(searchParams.get('month') || 0);
    const queryYear = Number(searchParams.get('year') || 0);
    const queryPromoCode = searchParams.get('promoCode');
    const queryError = searchParams.get('error');
    const querySuccess = searchParams.get('success');

    if (queryPassType === PASS_TYPE.SINGLE_ROUTE || queryPassType === PASS_TYPE.INTER_ROUTE) {
      setPassType(queryPassType);
    }
    if (queryRouteId !== null) {
      setSelectedRouteId(queryRouteId || '');
    }
    if (queryPaymentMethod === PAYMENT_METHOD.VNPAY || queryPaymentMethod === PAYMENT_METHOD.MOMO) {
      setPaymentMethod(queryPaymentMethod);
    }
    if (Number.isInteger(queryMonth) && queryMonth >= 1 && queryMonth <= 12) {
      setSelectedMonth(queryMonth);
    }
    if (Number.isInteger(queryYear) && queryYear >= new Date().getFullYear()) {
      setSelectedYear(queryYear);
    }
    if (queryPromoCode !== null) {
      setPromoCode(queryPromoCode);
      setPromoResult(null);
      setPromoError('');
    }
    if (queryError) {
      setError(queryError);
      setSuccess('');
    } else if (querySuccess) {
      setSuccess(querySuccess);
      setError('');
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedYear === currentYear && selectedMonth < currentMonth) {
      setSelectedMonth(currentMonth);
    }
  }, [currentMonth, currentYear, selectedMonth, selectedYear]);

  // ── Derived price calculations ──────────────────────────────────────────────
  const selectedRoute = pageData.routes.find(r => r._id === selectedRouteId) || null;
  const existingPass = pageData.myPasses.find((pass) => {
    const normalizedPassType = pass.passType || PASS_TYPE.SINGLE_ROUTE;
    if (normalizedPassType !== passType) return false;
    if (Number(pass.month) !== Number(selectedMonth) || Number(pass.year) !== Number(selectedYear)) return false;
    if (String(pass.status || '').toUpperCase() === 'CANCELLED') return false;
    if (passType === PASS_TYPE.SINGLE_ROUTE) {
      return getPassRouteId(pass) === String(selectedRouteId || '');
    }
    return true;
  }) || null;

  const basePrice = passType === PASS_TYPE.INTER_ROUTE
    ? pageData.interRouteMonthlyPrice
    : (selectedRoute?.effectiveMonthlyPassPrice ?? selectedRoute?.monthlyPassPrice ?? 0);

  const priorityDiscountAmt = pageData.priorityDiscountEligible
    ? Math.round((basePrice * pageData.priorityDiscountPercent) / 100)
    : 0;

  const priceAfterPriority = Math.max(0, basePrice - priorityDiscountAmt);

  // promoDiscount is applied on top of priority-discounted price (matches backend)
  // Use server-computed values when available to avoid rounding drift
  const promoDiscountAmt = promoResult?.applied ? (promoResult.promoDiscountAmount || 0) : 0;
  const finalPrice = promoResult?.applied && promoResult.finalPrice != null
    ? promoResult.finalPrice
    : Math.max(0, priceAfterPriority - promoDiscountAmt);

  // ── Promo preview ────────────────────────────────────────────────────────────
  const handlePromoApply = useCallback(async () => {
    const code = promoCode.trim();
    if (!code) return;
    if (passType === PASS_TYPE.SINGLE_ROUTE && !selectedRouteId) {
      setPromoError('Vui lòng chọn tuyến trước khi áp mã.');
      return;
    }
    setPromoLoading(true);
    setPromoError('');
    setPromoResult(null);
    try {
      const params = new URLSearchParams({ passType, promoCode: code });
      if (passType === PASS_TYPE.SINGLE_ROUTE) params.append('routeId', selectedRouteId);
      const res = await api.get(`/api/user/passes/monthly/promo-preview?${params}`);
      if (res.data.ok && res.data.applied) {
        setPromoResult(res.data);
      } else {
        setPromoError(res.data.message || 'Mã không hợp lệ hoặc không áp dụng được.');
      }
    } catch (e) {
      if (e.response?.status === 409 && e.response?.data?.existingPassId) {
        navigate(buildMonthlyPassDetailsPath(e.response.data.existingPassId));
        return;
      }
      setPromoError(e.response?.data?.message || 'Không thể kiểm tra mã giảm giá.');
    } finally {
      setPromoLoading(false);
    }
  }, [navigate, passType, promoCode, selectedMonth, selectedRouteId, selectedYear]);

  // ── Purchase / Checkout ──────────────────────────────────────────────────────
  const handlePurchase = async () => {
    setError(''); setSuccess('');
    if (passType === PASS_TYPE.SINGLE_ROUTE && !selectedRouteId) {
      setError('Vui lòng chọn tuyến xe.'); return;
    }
    if (existingPass?._id) {
      navigate(buildMonthlyPassDetailsPath(existingPass._id));
      return;
    }
    setPurchasing(true);
    try {
      const res = await api.post('/api/user/passes/monthly/checkout', {
        passType,
        routeId: passType === PASS_TYPE.SINGLE_ROUTE ? selectedRouteId : undefined,
        month: selectedMonth,
        year: selectedYear,
        paymentMethod,
        promoCode: promoCode.trim() || undefined,
      });
      if (res.data.ok && res.data.paymentUrl) {
        window.location.href = res.data.paymentUrl;
      } else {
        setError(res.data.message || 'Không thể khởi tạo thanh toán.');
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Lỗi hệ thống, vui lòng thử lại.');
    } finally {
      setPurchasing(false);
    }
  };

  const years = [currentYear, currentYear + 1, currentYear + 2];
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const selectableMonths = selectedYear === currentYear
    ? months.filter(m => m >= currentMonth)
    : months;

  // ── Loading state ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f2fcf8] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#2ba471] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f2fcf8] text-[#141d1b] font-inter">

      {/* ── Header ── */}
      <header className="bg-[#f2fcf8] flex justify-between items-center w-full px-6 py-4 fixed top-0 z-50 shadow-sm">
        <div className="flex items-center gap-8">
          <span className="text-xl font-extrabold text-[#001a0f] tracking-tight font-jakarta">BusDN</span>
          <nav className="hidden md:flex items-center gap-6">
            <button onClick={() => navigate('/')} className="text-[#426656] font-jakarta font-bold text-base hover:bg-[#e6f0ec] transition-colors px-3 py-1 rounded-lg">
              Trang chủ
            </button>
            <span className="text-[#2ba471] font-jakarta font-bold text-base px-3 py-1 rounded-lg">Vé tháng</span>
            <button onClick={() => navigate('/routes')} className="text-[#426656] font-jakarta font-bold text-base hover:bg-[#e6f0ec] transition-colors px-3 py-1 rounded-lg">
              Tuyến xe
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/profile')} className="p-2 text-[#001a0f] hover:bg-[#e6f0ec] rounded-full transition-colors active:scale-95 duration-150">
            <span className="material-symbols-outlined">account_circle</span>
          </button>
        </div>
      </header>

      {/* ── Main grid ── */}
      <main className="mt-20 mb-24 px-6 max-w-7xl mx-auto w-full grid grid-cols-12 gap-8">

        {/* ── Left column ── */}
        <section className="col-span-12 lg:col-span-7 flex flex-col gap-6 pt-6">

          {/* Title */}
          <div className="flex flex-col gap-1">
            <h1 className="text-4xl font-extrabold text-[#001a0f] tracking-tight font-jakarta">Mua vé tháng</h1>
            <p className="text-[#426656] font-medium">Chọn loại vé và thời gian bắt đầu hành trình của bạn.</p>
          </div>

          {/* Alerts */}
          {error && (
            <div className="flex items-center gap-3 bg-[#ffdad6] text-[#93000a] px-4 py-3 rounded-xl text-sm font-medium">
              <span className="material-symbols-outlined text-base">error</span>
              <span className="flex-1">{error}</span>
              <button onClick={() => setError('')}><span className="material-symbols-outlined text-base">close</span></button>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-3 bg-[#b5efd1] text-[#001a0f] px-4 py-3 rounded-xl text-sm font-medium">
              <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              <span className="flex-1">{success}</span>
              <button onClick={() => setSuccess('')}><span className="material-symbols-outlined text-base">close</span></button>
            </div>
          )}

          {/* Pass type */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { type: PASS_TYPE.SINGLE_ROUTE, label: 'Vé đơn tuyến', sub: 'Phổ biến' },
              { type: PASS_TYPE.INTER_ROUTE, label: 'Vé liên tuyến', sub: 'Toàn hệ thống' },
            ].map(({ type, label, sub }) => {
              const active = passType === type;
              return (
                <button
                  key={type}
                  onClick={() => { setPassType(type); if (type === PASS_TYPE.INTER_ROUTE) setSelectedRouteId(''); setPromoResult(null); setPromoCode(''); setPromoError(''); }}
                  className={`flex items-center justify-between p-5 rounded-xl border-2 transition-all text-left ${active ? 'border-[#2ba471] bg-white shadow-sm' : 'border-transparent bg-[#ecf6f2] hover:bg-[#e6f0ec]'}`}
                >
                  <div className="flex flex-col gap-1">
                    <span className={`text-xs font-bold uppercase tracking-widest ${active ? 'text-[#2ba471]' : 'text-[#426656] opacity-60'}`}>{sub}</span>
                    <span className="text-lg font-bold text-[#001a0f] font-jakarta">{label}</span>
                  </div>
                  <span className="material-symbols-outlined text-[#2ba471]" style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>
                    {active ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Route selector */}
          {passType === PASS_TYPE.SINGLE_ROUTE && (
            <div className="bg-white p-6 rounded-2xl flex flex-col gap-4 shadow-sm">
              <label className="text-sm font-bold text-[#001a0f] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#2ba471] text-xl">directions_bus</span>
                Chọn tuyến xe buýt
              </label>
              <div className="relative">
                <select
                  value={selectedRouteId}
                  onChange={e => { setSelectedRouteId(e.target.value); setPromoResult(null); setPromoError(''); }}
                  className="w-full h-14 pl-4 pr-10 rounded-xl bg-[#ecf6f2] border-none focus:ring-2 focus:ring-[#2ba471] appearance-none font-medium text-[#141d1b] outline-none"
                >
                  <option value="">-- Vui lòng chọn tuyến xe --</option>
                  {pageData.routes.map(r => (
                    <option key={r._id} value={r._id}>
                      {r.routeNumber ? `Tuyến ${r.routeNumber}: ` : ''}{r.name} · {fmt(r.effectiveMonthlyPassPrice ?? r.monthlyPassPrice)}đ
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#426656]">unfold_more</span>
              </div>
            </div>
          )}

          {/* Month / Year */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-2xl flex flex-col gap-3 shadow-sm">
              <label className="text-sm font-bold text-[#001a0f]">Tháng</label>
              <div className="relative">
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(Number(e.target.value))}
                  className="w-full h-12 px-4 rounded-xl bg-[#ecf6f2] border-none focus:ring-2 focus:ring-[#2ba471] font-medium outline-none appearance-none"
                >
                  {selectableMonths.map(m => <option key={m} value={m}>Tháng {String(m).padStart(2, '0')}</option>)}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#426656] text-base">expand_more</span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl flex flex-col gap-3 shadow-sm">
              <label className="text-sm font-bold text-[#001a0f]">Năm</label>
              <div className="relative">
                <select
                  value={selectedYear}
                  onChange={e => {
                    const nextYear = Number(e.target.value);
                    setSelectedYear(nextYear);
                    if (nextYear === currentYear && selectedMonth < currentMonth) {
                      setSelectedMonth(currentMonth);
                    }
                  }}
                  className="w-full h-12 px-4 rounded-xl bg-[#ecf6f2] border-none focus:ring-2 focus:ring-[#2ba471] font-medium outline-none appearance-none"
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#426656] text-base">expand_more</span>
              </div>
            </div>
          </div>

          {/* Recent passes */}
          {pageData.myPasses.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-[#001a0f] mb-4 uppercase tracking-widest">Vé tháng gần đây</h3>
              <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                {pageData.myPasses.slice(0, 5).map(pass => {
                  const isActive = pass.status === 'ACTIVE';
                  return (
                    <div key={pass._id} className={`min-w-[220px] p-4 rounded-2xl flex flex-col gap-2 relative overflow-hidden shrink-0 ${isActive ? 'bg-[#003120] text-white' : 'bg-[#dbe5e1] text-[#414844]'}`}>
                      <div className="absolute -right-4 -top-4 opacity-10">
                        <span className="material-symbols-outlined" style={{ fontSize: 80 }}>confirmation_number</span>
                      </div>
                      <div className="flex justify-between items-start">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${isActive ? 'bg-[#2ba471] text-white' : 'bg-[#426656] text-white'}`}>
                          {pass.displayRouteNumber ? `Tuyến ${pass.displayRouteNumber}` : 'Liên tuyến'}
                        </span>
                        <span className="text-xs opacity-70">T{String(pass.month).padStart(2, '0')}/{pass.year}</span>
                      </div>
                      <span className="text-base font-bold leading-snug font-jakarta">{pass.displayRouteName || 'Vé tháng'}</span>
                      <span className="text-xs opacity-70">Mã vé: {pass.passCode}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {existingPass && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Ve da ton tai</p>
                  <p className="mt-1 text-sm font-semibold">
                    Ban da co ve cho ky {String(selectedMonth).padStart(2, '0')}/{selectedYear}
                    {passType === PASS_TYPE.SINGLE_ROUTE && selectedRoute?.name ? ` tren tuyen ${selectedRoute.routeNumber ? `${selectedRoute.routeNumber} - ` : ''}${selectedRoute.name}` : ''}.
                  </p>
                  <p className="mt-1 text-xs font-medium">Ma ve: {existingPass.passCode}</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(buildMonthlyPassDetailsPath(existingPass._id))}
                  className="inline-flex items-center justify-center rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-amber-700"
                >
                  Xem vé hiện tại
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ── Right column ── */}
        <aside className="col-span-12 lg:col-span-5 flex flex-col gap-6 pt-6">

          {/* Payment method */}
          <div className="bg-white p-6 rounded-3xl shadow-sm flex flex-col gap-5">
            <h2 className="text-lg font-bold text-[#001a0f] font-jakarta">Phương thức thanh toán</h2>
            <div className="flex flex-col gap-3">
              {[
                {
                  method: PAYMENT_METHOD.VNPAY,
                  icon: (
                    <div className="w-10 h-10 bg-white rounded-lg border border-[#c1c8c3] flex items-center justify-center overflow-hidden p-1">
                      <span className="text-[10px] font-black text-blue-700 leading-none text-center">VNP<br/>AY</span>
                    </div>
                  ),
                  label: 'VNPAY QR',
                },
                {
                  method: PAYMENT_METHOD.MOMO,
                  icon: (
                    <div className="w-10 h-10 bg-[#A50064] rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm font-black">M</span>
                    </div>
                  ),
                  label: 'Ví MoMo',
                },
              ].map(({ method, icon, label }) => {
                const active = paymentMethod === method;
                return (
                  <label key={method} className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${active ? 'border-[#2ba471] bg-[#ecf6f2]' : 'border-transparent bg-[#ecf6f2] hover:border-[#c1c8c3]'}`}>
                    <div className="flex items-center gap-4">
                      {icon}
                      <span className="font-bold text-[#001a0f]">{label}</span>
                    </div>
                    <input type="radio" name="payment" value={method} checked={active} onChange={() => setPaymentMethod(method)} className="hidden" />
                    <span className="material-symbols-outlined text-[#2ba471]" style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>
                      {active ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                  </label>
                );
              })}
            </div>

            {/* Promo code */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-[#001a0f]">Mã giảm giá</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoResult(null); setPromoError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handlePromoApply()}
                  placeholder="Nhập mã ưu đãi..."
                  className="flex-1 h-12 px-4 rounded-xl bg-[#ecf6f2] border-none focus:ring-2 focus:ring-[#2ba471] placeholder:text-[#717974] font-medium outline-none"
                />
                <button
                  onClick={handlePromoApply}
                  disabled={promoLoading || !promoCode.trim()}
                  className="px-6 h-12 bg-[#001a0f] text-white font-bold rounded-xl hover:bg-[#003120] transition-colors active:scale-95 duration-150 disabled:opacity-40 whitespace-nowrap"
                >
                  {promoLoading ? '...' : 'Áp mã'}
                </button>
              </div>
              {promoError && (
                <p className="text-xs text-[#ba1a1a] font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">error</span>{promoError}
                </p>
              )}
              {promoResult?.applied && (
                <p className="text-xs text-[#2ba471] font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  {promoResult.message || `Áp mã ${promoResult.promoCode} thành công`}
                </p>
              )}
            </div>
          </div>

          {/* Payment summary */}
          <div className="bg-[#003120] p-8 rounded-3xl text-white flex flex-col gap-4 relative overflow-hidden">
            <div className="absolute bottom-0 left-0 w-full h-1 bg-[#2ba471]/20" />
            <h2 className="text-xl font-bold border-b border-white/10 pb-4 font-jakarta">Tóm tắt thanh toán</h2>

            <div className="flex flex-col gap-3">
              {/* Base price */}
              <div className="flex justify-between items-center opacity-80">
                <span className="text-sm font-medium">
                  Giá gốc vé {passType === PASS_TYPE.INTER_ROUTE ? 'liên tuyến' : 'đơn tuyến'}
                </span>
                <span className="text-base font-bold">{fmt(basePrice)}đ</span>
              </div>

              {/* Priority discount — always show row, value 0 if not eligible */}
              <div className={`flex justify-between items-center text-sm ${pageData.priorityDiscountEligible && priorityDiscountAmt > 0 ? 'text-[#b5efd1]' : 'opacity-60'}`}>
                <span className="font-medium">
                  Giảm giá đối tượng{pageData.priorityDiscountEligible ? ` (${pageData.priorityDiscountPercent}%)` : ''}
                </span>
                <span className="font-bold">
                  {pageData.priorityDiscountEligible && priorityDiscountAmt > 0 ? `- ${fmt(priorityDiscountAmt)}đ` : '0đ'}
                </span>
              </div>

              {/* Promo discount — always show row */}
              <div className={`flex justify-between items-center text-sm ${promoResult?.applied && promoDiscountAmt > 0 ? 'text-[#b5efd1]' : 'opacity-60'}`}>
                <span className="font-medium">
                  Mã giảm giá{promoResult?.applied ? ` (${promoResult.promoCode})` : ''}
                </span>
                <span className="font-bold">
                  {promoResult?.applied && promoDiscountAmt > 0 ? `- ${fmt(promoDiscountAmt)}đ` : '0đ'}
                </span>
              </div>
            </div>

            {/* Total + CTA */}
            <div className="pt-4 border-t border-white/10 flex justify-between items-end">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs uppercase tracking-widest opacity-60 font-bold">Thành toán</span>
                <span className="text-3xl font-extrabold text-[#2ba471] font-jakarta">
                  {fmt(finalPrice)}đ
                </span>
              </div>
              <button
                onClick={handlePurchase}
                disabled={purchasing || (passType === PASS_TYPE.SINGLE_ROUTE && !selectedRouteId)}
                className="px-8 py-4 bg-[#2ba471] hover:bg-[#238c61] text-white font-extrabold rounded-2xl transition-all shadow-lg active:scale-95 duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {purchasing
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Đang xử lý...</>
                  : 'THANH TOÁN'
                }
              </button>
            </div>
          </div>

          <p className="text-xs text-center text-[#426656] opacity-60 italic">
            Bằng cách nhấn thanh toán, bạn đồng ý với các Điều khoản &amp; Chính sách của BusDN.
          </p>
        </aside>
      </main>

      {/* ── Pass history ── */}
      {pageData.myPasses.length > 0 && (
        <div className="max-w-7xl mx-auto px-6 pb-16">
          <div className="bg-white rounded-3xl shadow-sm p-8">
            <h2 className="text-xl font-bold text-[#001a0f] mb-6 font-jakarta">Danh sách vé tháng của tôi</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#ecf6f2] text-[#426656] text-xs uppercase tracking-wider">
                    <th className="p-4 font-bold rounded-tl-xl">Mã thẻ</th>
                    <th className="p-4 font-bold">Tuyến</th>
                    <th className="p-4 font-bold">Kỳ vé</th>
                    <th className="p-4 font-bold text-right">Giá</th>
                    <th className="p-4 font-bold text-center rounded-tr-xl">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ecf6f2]">
                  {pageData.myPasses.map(pass => (
                    <tr key={pass._id} className="hover:bg-[#f2fcf8] transition-colors">
                      <td className="p-4 font-mono text-sm text-[#426656]">{pass.passCode}</td>
                      <td className="p-4 font-semibold text-[#001a0f]">
                        {pass.displayRouteNumber ? `${pass.displayRouteNumber} – ` : ''}{pass.displayRouteName || 'Liên tuyến'}
                      </td>
                      <td className="p-4 font-semibold text-[#001a0f]">
                        {String(pass.month).padStart(2, '0')}/{pass.year}
                      </td>
                      <td className="p-4 text-right font-bold text-[#ba1a1a]">{fmt(pass.pricePaid)}đ</td>
                      <td className="p-4 text-center"><StatusBadge status={pass.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile bottom nav ── */}
      <footer className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-3 bg-[#f2fcf8]/90 backdrop-blur-lg shadow-[0_-20px_40px_rgba(0,26,15,0.06)] rounded-t-3xl">
        {[
          { icon: 'home', label: 'Home', action: () => navigate('/') },
          { icon: 'confirmation_number', label: 'Passes', active: true },
          { icon: 'directions_bus', label: 'Routes', action: () => navigate('/routes') },
          { icon: 'person', label: 'Profile', action: () => navigate('/profile') },
        ].map(({ icon, label, active, action }) => (
          <button
            key={label}
            onClick={action}
            className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-2xl transition-all ${active ? 'bg-[#b5efd1] text-[#001a0f]' : 'text-[#426656] opacity-70 hover:opacity-100'}`}
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>{icon}</span>
            <span className="text-[11px] font-semibold tracking-wide">{label}</span>
          </button>
        ))}
      </footer>
    </div>
  );
};

export default MonthlyPass;
