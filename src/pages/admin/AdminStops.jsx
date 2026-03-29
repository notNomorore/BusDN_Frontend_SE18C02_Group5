import React, { useState, useEffect, useCallback } from 'react'
import { MapContainer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { FaPlus, FaEdit, FaMapMarkerAlt, FaExternalLinkAlt, FaToggleOn, FaToggleOff, FaTimes, FaSearch, FaBolt } from 'react-icons/fa'
import api from '../../utils/api'
import { useDialog } from '../../context/DialogContext'
import BaseMapTileLayer from '../../components/map/BaseMapTileLayer'

// Fix leaflet default icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const inputCls = 'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition focus:border-[#23a983] focus:bg-white'
const labelCls = 'mb-1 block text-xs font-semibold text-gray-600'
const EMPTY_FORM = { name: '', address: '', lat: '', lng: '', isTerminal: false, status: 'ACTIVE' }
const DA_NANG = [16.0544, 108.2022]
const DA_NANG_BOUNDS = L.latLngBounds(
  [15.97, 107.97],
  [16.21, 108.31],
)

function parseCoord(value) {
  if (value === null || value === undefined || value === '') return null
  const normalized = String(value).trim().replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function formatCoord(value) {
  return Number(value).toFixed(6)
}

function isWithinDaNang(lat, lng) {
  return DA_NANG_BOUNDS.contains([lat, lng])
}

function buildStopNameFromResult(result) {
  const nameParts = []
  const address = result?.address || {}
  const primary = address.road || address.pedestrian || address.neighbourhood || address.suburb || address.hamlet
  const district = address.city_district || address.town || address.city

  if (primary) nameParts.push(primary)
  if (district && !nameParts.includes(district)) nameParts.push(district)
  if (!nameParts.length && result?.name) nameParts.push(result.name)
  if (!nameParts.length && result?.display_name) {
    nameParts.push(String(result.display_name).split(',')[0].trim())
  }

  return nameParts.join(' - ').trim()
}

function buildAddressFromResult(result) {
  if (result?.display_name) return String(result.display_name).trim()
  if (result?.name) return String(result.name).trim()
  return ''
}

async function geocodeInDaNang(query) {
  const scopedQuery = `${query}, Da Nang, Viet Nam`
  const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=1&bounded=1&viewbox='
    + encodeURIComponent('107.97,16.21,108.31,15.97')
    + '&q='
    + encodeURIComponent(scopedQuery)

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error('Khong the tim dia diem.')
  }

  const results = await response.json()
  if (!Array.isArray(results) || !results.length) {
    throw new Error('Khong tim thay dia diem phu hop trong khu vuc Da Nang.')
  }

  const bestMatch = results.find((item) => {
    const lat = parseCoord(item.lat)
    const lng = parseCoord(item.lon)
    return lat !== null && lng !== null && isWithinDaNang(lat, lng)
  })

  if (!bestMatch) {
    throw new Error('Dia diem tim duoc nam ngoai khu vuc Da Nang.')
  }

  const lat = parseCoord(bestMatch.lat)
  const lng = parseCoord(bestMatch.lon)
  if (lat === null || lng === null) {
    throw new Error('Ket qua tim kiem khong co toa do hop le.')
  }

  return {
    lat,
    lng,
    suggestedName: buildStopNameFromResult(bestMatch),
    suggestedAddress: buildAddressFromResult(bestMatch),
  }
}

function MapViewport({ lat, lng }) {
  const map = useMap()

  useEffect(() => {
    const nextLat = parseCoord(lat)
    const nextLng = parseCoord(lng)
    if (nextLat !== null && nextLng !== null && isWithinDaNang(nextLat, nextLng)) {
      map.setView([nextLat, nextLng], 16)
    } else {
      map.fitBounds(DA_NANG_BOUNDS)
    }
  }, [lat, lng, map])

  return null
}

function MapPicker({ lat, lng, onChange }) {
  const parsedLat = parseCoord(lat)
  const parsedLng = parseCoord(lng)
  const pos = parsedLat !== null && parsedLng !== null ? [parsedLat, parsedLng] : null

  function ClickHandler() {
    useMapEvents({
      click(e) {
        if (!isWithinDaNang(e.latlng.lat, e.latlng.lng)) return
        onChange(formatCoord(e.latlng.lat), formatCoord(e.latlng.lng))
      },
    })
    return null
  }

  return (
    <MapContainer
      center={pos || DA_NANG}
      zoom={13}
      style={{ height: '220px', width: '100%', borderRadius: '10px', zIndex: 0 }}
      maxBounds={DA_NANG_BOUNDS.pad(0.25)}
    >
      <BaseMapTileLayer />
      <ClickHandler />
      <MapViewport lat={lat} lng={lng} />
      {pos && (
        <Marker
          position={pos}
          draggable
          eventHandlers={{
            dragend(event) {
              const nextPos = event.target.getLatLng()
              if (!isWithinDaNang(nextPos.lat, nextPos.lng)) {
                event.target.setLatLng(pos)
                return
              }
              onChange(formatCoord(nextPos.lat), formatCoord(nextPos.lng))
            },
          }}
        />
      )}
    </MapContainer>
  )
}

function StopFormModal({ stop, onClose, onSaved }) {
  const { showAlert } = useDialog()
  const isEdit = Boolean(stop?._id)
  const [form, setForm] = useState(stop ? {
    name: stop.name || '',
    address: stop.address || '',
    lat: stop.lat != null ? String(stop.lat) : '',
    lng: stop.lng != null ? String(stop.lng) : '',
    isTerminal: stop.isTerminal || false,
    status: stop.status || 'ACTIVE',
  } : EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [geoSearch, setGeoSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const [geoError, setGeoError] = useState('')
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))

  const syncCoords = useCallback((lat, lng) => {
    setForm((prev) => ({ ...prev, lat, lng }))
    setGeoError('')
  }, [])

  const handleGeoSearch = async ({ quickFill = false } = {}) => {
    const query = (geoSearch || form.address || form.name).trim()
    if (!query) {
      setGeoError('Vui long nhap dia chi hoac ten dia diem de tim tren ban do.')
      return
    }
    setSearching(true)
    setGeoError('')
    try {
      const match = await geocodeInDaNang(query)
      syncCoords(formatCoord(match.lat), formatCoord(match.lng))
      if (quickFill) {
        setForm((prev) => ({
          ...prev,
          name: prev.name.trim() ? prev.name : (match.suggestedName || ''),
          address: match.suggestedAddress || prev.address,
          lat: formatCoord(match.lat),
          lng: formatCoord(match.lng),
        }))
        if (match.suggestedAddress) setGeoSearch(match.suggestedAddress)
      }
    } catch (error) {
      const message = error?.message || 'Loi khi tim kiem dia diem'
      setGeoError(message)
    } finally {
      setSearching(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return showAlert('Ten tram la bat buoc', 'Loi')
    const lat = parseCoord(form.lat)
    const lng = parseCoord(form.lng)
    if (lat === null || lng === null) return showAlert('Vui long nhap day du vi do va kinh do hop le', 'Loi')
    if (!isWithinDaNang(lat, lng)) return showAlert('Vi tri tram phai nam trong khu vuc Da Nang', 'Loi')
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        address: form.address.trim(),
        lat,
        lng,
        isTerminal: form.isTerminal,
        status: form.status,
      }
      const url = isEdit ? '/api/admin/stops/' + stop._id : '/api/admin/stops/create'
      const res = isEdit ? await api.put(url, payload) : await api.post(url, payload)
      if (res.data.ok) {
        onSaved()
        onClose()
      }
    } catch (err) {
      showAlert(err.response?.data?.message || 'Loi khi luu tram', 'Loi')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-bold text-gray-900">{isEdit ? 'Chinh sua tram' : 'Them Tram Moi'}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"><FaTimes size={14} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="grid max-h-[calc(92vh-88px)] grid-cols-1 overflow-y-auto lg:grid-cols-2">
            {/* Left: form fields */}
            <div className="space-y-3 px-6 py-4 lg:border-r lg:border-gray-100">
              <div>
                <label className={labelCls}>Ten tram *</label>
                <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="VD: Tram Nguyen Van Linh" />
              </div>
              <div>
                <label className={labelCls}>Dia chi</label>
                <input className={inputCls} value={form.address} onChange={e => set('address', e.target.value)} placeholder="So nha, duong, quan..." />
              </div>
              <div>
                <label className={labelCls}>Tim dia diem</label>
                <div className="flex gap-2">
                  <input className={inputCls} value={geoSearch} onChange={e => setGeoSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleGeoSearch())}
                    placeholder="Nhap dia chi hoac ten dia diem..." />
                  <button type="button" onClick={handleGeoSearch} disabled={searching}
                    className="flex-shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                    <FaSearch size={12} />
                  </button>
                  <button type="button" onClick={() => handleGeoSearch({ quickFill: true })} disabled={searching}
                    className="flex-shrink-0 rounded-lg border border-[#2563eb] bg-white px-3 py-2 text-sm font-semibold text-[#2563eb] hover:bg-blue-50 disabled:opacity-50">
                    <span className="inline-flex items-center gap-2 whitespace-nowrap"><FaBolt size={11} /> Them tram nhanh</span>
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-400">Chi tim trong khu vuc Da Nang. Nut "Them tram nhanh" se tu dien ten tram, dia chi va toa do tu ket qua tim kiem.</p>
                {geoError && <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">{geoError}</div>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Vi do (lat) *</label>
                  <input type="number" step="any" className={inputCls} value={form.lat} onChange={e => set('lat', e.target.value)} placeholder="16.0544" />
                </div>
                <div>
                  <label className={labelCls}>Kinh do (lng) *</label>
                  <input type="number" step="any" className={inputCls} value={form.lng} onChange={e => set('lng', e.target.value)} placeholder="108.2022" />
                </div>
              </div>
              {isEdit && (
                <div>
                  <label className={labelCls}>Trang thai</label>
                  <select className={inputCls} value={form.status} onChange={e => set('status', e.target.value)}>
                    <option value="ACTIVE">Dang hoat dong</option>
                    <option value="INACTIVE">Tam ngung</option>
                  </select>
                </div>
              )}
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.isTerminal} onChange={e => set('isTerminal', e.target.checked)} className="h-4 w-4 accent-[#23a983]" />
                Tram dau/cuoi tuyen
              </label>
            </div>
            {/* Right: map */}
            <div className="px-6 py-4">
              <label className={labelCls}>Ban do</label>
              <p className="mb-2 text-xs text-gray-400">Click de chon vi tri. Keo marker de tinh chinh toa do.</p>
              <MapPicker lat={form.lat} lng={form.lng} onChange={syncCoords} />
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
            <button type="button" onClick={onClose} className="rounded-lg bg-gray-100 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200">Huy</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-[#23a983] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1bbd8f] disabled:opacity-50">
              {saving ? 'Dang luu...' : isEdit ? 'Cap nhat' : 'Tao tram'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function StopDetailPanel({ stop, onClose, onEdit, onToggle, toggling }) {
  if (!stop) return null
  const mapsUrl = stop.lat && stop.lng ? 'https://www.google.com/maps?q=' + stop.lat + ',' + stop.lng : null
  const isActive = stop.status === 'ACTIVE'
  return (
    <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-xs flex-col bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <h3 className="text-sm font-bold text-gray-900">Chi tiet tram</h3>
        <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><FaTimes size={13} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Ten tram</p>
          <p className="mt-0.5 text-base font-bold text-gray-900">{stop.name}</p>
        </div>
        {stop.address && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Dia chi</p>
            <p className="mt-0.5 text-sm text-gray-700">{stop.address}</p>
          </div>
        )}
        {(stop.lat || stop.lng) && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Toa do</p>
            <p className="mt-0.5 text-sm text-gray-700">{stop.lat}, {stop.lng}</p>
          </div>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          {stop.isTerminal && <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-600">Dau/cuoi tuyen</span>}
          <span className={isActive ? 'rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-bold text-green-700' : 'rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-500'}>
            {isActive ? 'Hoat dong' : 'Tam ngung'}
          </span>
        </div>
        {stop.lat && stop.lng && (
          <div className="overflow-hidden rounded-lg border border-gray-100">
            <MapContainer center={[parseFloat(stop.lat), parseFloat(stop.lng)]} zoom={15} style={{ height: '160px' }} zoomControl={false} dragging={false} scrollWheelZoom={false}>
              <BaseMapTileLayer />
              <Marker position={[parseFloat(stop.lat), parseFloat(stop.lng)]} />
            </MapContainer>
          </div>
        )}
        {mapsUrl && (
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100">
            <FaMapMarkerAlt size={11} /> Xem tren Google Maps <FaExternalLinkAlt size={10} />
          </a>
        )}
      </div>
      <div className="border-t border-gray-100 p-4 flex gap-2">
        <button onClick={() => onEdit(stop)} className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200">
          <FaEdit size={12} /> Chinh sua
        </button>
        <button onClick={() => onToggle(stop)} disabled={toggling}
          className={isActive ? 'flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-100 disabled:opacity-50' : 'flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-semibold text-green-700 hover:bg-green-100 disabled:opacity-50'}>
          {isActive ? <FaToggleOff size={12} /> : <FaToggleOn size={12} />}
          {isActive ? 'Tam ngung' : 'Kich hoat'}
        </button>
      </div>
    </div>
  )
}

export default function AdminStops() {
  const { showAlert, showConfirm } = useDialog()
  const [stops, setStops] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedStop, setSelectedStop] = useState(null)
  const [editStop, setEditStop] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [toggling, setToggling] = useState(false)

  const fetchStops = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (search) params.q = search
      if (statusFilter) params.status = statusFilter
      const res = await api.get('/api/admin/stops', { params })
      if (res.data.ok) setStops(res.data.stops || [])
    } catch {
      showAlert('Khong the tai danh sach tram', 'Loi')
    } finally {
      setLoading(false)
    }
  }, [search, showAlert, statusFilter])

  useEffect(() => { fetchStops() }, [fetchStops])

  const handleToggle = async (stop) => {
    const isActive = stop.status === 'ACTIVE'
    showConfirm(
      (isActive ? 'Tam ngung' : 'Kich hoat') + ' tram ' + stop.name + '?',
      async () => {
        setToggling(true)
        try {
          const res = await api.post('/api/admin/stops/' + stop._id + '/toggle-status')
          if (res.data.ok) {
            fetchStops()
            if (selectedStop?._id === stop._id) {
              setSelectedStop(res.data.stop || { ...selectedStop, status: isActive ? 'INACTIVE' : 'ACTIVE' })
            }
          }
        } catch (err) {
          showAlert(err.response?.data?.message || 'Loi khi cap nhat trang thai', 'Loi')
        } finally {
          setToggling(false)
        }
      },
      isActive ? 'Tam ngung tram' : 'Kich hoat tram'
    )
  }

  const total = stops.length
  const activeCount = stops.filter(s => s.status === 'ACTIVE').length
  const terminalCount = stops.filter(s => s.isTerminal).length

  return (
    <div className="space-y-4 text-black">
      <div className="admin-page-head">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Quan ly tram dung</h1>
          <p className="mt-0.5 text-xs text-gray-500">Danh sach cac tram dung xe buyt</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-lg bg-[#23a983] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1bbd8f]">
          <FaPlus size={12} /> + Them Tram Moi
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="admin-surface rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{total}</p>
          <p className="mt-0.5 text-xs text-gray-500">Tong tram</p>
        </div>
        <div className="admin-surface rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
          <p className="mt-0.5 text-xs text-gray-500">Dang hoat dong</p>
        </div>
        <div className="admin-surface rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-500">{terminalCount}</p>
          <p className="mt-0.5 text-xs text-gray-500">Dau/cuoi tuyen</p>
        </div>
      </div>

      <div className="admin-toolbar flex flex-wrap gap-2">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tim theo ten, dia chi..."
          className="min-w-[200px] flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#23a983] focus:bg-white" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#23a983]">
          <option value="">Tat ca trang thai</option>
          <option value="ACTIVE">Hoat dong</option>
          <option value="INACTIVE">Tam ngung</option>
        </select>
        <button onClick={fetchStops} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200">Dat lai</button>
      </div>

      <div className="admin-surface overflow-hidden rounded-xl">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-sm text-gray-400">Dang tai...</div>
        ) : stops.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-gray-400">Khong co tram nao</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Ten tram</th>
                <th className="px-4 py-3">Dia chi</th>
                <th className="px-4 py-3">Toa do</th>
                <th className="px-4 py-3">Loai</th>
                <th className="px-4 py-3">Trang thai</th>
                <th className="px-4 py-3 text-right">Hanh dong</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stops.map(stop => (
                <tr key={stop._id} onClick={() => setSelectedStop(stop)} className="cursor-pointer transition hover:bg-[#f3fffa]">
                  <td className="px-4 py-3 font-semibold text-gray-900">{stop.name}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-[180px] truncate text-xs">{stop.address || '-'}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{stop.lat && stop.lng ? stop.lat + ', ' + stop.lng : '-'}</td>
                  <td className="px-4 py-3">
                    {stop.isTerminal
                      ? <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-600">Dau/cuoi</span>
                      : <span className="text-xs text-gray-400">Thuong</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={stop.status === 'ACTIVE' ? 'rounded-full bg-green-50 px-2 py-0.5 text-xs font-bold text-green-700' : 'rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-500'}>
                      {stop.status === 'ACTIVE' ? 'Hoat dong' : 'Tam ngung'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <div className="inline-flex gap-1">
                      <button onClick={() => setEditStop(stop)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" title="Chinh sua">
                        <FaEdit size={13} />
                      </button>
                      <button onClick={() => handleToggle(stop)} disabled={toggling}
                        className={stop.status === 'ACTIVE' ? 'rounded p-1.5 text-orange-400 hover:bg-orange-50 disabled:opacity-40' : 'rounded p-1.5 text-green-500 hover:bg-green-50 disabled:opacity-40'}
                        title={stop.status === 'ACTIVE' ? 'Tam ngung' : 'Kich hoat'}>
                        {stop.status === 'ACTIVE' ? <FaToggleOff size={14} /> : <FaToggleOn size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedStop && (
        <>
          <div className="fixed inset-0 z-30 bg-black/20" onClick={() => setSelectedStop(null)} />
          <StopDetailPanel
            stop={selectedStop}
            onClose={() => setSelectedStop(null)}
            onEdit={(s) => { setEditStop(s); setSelectedStop(null) }}
            onToggle={handleToggle}
            toggling={toggling}
          />
        </>
      )}
      {showCreate && <StopFormModal onClose={() => setShowCreate(false)} onSaved={fetchStops} />}
      {editStop && <StopFormModal stop={editStop} onClose={() => setEditStop(null)} onSaved={fetchStops} />}
    </div>
  )
}
