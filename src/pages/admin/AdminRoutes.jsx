import React, { useCallback, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaBan,
  FaEdit,
  FaEye,
  FaMapMarkedAlt,
  FaMapMarkerAlt,
  FaPlus,
  FaSearch,
  FaUndo,
} from 'react-icons/fa'
import api from '../../utils/api'
import AuthContext from '../../context/AuthContext'
import { useDialog } from '../../context/DialogContext'

const STATUS_META = {
  DRAFT: { label: 'Nhap', chip: 'bg-slate-100 text-slate-700', tile: 'bg-slate-500' },
  PENDING_REVIEW: { label: 'Cho duyet', chip: 'bg-amber-100 text-amber-700', tile: 'bg-amber-500' },
  APPROVED: { label: 'Da duyet', chip: 'bg-sky-100 text-sky-700', tile: 'bg-sky-500' },
  SCHEDULED: { label: 'Len lich', chip: 'bg-indigo-100 text-indigo-700', tile: 'bg-indigo-500' },
  ACTIVE: { label: 'Dang hoat dong', chip: 'bg-emerald-100 text-emerald-700', tile: 'bg-[#23a983]' },
  REJECTED: { label: 'Tu choi', chip: 'bg-rose-100 text-rose-700', tile: 'bg-rose-500' },
  SUSPENDED: { label: 'Tam dung', chip: 'bg-gray-200 text-gray-700', tile: 'bg-gray-500' },
  INACTIVE: { label: 'Ngung hoat dong', chip: 'bg-gray-100 text-gray-600', tile: 'bg-gray-400' },
}

const ROUTE_STATUSES = Object.keys(STATUS_META)
const modalShadow = 'shadow-[0_2px_8px_rgba(0,0,0,0.05)]'

const getStatusMeta = (status) => STATUS_META[status] || STATUS_META.DRAFT
const formatMoney = (value) => `${Number(value || 0).toLocaleString('vi-VN')} d`
const formatOperationTime = (operationTime) => {
  if (!operationTime) return '-'
  if (typeof operationTime === 'string') return operationTime
  const start = operationTime.start || ''
  const end = operationTime.end || ''
  return start && end ? `${start} - ${end}` : '-'
}

const stopLabel = (stop) => {
  if (!stop) return 'Chua xac dinh'
  return stop.isTerminal ? `${stop.name} (Dau/cuoi)` : stop.name
}

const summarizeStops = (stops = []) => {
  if (!stops.length) return 'Chua co tram'
  return stops.slice(0, 4).map((stop) => stop.name).join(' -> ') + (stops.length > 4 ? ' ...' : '')
}

