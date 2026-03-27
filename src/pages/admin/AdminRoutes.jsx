import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaCheck,
  FaBan,
  FaEdit,
  FaEye,
  FaMapMarkedAlt,
  FaMapMarkerAlt,
  FaPlus,
  FaTimes,
  FaSearch,
  FaUndo,
} from 'react-icons/fa'
import api from '../../utils/api'
import AuthContext from '../../context/AuthContext'
import { useDialog } from '../../context/DialogContext'

const STATUS_META = {
  DRAFT: { label: 'Nháp', chip: 'bg-slate-100 text-slate-700', tile: 'bg-slate-500' },
  PENDING_REVIEW: { label: 'Chờ duyệt', chip: 'bg-amber-100 text-amber-700', tile: 'bg-amber-500' },
  APPROVED: { label: 'Đã duyệt', chip: 'bg-sky-100 text-sky-700', tile: 'bg-sky-500' },
  SCHEDULED: { label: 'Đã lên lịch', chip: 'bg-indigo-100 text-indigo-700', tile: 'bg-indigo-500' },
  ACTIVE: { label: 'Hoạt động', chip: 'bg-emerald-100 text-emerald-700', tile: 'bg-[#23a983]' },
  REJECTED: { label: 'Từ chối', chip: 'bg-rose-100 text-rose-700', tile: 'bg-rose-500' },
  SUSPENDED: { label: 'Tạm dừng', chip: 'bg-gray-200 text-gray-700', tile: 'bg-gray-500' },
  INACTIVE: { label: 'Tạm ngưng', chip: 'bg-gray-100 text-gray-600', tile: 'bg-gray-400' },
}

