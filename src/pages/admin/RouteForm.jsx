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
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})

const outboundIcon = makeIcon('https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png')
const inboundIcon = makeIcon('https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png')
const terminalIcon = makeIcon('https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png')
const makeNumberBadge = (index, color) => L.divIcon({
  className: 'route-stop-order-icon',
  html: `<div style="width:22px;height:22px;border-radius:9999px;background:${color};color:#fff;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,.18);">${index}</div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

const DA_NANG = [16.0544, 108.2022]
const OPERATING_DAYS = [
  { value: 'MONDAY', label: 'Thu 2' },
  { value: 'TUESDAY', label: 'Thu 3' },
  { value: 'WEDNESDAY', label: 'Thu 4' },
  { value: 'THURSDAY', label: 'Thu 5' },
  { value: 'FRIDAY', label: 'Thu 6' },
  { value: 'SATURDAY', label: 'Thu 7' },
  { value: 'SUNDAY', label: 'Chu nhat' },
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
  operatingDays: OPERATING_DAYS.map((item) => item.value),
  notes: '',
  outboundStops: [],
  inboundStops: [],
}

const inputCls = 'w-full rounded-xl border border-gray-200 bg-[#f8fafc] px-3 py-2.5 text-sm outline-none transition focus:border-[#23a983] focus:bg-white'
const labelCls = 'mb-1 block text-sm font-semibold text-gray-700'
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
const todayInputValue = new Date().toISOString().slice(0, 10)

const normalizeText = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'D')

const buildRouteName = (startStop, endStop) => {
  if (!startStop?.name || !endStop?.name) return ''
  return `${startStop.name} - ${endStop.name}`
}

const getDirectionCoords = (items, stopMap) => items
  .map((item) => stopMap.get(String(item.stopId || '')))
  .filter((stop) => stop?.lat != null && stop?.lng != null)
  .map((stop) => [Number(stop.lng), Number(stop.lat)])

const fetchDirectionDistanceKm = async (coords) => {
  if (coords.length < 2) return null
  const path = coords.map(([lng, lat]) => `${lng},${lat}`).join(';')
  const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${path}?overview=false`)
  if (!response.ok) throw new Error('OSRM request failed')
  const data = await response.json()
  const meters = data?.routes?.[0]?.distance
  return Number.isFinite(meters) ? Number((meters / 1000).toFixed(1)) : null
}

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
        <p className="text-xs text-gray-400">Marker va duong tuyen se cap nhat theo danh sach tram hai chieu.</p>
      </div>
      <MapContainer center={center} zoom={12} style={{ height: '420px' }} key={center.join(',')}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
        {outCoords.length > 1 ? <Polyline positions={outCoords} color="#3b82f6" weight={3} /> : null}
        {inCoords.length > 1 ? <Polyline positions={inCoords} color="#f97316" weight={3} dashArray="6,4" /> : null}
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
        {outboundStops.map((item, index) => {
          const stop = stopMap.get(item.stopId)
          if (!stop?.lat || !stop?.lng) return null
          return (
            <Marker
              key={`out-order-${item.stopId}-${index}`}
              position={[Number(stop.lat), Number(stop.lng)]}
              icon={makeNumberBadge(index + 1, '#2563eb')}
              interactive={false}
              zIndexOffset={1000}
            />
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
        {inboundStops.map((item, index) => {
          const stop = stopMap.get(item.stopId)
          if (!stop?.lat || !stop?.lng) return null
          return (
            <Marker
              key={`in-order-${item.stopId}-${index}`}
              position={[Number(stop.lat), Number(stop.lng)]}
              icon={makeNumberBadge(index + 1, '#ea580c')}
              interactive={false}
              zIndexOffset={1000}
            />
          )
        })}
      </MapContainer>
    </div>
  )
}

function DirectionEditor({ title, description, items, setItems, availableStops }) {
  const [search, setSearch] = useState('')
  const filteredStops = availableStops.filter((stop) => (
    !items.some((item) => item.stopId === stop._id)
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

  const patchItem = (index, patch) => setItems(items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)))
  const moveItem = (index, offset) => {
    const target = index + offset
    if (target < 0 || target >= items.length) return
    const next = [...items]
    ;[next[index], next[target]] = [next[target], next[index]]
    setItems(next)
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-start justify-between border-b border-gray-100 px-4 py-3">
        <div>
          <p className="text-sm font-bold text-gray-800">{title}</p>
          <p className="text-xs text-gray-400">{description}</p>
        </div>
        <span className="text-xs font-medium text-gray-500">Số trạm: {items.length}</span>
      </div>
      <div className="px-4 py-3">
        <p className="mb-1 text-xs font-semibold text-gray-600">Tìm trạm</p>
        <div className="flex gap-2">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nhập tên trạm hoặc địa chỉ..." className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#23a983] focus:bg-white" />
          <button type="button" onClick={() => filteredStops[0] && addStop(filteredStops[0])} className="rounded-lg border border-[#23a983] px-3 py-2 text-xs font-semibold text-[#23a983] hover:bg-[#f3fffa]">+ Thêm trạm</button>
        </div>
        {search && filteredStops.length ? <div className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-gray-200">{filteredStops.slice(0, 8).map((stop) => <button key={stop._id} type="button" onClick={() => addStop(stop)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[#f3fffa]"><span>{stop.name}</span><span className="max-w-[160px] truncate text-xs text-gray-400">{stop.address}</span></button>)}</div> : null}
        {!items.length ? <p className="mt-2 text-xs text-gray-400">Chưa chọn trạm.</p> : null}
      </div>
      {items.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-y border-gray-100 bg-gray-50 text-left font-semibold text-gray-500">
                <th className="px-4 py-2">Trạm</th>
                <th className="px-2 py-2 text-center">Phút từ đầu</th>
                <th className="px-2 py-2 text-center">Km từ đầu</th>
                <th className="px-2 py-2 text-center">Tác vụ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item, index) => (
                <tr key={`${item.stopId}-${index}`} className="hover:bg-gray-50">
                  <td className="min-w-[170px] px-4 py-2"><div className="flex items-start gap-2"><span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#23a983] text-[10px] font-bold text-white">{index + 1}</span><div><p className="font-semibold text-gray-800">{item.name}</p><p className="text-gray-400">{item.address}</p></div></div></td>
                  <td className="px-2 py-2"><input type="number" min="0" value={item.estimatedMinutesFromStart} onChange={(event) => patchItem(index, { estimatedMinutesFromStart: Number(event.target.value) })} className="w-16 rounded border border-gray-200 bg-gray-50 px-1.5 py-1 text-center" /></td>
                  <td className="px-2 py-2"><input type="number" min="0" step="0.1" value={item.distanceFromStart} onChange={(event) => patchItem(index, { distanceFromStart: Number(event.target.value) })} className="w-16 rounded border border-gray-200 bg-gray-50 px-1.5 py-1 text-center" /></td>
                  <td className="px-2 py-2"><div className="flex items-center gap-0.5"><button type="button" onClick={() => moveItem(index, -1)} disabled={index === 0} className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30"><FaArrowUp size={10} /></button><button type="button" onClick={() => moveItem(index, 1)} disabled={index === items.length - 1} className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30"><FaArrowDown size={10} /></button><button type="button" onClick={() => setItems(items.filter((_, itemIndex) => itemIndex !== index))} className="rounded p-1 text-red-400 hover:bg-red-50"><FaTimes size={10} /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <div className="px-4 pb-4 text-center text-xs text-gray-400">Chưa có trạm nào trong hành trình.</div>}
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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState([])
  const [activeTab, setActiveTab] = useState('basic')
  const [distanceLoading, setDistanceLoading] = useState(false)
  const stopMap = useMemo(() => new Map(availableStops.map((stop) => [String(stop._id), stop])), [availableStops])

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
              operatingDays: route.operationSettings?.operatingDays?.length ? route.operationSettings.operatingDays : OPERATING_DAYS.map((item) => item.value),
              notes: route.operationSettings?.notes || '',
              outboundStops: (route.outboundStops || []).map((stop) => ({ stopId: stop.stopRefId || stop.id || stop.stopId, name: stop.name || '', address: stop.address || '', estimatedMinutesFromStart: stop.estimatedMinutesFromStart ?? 0, distanceFromStart: stop.distanceFromStart ?? 0, pickupAllowed: stop.pickupAllowed !== false, dropoffAllowed: stop.dropoffAllowed !== false, status: stop.status || 'ACTIVE' })),
              inboundStops: (route.inboundStops || []).map((stop) => ({ stopId: stop.stopRefId || stop.id || stop.stopId, name: stop.name || '', address: stop.address || '', estimatedMinutesFromStart: stop.estimatedMinutesFromStart ?? 0, distanceFromStart: stop.distanceFromStart ?? 0, pickupAllowed: stop.pickupAllowed !== false, dropoffAllowed: stop.dropoffAllowed !== false, status: stop.status || 'ACTIVE' })),
            })
          }
        }
      } catch (error) {
        showAlert(normalizeText(error.response?.data?.message || 'Không thể tải dữ liệu tuyến'), 'Lỗi')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [id, isEdit, showAlert])

  useEffect(() => {
    const startStop = stopMap.get(String(form.startPoint || ''))
    const endStop = stopMap.get(String(form.endPoint || ''))
    const nextRouteName = buildRouteName(startStop, endStop)
    setForm((prev) => (prev.routeName === nextRouteName ? prev : { ...prev, routeName: nextRouteName }))
  }, [form.startPoint, form.endPoint, stopMap])

  const setField = useCallback((field, value) => setForm((prev) => ({ ...prev, [field]: value })), [])
  const setEndpointField = useCallback((field, value) => {
    setForm((prev) => {
      const otherField = field === 'startPoint' ? 'endPoint' : 'startPoint'
      if (value && prev[otherField] && value === prev[otherField]) {
        showAlert('Điểm đầu và điểm cuối không được trùng nhau.', 'Lỗi')
        return prev
      }
      return { ...prev, [field]: value }
    })
  }, [showAlert])

  useEffect(() => {
    let cancelled = false
    const outboundCoords = getDirectionCoords(form.outboundStops, stopMap)
    const inboundCoords = getDirectionCoords(form.inboundStops, stopMap)

    if (outboundCoords.length < 2 && inboundCoords.length < 2) return undefined

    const timer = setTimeout(async () => {
      try {
        setDistanceLoading(true)
        const [outboundDistance, inboundDistance] = await Promise.all([
          fetchDirectionDistanceKm(outboundCoords).catch(() => null),
          fetchDirectionDistanceKm(inboundCoords).catch(() => null),
        ])

        if (cancelled) return

        const candidates = [outboundDistance, inboundDistance].filter((value) => Number.isFinite(value))
        if (!candidates.length) return

        const nextDistance = String(Math.max(...candidates))
        setForm((prev) => (String(prev.distance) === nextDistance ? prev : { ...prev, distance: nextDistance }))
      } finally {
        if (!cancelled) setDistanceLoading(false)
      }
    }, 500)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [form.outboundStops, form.inboundStops, stopMap])

  const validateForm = useCallback((intent) => {
    const strict = intent === 'submit_review'
    const nextErrors = []
    const distance = Number(form.distance)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (!form.routeCode.trim()) nextErrors.push('Ma tuyen la bat buoc.')
    if (!Number.isFinite(distance) || distance <= 0) nextErrors.push('Cu ly la bat buoc va phai lon hon 0.')
    if (form.effectiveDate) {
      const effectiveDate = new Date(`${form.effectiveDate}T00:00:00`)
      if (Number.isNaN(effectiveDate.getTime())) nextErrors.push('Ngay hieu luc khong hop le.')
      else if (effectiveDate < today) nextErrors.push('Ngay hieu luc khong duoc o trong qua khu.')
    }
    if (form.startPoint && form.endPoint && form.startPoint === form.endPoint) nextErrors.push('Diem dau va diem cuoi khong duoc trung nhau.')

    const validateDirection = (label, items) => {
      const seen = new Set()
      let previousMinutes = -1
      let previousDistance = -1
      items.forEach((item, index) => {
        if (!item.stopId) {
          nextErrors.push(`Tram thu ${index + 1} cua chieu ${label} thieu stopId.`)
          return
        }
        if (seen.has(item.stopId)) nextErrors.push(`Chieu ${label} khong duoc chua tram trung lap.`)
        seen.add(item.stopId)
        const minutes = Number(item.estimatedMinutesFromStart ?? 0)
        const currentDistance = Number(item.distanceFromStart ?? 0)
        if (!Number.isFinite(minutes) || minutes < 0) nextErrors.push(`Estimated minutes cua chieu ${label} khong hop le.`)
        else if (minutes < previousMinutes) nextErrors.push(`Estimated minutes cua chieu ${label} phai tang dan theo hanh trinh.`)
        if (!Number.isFinite(currentDistance) || currentDistance < 0) nextErrors.push(`Distance tu dau tuyen cua chieu ${label} khong hop le.`)
        else if (currentDistance < previousDistance) nextErrors.push(`Distance tu dau tuyen cua chieu ${label} phai tang dan theo hanh trinh.`)
        previousMinutes = minutes
        previousDistance = currentDistance
      })
    }

    validateDirection('di', form.outboundStops)
    validateDirection('ve', form.inboundStops)

    if (strict) {
      if (!form.startPoint) nextErrors.push('Điểm đầu là bắt buộc.')
      if (!form.endPoint) nextErrors.push('Điểm cuối là bắt buộc.')
      if (!form.routeName) nextErrors.push('Không thể tạo tên tuyến. Vui lòng chọn đủ điểm đầu và điểm cuối hợp lệ.')
      if (!form.effectiveDate) nextErrors.push('Ngày hiệu lực là bắt buộc khi gửi duyệt.')
      if (!form.startTime || !form.endTime) nextErrors.push('Phải cấu hình đầy đủ giờ vận hành.')
      else if (!timeRegex.test(form.startTime) || !timeRegex.test(form.endTime)) nextErrors.push('Giờ vận hành phải đúng định dạng HH:mm.')
      else if (form.startTime >= form.endTime) nextErrors.push('Giờ bắt đầu phải sớm hơn giờ kết thúc.')
      if (!Number.isFinite(Number(form.tripInterval)) || Number(form.tripInterval) <= 0) nextErrors.push('Phải nhập tần suất hợp lệ.')
      if (!Number.isFinite(Number(form.estimatedRouteDuration)) || Number(form.estimatedRouteDuration) <= 0) nextErrors.push('Phải nhập thời gian hành trình hợp lệ.')
      if (!form.operatingDays.length) nextErrors.push('Phải chọn ít nhất 1 ngày vận hành.')
      if (form.outboundStops.length < 2) nextErrors.push('Chiều đi phải có ít nhất 2 trạm.')
      if (form.inboundStops.length < 2) nextErrors.push('Chiều về phải có ít nhất 2 trạm.')
      if (form.outboundStops.length) {
         if (form.outboundStops[0]?.stopId !== form.startPoint) nextErrors.push('Chiều đi phải bắt đầu từ đúng điểm.')
         if (form.outboundStops[form.outboundStops.length - 1]?.stopId !== form.endPoint) nextErrors.push('Chiều đi phải kết thúc tại đúng điểm.')
      }
      if (form.inboundStops.length) {
         if (form.inboundStops[0]?.stopId !== form.endPoint) nextErrors.push('Chiều về phải bắt đầu từ đúng điểm.')
         if (form.inboundStops[form.inboundStops.length - 1]?.stopId !== form.startPoint) nextErrors.push('Chiều về phải kết thúc tại đúng điểm.')
      }
    }

    return [...new Set(nextErrors.map(normalizeText))]
  }, [form])

  const buildPayload = (intent) => {
    const outboundStops = form.outboundStops.map((stop) => ({ stopId: stop.stopId, estimatedMinutesFromStart: Number(stop.estimatedMinutesFromStart) || 0, distanceFromStart: Number(stop.distanceFromStart) || 0, pickupAllowed: stop.pickupAllowed !== false, dropoffAllowed: stop.dropoffAllowed !== false, status: stop.status || 'ACTIVE' }))
    const inboundStops = form.inboundStops.map((stop) => ({ stopId: stop.stopId, estimatedMinutesFromStart: Number(stop.estimatedMinutesFromStart) || 0, distanceFromStart: Number(stop.distanceFromStart) || 0, pickupAllowed: stop.pickupAllowed !== false, dropoffAllowed: stop.dropoffAllowed !== false, status: stop.status || 'ACTIVE' }))
    return {
      intent,
      routeCode: form.routeCode.trim().toUpperCase(),
      routeName: form.routeName.trim(),
      startPoint: form.startPoint,
      endPoint: form.endPoint,
      description: form.description.trim(),
      effectiveDate: form.effectiveDate,
      distance: form.distance,
      startTime: form.startTime,
      endTime: form.endTime,
      tripInterval: form.tripInterval,
      estimatedRouteDuration: form.estimatedRouteDuration,
      turnaroundTime: form.turnaroundTime,
      operatingDays: form.operatingDays,
      notes: form.notes.trim(),
      outboundStops,
      inboundStops,
      outboundStopsJson: JSON.stringify(outboundStops),
      inboundStopsJson: JSON.stringify(inboundStops),
    }
  }

  const saveRoute = async (intent) => {
    const validationErrors = validateForm(intent)
    if (validationErrors.length) {
      setErrors(validationErrors)
      showAlert(validationErrors[0], 'Lỗi')
      return
    }
    setSaving(true)
    setErrors([])
    try {
      const response = isEdit ? await api.put(`/api/admin/routes/${id}`, buildPayload(intent)) : await api.post('/api/admin/routes/create', buildPayload(intent))
      if (response.data.ok) {
        showAlert(normalizeText(response.data.message || 'Lưu tuyến thành công'), 'Thành công')
        navigate('/admin/routes')
      }
    } catch (error) {
      const apiErrors = (error.response?.data?.errors || []).map(normalizeText)
      if (apiErrors.length) {
        setErrors(apiErrors)
        showAlert(apiErrors[0], 'Lỗi')
      } else {
        const detail = normalizeText(error.response?.data?.details || '')
        const message = normalizeText(error.response?.data?.message || 'Lỗi khi lưu tuyến')
        showAlert(detail ? `${message}: ${detail}` : message, 'Lỗi')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex h-64 items-center justify-center text-gray-500">Đang tải...</div>

  const submitReviewErrors = validateForm('submit_review')
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
      {errors.length ? <div className="rounded-xl bg-red-50 px-4 py-3"><p className="mb-1 text-sm font-semibold text-red-700">Vui lòng kiểm tra lại:</p><ul className="list-inside list-disc space-y-0.5 text-sm text-red-600">{errors.map((error, index) => <li key={index}>{error}</li>)}</ul></div> : null}
      <div className="flex gap-1 rounded-2xl bg-gray-100 p-1">{[['basic', 'Thông tin cơ bản'], ['directions', 'Hành trình'], ['operation', 'Vận hành']].map(([key, label]) => <button key={key} type="button" onClick={() => setActiveTab(key)} className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${activeTab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{label}</button>)}</div>
      <div className={activeTab === 'directions' ? 'overflow-hidden rounded-2xl bg-white shadow-sm' : 'rounded-2xl bg-white p-6 shadow-sm'}>
        {activeTab === 'basic' ? <div className="space-y-5"><div className="grid gap-4 md:grid-cols-2"><div><label className={labelCls}>Mã tuyến *</label><input className={inputCls} value={form.routeCode} onChange={(event) => setField('routeCode', event.target.value.toUpperCase())} placeholder="VD: BUS01" /></div><div><label className={labelCls}>Tên tuyến</label><input className={`${inputCls} text-gray-600`} value={form.routeName || 'Tự động tạo từ điểm đầu và điểm cuối'} readOnly /></div></div><div className="grid gap-4 md:grid-cols-2"><div><label className={labelCls}>Điểm đầu</label><select className={inputCls} value={form.startPoint} onChange={(event) => setEndpointField('startPoint', event.target.value)}><option value="">-- Chọn trạm đầu --</option>{availableStops.map((stop) => <option key={stop._id} value={stop._id}>{stop.name}{stop.isTerminal ? ' (Đầu/cuối)' : ''}</option>)}</select></div><div><label className={labelCls}>Điểm cuối</label><select className={inputCls} value={form.endPoint} onChange={(event) => setEndpointField('endPoint', event.target.value)}><option value="">-- Chọn trạm cuối --</option>{availableStops.map((stop) => <option key={stop._id} value={stop._id}>{stop.name}{stop.isTerminal ? ' (Đầu/cuối)' : ''}</option>)}</select></div></div><div className="grid gap-4 md:grid-cols-2"><div><label className={labelCls}>Cự ly (km)</label><input type="number" min="0.1" step="0.1" className={`${inputCls} ${distanceLoading ? 'text-gray-500' : ''}`} value={form.distance} onChange={(event) => setField('distance', event.target.value)} placeholder="Tự động tính theo hành trình" /><p className="mt-1 text-xs text-gray-400">{distanceLoading ? 'Đang tính cự ly theo đường đi...' : 'Cự ly sẽ tự động cập nhật theo danh sách trạm.'}</p></div><div><label className={labelCls}>Ngày hiệu lực</label><input type="date" min={todayInputValue} className={inputCls} value={form.effectiveDate} onChange={(event) => setField('effectiveDate', event.target.value)} /></div></div><div><label className={labelCls}>Mô tả</label><textarea rows={3} className={inputCls} value={form.description} onChange={(event) => setField('description', event.target.value)} placeholder="Mô tả ngắn về tuyến..." /></div></div> : null}
        {activeTab === 'directions' ? <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_420px]"><div className="space-y-4 border-r border-gray-100 p-5"><DirectionEditor title="2. Trạm chiều đi" description="Quản lý danh sách trạm theo đúng thứ tự xe đi qua của chiều đi." items={form.outboundStops} setItems={(items) => setField('outboundStops', items)} availableStops={availableStops} /><DirectionEditor title="3. Trạm chiều về" description="Quản lý danh sách trạm theo đúng thứ tự xe đi qua của chiều về." items={form.inboundStops} setItems={(items) => setField('inboundStops', items)} availableStops={availableStops} /></div><div className="self-start p-4"><RouteMap outboundStops={form.outboundStops} inboundStops={form.inboundStops} stopMap={stopMap} /></div></div> : null}
        {activeTab === 'operation' ? <div className="space-y-5"><div className="grid gap-4 md:grid-cols-2"><div><label className={labelCls}>Giờ bắt đầu</label><input type="time" className={inputCls} value={form.startTime} onChange={(event) => setField('startTime', event.target.value)} /></div><div><label className={labelCls}>Giờ kết thúc</label><input type="time" className={inputCls} value={form.endTime} onChange={(event) => setField('endTime', event.target.value)} /></div></div><div className="grid gap-4 md:grid-cols-3"><div><label className={labelCls}>Tần suất (phút)</label><input type="number" min="1" className={inputCls} value={form.tripInterval} onChange={(event) => setField('tripInterval', Number(event.target.value))} /></div><div><label className={labelCls}>Thời gian hành trình (phút)</label><input type="number" min="1" className={inputCls} value={form.estimatedRouteDuration} onChange={(event) => setField('estimatedRouteDuration', Number(event.target.value))} /></div><div><label className={labelCls}>Thời gian quay đầu (phút)</label><input type="number" min="0" className={inputCls} value={form.turnaroundTime} onChange={(event) => setField('turnaroundTime', Number(event.target.value))} /></div></div><div><label className={labelCls}>Ngày vận hành</label><div className="mt-2 flex flex-wrap gap-2">{OPERATING_DAYS.map((day) => <button key={day.value} type="button" onClick={() => setForm((prev) => ({ ...prev, operatingDays: prev.operatingDays.includes(day.value) ? prev.operatingDays.filter((item) => item !== day.value) : [...prev.operatingDays, day.value] }))} className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${form.operatingDays.includes(day.value) ? 'bg-[#23a983] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{day.label}</button>)}</div></div><div><label className={labelCls}>Ghi chú vận hành</label><textarea rows={2} className={inputCls} value={form.notes} onChange={(event) => setField('notes', event.target.value)} placeholder="Ghi chú thêm..." /></div></div> : null}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm"><button type="button" onClick={() => navigate('/admin/routes')} className="rounded-xl bg-gray-100 px-5 py-2.5 font-semibold text-gray-700 hover:bg-gray-200">Hủy</button><div className="flex gap-3"><button type="button" onClick={() => saveRoute('save_draft')} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-gray-800 px-5 py-2.5 font-semibold text-white hover:bg-gray-700 disabled:opacity-50"><FaSave /> {saving ? 'Đang lưu...' : 'Lưu nháp'}</button><div className="flex flex-col items-end gap-1"><button type="button" onClick={() => saveRoute('submit_review')} disabled={saving || !canSubmitReview} title={!canSubmitReview ? submitReviewErrors[0] : ''} className="inline-flex items-center gap-2 rounded-xl bg-[#23a983] px-5 py-2.5 font-semibold text-white hover:bg-[#1bbd8f] disabled:cursor-not-allowed disabled:opacity-50"><FaPaperPlane /> {saving ? 'Đang gửi...' : 'Gửi duyệt'}</button>{!canSubmitReview ? <p className="max-w-[320px] text-right text-xs text-amber-600">Chưa thể gửi duyệt: {submitReviewErrors[0]}</p> : null}</div></div></div>
    </div>
  )
}