function RouteViewModal({ route, onClose }) {
  if (!route) return null
  const statusMeta = getStatusMeta(route.status)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 text-black">
      <div className={`flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white ${modalShadow}`}>
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-gray-400">Route Detail</p>
            <h3 className="mt-2 text-2xl font-bold text-gray-900">
              {route.routeNumber} - {route.name || 'Tuyen chua dat ten'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">Xem nhanh diem dau/cuoi, hanh trinh hai chieu va cau hinh van hanh.</p>
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
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Diem dau</p>
                  <p className="mt-2 font-bold text-gray-900">{stopLabel(route.startStop)}</p>
                  <p className="mt-1 text-sm text-gray-500">{route.startStop?.address || 'Khong co dia chi'}</p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-[#f8fafc] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Diem cuoi</p>
                  <p className="mt-2 font-bold text-gray-900">{stopLabel(route.endStop)}</p>
                  <p className="mt-1 text-sm text-gray-500">{route.endStop?.address || 'Khong co dia chi'}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusMeta.chip}`}>{statusMeta.label}</span>
                  <span className="rounded-full bg-[#ecfdf5] px-3 py-1 text-xs font-bold text-[#23a983]">{formatMoney(route.monthlyPassPrice)}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                    {route.stopCount || 0} tram chieu di
                  </span>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-500">Khung gio</p>
                    <p className="mt-1 text-sm font-bold text-gray-900">{formatOperationTime(route.operationTime)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-500">Tan suat / Hanh trinh / Quay dau</p>
                    <p className="mt-1 text-sm font-bold text-gray-900">
                      {(route.operationSettings?.tripInterval ?? route.frequencyMinutes ?? '--')} / {(route.operationSettings?.estimatedRouteDuration ?? route.roundTripMinutes ?? '--')} / {(route.operationSettings?.turnaroundTime ?? route.bufferMinutes ?? '--')} phut
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-gray-400">Mo ta</p>
                <p className="mt-3 text-sm leading-7 text-gray-600">{route.description || 'Chua co mo ta cho tuyen nay.'}</p>
              </div>
            </section>

            <section className="space-y-4">
              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-gray-400">Chieu di</p>
                  <p className="mt-1 text-sm text-gray-500">So tram: {route.outboundStops?.length || 0}</p>
                </div>
                <div className="mt-4 space-y-3">
                  {(route.outboundStops || []).length === 0 ? (
                    <p className="rounded-2xl bg-[#f8fafc] px-4 py-6 text-center text-sm text-gray-500">Chua co du lieu chieu di.</p>
                  ) : (
                    route.outboundStops.map((stop, index) => (
                      <div key={`${stop.stopRefId || stop.id}-${index}`} className="rounded-2xl border border-gray-100 bg-[#f8fafc] px-4 py-3">
                        <p className="text-sm font-bold text-gray-900">{index + 1}. {stop.name}</p>
                        <p className="mt-1 text-xs text-gray-500">{stop.address || 'Khong co dia chi'}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-gray-400">Chieu ve</p>
                <p className="mt-1 text-sm text-gray-500">So tram: {route.inboundStops?.length || 0}</p>
                <div className="mt-4 space-y-3">
                  {(route.inboundStops || []).length === 0 ? (
                    <p className="rounded-2xl bg-[#f8fafc] px-4 py-6 text-center text-sm text-gray-500">Chua co du lieu chieu ve.</p>
                  ) : (
                    route.inboundStops.map((stop, index) => (
                      <div key={`${stop.stopRefId || stop.id}-${index}`} className="rounded-2xl border border-gray-100 bg-[#f8fafc] px-4 py-3">
                        <p className="text-sm font-bold text-gray-900">{index + 1}. {stop.name}</p>
                        <p className="mt-1 text-xs text-gray-500">{stop.address || 'Khong co dia chi'}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="flex justify-end border-t border-gray-100 px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-[#f3f5f8] px-5 py-2.5 font-semibold text-gray-700 transition hover:bg-gray-200"
          >
            Dong
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminRoutes() {
  const { token } = useContext(AuthContext)
  const { showAlert, showConfirm } = useDialog()
  const navigate = useNavigate()

  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedRoute, setSelectedRoute] = useState(null)

  const fetchRoutes = useCallback(async () => {
    try {
      setLoading(true)
      const params = {}
      if (search.trim()) params.q = search.trim()
      if (statusFilter) params.status = statusFilter
      const res = await api.get('/api/admin/routes', { params })
      if (res.data.ok) setRoutes(res.data.routes || [])
    } catch (error) {
      console.error('Error fetching routes:', error)
      showAlert(error.response?.data?.message || 'Khong the tai danh sach tuyen', 'Loi')
    } finally {
      setLoading(false)
    }
  }, [search, showAlert, statusFilter])

  useEffect(() => {
    fetchRoutes()
  }, [fetchRoutes])

  const handleSearch = (event) => {
    event.preventDefault()
    fetchRoutes()
  }

  const handleToggleStatus = (route) => {
    const isActive = route.status === 'ACTIVE'
    const actionText = isActive ? 'tam ngung' : 'kich hoat lai'

    showConfirm(`Ban co chac muon ${actionText} tuyen ${route.routeNumber}?`, async () => {
      try {
        const res = await api.post(`/api/admin/routes/${route._id}/toggle-status`)
        if (res.data.ok) {
          setRoutes((current) => current.map((item) => (
            item._id === route._id ? { ...item, status: res.data.status } : item
          )))
          if (selectedRoute?._id === route._id) {
            setSelectedRoute((prev) => ({ ...prev, status: res.data.status }))
          }
          showAlert(res.data.message || 'Cap nhat trang thai thanh cong', 'Thanh cong')
        }
      } catch (error) {
        showAlert(error.response?.data?.message || 'Khong the cap nhat trang thai tuyen', 'Loi')
      }
    }, isActive ? 'Tam ngung tuyen' : 'Kich hoat tuyen')
  }

  if (!token) return null

  return (
    <div className="space-y-6 text-black">
      <div className="admin-page-head">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
            <FaMapMarkedAlt className="text-[#23a983]" />
            Quan ly tuyen xe
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Dong bo workflow route, diem dau/cuoi, hanh trinh hai chieu va metadata van hanh.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate('/admin/stops')}
            className="rounded-2xl bg-white px-4 py-2.5 font-semibold text-cyan-700 transition hover:bg-cyan-50"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
          >
            Quan ly tram dung
          </button>
          <button
            onClick={() => navigate('/admin/routes/create')}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#23a983] px-4 py-2.5 font-semibold text-white transition hover:bg-[#1bbd8f]"
          >
            <FaPlus />
            Tao tuyen moi
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <div className="admin-toolbar">
            <form onSubmit={handleSearch} className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px_auto]">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Tim tuyen</label>
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Ma tuyen, ten tuyen, mo ta..."
                  className="w-full rounded-2xl border border-gray-200 bg-[#f8fafc] px-4 py-2.5 outline-none transition focus:border-[#23a983] focus:bg-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Trang thai</label>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-[#f8fafc] px-4 py-2.5 outline-none transition focus:border-[#23a983] focus:bg-white"
                >
                  <option value="">Tat ca</option>
                  {ROUTE_STATUSES.map((status) => (
                    <option key={status} value={status}>{STATUS_META[status].label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button type="submit" className="inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-5 py-2.5 font-semibold text-white transition hover:bg-gray-800">
                  <FaSearch />
                  Loc
                </button>
              </div>
            </form>
          </div>

          <div className="admin-surface overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Danh sach tuyen</h2>
                <p className="mt-1 text-sm text-gray-500">Tong hop route code, diem dau/cuoi, hanh trinh, gia ve va workflow.</p>
              </div>
              {loading ? <span className="text-sm text-gray-500">Dang tai...</span> : null}
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="text-xs uppercase tracking-[0.18em] text-gray-400">
                    <th className="px-6 py-3 font-semibold">Tuyen</th>
                    <th className="px-6 py-3 font-semibold">Dau / Cuoi</th>
                    <th className="px-6 py-3 font-semibold">Hanh trinh</th>
                    <th className="px-6 py-3 font-semibold">Van hanh</th>
                    <th className="px-6 py-3 font-semibold">Trang thai</th>
                    <th className="px-6 py-3 text-right font-semibold">Thao tac</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {!loading && routes.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                        Chua co tuyen nao phu hop bo loc hien tai.
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
                                <p className="text-sm font-bold text-gray-900">{route.name || 'Tuyen chua dat ten'}</p>
                                <p className="mt-2 max-w-[260px] text-xs text-gray-500">{route.description || 'Khong co mo ta'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-semibold text-gray-900">{stopLabel(route.startStop)}</p>
                            <p className="mt-1 text-xs text-gray-500">{stopLabel(route.endStop)}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-semibold text-gray-900">{route.stopCount || 0} tram chieu di</p>
                            <p className="mt-1 max-w-[260px] text-xs text-gray-500">{summarizeStops(route.outboundStops)}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-semibold text-gray-900">{formatOperationTime(route.operationTime)}</p>
                            <p className="mt-1 text-xs text-gray-500">
                              {formatMoney(route.monthlyPassPrice)} · {Number(route.distance || 0).toLocaleString('vi-VN')} km
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusMeta.chip}`}>{statusMeta.label}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => setSelectedRoute(route)}
                                className="rounded-xl p-2 text-blue-600 transition hover:bg-blue-50"
                                title="Xem chi tiet"
                              >
                                <FaEye />
                              </button>
                              <button
                                onClick={() => navigate(`/admin/routes/${route._id}/edit`)}
                                className="rounded-xl p-2 text-indigo-600 transition hover:bg-indigo-50"
                                title="Chinh sua"
                              >
                                <FaEdit />
                              </button>
                              {['ACTIVE', 'INACTIVE'].includes(route.status) ? (
                                <button
                                  onClick={() => handleToggleStatus(route)}
                                  className={`rounded-xl p-2 transition ${route.status === 'ACTIVE' ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                                  title={route.status === 'ACTIVE' ? 'Tam ngung' : 'Kich hoat'}
                                >
                                  {route.status === 'ACTIVE' ? <FaBan /> : <FaUndo />}
                                </button>
                              ) : (
                                <span className="rounded-xl bg-gray-100 p-2 text-gray-400" title="Workflow lock">
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
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">Workflow</p>
            <div className="mt-4 space-y-3">
              {ROUTE_STATUSES.map((status) => (
                <div key={status} className="flex items-center gap-3 rounded-2xl bg-[#f8fafc] px-4 py-3">
                  <span className={`h-3 w-3 rounded-full ${STATUS_META[status].tile}`} />
                  <span className="text-sm font-semibold text-gray-700">{STATUS_META[status].label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="admin-surface p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">Tac vu nhanh</p>
            <div className="mt-4 space-y-3 text-sm text-gray-600">
              <div className="rounded-2xl bg-[#f8fafc] px-4 py-4">
                <p className="font-semibold text-gray-900">Route builder</p>
                <p className="mt-1">Form tao/chinh sua ho tro 2 chieu, metadata van hanh va preview map.</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/admin/routes/create')}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#23a983] px-4 py-3 font-semibold text-[#23a983] transition hover:bg-[#ecfdf5]"
              >
                <FaMapMarkerAlt />
                Tao route builder moi
              </button>
            </div>
          </div>
        </aside>
      </div>

      {selectedRoute ? (
        <RouteViewModal route={selectedRoute} onClose={() => setSelectedRoute(null)} />
      ) : null}
    </div>
  )
}
