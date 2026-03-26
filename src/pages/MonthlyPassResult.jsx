import React, { useContext, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FiAlertCircle, FiArrowLeft, FiCheckCircle, FiClock, FiCreditCard, FiHome, FiMapPin, FiRefreshCw, FiShield, FiTag } from 'react-icons/fi'
import AuthContext from '../context/AuthContext'
import api from '../utils/api'

const PASS_TYPE_LABELS = { SINGLE_ROUTE: 'Vé tháng đơn tuyến', INTER_ROUTE: 'Vé tháng liên tuyến' }
const PAYMENT_METHOD_LABELS = { VNPAY: 'VNPAY', MOMO: 'MoMo', WALLET: 'Ví BusDN' }
const STATUS_LABELS = { ACTIVE: 'Sẵn sàng', EXPIRED: 'Hết hạn', CANCELLED: 'Đã hủy' }

function toPositiveInt(v) { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : 0 }
function formatMoney(v) { return `${Number(v || 0).toLocaleString('vi-VN')}đ` }
function formatDate(v) { if (!v) return '--'; const d = new Date(v); return isNaN(d) ? '--' : d.toLocaleDateString('vi-VN') }
function formatPeriod(m, y) { return m && y ? `${String(m).padStart(2,'0')}/${y}` : '--' }
function getRouteId(p) { if (!p?.routeId) return ''; return typeof p.routeId === 'object' ? String(p.routeId._id||'') : String(p.routeId) }
function getRouteLabel(p, fb='') { if (!p) return fb==='INTER_ROUTE'?'Vé liên tuyến toàn mạng lưới':'Đang cập nhật tuyến xe'; if (p.displayRouteNumber) return `${p.displayRouteNumber} - ${p.displayRouteName||'Tuyến xe'}`; return p.displayRouteName||(p.passType==='INTER_ROUTE'?'Vé liên tuyến toàn mạng lưới':'Đang cập nhật tuyến xe') }
function getPassTypeLabel(p, fb='') { return PASS_TYPE_LABELS[p?.passType||fb]||'Vé tháng' }
function getPaymentMethodLabel(p, fb='') { const m = p?.paidBy||fb; return PAYMENT_METHOD_LABELS[m]||(m||'Đang cập nhật') }
function findMatchingPass(passes, c) {
  if (!Array.isArray(passes)||!passes.length) return null
  if (c.passId) { const x = passes.find(p=>String(p._id)===c.passId); if (x) return x }
  const f = passes.filter(p=>{
    if (c.month&&Number(p.month)!==c.month) return false
    if (c.year&&Number(p.year)!==c.year) return false
    if (c.passType&&String(p.passType||'')!==c.passType) return false
    if (c.routeId&&getRouteId(p)!==c.routeId) return false
    return true
  })
  return f[0]||passes.find(p=>p.status==='ACTIVE')||passes[0]||null
}

function TicketSkeleton() {
  return (
    <div className="animate-pulse space-y-0">
      <div className="h-52 rounded-t-[28px] bg-emerald-900/80" />
      <div className="rounded-b-[28px] border border-emerald-100 bg-white px-7 pb-7 pt-10">
        <div className="mx-auto h-44 w-44 rounded-2xl bg-slate-100" />
        <div className="mt-5 h-4 rounded-full bg-slate-100" />
        <div className="mt-3 h-4 w-3/4 rounded-full bg-slate-100" />
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="h-16 rounded-2xl bg-slate-100" />
          <div className="h-16 rounded-2xl bg-slate-100" />
        </div>
      </div>
    </div>
  )
}

