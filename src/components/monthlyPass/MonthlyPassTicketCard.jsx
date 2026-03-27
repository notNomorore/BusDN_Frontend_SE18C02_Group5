import React from 'react';
import { FiAlertCircle, FiShield } from 'react-icons/fi';
import { formatMonthlyPassDate, getMonthlyPassStatusStyles } from '../../utils/monthlyPass';

export function MonthlyPassTicketSkeleton({ compact = false }) {
  return (
    <div className="animate-pulse space-y-0">
      <div className={`${compact ? 'h-44 rounded-t-[24px]' : 'h-52 rounded-t-[28px]'} bg-emerald-900/80`} />
      <div className={`border border-emerald-100 bg-white ${compact ? 'rounded-b-[24px] px-5 pb-5 pt-7' : 'rounded-b-[28px] px-7 pb-7 pt-10'}`}>
        <div className={`mx-auto rounded-2xl bg-slate-100 ${compact ? 'h-32 w-32' : 'h-44 w-44'}`} />
        <div className={`${compact ? 'mt-4' : 'mt-5'} h-4 rounded-full bg-slate-100`} />
        <div className="mt-3 h-4 w-3/4 rounded-full bg-slate-100" />
        <div className={`${compact ? 'mt-4 gap-2' : 'mt-6 gap-3'} grid grid-cols-2`}>
          <div className={`${compact ? 'h-14' : 'h-16'} rounded-2xl bg-slate-100`} />
          <div className={`${compact ? 'h-14' : 'h-16'} rounded-2xl bg-slate-100`} />
        </div>
      </div>
    </div>
  );
}

export default function MonthlyPassTicketCard({
  showQr = true,
  qrUrl = '',
  passengerName = 'Hành khách BusDN',
  passCode = 'Đang cập nhật',
  status = 'ACTIVE',
  statusLabel = 'Sẵn sàng',
  validTo,
  helperText,
  qrFallbackTitle = 'Mã QR đang được cập nhật',
  qrFallbackDescription = 'Vào trang chi tiết vé để tải lại QR.',
  compact = false,
}) {
  const styles = getMonthlyPassStatusStyles(status);

  return (
    <div className={`relative w-full ${compact ? 'max-w-[20rem]' : 'max-w-xs'}`}>
      <div
        className={`relative overflow-hidden text-white ${compact ? 'rounded-t-[22px] px-5 pb-3 pt-3.5' : 'rounded-t-[24px] px-6 py-5'}`}
        style={{ background: 'linear-gradient(135deg, #426656 0%, #003120 100%)' }}
      >
        <div className={`absolute -right-4 -top-4 rounded-full bg-white/10 blur-2xl ${compact ? 'h-16 w-16' : 'h-20 w-20'}`} />
        <div className={`relative z-10 flex items-start justify-between ${compact ? 'mb-3.5' : 'mb-6'}`}>
          <div>
            <h3 className="text-base font-extrabold">BusDN</h3>
            <p className="mt-0.5 text-[10px] uppercase tracking-widest text-[#b5efd1]/80">Digital Boarding Pass</p>
          </div>
          <FiShield className="text-xl opacity-50" />
        </div>
        <div className="relative z-10">
          <p className="text-[10px] font-medium text-[#b5efd1]/70">Hành khách</p>
          <p className={`${compact ? 'mt-0.5 text-[1.05rem] leading-tight' : 'text-lg'} font-bold uppercase tracking-wide`}>{passengerName}</p>
        </div>
      </div>

      <div className="relative border-x border-[#e6f0ec] bg-white py-0">
        <div className="absolute -left-3 top-1/2 z-10 h-6 w-6 -translate-y-1/2 rounded-full bg-[#f2fcf8]" />
        <div className="absolute -right-3 top-1/2 z-10 h-6 w-6 -translate-y-1/2 rounded-full bg-[#f2fcf8]" />
        <div className="mx-3 border-t-2 border-dashed border-[#e6f0ec]" />
      </div>

      <div className={`border border-t-0 border-[#e6f0ec] bg-white shadow-[0_20px_40px_rgba(0,26,15,0.08)] ${compact ? 'rounded-b-[22px] px-5 pb-4 pt-4' : 'rounded-b-[24px] px-6 pb-5 pt-5'}`}>
        <div className="flex flex-col items-center text-center">
          {showQr ? (
            qrUrl ? (
              <div className="rounded-xl border border-[#e6f0ec] bg-[#ecf6f2] p-2.5">
                <img src={qrUrl} alt={`QR vé ${passCode}`} className={`${compact ? 'h-36 w-36' : 'h-36 w-36'} object-contain mix-blend-multiply`} />
              </div>
            ) : (
              <div className={`flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#c1c8c3]/40 bg-[#ecf6f2] px-4 ${compact ? 'h-32' : 'h-44'}`}>
                <FiAlertCircle className="text-2xl text-[#426656]" />
                <p className="mt-2 text-xs font-bold text-[#141d1b]">{qrFallbackTitle}</p>
                <p className="mt-1 text-[10px] text-[#426656]">{qrFallbackDescription}</p>
              </div>
            )
          ) : (
            <div className={`flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-red-200 bg-red-50 px-4 ${compact ? 'h-32' : 'h-44'}`}>
              <FiAlertCircle className="text-2xl text-red-400" />
              <p className="mt-2 text-xs font-bold text-red-700">Vé chưa sẵn sàng để quét</p>
            </div>
          )}
          <p className={`${compact ? 'mt-2.5' : 'mt-3'} text-xs font-semibold text-[#141d1b]`}>
            {helperText || (showQr ? 'Quét mã này khi lên xe' : 'Vé sẽ xuất hiện sau khi thanh toán thành công')}
          </p>
        </div>

        <div className={`${compact ? 'mt-3' : 'mt-4'} flex items-center justify-between rounded-lg bg-[#ecf6f2] px-3 py-2.5`}>
          <div className="text-left">
            <p className="text-[9px] uppercase tracking-tighter text-[#426656]/70">Hiệu lực đến</p>
            <p className="text-xs font-bold text-[#001a0f]">{formatMonthlyPassDate(validTo)}</p>
          </div>
          <div className="h-5 w-px bg-[#c1c8c3]/40" />
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-tighter text-[#426656]/70">Trạng thái</p>
            <p className={`flex items-center justify-end gap-1 text-xs font-bold ${styles.text}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
              {statusLabel}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
