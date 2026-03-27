import React, { useContext, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FiAlertCircle,
  FiArrowLeft,
  FiCalendar,
  FiClock,
  FiCreditCard,
  FiMapPin,
  FiRefreshCw,
  FiTag,
} from 'react-icons/fi';
import AuthContext from '../context/AuthContext';
import useMonthlyPassDetails from '../hook/useMonthlyPassDetails';
import MonthlyPassTicketCard, { MonthlyPassTicketSkeleton } from '../components/monthlyPass/MonthlyPassTicketCard';
import {
  formatMonthlyPassDate,
  formatMonthlyPassDateTime,
  formatMonthlyPassMoney,
  formatMonthlyPassPeriod,
  getMonthlyPassPaymentMethodLabel,
  getMonthlyPassRouteLabel,
  getMonthlyPassScopeLabel,
  getMonthlyPassStatusStyles,
  getMonthlyPassTypeLabel,
  STATUS_LABELS,
} from '../utils/monthlyPass';

const QUICK_GUIDE = [
  'Mở mã QR trước khi lên xe để nhân viên dễ kiểm tra.',
  'Vé đơn tuyến chỉ dùng cho tuyến đã đăng ký, vé liên tuyến dùng toàn mạng lưới.',
  'Nếu đổi thiết bị hoặc đăng xuất, chỉ cần đăng nhập lại để tải lại mã QR.',
];