const PRIMARY_ROUTE_STATUSES = ['DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'INACTIVE', 'REJECTED']
const modalShadow = 'shadow-[0_2px_8px_rgba(0,0,0,0.05)]'

const getStatusMeta = (status) => STATUS_META[status] || STATUS_META.DRAFT
const formatMoney = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`

const formatOperationTime = (operationTime) => {
  if (!operationTime) return '-'
  if (typeof operationTime === 'string') return operationTime
  const start = operationTime.start || ''
  const end = operationTime.end || ''
  return start && end ? `${start} - ${end}` : '-'
}

const stopLabel = (stop) => {
  if (!stop) return 'Chưa xác định'
  return stop.isTerminal ? `${stop.name} (Đầu/cuối)` : stop.name
}

const summarizeStops = (stops = []) => {
  if (!stops.length) return 'Chưa có trạm'
  return stops.slice(0, 3).map((stop) => stop.name).join(' -> ') + (stops.length > 3 ? ' ...' : '')
}

const RouteViewModal = ({ route, onClose }) => {
  if (!route) return null
  const statusMeta = getStatusMeta(route.status)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 text-black">
      <div className={`flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white ${modalShadow}`}>
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-gray-400">Chi Tiết Tuyến</p>
            <h3 className="mt-2 text-2xl font-bold text-gray-900">
              {route.routeNumber} - {route.name || 'Tuyến chưa đặt tên'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">Xem nhanh điểm đầu/cuối, hành trình hai chiều và cấu hình vận hành.</p>
          </div>
          <button onClick={onClose} className="text-2xl font-bold text-gray-400 transition hover:text-gray-600">
            &times;
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-6">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-gray-100 bg-[#f8fafc] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Điểm đầu</p>
                  <p className="mt-2 font-bold text-gray-900">{stopLabel(route.startStop)}</p>
                  <p className="mt-1 text-sm text-gray-500">{route.startStop?.address || 'Không có địa chỉ'}</p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-[#f8fafc] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Điểm cuối</p>
                  <p className="mt-2 font-bold text-gray-900">{stopLabel(route.endStop)}</p>
                  <p className="mt-1 text-sm text-gray-500">{route.endStop?.address || 'Không có địa chỉ'}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusMeta.chip}`}>{statusMeta.label}</span>
                  <span className="rounded-full bg-[#ecfdf5] px-3 py-1 text-xs font-bold text-[#23a983]">{formatMoney(route.monthlyPassPrice)}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                    {route.stopCount || 0} trạm chiều đi
                  </span>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-500">Loại tuyến</p>
                    <p className="mt-1 text-sm font-bold text-gray-900">{route.routeType || 'Chưa cấu hình'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-500">Loại dịch vụ</p>
                    <p className="mt-1 text-sm font-bold text-gray-900">{route.serviceType || 'Chưa cấu hình'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-500">Thời gian vận hành</p>
                    <p className="mt-1 text-sm font-bold text-gray-900">{formatOperationTime(route.operationTime)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-500">Tần suất / Hành trình / Quay đầu</p>
                    <p className="mt-1 text-sm font-bold text-gray-900">
                      {(route.operationSettings?.tripInterval ?? route.frequencyMinutes ?? '--')} / {(route.operationSettings?.estimatedRouteDuration ?? route.roundTripMinutes ?? '--')} / {(route.operationSettings?.turnaroundTime ?? route.bufferMinutes ?? '--')} phút
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-gray-400">Mô Tả</p>
                <p className="mt-3 text-sm leading-7 text-gray-600">{route.description || 'Chưa có mô tả cho tuyến này.'}</p>
              </div>
            </section>

            <section className="space-y-4">
              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-gray-400">Chiều Đi</p>
                <p className="mt-1 text-sm text-gray-500">Số trạm: {route.outboundStops?.length || 0}</p>
                <div className="mt-4 space-y-3">
                  {(route.outboundStops || []).length === 0 ? (
                    <p className="rounded-2xl bg-[#f8fafc] px-4 py-6 text-center text-sm text-gray-500">Chưa có dữ liệu chiều đi.</p>
                  ) : (
                    route.outboundStops.map((stop, index) => (
                      <div key={`${stop.stopRefId || stop.id}-${index}`} className="rounded-2xl border border-gray-100 bg-[#f8fafc] px-4 py-3">
                        <p className="text-sm font-bold text-gray-900">{index + 1}. {stop.name}</p>
                        <p className="mt-1 text-xs text-gray-500">{stop.address || 'Không có địa chỉ'}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-gray-400">Chiều Về</p>
                <p className="mt-1 text-sm text-gray-500">Số trạm: {route.inboundStops?.length || 0}</p>
                <div className="mt-4 space-y-3">
                  {(route.inboundStops || []).length === 0 ? (
                    <p className="rounded-2xl bg-[#f8fafc] px-4 py-6 text-center text-sm text-gray-500">Chưa có dữ liệu chiều về.</p>
                  ) : (
                    route.inboundStops.map((stop, index) => (
                      <div key={`${stop.stopRefId || stop.id}-${index}`} className="rounded-2xl border border-gray-100 bg-[#f8fafc] px-4 py-3">
                        <p className="text-sm font-bold text-gray-900">{index + 1}. {stop.name}</p>
                        <p className="mt-1 text-xs text-gray-500">{stop.address || 'Không có địa chỉ'}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="flex justify-end border-t border-gray-100 px-6 py-5">
          <button type="button" onClick={onClose} className="rounded-2xl bg-[#f3f5f8] px-5 py-2.5 font-semibold text-gray-700 transition hover:bg-gray-200">
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}

const AdminRoutes = () => {
  const { token } = useContext(AuthContext)
  const { showAlert, showConfirm } = useDialog()
  const navigate = useNavigate()

  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedRoute, setSelectedRoute] = useState(null)

  useEffect(() => {
    fetchRoutes()
  }, [statusFilter])

  const fetchRoutes = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search.trim()) params.set('q', search.trim())
      if (statusFilter) params.set('status', statusFilter)
      const query = params.toString()
      const res = await api.get(`/api/admin/routes${query ? `?${query}` : ''}`)
      if (res.data.ok) setRoutes(res.data.routes || [])
    } catch (error) {
      console.error('Error fetching routes:', error)
      showAlert(error.response?.data?.message || 'Không thể tải danh sách tuyến', 'Lỗi')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (event) => {
    event.preventDefault()
    fetchRoutes()
  }

  const handleToggleStatus = (route) => {
    const actionText = route.status === 'ACTIVE' ? 'tạm ngưng' : 'kích hoạt'
    showConfirm(`Bạn có chắc muốn ${actionText} tuyến ${route.routeNumber}?`, async () => {
      try {
        const res = await api.post(`/api/admin/routes/${route._id}/toggle-status`)
        if (res.data.ok) {
          setRoutes((current) => current.map((item) => (
            item._id === route._id ? { ...item, status: res.data.status } : item
          )))
          showAlert(res.data.message || 'Cập nhật trạng thái thành công', 'Thành công')
        }
      } catch (error) {
        showAlert(error.response?.data?.message || 'Không thể cập nhật trạng thái tuyến', 'Lỗi')
      }
    })
  }

  const handleApproveRoute = (route) => {
    showConfirm(`Bạn có chắc muốn duyệt tuyến ${route.routeNumber}?`, async () => {
      try {
        const res = await api.post(`/api/admin/routes/${route._id}/approve`)
        if (res.data.ok) {
          setRoutes((current) => current.map((item) => (
            item._id === route._id ? { ...item, ...(res.data.route || {}), status: 'APPROVED' } : item
          )))
          showAlert(res.data.message || 'Duyệt tuyến thành công', 'Thành công')
        }
      } catch (error) {
        showAlert(error.response?.data?.message || 'Không thể duyệt tuyến', 'Lỗi')
      }
    })
  }

  const handleRejectRoute = (route) => {
    const rejectionReason = window.prompt(`Nhập lý do từ chối tuyến ${route.routeNumber}:`, '')
    if (rejectionReason === null) return
    if (!rejectionReason.trim()) {
      showAlert('Vui lòng nhập lý do từ chối', 'Thông báo')
      return
    }

    showConfirm(`Bạn có chắc muốn từ chối tuyến ${route.routeNumber}?`, async () => {
      try {
        const res = await api.post(`/api/admin/routes/${route._id}/reject`, { rejectionReason: rejectionReason.trim() })
        if (res.data.ok) {
          setRoutes((current) => current.map((item) => (
            item._id === route._id ? { ...item, ...(res.data.route || {}), status: 'REJECTED' } : item
          )))
          showAlert(res.data.message || 'Từ chối tuyến thành công', 'Thành công')
        }
      } catch (error) {
        showAlert(error.response?.data?.message || 'Không thể từ chối tuyến', 'Lỗi')
      }
    })
  }

  if (!token) return null

  return (
    <div className="space-y-6 text-black">
      <div className="admin-page-head">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
            <FaMapMarkedAlt className="text-[#23a983]" />
            Quản lý tuyến xe
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Đồng bộ workflow tuyến, điểm đầu/cuối, hành trình hai chiều và metadata vận hành.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate('/admin/stops')}
            className="rounded-2xl bg-white px-4 py-2.5 font-semibold text-cyan-700 transition hover:bg-cyan-50"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
          >
            Quản lý trạm dừng
          </button>
          <button
            onClick={() => navigate('/admin/routes/create')}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#23a983] px-4 py-2.5 font-semibold text-white transition hover:bg-[#1bbd8f]"
          >
            <FaPlus />
            Tạo tuyến mới
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <div className="admin-toolbar">
            <form onSubmit={handleSearch} className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px_auto]">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Tìm tuyến</label>
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Mã tuyến, tên tuyến, mô tả..."
                  className="w-full rounded-2xl border border-gray-200 bg-[#f8fafc] px-4 py-2.5 outline-none transition focus:border-[#23a983] focus:bg-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Trạng thái</label>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-[#f8fafc] px-4 py-2.5 outline-none transition focus:border-[#23a983] focus:bg-white"
                >
                  <option value="">Tất cả</option>
                  {PRIMARY_ROUTE_STATUSES.map((status) => (
                    <option key={status} value={status}>{STATUS_META[status].label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button type="submit" className="inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-5 py-2.5 font-semibold text-white transition hover:bg-gray-800">
                  <FaSearch />
                  Lọc
                </button>
              </div>
            </form>
          </div>

          <div className="admin-surface overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Danh sách tuyến</h2>
                <p className="mt-1 text-sm text-gray-500">Tổng hợp mã tuyến, điểm đầu/cuối, hành trình, giá vé và luồng xử lý.</p>
              </div>
              {loading ? <span className="text-sm text-gray-500">Đang tải...</span> : null}
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="text-xs uppercase tracking-[0.18em] text-gray-400">
                    <th className="px-6 py-3 font-semibold">Tuyến</th>
                    <th className="px-6 py-3 font-semibold">Đầu / Cuối</th>
                    <th className="px-6 py-3 font-semibold">Hành trình</th>
                    <th className="px-6 py-3 font-semibold">Vận hành</th>
                    <th className="px-6 py-3 font-semibold">Trạng thái</th>
                    <th className="px-6 py-3 text-right font-semibold">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {!loading && routes.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                        Chưa có tuyến nào phù hợp bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    routes.map((route) => {
                      const statusMeta = getStatusMeta(route.status)
                      return (
                        <tr key={route._id} className="transition-colors hover:bg-[#fbfcfd]">
                          <td className="px-6 py-4">
                            <div className="flex items-start gap-3">
                              <span className={`rounded-2xl px-3 py-1.5 text-sm font-bold text-white ${statusMeta.tile}`}>
                                {route.routeNumber}
                              </span>
                              <div>
                                <p className="text-sm font-bold text-gray-900">{route.name || 'Tuyến chưa đặt tên'}</p>
                                <p className="mt-1 text-xs text-gray-500">{route.routeType || 'Chưa có loại tuyến'} · {route.serviceType || 'Chưa có loại dịch vụ'}</p>
                                <p className="mt-2 max-w-[260px] text-xs text-gray-500">{route.description || 'Không có mô tả'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-semibold text-gray-900">{stopLabel(route.startStop)}</p>
                            <p className="mt-1 text-xs text-gray-500">{stopLabel(route.endStop)}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-semibold text-gray-900">{route.stopCount || 0} trạm chiều đi</p>
                            <p className="mt-1 max-w-[260px] text-xs text-gray-500">{summarizeStops(route.outboundStops)}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-semibold text-gray-900">{formatOperationTime(route.operationTime)}</p>
                            <p className="mt-1 text-xs text-gray-500">
                              {formatMoney(route.monthlyPassPrice)} · {(route.distance || 0).toLocaleString('vi-VN')} km
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusMeta.chip}`}>{statusMeta.label}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-1">
                              <button onClick={() => setSelectedRoute(route)} className="rounded-xl p-2 text-blue-600 transition hover:bg-blue-50" title="Xem chi tiết">
                                <FaEye />
                              </button>
                              <button onClick={() => navigate(`/admin/routes/${route._id}/edit`)} className="rounded-xl p-2 text-indigo-600 transition hover:bg-indigo-50" title="Chỉnh sửa">
                                <FaEdit />
                              </button>
                              {route.status === 'PENDING_REVIEW' ? (
                                <>
                                  <button onClick={() => handleApproveRoute(route)} className="rounded-xl p-2 text-emerald-600 transition hover:bg-emerald-50" title="Duyệt tuyến">
                                    <FaCheck />
                                  </button>
                                  <button onClick={() => handleRejectRoute(route)} className="rounded-xl p-2 text-rose-600 transition hover:bg-rose-50" title="Từ chối tuyến">
                                    <FaTimes />
                                  </button>
                                </>
                              ) : ['ACTIVE', 'INACTIVE', 'APPROVED'].includes(route.status) ? (
                                <button
                                  onClick={() => handleToggleStatus(route)}
                                  className={`rounded-xl p-2 transition ${route.status === 'ACTIVE' ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                                  title={route.status === 'ACTIVE' ? 'Tạm ngưng' : 'Kích hoạt'}
                                >
                                  {route.status === 'ACTIVE' ? <FaBan /> : <FaUndo />}
                                </button>
                              ) : (
                                <span className="rounded-xl bg-gray-100 p-2 text-gray-400" title="Khóa workflow">
                                  <FaBan />
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="admin-surface p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">Luồng Trạng Thái</p>
            <div className="mt-4 space-y-3">
              {PRIMARY_ROUTE_STATUSES.map((status) => (
                <div key={status} className="flex items-center gap-3 rounded-2xl bg-[#f8fafc] px-4 py-3">
                  <span className={`h-3 w-3 rounded-full ${STATUS_META[status].tile}`} />
                  <span className="text-sm font-semibold text-gray-700">{STATUS_META[status].label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="admin-surface p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">Thao Tác Nhanh</p>
            <div className="mt-4 space-y-3 text-sm text-gray-600">
              <div className="rounded-2xl bg-[#f8fafc] px-4 py-4">
                <p className="font-semibold text-gray-900">Trình tạo tuyến mới</p>
                <p className="mt-1">Màn tạo/chỉnh sửa tuyến hiện hỗ trợ chiều đi, chiều về, cấu hình vận hành và preview bản đồ.</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/admin/routes/create')}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#23a983] px-4 py-3 font-semibold text-[#23a983] transition hover:bg-[#ecfdf5]"
              >
                <FaMapMarkerAlt />
                Tạo tuyến mới
              </button>
            </div>
          </div>
        </aside>
      </div>

      {selectedRoute ? <RouteViewModal route={selectedRoute} onClose={() => setSelectedRoute(null)} /> : null}
    </div>
  )
}

export default AdminRoutes