const MonthlyPassResult = () => {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { token } = useContext(AuthContext)

  const isSuccess = params.has('success')
  const message = params.get('success')||params.get('error')||''
  const txnRef = params.get('txnRef')||''
  const passId = params.get('passId')||''
  const paymentMethod = params.get('paymentMethod')||''
  const passType = params.get('passType')||''
  const routeId = params.get('routeId')||''
  const month = toPositiveInt(params.get('month'))
  const year = toPositiveInt(params.get('year'))
  const amount = Number(params.get('amount')||0)

  const [ticket, setTicket] = useState(null)
  const [profileName, setProfileName] = useState('')
  const [qrUrl, setQrUrl] = useState('')
  const [loadingDetails, setLoadingDetails] = useState(isSuccess)
  const [detailError, setDetailError] = useState('')

  useEffect(() => { window.scrollTo(0,0) }, [])

  useEffect(() => {
    let mounted = true; let nextQr = ''
    async function load() {
      if (!isSuccess) { setLoadingDetails(false); return }
      if (!token) { setDetailError('Đăng nhập lại để xem vé vừa kích hoạt.'); setLoadingDetails(false); return }
      setLoadingDetails(true); setDetailError('')
      try {
        const [pr, prof] = await Promise.allSettled([api.get('/api/user/passes/monthly'), api.get('/api/user/profile')])
        if (!mounted) return
        if (prof.status==='fulfilled') setProfileName(prof.value?.data?.user?.fullName||'')
        if (pr.status!=='fulfilled') throw pr.reason
        const passes = pr.value?.data?.myPasses||[]
        const matched = findMatchingPass(passes,{passId,month,year,passType,routeId})
        setTicket(matched||null)
        if (!matched?._id) { setDetailError('Không tìm thấy vé tháng vừa thanh toán trong tài khoản của bạn.'); return }
        try {
          const qrId = String(matched._id)
          const qr = await api.get(`/api/user/passes/monthly/${qrId}/qr`, { responseType: 'blob' })
          if (!mounted) return
          nextQr = URL.createObjectURL(qr.data); setQrUrl(nextQr)
        } catch (qrErr) {
          console.error('QR fetch error:', qrErr)
          if (mounted) setDetailError('Không thể tải mã QR cho vé này.')
        }
      } catch (e) { if (mounted) setDetailError(e?.response?.data?.message||'Không thể tải chi tiết giao dịch vé tháng.') }
      finally { if (mounted) setLoadingDetails(false) }
    }
    load()
    return () => { mounted=false; if (nextQr) URL.revokeObjectURL(nextQr) }
  }, [amount,isSuccess,month,passId,passType,routeId,token,year])

  const detailRoute = getRouteLabel(ticket, passType)
  const detailPassType = getPassTypeLabel(ticket, passType)
  const detailPeriod = ticket ? formatPeriod(ticket.month,ticket.year) : formatPeriod(month,year)
  const detailAmount = ticket ? formatMoney(ticket.pricePaid) : (amount>0?formatMoney(amount):'--')
  const detailPaymentMethod = getPaymentMethodLabel(ticket, paymentMethod)
  const detailPassCode = ticket?.passCode||'Đang cập nhật'
  const detailValidity = ticket ? `${formatDate(ticket.validFrom)} – ${formatDate(ticket.validTo)}` : '--'
  const detailIssuedAt = ticket ? formatDate(ticket.createdAt||ticket.updatedAt||ticket.validFrom) : '--'
  const detailStatus = STATUS_LABELS[ticket?.status]||(isSuccess?'Sẵn sàng':'Thất bại')
  const passengerLabel = profileName||'Hành khách BusDN'

  return (
    <div className="relative min-h-screen bg-[#f2fcf8] px-4 py-5 sm:px-8">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute right-[-5%] top-[-10%] h-[60%] w-[40%] rounded-full bg-[#b5efd1]/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] h-[60%] w-[40%] rounded-full bg-[#c4ebd7]/15 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-6xl">
        <button onClick={() => navigate('/monthly-pass')}
          className="inline-flex items-center gap-2 rounded-full border border-[#c1c8c3]/40 bg-white px-4 py-2 text-sm font-semibold text-[#426656] shadow-sm transition hover:border-[#2ba471]/40 hover:text-[#2ba471]">
          <FiArrowLeft size={14} /> Quay lại vé tháng
        </button>

        <main className="mt-4 grid gap-6 md:grid-cols-2 items-start">
          {/* Left: status + transaction details */}
          <div className="space-y-4">
            <header className="flex items-center gap-4">
              <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full ${isSuccess ? 'bg-[#b5efd1] text-[#005234]' : 'bg-red-100 text-red-600'}`}>
                {isSuccess ? <FiCheckCircle size={28} /> : <FiAlertCircle size={28} />}
              </div>
              <div>
                <h1 className="font-extrabold text-2xl tracking-tight text-[#001a0f]">
                  {isSuccess ? 'Thanh toán thành công!' : 'Thanh toán chưa hoàn tất'}
                </h1>
                <p className="text-sm text-[#426656]">
                  {isSuccess ? 'Giao dịch của bạn đã được xử lý an toàn.' : (message || 'Giao dịch chưa thành công.')}
                </p>
              </div>
            </header>

            {/* Transaction bento */}
            <div className="rounded-xl bg-white p-5 shadow-[0_8px_24px_rgba(0,26,15,0.06)] space-y-4">
              <div className="flex justify-between items-center border-b border-[#c1c8c3]/20 pb-3">
                <span className="text-sm text-[#426656] font-medium">Mã giao dịch</span>
                <span className="font-bold text-[#001a0f] text-sm">{txnRef || 'Đang cập nhật'}</span>
              </div>
              {detailError && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                  <FiAlertCircle className="mt-0.5 shrink-0" size={13} />
                  <p>{detailError}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {[
                  ['Loại vé', detailPassType],
                  ['Tuyến xe', detailRoute],
                  ['Số tiền', detailAmount, true],
                  ['Ngày thanh toán', detailIssuedAt],
                  ['Kỳ vé', detailPeriod],
                  ['Phương thức', detailPaymentMethod],
                  ['Hiệu lực', detailValidity],
                  ['Trạng thái', detailStatus],
                ].map(([label, value, accent]) => (
                  <div key={label}>
                    <p className="text-xs text-[#426656] mb-0.5">{label}</p>
                    <p className={`text-sm font-semibold ${accent ? 'text-[#2ba471]' : 'text-[#141d1b]'}`}>{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={() => navigate('/profile?tab=bookings')}
                className="flex-1 rounded-full py-3 px-6 text-sm font-bold text-white shadow-md transition active:scale-95"
                style={{ background: 'linear-gradient(135deg, #426656 0%, #003120 100%)' }}>
                Xem vé của tôi
              </button>
              <button onClick={() => navigate('/')}
                className="flex-1 rounded-full bg-[#dbe5e1] py-3 px-6 text-sm font-bold text-[#141d1b] transition active:scale-95 hover:bg-[#c1c8c3]">
                Quay về trang chủ
              </button>
              {!ticket && isSuccess && token && (
                <button onClick={() => window.location.reload()}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#c1c8c3]/40 bg-white px-4 py-3 text-sm font-bold text-[#426656]">
                  <FiRefreshCw size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Right: ticket card — aligned with transaction box */}
          <div className="flex justify-center md:justify-end mt-[58px]">
            {loadingDetails && isSuccess ? <TicketSkeleton /> : (
              <div className="relative w-full max-w-xs">
                {/* Ticket header */}
                <div className="relative overflow-hidden rounded-t-[24px] px-6 py-5 text-white"
                  style={{ background: 'linear-gradient(135deg, #426656 0%, #003120 100%)' }}>
                  <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10 blur-2xl" />
                  <div className="relative z-10 flex justify-between items-start mb-6">
                    <div>
                      <h3 className="font-extrabold text-base">BusDN</h3>
                      <p className="text-[#b5efd1]/80 text-[10px] uppercase tracking-widest mt-0.5">Digital Boarding Pass</p>
                    </div>
                    <FiShield className="text-xl opacity-50" />
                  </div>
                  <div className="relative z-10">
                    <p className="text-[10px] text-[#b5efd1]/70 font-medium">Hành khách</p>
                    <p className="font-bold text-lg uppercase tracking-wide">{passengerLabel}</p>
                  </div>
                </div>

                {/* Perforation */}
                <div className="relative bg-white border-x border-[#e6f0ec] py-0">
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-[#f2fcf8] z-10" />
                  <div className="absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-[#f2fcf8] z-10" />
                  <div className="border-t-2 border-dashed border-[#e6f0ec] mx-3" />
                </div>

                {/* Ticket body */}
                <div className="rounded-b-[24px] border border-t-0 border-[#e6f0ec] bg-white px-6 pb-5 pt-5 shadow-[0_20px_40px_rgba(0,26,15,0.08)]">
                  <div className="flex flex-col items-center text-center">
                    {isSuccess ? (
                      qrUrl ? (
                        <div className="rounded-xl border border-[#e6f0ec] bg-[#ecf6f2] p-3">
                          <img src={qrUrl} alt={`QR vé ${detailPassCode}`} className="h-36 w-36 object-contain mix-blend-multiply" />
                        </div>
                      ) : (
                        <div className="flex h-44 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#c1c8c3]/40 bg-[#ecf6f2] px-4">
                          <FiAlertCircle className="text-2xl text-[#426656]" />
                          <p className="mt-2 text-xs font-bold text-[#141d1b]">Mã QR đang được cập nhật</p>
                          <p className="mt-1 text-[10px] text-[#426656]">Vào trang vé tháng để tải lại QR.</p>
                        </div>
                      )
                    ) : (
                      <div className="flex h-44 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-red-200 bg-red-50 px-4">
                        <FiAlertCircle className="text-2xl text-red-400" />
                        <p className="mt-2 text-xs font-bold text-red-700">Giao dịch chưa tạo vé</p>
                      </div>
                    )}
                    <p className="mt-3 text-xs font-semibold text-[#141d1b]">
                      {isSuccess ? 'Quét mã này khi lên xe' : 'Vé sẽ xuất hiện sau khi thanh toán thành công'}
                    </p>
                  </div>

                  <div className="mt-4 flex justify-between items-center rounded-lg bg-[#ecf6f2] px-3 py-2.5">
                    <div className="text-left">
                      <p className="text-[9px] uppercase tracking-tighter text-[#426656]/70">Hiệu lực đến</p>
                      <p className="text-xs font-bold text-[#001a0f]">{ticket ? formatDate(ticket.validTo) : '--'}</p>
                    </div>
                    <div className="w-px h-5 bg-[#c1c8c3]/40" />
                    <div className="text-right">
                      <p className="text-[9px] uppercase tracking-tighter text-[#426656]/70">Trạng thái</p>
                      <p className="text-xs font-bold text-[#2ba471] flex items-center gap-1 justify-end">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#2ba471]" />
                        {detailStatus}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default MonthlyPassResult
