import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FaArrowDown, FaArrowLeft, FaArrowUp, FaPaperPlane, FaPlus, FaSave, FaTimes } from 'react-icons/fa'
import { MapContainer, Marker, Polyline, TileLayer, Tooltip } from 'react-leaflet'
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

const makeIcon = (url) => new L.Icon({
  iconUrl: url,
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
})

const outboundIcon = makeIcon('https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png')
const inboundIcon = makeIcon('https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png')
const terminalIcon = makeIcon('https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png')

const DA_NANG = [16.0544, 108.2022]
const OPERATING_DAYS = [
  ['MONDAY', 'Thu 2'],
  ['TUESDAY', 'Thu 3'],
  ['WEDNESDAY', 'Thu 4'],
  ['THURSDAY', 'Thu 5'],
  ['FRIDAY', 'Thu 6'],
  ['SATURDAY', 'Thu 7'],
  ['SUNDAY', 'Chu nhat'],
]

const EMPTY_FORM = {
  routeCode: '',
  routeName: '',
  startPoint: '',
  endPoint: '',
  description: '',
  effectiveDate: '',
  monthlyPassPrice: 200000,
  distance: '',
  startTime: '05:00',
  endTime: '22:00',
  tripInterval: 15,
  estimatedRouteDuration: 60,
  turnaroundTime: 10,
  operatingDays: OPERATING_DAYS.map(([value]) => value),
  notes: '',
  outboundStops: [],
  inboundStops: [],
}

const inputCls = 'w-full rounded-xl border border-gray-200 bg-[#f8fafc] px-3 py-2.5 text-sm outline-none transition focus:border-[#23a983] focus:bg-white'
const labelCls = 'mb-1 block text-sm font-semibold text-gray-700'

