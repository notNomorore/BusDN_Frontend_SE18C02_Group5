import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FaArrowLeft, FaPlus, FaTimes, FaArrowUp, FaArrowDown, FaSave, FaPaperPlane } from 'react-icons/fa'
import { MapContainer, TileLayer, Marker, Polyline, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../../utils/api'
import { useDialog } from '../../context/DialogContext'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const outboundIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
})
const inboundIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
})
const terminalIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
})

const DA_NANG = [16.0544, 108.2022]

function RouteMap({ outboundStops, inboundStops, availableStops }) {
  const stopMap = Object.fromEntries(availableStops.map(s => [s._id, s]))

  const outCoords = outboundStops
    .map(s => stopMap[s.stopId])
    .filter(s => s?.lat && s?.lng)
    .map(s => [parseFloat(s.lat), parseFloat(s.lng)])

  const inCoords = inboundStops
    .map(s => stopMap[s.stopId])
    .filter(s => s?.lat && s?.lng)
    .map(s => [parseFloat(s.lat), parseFloat(s.lng)])

  const allCoords = [...outCoords, ...inCoords]
  const center = allCoords.length > 0
    ? [allCoords.reduce((s, c) => s + c[0], 0) / allCoords.length, allCoords.reduce((s, c) => s + c[1], 0) / allCoords.length]
    : DA_NANG

  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden">
      <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
        <p className="text-xs font-bold text-gray-700">Ban do tuyen</p>
        <p className="text-xs text-gray-400">Marker va duong tuyen se cap nhat theo cac tram hop le tren ban do.</p>
      </div>
      <MapContainer center={center} zoom={12} style={{ height: '320px' }} key={center.join(',')}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
        {outCoords.length > 1 && <Polyline positions={outCoords} color="#3b82f6" weight={3} />}
        {inCoords.length > 1 && <Polyline positions={inCoords} color="#ef4444" weight={3} dashArray="6,4" />}
        {outboundStops.map((s, i) => {
          const stop = stopMap[s.stopId]
          if (!stop?.lat || !stop?.lng) return null
          const isTerminal = i === 0 || i === outboundStops.length - 1
          return (
            <Marker key={'out-' + s.stopId + i} position={[parseFloat(stop.lat), parseFloat(stop.lng)]} icon={isTerminal ? terminalIcon : outboundIcon}>
              <Tooltip permanent={isTerminal} direction="top" offset={[0, -38]}>{stop.name}</Tooltip>
            </Marker>
          )
        })}
        {inboundStops.map((s, i) => {
          const stop = stopMap[s.stopId]
          if (!stop?.lat || !stop?.lng) return null
          const isTerminal = i === 0 || i === inboundStops.length - 1
          return (
            <Marker key={'in-' + s.stopId + i} position={[parseFloat(stop.lat), parseFloat(stop.lng)]} icon={isTerminal ? terminalIcon : inboundIcon}>
              <Tooltip direction="top" offset={[0, -38]}>{stop.name}</Tooltip>
            </Marker>
          )
        })}
      </MapContainer>
      <div className="flex gap-4 px-4 py-2 bg-gray-50 border-t border-gray-100">
        <span className="flex items-center gap-1.5 text-xs text-gray-600"><span className="inline-block h-2 w-4 rounded bg-blue-500"></span>Chieu di</span>
        <span className="flex items-center gap-1.5 text-xs text-gray-600"><span className="inline-block h-2 w-4 rounded bg-red-500"></span>Chieu ve</span>
        <span className="flex items-center gap-1.5 text-xs text-gray-600"><span className="inline-block h-2 w-4 rounded bg-green-500"></span>Diem dau / cuoi</span>
      </div>
      {allCoords.length === 0 && (
        <p className="px-4 py-2 text-center text-xs text-gray-400 bg-gray-50">Chua co du lieu tram de hien thi tuyen tren ban do.</p>
      )}
    </div>
  )
}

