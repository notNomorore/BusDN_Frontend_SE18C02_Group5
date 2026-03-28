import React, { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { io } from 'socket.io-client'
import {
  FaBus,
  FaExclamationTriangle,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaRoute,
} from 'react-icons/fa'
import api from '../../utils/api'
import { useDialog } from '../../context/DialogContext'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const DEFAULT_CENTER = [16.0544, 108.2022]

function FitLiveBounds({ vehicles }) {
  const map = useMap()

  useEffect(() => {
    const points = vehicles
      .filter((vehicle) => Number.isFinite(Number(vehicle.currentLocation?.lat)) && Number.isFinite(Number(vehicle.currentLocation?.lng)))
      .map((vehicle) => [Number(vehicle.currentLocation.lat), Number(vehicle.currentLocation.lng)])

    if (!points.length) {
      map.setView(DEFAULT_CENTER, 12)
      return
    }

    if (points.length === 1) {
      map.setView(points[0], 14)
      return
    }

    map.fitBounds(points, { padding: [40, 40] })
  }, [map, vehicles])

  return null
}

const buildBusMarker = (vehicle) => L.divIcon({
  className: 'custom-admin-bus-marker',
  html: `
    <div style="
      position: relative;
      width: 56px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        position: relative;
        width: 48px;
        height: 34px;
        background: ${vehicle.loadColor || '#16a34a'};
        border: 3px solid #ffffff;
        border-radius: 12px 12px 10px 10px;
        box-shadow: 0 8px 20px rgba(0,0,0,0.28);
      ">
        <div style="position:absolute;top:6px;left:7px;width:10px;height:10px;background:rgba(255,255,255,0.92);border-radius:3px;"></div>
        <div style="position:absolute;top:6px;left:20px;width:10px;height:10px;background:rgba(255,255,255,0.92);border-radius:3px;"></div>
        <div style="position:absolute;top:6px;left:33px;width:8px;height:10px;background:rgba(255,255,255,0.92);border-radius:3px;"></div>
        <div style="position:absolute;bottom:6px;left:8px;width:22px;height:4px;background:rgba(255,255,255,0.88);border-radius:999px;"></div>
        <div style="position:absolute;bottom:-7px;left:6px;width:11px;height:11px;background:#1f2937;border:2px solid #ffffff;border-radius:999px;"></div>
        <div style="position:absolute;bottom:-7px;right:6px;width:11px;height:11px;background:#1f2937;border:2px solid #ffffff;border-radius:999px;"></div>
        <div style="
          position: absolute;
          right: -6px;
          top: -8px;
          min-width: 24px;
          height: 24px;
          padding: 0 6px;
          background: #ffffff;
          color: ${vehicle.loadColor || '#16a34a'};
          border: 2px solid ${vehicle.loadColor || '#16a34a'};
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 10px;
          line-height: 1;
        ">${Math.round(Number(vehicle.occupancyPercentage || 0))}%</div>
      </div>
      <div style="
        position: absolute;
        bottom: 1px;
        width: 0;
        height: 0;
        border-left: 7px solid transparent;
        border-right: 7px solid transparent;
        border-top: 10px solid ${vehicle.loadColor || '#16a34a'};
        filter: drop-shadow(0 2px 3px rgba(0,0,0,0.18));
      "></div>
    </div>
  `,
  iconSize: [56, 56],
  iconAnchor: [28, 50],
  popupAnchor: [0, -42],
})

const statusLabel = (vehicle) => {
  if (!vehicle?.isOnline) return { text: 'Mất tín hiệu GPS', color: 'text-red-600' }
  if (vehicle.tripStatus === 'IN_PROGRESS') return { text: 'Đang chạy', color: 'text-green-600' }
  return { text: 'Đang chờ', color: 'text-yellow-600' }
}

const Dashboard = () => {
  const { showAlert } = useDialog()
  const [vehicles, setVehicles] = useState([])
  const [routes, setRoutes] = useState([])
  const [loadingMap, setLoadingMap] = useState(true)

  const fetchDashboardData = async (withLoading = true) => {
    if (withLoading) setLoadingMap(true)
    try {
      const [trackingRes, routeRes] = await Promise.all([
        api.get('/api/public/tracking/live?onlyRunning=false'),
        api.get('/api/public/routes'),
      ])

      setVehicles(Array.isArray(trackingRes.data?.vehicles) ? trackingRes.data.vehicles : [])

      const routeList = routeRes.data?.data?.routes || routeRes.data?.data || routeRes.data?.routes || routeRes.data || []
      setRoutes(Array.isArray(routeList) ? routeList : [])
    } catch (error) {
      console.error('Dashboard realtime fetch error:', error)
      setVehicles([])
    } finally {
      if (withLoading) setLoadingMap(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  useEffect(() => {
    const socket = io('/', {
      transports: ['websocket'],
      withCredentials: true,
    })

    const refresh = () => fetchDashboardData(false)

    socket.on('connect', () => {
      socket.emit('admin:join')
    })
    socket.on('tracking:updated', refresh)
    socket.on('schedule:changed', refresh)
    socket.on('tracking:gps-lost', (payload) => {
      refresh()
      showAlert(payload?.message || 'Mất tín hiệu GPS từ xe đang chạy.', payload?.title || 'Cảnh báo khẩn GPS')
    })

    const timer = window.setInterval(refresh, 10000)

    return () => {
      window.clearInterval(timer)
      socket.off('tracking:updated', refresh)
      socket.off('schedule:changed', refresh)
      socket.off('tracking:gps-lost')
      socket.disconnect()
    }
  }, [showAlert])

  const stats = useMemo(() => {
    const running = vehicles.filter((vehicle) => vehicle.tripStatus === 'IN_PROGRESS').length
    const warning = vehicles.filter((vehicle) => !vehicle.isOnline || ['FULL', 'CROWDED'].includes(String(vehicle.loadStatus || '').toUpperCase())).length
    return [
      {
        title: 'Tổng tuyến',
        value: String(routes.length || 0),
        icon: <FaRoute className="text-5xl opacity-30" />,
        classes: 'from-blue-500 to-blue-700 text-white',
      },
      {
        title: 'Xe đang chạy',
        value: `${running}/${vehicles.length || 0}`,
        icon: <FaBus className="text-5xl opacity-30" />,
        classes: 'from-green-500 to-[#23a983] text-white',
      },
      {
        title: 'Cảnh báo',
        value: String(warning),
        icon: <FaExclamationTriangle className="text-5xl opacity-20" />,
        classes: 'from-yellow-400 to-yellow-500 text-yellow-900',
      },
      {
        title: 'Doanh thu hôm nay',
        value: 'Đang cập nhật',
        icon: <FaMoneyBillWave className="text-5xl opacity-30" />,
        classes: 'from-purple-500 to-purple-700 text-white',
      },
    ]
  }, [routes.length, vehicles])

  const recentVehicles = [...vehicles]
    .sort((a, b) => new Date(b.currentLocation?.updatedAt || 0) - new Date(a.currentLocation?.updatedAt || 0))
    .slice(0, 6)

  return (
    <div className="space-y-6">
      <div className="admin-page-head">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Dashboard Tổng Quan</h1>
          <p className="mt-1 text-sm text-gray-500">Theo dõi nhanh hoạt động vận hành trong ngày.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((card) => (
          <div
            key={card.title}
            className={`rounded-2xl bg-gradient-to-br p-5 shadow-[0_2px_8px_rgba(0,0,0,0.05)] ${card.classes}`}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.18em] opacity-80">{card.title}</p>
                <h2 className="mt-2 text-3xl font-bold">{card.value}</h2>
              </div>
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="admin-surface xl:col-span-2 overflow-hidden">
          <div className="px-6 pt-6">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
              <FaMapMarkerAlt className="text-red-500" />
              Giám sát đội xe
            </h2>
            <p className="mt-1 text-sm text-gray-500">Bản đồ theo dõi fleet theo thời gian thực.</p>
          </div>

          <div className="mt-5 h-[420px] rounded-b-2xl overflow-hidden bg-[#f4f6f8]">
            {loadingMap ? (
              <div className="flex h-full items-center justify-center text-gray-400">
                Đang tải bản đồ realtime...
              </div>
            ) : (
              <MapContainer center={DEFAULT_CENTER} zoom={12} scrollWheelZoom className="h-full w-full">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <FitLiveBounds vehicles={vehicles} />
                {vehicles.map((vehicle) => {
                  const lat = Number(vehicle.currentLocation?.lat)
                  const lng = Number(vehicle.currentLocation?.lng)
                  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

                  return (
                    <Marker
                      key={vehicle.scheduleId}
                      position={[lat, lng]}
                      icon={buildBusMarker(vehicle)}
                    >
                      <Popup>
                        <div className="min-w-[190px] font-sans">
                          <h3 className="mb-1 text-[15px] font-bold text-[#003366]">
                            {vehicle.routeNumber || 'Tuyến xe'} {vehicle.licensePlate ? `· ${vehicle.licensePlate}` : ''}
                          </h3>
                          <p className="mb-1 text-xs text-gray-600">{vehicle.driverName || 'Chưa có tài xế'}</p>
                          <p className="mb-1 text-xs text-gray-500">
                            Tải trọng: {vehicle.passengerCount || 0}/{vehicle.capacity || 45} khách
                          </p>
                          <p className="mb-1 text-xs text-gray-500">
                            Mức độ đông: {Math.round(Number(vehicle.occupancyPercentage || 0))}% · {vehicle.loadStatus || 'NORMAL'}
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  )
                })}
              </MapContainer>
            )}
          </div>
        </section>

        <section className="admin-surface overflow-hidden">
          <div className="px-6 pt-6">
            <h2 className="text-lg font-bold text-gray-800">Trạng thái chuyến gần nhất</h2>
            <p className="mt-1 text-sm text-gray-500">Cập nhật nhanh tình trạng xe và sự cố.</p>
          </div>
          <ul className="mt-5 divide-y divide-gray-100 text-sm">
            {recentVehicles.length === 0 ? (
              <li className="px-6 py-8 text-center text-gray-400">Chưa có xe nào gửi vị trí realtime.</li>
            ) : recentVehicles.map((vehicle) => {
              const status = statusLabel(vehicle)
              return (
                <li key={vehicle.scheduleId} className="px-6 py-4 transition-colors hover:bg-gray-50">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold text-gray-800">
                      <span className="mr-2 rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
                        {vehicle.routeNumber || '--'}
                      </span>
                      {vehicle.licensePlate || 'Chưa gán biển số'}
                    </div>
                    <span className={`font-medium ${status.color}`}>
                      {status.text}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </div>
  )
}

export default Dashboard