function RouteMap({ outboundStops, inboundStops, stopMap }) {
  const outCoords = outboundStops.map((item) => stopMap.get(item.stopId)).filter((stop) => stop?.lat != null && stop?.lng != null).map((stop) => [Number(stop.lat), Number(stop.lng)])
  const inCoords = inboundStops.map((item) => stopMap.get(item.stopId)).filter((stop) => stop?.lat != null && stop?.lng != null).map((stop) => [Number(stop.lat), Number(stop.lng)])
  const allCoords = [...outCoords, ...inCoords]
  const center = allCoords.length ? [
    allCoords.reduce((sum, item) => sum + item[0], 0) / allCoords.length,
    allCoords.reduce((sum, item) => sum + item[1], 0) / allCoords.length,
  ] : DA_NANG

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100">
      <div className="border-b border-gray-100 bg-gray-50 px-4 py-2.5">
        <p className="text-xs font-bold text-gray-700">Ban do tuyen</p>
        <p className="text-xs text-gray-400">Ban do se cap nhat theo danh sach tram hai chieu.</p>
      </div>
      <MapContainer center={center} zoom={12} style={{ height: '460px' }} key={center.join(',')}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
        {outCoords.length > 1 ? <Polyline positions={outCoords} color="#3b82f6" weight={3} /> : null}
        {inCoords.length > 1 ? <Polyline positions={inCoords} color="#ef4444" weight={3} dashArray="6,4" /> : null}
        {outboundStops.map((item, index) => {
          const stop = stopMap.get(item.stopId)
          if (!stop?.lat || !stop?.lng) return null
          const isTerminal = index === 0 || index === outboundStops.length - 1
          return (
            <Marker key={`out-${item.stopId}-${index}`} position={[Number(stop.lat), Number(stop.lng)]} icon={isTerminal ? terminalIcon : outboundIcon}>
              <Tooltip permanent={isTerminal} direction="top" offset={[0, -38]}>{stop.name}</Tooltip>
            </Marker>
          )
        })}
        {inboundStops.map((item, index) => {
          const stop = stopMap.get(item.stopId)
          if (!stop?.lat || !stop?.lng) return null
          const isTerminal = index === 0 || index === inboundStops.length - 1
          return (
            <Marker key={`in-${item.stopId}-${index}`} position={[Number(stop.lat), Number(stop.lng)]} icon={isTerminal ? terminalIcon : inboundIcon}>
              <Tooltip direction="top" offset={[0, -38]}>{stop.name}</Tooltip>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}

function DirectionEditor({ title, items, setItems, availableStops }) {
  const [search, setSearch] = useState('')
  const filtered = availableStops.filter((stop) => (
    stop.status === 'ACTIVE'
    && !items.some((item) => item.stopId === stop._id)
    && (!search || stop.name.toLowerCase().includes(search.toLowerCase()) || (stop.address || '').toLowerCase().includes(search.toLowerCase()))
  ))

  const addStop = (stop) => {
    setItems([...items, {
      stopId: stop._id,
      name: stop.name,
      address: stop.address || '',
      estimatedMinutesFromStart: 0,
      distanceFromStart: 0,
      pickupAllowed: true,
      dropoffAllowed: true,
      status: 'ACTIVE',
    }])
    setSearch('')
  }

  const patchItem = (index, patch) => setItems(items.map((item, idx) => (idx === index ? { ...item, ...patch } : item)))
  const moveItem = (index, offset) => {
    const target = index + offset
    if (target < 0 || target >= items.length) return
    const next = [...items]
    ;[next[index], next[target]] = [next[target], next[index]]
    setItems(next)
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div>
          <p className="text-sm font-bold text-gray-800">{title}</p>
          <p className="text-xs text-gray-400">So tram: {items.length}</p>
        </div>
      </div>
      <div className="px-4 py-3">
        <div className="flex gap-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nhap ten tram hoac dia chi..." className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#23a983] focus:bg-white" />
          <button type="button" onClick={() => filtered[0] && addStop(filtered[0])} className="rounded-lg border border-[#23a983] px-3 py-2 text-xs font-semibold text-[#23a983] hover:bg-[#f3fffa]">+ Them tram</button>
        </div>
        {search && filtered.length ? <div className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-gray-200">{filtered.slice(0, 8).map((stop) => <button key={stop._id} type="button" onClick={() => addStop(stop)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[#f3fffa]"><span>{stop.name}</span><span className="max-w-[160px] truncate text-xs text-gray-400">{stop.address}</span></button>)}</div> : null}
      </div>
      {!items.length ? <div className="px-4 pb-4 text-center text-xs text-gray-400">Chua co tram nao trong hanh trinh.</div> : null}
      {items.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-y border-gray-100 bg-gray-50 text-left font-semibold text-gray-500">
                <th className="px-4 py-2">Tram</th>
                <th className="px-2 py-2 text-center">Phut</th>
                <th className="px-2 py-2 text-center">Km</th>
                <th className="px-2 py-2 text-center">Don</th>
                <th className="px-2 py-2 text-center">Tra</th>
                <th className="px-2 py-2 text-center">Trang thai</th>
                <th className="px-2 py-2 text-center">Tac vu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item, index) => (
                <tr key={`${item.stopId}-${index}`} className="hover:bg-gray-50">
                  <td className="min-w-[170px] px-4 py-2">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#23a983] text-[10px] font-bold text-white">{index + 1}</span>
                      <div><p className="font-semibold text-gray-800">{item.name}</p><p className="text-gray-400">{item.address}</p></div>
                    </div>
                  </td>
                  <td className="px-2 py-2"><input type="number" min="0" value={item.estimatedMinutesFromStart} onChange={(e) => patchItem(index, { estimatedMinutesFromStart: Number(e.target.value) })} className="w-16 rounded border border-gray-200 bg-gray-50 px-1.5 py-1 text-center" /></td>
                  <td className="px-2 py-2"><input type="number" min="0" step="0.1" value={item.distanceFromStart} onChange={(e) => patchItem(index, { distanceFromStart: Number(e.target.value) })} className="w-16 rounded border border-gray-200 bg-gray-50 px-1.5 py-1 text-center" /></td>
                  <td className="px-2 py-2 text-center"><input type="checkbox" checked={item.pickupAllowed} onChange={(e) => patchItem(index, { pickupAllowed: e.target.checked })} className="h-3.5 w-3.5 accent-[#23a983]" /></td>
                  <td className="px-2 py-2 text-center"><input type="checkbox" checked={item.dropoffAllowed} onChange={(e) => patchItem(index, { dropoffAllowed: e.target.checked })} className="h-3.5 w-3.5 accent-[#23a983]" /></td>
                  <td className="px-2 py-2"><select value={item.status} onChange={(e) => patchItem(index, { status: e.target.value })} className="rounded border border-gray-200 bg-gray-50 px-1 py-1"><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option></select></td>
                  <td className="px-2 py-2"><div className="flex items-center gap-0.5"><button type="button" onClick={() => moveItem(index, -1)} disabled={index === 0} className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30"><FaArrowUp size={10} /></button><button type="button" onClick={() => moveItem(index, 1)} disabled={index === items.length - 1} className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30"><FaArrowDown size={10} /></button><button type="button" onClick={() => setItems(items.filter((_, idx) => idx !== index))} className="rounded p-1 text-red-400 hover:bg-red-50"><FaTimes size={10} /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}

export default function RouteForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showAlert } = useDialog()
  const isEdit = Boolean(id)

  const [form, setForm] = useState(EMPTY_FORM)
  const [availableStops, setAvailableStops] = useState([])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState([])
  const [activeTab, setActiveTab] = useState('basic')

  const stopMap = useMemo(() => new Map(availableStops.map((stop) => [stop._id, stop])), [availableStops])

  useEffect(() => {
    const init = async () => {
      try {
        const metaRes = await api.get('/api/admin/routes/metadata')
        if (metaRes.data.ok) setAvailableStops(metaRes.data.availableStops || [])
        if (isEdit) {
          const routeRes = await api.get(`/api/admin/routes/${id}`)
          if (routeRes.data.ok) {
            const route = routeRes.data.route
            setForm({
              routeCode: route.routeCode || route.routeNumber || '',
              routeName: route.routeName || route.name || '',
              startPoint: route.startStop?._id || route.startStop?.id || '',
              endPoint: route.endStop?._id || route.endStop?.id || '',
              description: route.description || '',
              effectiveDate: route.effectiveDate ? String(route.effectiveDate).slice(0, 10) : '',
              monthlyPassPrice: route.monthlyPassPrice ?? 200000,
              distance: route.distance || '',
              startTime: route.operationSettings?.startTime || route.operationTime?.start || '05:00',
              endTime: route.operationSettings?.endTime || route.operationTime?.end || '22:00',
              tripInterval: route.operationSettings?.tripInterval ?? route.frequencyMinutes ?? 15,
              estimatedRouteDuration: route.operationSettings?.estimatedRouteDuration ?? route.roundTripMinutes ?? 60,
              turnaroundTime: route.operationSettings?.turnaroundTime ?? route.bufferMinutes ?? 10,
              operatingDays: route.operationSettings?.operatingDays?.length ? route.operationSettings.operatingDays : OPERATING_DAYS.map(([value]) => value),
              notes: route.operationSettings?.notes || '',
              outboundStops: (route.outboundStops || []).map((stop) => ({ stopId: stop.stopRefId || stop.id || stop.stopId, name: stop.name, address: stop.address || '', estimatedMinutesFromStart: stop.estimatedMinutesFromStart ?? 0, distanceFromStart: stop.distanceFromStart ?? 0, pickupAllowed: stop.pickupAllowed !== false, dropoffAllowed: stop.dropoffAllowed !== false, status: stop.status || 'ACTIVE' })),
              inboundStops: (route.inboundStops || []).map((stop) => ({ stopId: stop.stopRefId || stop.id || stop.stopId, name: stop.name, address: stop.address || '', estimatedMinutesFromStart: stop.estimatedMinutesFromStart ?? 0, distanceFromStart: stop.distanceFromStart ?? 0, pickupAllowed: stop.pickupAllowed !== false, dropoffAllowed: stop.dropoffAllowed !== false, status: stop.status || 'ACTIVE' })),
            })
          }
        }
      } catch (error) {
        showAlert(error.response?.data?.message || 'Khong the tai du lieu route', 'Loi')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [id, isEdit, showAlert])

  useEffect(() => {
    const start = stopMap.get(form.startPoint)
    const end = stopMap.get(form.endPoint)
    if (start && end && form.startPoint !== form.endPoint) {
      const nextName = `${start.name} - ${end.name}`
      setForm((prev) => (prev.routeName === nextName ? prev : { ...prev, routeName: nextName }))
    }
  }, [form.endPoint, form.startPoint, stopMap])

  if (loading) return <div className="flex h-64 items-center justify-center text-gray-500">Dang tai...</div>

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))
  const buildPayload = (intent) => ({ ...form, routeCode: form.routeCode.trim().toUpperCase(), routeName: form.routeName.trim(), description: form.description.trim(), notes: form.notes.trim(), intent })

  const validateBeforeSubmitReview = () => {
    const nextErrors = []

    if (!form.routeCode.trim()) nextErrors.push('Ma tuyen la bat buoc.')
    if (!form.startPoint) nextErrors.push('Diem dau la bat buoc.')
    if (!form.endPoint) nextErrors.push('Diem cuoi la bat buoc.')
    if (form.startPoint && form.endPoint && form.startPoint === form.endPoint) {
      nextErrors.push('Diem dau va diem cuoi khong duoc trung nhau.')
    }

    const distance = Number(form.distance)
    if (!form.distance && form.distance !== 0) {
      nextErrors.push('Cu ly la bat buoc va phai lon hon 0.')
    } else if (!Number.isFinite(distance) || distance <= 0) {
      nextErrors.push('Cu ly la bat buoc va phai lon hon 0.')
    }

    if (!form.effectiveDate) nextErrors.push('Ngay hieu luc la bat buoc khi gui duyet.')
    if (!form.startTime) nextErrors.push('Gio bat dau la bat buoc.')
    if (!form.endTime) nextErrors.push('Gio ket thuc la bat buoc.')
    if (!Number.isFinite(Number(form.tripInterval)) || Number(form.tripInterval) <= 0) {
      nextErrors.push('Tan suat chay la bat buoc.')
    }
    if (!Number.isFinite(Number(form.estimatedRouteDuration)) || Number(form.estimatedRouteDuration) <= 0) {
      nextErrors.push('Thoi gian hanh trinh la bat buoc.')
    }
    if (!form.operatingDays.length) nextErrors.push('Vui long chon it nhat 1 ngay van hanh.')

    if (form.outboundStops.length < 2) nextErrors.push('Chieu di phai co it nhat 2 tram.')
    if (form.inboundStops.length < 2) nextErrors.push('Chieu ve phai co it nhat 2 tram.')

    if (form.outboundStops.length) {
      if (form.startPoint && form.outboundStops[0]?.stopId !== form.startPoint) {
        nextErrors.push('Chieu di phai bat dau tu dung diem.')
      }
      if (form.endPoint && form.outboundStops[form.outboundStops.length - 1]?.stopId !== form.endPoint) {
        nextErrors.push('Chieu di phai ket thuc tai dung diem.')
      }
    }

    if (form.inboundStops.length) {
      if (form.endPoint && form.inboundStops[0]?.stopId !== form.endPoint) {
        nextErrors.push('Chieu ve phai bat dau tu dung diem.')
      }
      if (form.startPoint && form.inboundStops[form.inboundStops.length - 1]?.stopId !== form.startPoint) {
        nextErrors.push('Chieu ve phai ket thuc tai dung diem.')
      }
    }

    return [...new Set(nextErrors)]
  }

  const saveRoute = async (intent) => {
    if (intent === 'submit_review') {
      const nextErrors = validateBeforeSubmitReview()
      if (nextErrors.length) {
        setErrors(nextErrors)
        showAlert(nextErrors[0], 'Loi')
        return
      }
    }

    setSaving(true)
    setErrors([])
    try {
      const res = isEdit ? await api.put(`/api/admin/routes/${id}`, buildPayload(intent)) : await api.post('/api/admin/routes/create', buildPayload(intent))
      if (res.data.ok) {
        showAlert(res.data.message || 'Luu route thanh cong', 'Thanh cong')
        navigate('/admin/routes')
      }
    } catch (error) {
      const nextErrors = error.response?.data?.errors || []
      if (nextErrors.length) setErrors(nextErrors)
      else showAlert(error.response?.data?.message || 'Loi khi luu route', 'Loi')
    } finally {
      setSaving(false)
    }
  }

  const submitReviewErrors = validateBeforeSubmitReview()
  const canSubmitReview = submitReviewErrors.length === 0

  return (
    <div className="space-y-6 text-black">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admin/routes')} className="rounded-xl p-2 text-gray-500 hover:bg-gray-100"><FaArrowLeft /></button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Chinh sua tuyen' : 'Tao tuyen moi'}</h1>
          <p className="mt-0.5 text-sm text-gray-500">{isEdit ? `Dang sua tuyen ${form.routeCode}` : 'Dien thong tin de tao tuyen xe buyt moi'}</p>
        </div>
      </div>

      {errors.length ? <div className="rounded-xl bg-red-50 px-4 py-3"><p className="mb-1 text-sm font-semibold text-red-700">Vui long kiem tra lai:</p><ul className="list-inside list-disc space-y-0.5 text-sm text-red-600">{errors.map((error, index) => <li key={index}>{error}</li>)}</ul></div> : null}

      <div className="flex gap-1 rounded-2xl bg-gray-100 p-1">
        {[['basic', 'Thong tin co ban'], ['directions', 'Hanh trinh'], ['operation', 'Van hanh']].map(([key, label]) => (
          <button key={key} type="button" onClick={() => setActiveTab(key)} className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${activeTab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{label}</button>
        ))}
      </div>

      <div className={activeTab === 'directions' ? 'overflow-hidden rounded-2xl bg-white shadow-sm' : 'rounded-2xl bg-white p-6 shadow-sm'}>
        {activeTab === 'basic' ? (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div><label className={labelCls}>Ma tuyen *</label><input className={inputCls} value={form.routeCode} onChange={(e) => setField('routeCode', e.target.value.toUpperCase())} placeholder="VD: BUS01" /></div>
              <div><label className={labelCls}>Ten tuyen</label><input className={`${inputCls} text-gray-600`} value={form.routeName} readOnly placeholder="Tu dong tao tu diem dau va diem cuoi" /></div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div><label className={labelCls}>Diem dau</label><select className={inputCls} value={form.startPoint} onChange={(e) => setField('startPoint', e.target.value)}><option value="">-- Chon tram dau --</option>{availableStops.filter((stop) => stop.status === 'ACTIVE').map((stop) => <option key={stop._id} value={stop._id}>{stop.name}{stop.isTerminal ? ' (Dau/cuoi)' : ''}</option>)}</select></div>
              <div><label className={labelCls}>Diem cuoi</label><select className={inputCls} value={form.endPoint} onChange={(e) => setField('endPoint', e.target.value)}><option value="">-- Chon tram cuoi --</option>{availableStops.filter((stop) => stop.status === 'ACTIVE').map((stop) => <option key={stop._id} value={stop._id}>{stop.name}{stop.isTerminal ? ' (Dau/cuoi)' : ''}</option>)}</select></div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div><label className={labelCls}>Gia ve thang (VND)</label><input type="number" min="0" className={inputCls} value={form.monthlyPassPrice} onChange={(e) => setField('monthlyPassPrice', Number(e.target.value))} /></div>
              <div><label className={labelCls}>Cu ly (km)</label><input type="number" min="0" step="0.1" className={inputCls} value={form.distance} onChange={(e) => setField('distance', e.target.value)} placeholder="Bat buoc > 0" /></div>
              <div><label className={labelCls}>Ngay hieu luc</label><input type="date" className={inputCls} value={form.effectiveDate} onChange={(e) => setField('effectiveDate', e.target.value)} /></div>
            </div>
            <div><label className={labelCls}>Mo ta</label><textarea rows={3} className={inputCls} value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="Mo ta ngan ve tuyen..." /></div>
          </div>
        ) : null}

        {activeTab === 'directions' ? (
          <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_520px]">
            <div className="space-y-4 border-r border-gray-100 p-5">
              <DirectionEditor title="1. Tram chieu di" items={form.outboundStops} setItems={(items) => setField('outboundStops', items)} availableStops={availableStops} />
              <DirectionEditor title="2. Tram chieu ve" items={form.inboundStops} setItems={(items) => setField('inboundStops', items)} availableStops={availableStops} />
            </div>
            <div className="self-start p-4"><RouteMap outboundStops={form.outboundStops} inboundStops={form.inboundStops} stopMap={stopMap} /></div>
          </div>
        ) : null}

        {activeTab === 'operation' ? (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div><label className={labelCls}>Gio bat dau</label><input type="time" className={inputCls} value={form.startTime} onChange={(e) => setField('startTime', e.target.value)} /></div>
              <div><label className={labelCls}>Gio ket thuc</label><input type="time" className={inputCls} value={form.endTime} onChange={(e) => setField('endTime', e.target.value)} /></div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div><label className={labelCls}>Tan suat (phut)</label><input type="number" min="1" className={inputCls} value={form.tripInterval} onChange={(e) => setField('tripInterval', Number(e.target.value))} /></div>
              <div><label className={labelCls}>Thoi gian hanh trinh (phut)</label><input type="number" min="1" className={inputCls} value={form.estimatedRouteDuration} onChange={(e) => setField('estimatedRouteDuration', Number(e.target.value))} /></div>
              <div><label className={labelCls}>Thoi gian quay dau (phut)</label><input type="number" min="0" className={inputCls} value={form.turnaroundTime} onChange={(e) => setField('turnaroundTime', Number(e.target.value))} /></div>
            </div>
            <div><label className={labelCls}>Ngay van hanh</label><div className="mt-2 flex flex-wrap gap-2">{OPERATING_DAYS.map(([value, label]) => <button key={value} type="button" onClick={() => setField('operatingDays', form.operatingDays.includes(value) ? form.operatingDays.filter((item) => item !== value) : [...form.operatingDays, value])} className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${form.operatingDays.includes(value) ? 'bg-[#23a983] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{label}</button>)}</div></div>
            <div><label className={labelCls}>Ghi chu van hanh</label><textarea rows={2} className={inputCls} value={form.notes} onChange={(e) => setField('notes', e.target.value)} placeholder="Ghi chu them..." /></div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <button type="button" onClick={() => navigate('/admin/routes')} className="rounded-xl bg-gray-100 px-5 py-2.5 font-semibold text-gray-700 hover:bg-gray-200">Huy</button>
        <div className="flex gap-3">
          <button type="button" onClick={() => saveRoute('save_draft')} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-gray-800 px-5 py-2.5 font-semibold text-white hover:bg-gray-700 disabled:opacity-50"><FaSave /> {saving ? 'Dang luu...' : 'Luu nhap'}</button>
          <div className="flex flex-col items-end gap-1">
            <button
              type="button"
              onClick={() => saveRoute('submit_review')}
              disabled={saving || !canSubmitReview}
              className="inline-flex items-center gap-2 rounded-xl bg-[#23a983] px-5 py-2.5 font-semibold text-white hover:bg-[#1bbd8f] disabled:cursor-not-allowed disabled:opacity-50"
              title={!canSubmitReview ? submitReviewErrors[0] : ''}
            >
              <FaPaperPlane /> {saving ? 'Dang gui...' : 'Gui duyet'}
            </button>
            {!canSubmitReview ? (
              <p className="max-w-[320px] text-right text-xs text-amber-600">
                Chua the gui duyet: {submitReviewErrors[0]}
              </p>
            ) : (
              <p className="text-xs text-emerald-600">Form da du dieu kien de gui duyet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