const ROUTE_TYPES = ['REGULAR', 'EXPRESS', 'LOOP', 'SHUTTLE']
const SERVICE_TYPES = ['URBAN', 'SUBURBAN', 'SCHOOL', 'AIRPORT', 'SPECIAL']
const OPERATING_DAYS = [
  { value: 'MONDAY', label: 'Thứ 2' },
  { value: 'TUESDAY', label: 'Thứ 3' },
  { value: 'WEDNESDAY', label: 'Thứ 4' },
  { value: 'THURSDAY', label: 'Thứ 5' },
  { value: 'FRIDAY', label: 'Thứ 6' },
  { value: 'SATURDAY', label: 'Thứ 7' },
  { value: 'SUNDAY', label: 'Chủ nhật' },
]

const EMPTY_FORM = {
  routeCode: '', routeName: '', routeType: 'REGULAR', serviceType: 'URBAN',
  startPoint: '', endPoint: '', description: '', effectiveDate: '',
  monthlyPassPrice: 200000, distance: '',
  startTime: '05:00', endTime: '22:00',
  tripInterval: 15, estimatedRouteDuration: 60, turnaroundTime: 10,
  operatingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
  notes: '', outboundStops: [], inboundStops: [],
}

const inputCls = 'w-full rounded-xl border border-gray-200 bg-[#f8fafc] px-3 py-2.5 text-sm outline-none transition focus:border-[#23a983] focus:bg-white'
const labelCls = 'mb-1 block text-sm font-semibold text-gray-700'