const MonthlyPassDetails = () => {
  const navigate = useNavigate();
  const { passId = '' } = useParams();
  const { token } = useContext(AuthContext);

  const {
    pass,
    profileName,
    qrUrl,
    loading,
    error,
    refresh,
  } = useMonthlyPassDetails({ passId, token });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [navigate, token]);

  const statusLabel = STATUS_LABELS[pass?.status] || 'Đang cập nhật';
  const statusStyles = getMonthlyPassStatusStyles(pass?.status);
  const routeLabel = getMonthlyPassRouteLabel(pass);
  const scopeLabel = getMonthlyPassScopeLabel(pass);
  const typeLabel = getMonthlyPassTypeLabel(pass);
  const paymentMethodLabel = getMonthlyPassPaymentMethodLabel(pass);
  const passCode = pass?.passCode || 'Đang cập nhật';
  const passengerLabel = profileName || 'Hành khách BusDN';

  const metaCards = [
    {
      icon: <FiMapPin className="text-lg text-emerald-700" />,
      label: 'Phạm vi sử dụng',
      value: scopeLabel,
      note: pass?.passType === 'INTER_ROUTE' ? 'Áp dụng trên toàn hệ thống.' : 'Chỉ áp dụng cho tuyến đã đăng ký.',
    },
    {
      icon: <FiCalendar className="text-lg text-emerald-700" />,
      label: 'Kỳ vé',
      value: formatMonthlyPassPeriod(pass?.month, pass?.year),
      note: `${formatMonthlyPassDate(pass?.validFrom)} - ${formatMonthlyPassDate(pass?.validTo)}`,
    },
    {
      icon: <FiCreditCard className="text-lg text-emerald-700" />,
      label: 'Thanh toán',
      value: formatMonthlyPassMoney(pass?.pricePaid),
      note: paymentMethodLabel,
    },
    {
      icon: <FiTag className="text-lg text-emerald-700" />,
      label: 'Mã vé',
      value: passCode,
      note: typeLabel,
    },
  ];

  const timelineItems = [
    ['Ngày tạo', formatMonthlyPassDateTime(pass?.createdAt)],
    ['Hiệu lực từ', formatMonthlyPassDate(pass?.validFrom)],
    ['Hiệu lực đến', formatMonthlyPassDate(pass?.validTo)],
    ['Cập nhật gần nhất', formatMonthlyPassDateTime(pass?.updatedAt || pass?.createdAt)],
  ];

  if (!loading && !pass) {
    return (
      <div className="min-h-screen bg-[#f2fcf8] px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-3xl">
          <button
            type="button"
            onClick={() => navigate('/monthly-pass')}
            className="inline-flex items-center gap-2 rounded-full border border-[#c1c8c3]/40 bg-white px-4 py-2 text-sm font-semibold text-[#426656] shadow-sm transition hover:border-[#2ba471]/40 hover:text-[#2ba471]"
          >
            <FiArrowLeft size={14} /> Quay lại vé tháng
          </button>

          <section className="mt-8 rounded-[32px] border border-white/70 bg-white/90 p-8 text-center shadow-[0_30px_70px_rgba(0,26,15,0.08)] backdrop-blur">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-red-500">
              <FiAlertCircle size={28} />
            </div>
            <h1 className="mt-5 text-3xl font-black tracking-tight text-[#001a0f]">Không tìm thấy vé tháng</h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#426656]">
              {error || 'Vé tháng này không còn tồn tại hoặc không thuộc tài khoản hiện tại.'}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={refresh}
                className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-sm font-bold text-emerald-700"
              >
                <FiRefreshCw size={15} /> Thử lại
              </button>
              <button
                type="button"
                onClick={() => navigate('/profile?tab=bookings')}
                className="rounded-2xl bg-[#003120] px-5 py-3 text-sm font-bold text-white"
              >
                Về danh sách vé
              </button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#f2fcf8] px-4 py-5 sm:px-6 lg:px-6 lg:py-4">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute right-[-5%] top-[-10%] h-[60%] w-[40%] rounded-full bg-[#b5efd1]/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] h-[60%] w-[40%] rounded-full bg-[#c4ebd7]/15 blur-[120px]" />
      </div>

      <div className="mx-auto flex h-full w-full max-w-[95vw] flex-col 2xl:max-w-[1700px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/monthly-pass')}
            className="inline-flex items-center gap-2 rounded-full border border-[#c1c8c3]/40 bg-white px-4 py-2 text-sm font-semibold text-[#426656] shadow-sm transition hover:border-[#2ba471]/40 hover:text-[#2ba471]"
          >
            <FiArrowLeft size={14} /> Quay lại vé tháng
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/profile?tab=bookings')}
              className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700"
            >
              Danh sách vé của tôi
            </button>
            <button
              type="button"
              onClick={refresh}
              className="inline-flex items-center gap-2 rounded-full bg-[#003120] px-4 py-2 text-sm font-semibold text-white"
            >
              <FiRefreshCw size={14} /> Làm mới QR
            </button>
          </div>
        </div>

        <section className="mt-4 flex min-h-0 flex-1 flex-col rounded-[30px] border border-white/70 bg-white/85 p-5 shadow-[0_24px_64px_rgba(0,26,15,0.08)] backdrop-blur md:p-6 lg:p-5">
          <div className="grid min-h-0 flex-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_21rem]">
            <div className="min-h-0 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] ${statusStyles.badge}`}>
                    {statusLabel}
                  </span>
                  <h1 className="mt-3 text-[2rem] font-black leading-[1.05] tracking-tight text-[#001a0f] md:text-[2.35rem]">
                    {routeLabel}
                  </h1>
                  <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[#426656]">
                    {typeLabel} cho <span className="font-semibold text-[#001a0f]">{passengerLabel}</span>. Mã QR bên phải luôn dùng cùng dữ liệu vé hiện tại trong tài khoản.
                  </p>
                </div>

                <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/70 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-700">Mã vé</p>
                  <p className="mt-1.5 max-w-[18rem] break-all text-xl font-black leading-tight text-[#001a0f]">{passCode}</p>
                  <p className="mt-1 text-xs text-[#426656]">{formatMonthlyPassPeriod(pass?.month, pass?.year)}</p>
                </div>
              </div>

              {error ? (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <FiAlertCircle className="mt-0.5 shrink-0" />
                  <p>{error}</p>
                </div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2">
                {metaCards.map((item) => (
                  <article key={item.label} className="rounded-[22px] border border-emerald-100 bg-[#f7fcfa] p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100/80">
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#426656]">{item.label}</p>
                        <p className="mt-1.5 break-words text-[1.05rem] font-black leading-snug text-[#001a0f]">{item.value}</p>
                        <p className="mt-1 text-xs leading-5 text-[#426656]">{item.note}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="grid gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                <section className="rounded-[24px] bg-[#072f28] p-5 text-white shadow-[0_20px_44px_rgba(7,47,40,0.2)]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                      <FiClock className="text-lg text-emerald-300" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-300">Dòng thời gian</p>
                      <h2 className="mt-1 text-xl font-black">Thông tin hiệu lực</h2>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {timelineItems.map(([label, value]) => (
                      <div key={label} className="rounded-2xl bg-white/8 px-3 py-3">
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-200/85">{label}</p>
                        <p className="mt-1 text-sm font-black text-white">{value}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-[24px] border border-emerald-100 bg-white p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">Hướng dẫn sử dụng</p>
                  <h2 className="mt-1.5 text-xl font-black text-[#001a0f]">Lên xe nhanh hơn</h2>
                  <div className="mt-4 space-y-2.5">
                    {QUICK_GUIDE.map((step) => (
                      <div key={step} className="rounded-2xl bg-[#f3faf7] px-4 py-2.5 text-sm leading-5 text-[#426656]">
                        {step}
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>

            <div className="flex justify-center lg:justify-end">
              {loading ? (
                <TicketWrap>
                  <MonthlyPassTicketSkeleton compact />
                </TicketWrap>
              ) : (
                <TicketWrap>
                  <MonthlyPassTicketCard
                    compact
                    showQr={pass?.status === 'ACTIVE'}
                    qrUrl={qrUrl}
                    passengerName={passengerLabel}
                    passCode={passCode}
                    status={pass?.status}
                    statusLabel={statusLabel}
                    validTo={pass?.validTo}
                    qrFallbackDescription="Dùng nút làm mới để tải lại mã QR mới nhất cho vé này."
                    helperText={pass?.status === 'ACTIVE' ? 'Quét mã này khi lên xe' : 'Chỉ vé đang hoạt động mới dùng để quét lên xe'}
                  />
                </TicketWrap>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

function TicketWrap({ children }) {
  return <div className="w-full max-w-[20rem]">{children}</div>;
}

export default MonthlyPassDetails;