// --- Stop selector for direction builder ---
const StopSelector = ({ availableStops, selectedStops, onChange, label, sectionNumber }) => {
  const [search, setSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  const filtered = availableStops.filter((s) =>
    !selectedStops.find((sel) => sel.stopId === s._id) &&
    (s.name.toLowerCase().includes(search.toLowerCase()) || (s.address || '').toLowerCase().includes(search.toLowerCase()))
  )

  const addStop = (stop) => {
    onChange([...selectedStops, {
      stopId: stop._id, name: stop.name, address: stop.address || '',
      isTerminal: stop.isTerminal || false,
      estimatedMinutesFromStart: 0, distanceFromStart: 0,
      pickupAllowed: true, dropoffAllowed: true, status: 'ACTIVE',
    }])
    setSearch('')
    setShowDropdown(false)
  }

  const removeStop = (idx) => onChange(selectedStops.filter((_, i) => i !== idx))

  const moveStop = (idx, dir) => {
    const arr = [...selectedStops]
    const target = idx + dir
    if (target < 0 || target >= arr.length) return
    ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
    onChange(arr)
  }

  const updateStop = (idx, field, value) => {
    const arr = [...selectedStops]
    arr[idx] = { ...arr[idx], [field]: value }
    onChange(arr)
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      {/* Section header */}
      <div className="flex items-start justify-between border-b border-gray-100 px-4 py-3">
        <div>
          <p className="text-sm font-bold text-gray-800">{sectionNumber}. {label}</p>
          <p className="text-xs text-gray-400">Quan ly danh sach tram theo dung thu tu xe di qua cua {label.toLowerCase()}.</p>
        </div>
        <span className="text-xs text-gray-500 font-medium">So tram: {selectedStops.length}</span>
      </div>

      {/* Search row */}
      <div className="px-4 pt-3 pb-2">
        <p className="mb-1 text-xs font-semibold text-gray-600">Tim tram</p>
        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <input
              type="text" value={search}
              onChange={(e) => { setSearch(e.target.value); setShowDropdown(true) }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              placeholder="Nhap ten tram hoac dia chi..."
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#23a983] focus:bg-white"
            />
            {showDropdown && search && filtered.length > 0 && (
              <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                {filtered.map((s) => (
                  <button key={s._id} type="button" onMouseDown={() => addStop(s)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[#f3fffa]">
                    <FaPlus className="flex-shrink-0 text-[#23a983]" size={10} />
                    <span className="font-semibold text-gray-800 text-xs">{s.name}</span>
                    {s.isTerminal ? <span className="rounded-full bg-red-50 px-1.5 text-[10px] font-bold text-red-600">Dau/cuoi</span> : null}
                    <span className="ml-auto text-xs text-gray-400 truncate max-w-[120px]">{s.address}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" onMouseDown={() => { if (filtered.length > 0) addStop(filtered[0]) }}
            className="flex-shrink-0 rounded-lg border border-[#23a983] px-3 py-2 text-xs font-semibold text-[#23a983] hover:bg-[#f3fffa]">
            + Them tram
          </button>
        </div>
        {selectedStops.length === 0 && <p className="mt-1 text-xs text-gray-400">Chua chon tram.</p>}
      </div>

      {/* Table */}
      {selectedStops.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-y border-gray-100 bg-gray-50 text-left text-gray-500 font-semibold">
                <th className="px-4 py-2">Tram</th>
                <th className="px-2 py-2 text-center">Phut tu dau</th>
                <th className="px-2 py-2 text-center">Km tu dau</th>
                <th className="px-2 py-2 text-center">Don</th>
                <th className="px-2 py-2 text-center">Tra</th>
                <th className="px-2 py-2 text-center">Trang thai</th>
                <th className="px-2 py-2 text-center">Tac vu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {selectedStops.map((stop, idx) => (
                <tr key={stop.stopId + idx} className="hover:bg-gray-50">
                  <td className="px-4 py-2 min-w-[160px]">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#23a983] text-[10px] font-bold text-white">{idx + 1}</span>
                      <div>
                        <p className="font-semibold text-gray-800 leading-tight">{stop.name}</p>
                        {stop.address && <p className="text-gray-400 leading-tight">{stop.address}</p>}
                        <p className="text-gray-400">Tram trong hanh trinh</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <input type="number" min="0" value={stop.estimatedMinutesFromStart}
                      onChange={(e) => updateStop(idx, 'estimatedMinutesFromStart', Number(e.target.value))}
                      className="w-14 rounded border border-gray-200 bg-gray-50 px-1.5 py-1 text-center text-xs outline-none focus:border-[#23a983]" />
                  </td>
                  <td className="px-2 py-2">
                    <input type="number" min="0" step="0.1" value={stop.distanceFromStart}
                      onChange={(e) => updateStop(idx, 'distanceFromStart', Number(e.target.value))}
                      className="w-14 rounded border border-gray-200 bg-gray-50 px-1.5 py-1 text-center text-xs outline-none focus:border-[#23a983]" />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <input type="checkbox" checked={stop.pickupAllowed}
                      onChange={(e) => updateStop(idx, 'pickupAllowed', e.target.checked)}
                      className="h-3.5 w-3.5 accent-[#23a983]" />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <input type="checkbox" checked={stop.dropoffAllowed}
                      onChange={(e) => updateStop(idx, 'dropoffAllowed', e.target.checked)}
                      className="h-3.5 w-3.5 accent-[#23a983]" />
                  </td>
                  <td className="px-2 py-2">
                    <select value={stop.status} onChange={(e) => updateStop(idx, 'status', e.target.value)}
                      className="rounded border border-gray-200 bg-gray-50 px-1 py-1 text-xs outline-none focus:border-[#23a983]">
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-0.5">
                      <button type="button" onClick={() => moveStop(idx, -1)} disabled={idx === 0}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"><FaArrowUp size={10} /></button>
                      <button type="button" onClick={() => moveStop(idx, 1)} disabled={idx === selectedStops.length - 1}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30"><FaArrowDown size={10} /></button>
                      <button type="button" onClick={() => removeStop(idx)}
                        className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"><FaTimes size={10} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selectedStops.length === 0 && (
        <div className="px-4 pb-4 text-center text-xs text-gray-400">Chua co tram nao trong hanh trinh.</div>
      )}
    </div>
  )
}

// --- Main RouteForm component ---
const RouteForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showAlert } = useDialog()
  const isEdit = Boolean(id)

  const [form, setForm] = useState(EMPTY_FORM)
  const [availableStops, setAvailableStops] = useState([])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState([])
  const [activeTab, setActiveTab] = useState('basic') // basic | directions | operation

  // Load metadata (stops list) + route data if editing
  useEffect(() => {
    const init = async () => {
      try {
        const metaRes = await api.get('/api/admin/routes/metadata')
        if (metaRes.data.ok) setAvailableStops(metaRes.data.availableStops || [])

        if (isEdit) {
          const routeRes = await api.get(`/api/admin/routes/${id}`)
          if (routeRes.data.ok) {
            const r = routeRes.data.route
            setForm({
              routeCode: r.routeCode || r.routeNumber || '',
              routeName: r.routeName || r.name || '',
              routeType: r.routeType || 'REGULAR',
              serviceType: r.serviceType || 'URBAN',
              startPoint: r.startStop?._id || r.startStop?.id || '',
              endPoint: r.endStop?._id || r.endStop?.id || '',
              description: r.description || '',
              effectiveDate: r.effectiveDate ? r.effectiveDate.slice(0, 10) : '',
              monthlyPassPrice: r.monthlyPassPrice ?? 200000,
              distance: r.distance || '',
              startTime: r.operationSettings?.startTime || r.operationTime?.start || '05:00',
              endTime: r.operationSettings?.endTime || r.operationTime?.end || '22:00',
              tripInterval: r.operationSettings?.tripInterval ?? r.frequencyMinutes ?? 15,
              estimatedRouteDuration: r.operationSettings?.estimatedRouteDuration ?? r.roundTripMinutes ?? 60,
              turnaroundTime: r.operationSettings?.turnaroundTime ?? r.bufferMinutes ?? 10,
              operatingDays: r.operationSettings?.operatingDays || OPERATING_DAYS.map((d) => d.value),
              notes: r.operationSettings?.notes || '',
              outboundStops: (r.outboundStops || []).map((s) => ({
                stopId: s.stopRefId || s.id || s.stopId,
                name: s.name || '',
                address: s.address || '',
                isTerminal: s.isTerminal || false,
                estimatedMinutesFromStart: s.estimatedMinutesFromStart ?? 0,
                distanceFromStart: s.distanceFromStart ?? 0,
                pickupAllowed: s.pickupAllowed !== false,
                dropoffAllowed: s.dropoffAllowed !== false,
                status: s.status || 'ACTIVE',
              })),
              inboundStops: (r.inboundStops || []).map((s) => ({
                stopId: s.stopRefId || s.id || s.stopId,
                name: s.name || '',
                address: s.address || '',
                isTerminal: s.isTerminal || false,
                estimatedMinutesFromStart: s.estimatedMinutesFromStart ?? 0,
                distanceFromStart: s.distanceFromStart ?? 0,
                pickupAllowed: s.pickupAllowed !== false,
                dropoffAllowed: s.dropoffAllowed !== false,
                status: s.status || 'ACTIVE',
              })),
            })
          }
        }
      } catch (err) {
        showAlert('Không thể tải dữ liệu', 'Lỗi')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [id, isEdit])

  const set = useCallback((field, value) => setForm((prev) => ({ ...prev, [field]: value })), [])

  const toggleDay = (day) => {
    setForm((prev) => ({
      ...prev,
      operatingDays: prev.operatingDays.includes(day)
        ? prev.operatingDays.filter((d) => d !== day)
        : [...prev.operatingDays, day],
    }))
  }

  const buildPayload = (intent) => ({
    intent,
    routeCode: form.routeCode,
    routeName: form.routeName,
    routeType: form.routeType,
    serviceType: form.serviceType,
    startPoint: form.startPoint,
    endPoint: form.endPoint,
    description: form.description,
    effectiveDate: form.effectiveDate,
    monthlyPassPrice: form.monthlyPassPrice,
    distance: form.distance,
    startTime: form.startTime,
    endTime: form.endTime,
    tripInterval: form.tripInterval,
    estimatedRouteDuration: form.estimatedRouteDuration,
    turnaroundTime: form.turnaroundTime,
    operatingDays: form.operatingDays,
    notes: form.notes,
    outboundStops: JSON.stringify(form.outboundStops.map((s) => ({
      stopId: s.stopId, estimatedMinutesFromStart: s.estimatedMinutesFromStart,
      distanceFromStart: s.distanceFromStart, pickupAllowed: s.pickupAllowed, dropoffAllowed: s.dropoffAllowed,
    }))),
    inboundStops: JSON.stringify(form.inboundStops.map((s) => ({
      stopId: s.stopId, estimatedMinutesFromStart: s.estimatedMinutesFromStart,
      distanceFromStart: s.distanceFromStart, pickupAllowed: s.pickupAllowed, dropoffAllowed: s.dropoffAllowed,
    }))),
  })

  const handleSave = async (intent = 'save_draft') => {
    setSaving(true)
    setErrors([])
    try {
      const payload = buildPayload(intent)
      const res = isEdit
        ? await api.put(`/api/admin/routes/${id}`, payload)
        : await api.post('/api/admin/routes/create', payload)

      if (res.data.ok) {
        showAlert(res.data.message || 'Lưu thành công', 'Thành công')
        navigate('/admin/routes')
      }
    } catch (err) {
      const errs = err.response?.data?.errors || []
      if (errs.length) setErrors(errs)
      else showAlert(err.response?.data?.message || 'Lỗi khi lưu tuyến', 'Lỗi')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        <svg className="mr-2 h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        Đang tải...
      </div>
    )
  }

  const tabs = [
    { key: 'basic', label: 'Thông tin cơ bản' },
    { key: 'directions', label: 'Hành trình' },
    { key: 'operation', label: 'Vận hành' },
  ]

  return (
    <div className="space-y-6 text-black">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admin/routes')} className="rounded-xl p-2 text-gray-500 hover:bg-gray-100">
          <FaArrowLeft />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Chỉnh sửa tuyến' : 'Tạo tuyến mới'}</h1>
          <p className="mt-0.5 text-sm text-gray-500">{isEdit ? `Đang sửa tuyến ${form.routeCode}` : 'Điền thông tin để tạo tuyến xe buýt mới'}</p>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 ? (
        <div className="rounded-xl bg-red-50 px-4 py-3">
          <p className="mb-1 text-sm font-semibold text-red-700">Vui lòng kiểm tra lại:</p>
          <ul className="list-inside list-disc space-y-0.5 text-sm text-red-600">
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      ) : null}

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl bg-gray-100 p-1">
        {tabs.map((tab) => (
          <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={activeTab === 'directions' ? 'rounded-2xl bg-white shadow-sm overflow-hidden' : 'rounded-2xl bg-white p-6 shadow-sm'}>
        {/* Tab: Basic */}
        {activeTab === 'basic' ? (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelCls}>Mã tuyến *</label>
                <input className={inputCls} value={form.routeCode} onChange={(e) => set('routeCode', e.target.value)} placeholder="VD: BUS01" />
              </div>
              <div>
                <label className={labelCls}>Tên tuyến *</label>
                <input className={inputCls} value={form.routeName} onChange={(e) => set('routeName', e.target.value)} placeholder="VD: Tuyến Đà Nẵng - Hội An" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelCls}>Loại tuyến</label>
                <select className={inputCls} value={form.routeType} onChange={(e) => set('routeType', e.target.value)}>
                  {ROUTE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Loại dịch vụ</label>
                <select className={inputCls} value={form.serviceType} onChange={(e) => set('serviceType', e.target.value)}>
                  {SERVICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelCls}>Điểm đầu</label>
                <select className={inputCls} value={form.startPoint} onChange={(e) => set('startPoint', e.target.value)}>
                  <option value="">-- Chọn trạm đầu --</option>
                  {availableStops.map((s) => <option key={s._id} value={s._id}>{s.name}{s.isTerminal ? ' (Đầu/cuối)' : ''}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Điểm cuối</label>
                <select className={inputCls} value={form.endPoint} onChange={(e) => set('endPoint', e.target.value)}>
                  <option value="">-- Chọn trạm cuối --</option>
                  {availableStops.map((s) => <option key={s._id} value={s._id}>{s.name}{s.isTerminal ? ' (Đầu/cuối)' : ''}</option>)}
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className={labelCls}>Giá vé tháng (VNĐ)</label>
                <input type="number" min="0" className={inputCls} value={form.monthlyPassPrice} onChange={(e) => set('monthlyPassPrice', Number(e.target.value))} />
              </div>
              <div>
                <label className={labelCls}>Cự ly (km)</label>
                <input type="number" min="0" step="0.1" className={inputCls} value={form.distance} onChange={(e) => set('distance', e.target.value)} placeholder="Tự tính nếu để trống" />
              </div>
              <div>
                <label className={labelCls}>Ngày hiệu lực</label>
                <input type="date" className={inputCls} value={form.effectiveDate} onChange={(e) => set('effectiveDate', e.target.value)} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Mô tả</label>
              <textarea rows={3} className={inputCls} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Mô tả ngắn về tuyến..." />
            </div>
          </div>
        ) : null}

        {/* Tab: Directions */}
        {activeTab === 'directions' ? (
          <div className="grid gap-0" style={{ gridTemplateColumns: '1fr 380px' }}>
            {/* Left: stop selectors */}
            <div className="space-y-0 min-w-0 border-r border-gray-100 p-5">
              <StopSelector
                availableStops={availableStops}
                selectedStops={form.outboundStops}
                onChange={(stops) => set('outboundStops', stops)}
                label="Tram chieu di"
                sectionNumber={2}
              />
              <div className="mt-4">
                <StopSelector
                  availableStops={availableStops}
                  selectedStops={form.inboundStops}
                  onChange={(stops) => set('inboundStops', stops)}
                  label="Tram chieu ve"
                  sectionNumber={3}
                />
              </div>
            </div>
            {/* Right: sticky map */}
            <div className="p-4 sticky top-4 self-start">
              <RouteMap
                outboundStops={form.outboundStops}
                inboundStops={form.inboundStops}
                availableStops={availableStops}
              />
            </div>
          </div>
        ) : null}

        {/* Tab: Operation */}
        {activeTab === 'operation' ? (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelCls}>Giờ bắt đầu</label>
                <input type="time" className={inputCls} value={form.startTime} onChange={(e) => set('startTime', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Giờ kết thúc</label>
                <input type="time" className={inputCls} value={form.endTime} onChange={(e) => set('endTime', e.target.value)} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className={labelCls}>Tần suất (phút)</label>
                <input type="number" min="1" className={inputCls} value={form.tripInterval} onChange={(e) => set('tripInterval', Number(e.target.value))} />
              </div>
              <div>
                <label className={labelCls}>Thời gian hành trình (phút)</label>
                <input type="number" min="1" className={inputCls} value={form.estimatedRouteDuration} onChange={(e) => set('estimatedRouteDuration', Number(e.target.value))} />
              </div>
              <div>
                <label className={labelCls}>Thời gian quay đầu (phút)</label>
                <input type="number" min="0" className={inputCls} value={form.turnaroundTime} onChange={(e) => set('turnaroundTime', Number(e.target.value))} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Ngày vận hành</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {OPERATING_DAYS.map((day) => (
                  <button key={day.value} type="button" onClick={() => toggleDay(day.value)}
                    className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${form.operatingDays.includes(day.value) ? 'bg-[#23a983] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelCls}>Ghi chú vận hành</label>
              <textarea rows={2} className={inputCls} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Ghi chú thêm..." />
            </div>
          </div>
        ) : null}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <button type="button" onClick={() => navigate('/admin/routes')} className="rounded-xl bg-gray-100 px-5 py-2.5 font-semibold text-gray-700 hover:bg-gray-200">
          Hủy
        </button>
        <div className="flex gap-3">
          <button type="button" onClick={() => handleSave('save_draft')} disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-gray-800 px-5 py-2.5 font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
          >
            <FaSave /> {saving ? 'Đang lưu...' : 'Lưu nháp'}
          </button>
          <button type="button" onClick={() => handleSave('submit_review')} disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#23a983] px-5 py-2.5 font-semibold text-white hover:bg-[#1bbd8f] disabled:opacity-50"
          >
            <FaPaperPlane /> {saving ? 'Đang gửi...' : 'Gửi duyệt'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default RouteForm
