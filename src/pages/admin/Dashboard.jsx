import React, { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
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
import BaseMapTileLayer from '../../components/map/BaseMapTileLayer'

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

    const rafId = window.requestAnimationFrame(() => {
      map.invalidateSize()

      if (!points.length) {
        map.setView(DEFAULT_CENTER, 12)
        return
      }

      if (points.length === 1) {
        map.setView(points[0], 14)
        return
      }

      map.fitBounds(points, { padding: [40, 40] })
    })

    return () => window.cancelAnimationFrame(rafId)
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

const formatCurrency = (value) => {
  const amount = Number(value || 0)
  if (!amount) return '0 đ'
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(amount % 1000000 === 0 ? 0 : 1)} tr`
  }
  return `${amount.toLocaleString('vi-VN')} đ`
}

const isScheduleOnline = (schedule) => {
  const updatedAt = schedule?.currentLocation?.updatedAt
  if (!updatedAt) return false
  return (Date.now() - new Date(updatedAt).getTime()) <= (2 * 60 * 1000)
}

const buildScheduleStatus = (schedule) => {
  if (!schedule) return { text: 'Chưa có dữ liệu', color: 'text-gray-400' }

  if (schedule.actualEnd || schedule.status === 'COMPLETED') {
    return { text: 'Hoàn thành', color: 'text-gray-500' }
  }

  if (schedule.status === 'IN_PROGRESS') {
    if (!isScheduleOnline(schedule)) {
      return { text: 'Mất tín hiệu GPS', color: 'text-red-600 font-bold' }
    }
    return { text: 'Đang chạy', color: 'text-green-600' }
  }

  if (schedule.status === 'CANCELLED') {
    return { text: 'Đã hủy', color: 'text-red-500' }
  }

  return { text: 'Đang chuẩn bị', color: 'text-yellow-600' }
}

const getRecentSchedules = (schedules) => (
  [...schedules]
    .filter((schedule) => schedule?.routeId || schedule?.busId)
    .sort((a, b) => {
      const aTime = new Date(a.currentLocation?.updatedAt || a.actualStart || a.departureTime || a.date || 0).getTime()
      const bTime = new Date(b.currentLocation?.updatedAt || b.actualStart || b.departureTime || b.date || 0).getTime()
      return bTime - aTime
    })
    .slice(0, 6)
)

const hasValidCoordinates = (vehicle) => (
  Number.isFinite(Number(vehicle?.currentLocation?.lat)) &&
  Number.isFinite(Number(vehicle?.currentLocation?.lng))
)

const isVehicleLive = (vehicle) => (
  hasValidCoordinates(vehicle) &&
  (
    vehicle?.trackingActive === true ||
    vehicle?.isOnline === true ||
    String(vehicle?.tripStatus || '').toUpperCase() === 'IN_PROGRESS'
  )
)

const Dashboard = () => {
  const { showAlert } = useDialog()
  const [vehicles, setVehicles] = useState([])
  const [routes, setRoutes] = useState([])
  const [allSchedules, setAllSchedules] = useState([])
  const [todaySchedules, setTodaySchedules] = useState([])
  const [revenueSummary, setRevenueSummary] = useState({ totalRevenue: 0, totalPassengers: 0, totalTrips: 0 })
  const [loadingMap, setLoadingMap] = useState(true)

  const fetchDashboardData = async (withLoading = true) => {
    if (withLoading) setLoadingMap(true)

    const today = new Date().toISOString().substring(0, 10)

    try {
      const [trackingRes, routeRes, scheduleRes, revenueRes] = await Promise.allSettled([
        api.get('/api/public/tracking/live?onlyRunning=false'),
        api.get('/api/public/routes'),
        api.get('/api/admin/schedules'),
        api.get('/api/admin/reports/revenue', {
          params: { from: today, to: today, group: 'day' },
        }),
      ])

      const trackingData = trackingRes.status === 'fulfilled' ? trackingRes.value.data : {}
      const routeData = routeRes.status === 'fulfilled' ? routeRes.value.data : {}
      const scheduleData = scheduleRes.status === 'fulfilled' ? scheduleRes.value.data : {}
      const revenueData = revenueRes.status === 'fulfilled' ? revenueRes.value.data : {}

      setVehicles(Array.isArray(trackingData?.vehicles) ? trackingData.vehicles : [])

      const routeList = routeData?.data?.routes || routeData?.data || routeData?.routes || routeData || []
      setRoutes(Array.isArray(routeList) ? routeList : [])

      const schedules = Array.isArray(scheduleData?.schedules) ? scheduleData.schedules : []
      setAllSchedules(schedules)
      const todayOnly = schedules.filter((schedule) => {
        const rawDate = schedule?.date ? String(schedule.date).substring(0, 10) : ''
        return rawDate === today
      })
      setTodaySchedules(todayOnly)

      if (revenueData?.ok) {
        setRevenueSummary(revenueData.summary || { totalRevenue: 0, totalPassengers: 0, totalTrips: 0 })
      } else {
        setRevenueSummary({ totalRevenue: 0, totalPassengers: 0, totalTrips: 0 })
      }
    } catch (error) {
      console.error('Dashboard fetch error:', error)
      setVehicles([])
      setRoutes([])
      setAllSchedules([])
      setTodaySchedules([])
      setRevenueSummary({ totalRevenue: 0, totalPassengers: 0, totalTrips: 0 })
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
    const handleScheduleChanged = (payload) => {
      refresh()

      if (payload?.action !== 'completed') return

      const licensePlate = payload?.licensePlate || 'xe chua ro bien so'
      const routeLabel = payload?.routeNumber
        ? `tuyen ${payload.routeNumber}${payload?.routeName ? ` - ${payload.routeName}` : ''}`
        : 'mot chuyen xe'
      const actualEnd = payload?.actualEnd ? ` luc ${payload.actualEnd}` : ''

      showAlert(
        `${licensePlate} - ${routeLabel} da ket thuc chuyen${actualEnd}.`,
        'Thong bao ket thuc chuyen',
      )
    }

    socket.on('connect', () => {
      socket.emit('admin:join')
    })
    socket.on('tracking:updated', refresh)
    socket.on('schedule:changed', handleScheduleChanged)
    socket.on('tracking:gps-lost', (payload) => {
      refresh()
      showAlert(payload?.message || 'Mất tín hiệu GPS từ xe đang chạy.', payload?.title || 'Cảnh báo khẩn GPS')
    })

    const timerId = window.setInterval(refresh, 10000)

    return () => {
      window.clearInterval(timerId)
      socket.off('tracking:updated', refresh)
      socket.off('schedule:changed', handleScheduleChanged)
      socket.off('tracking:gps-lost')
      socket.disconnect()
    }
  }, [showAlert])

  const liveVehicles = useMemo(
    () => vehicles.filter(isVehicleLive),
    [vehicles],
  )

  const activeSchedules = useMemo(
    () => allSchedules.filter((schedule) => (
      schedule?.status === 'IN_PROGRESS' ||
      schedule?.trackingActive === true ||
      (schedule?.actualStart && !schedule?.actualEnd)
    )),
    [allSchedules],
  )

  const visibleSchedules = useMemo(() => {
    const seen = new Set()
    return [...activeSchedules, ...todaySchedules].filter((schedule) => {
      const id = String(schedule?._id || '')
      if (!id || seen.has(id)) return false
      seen.add(id)
      return true
    })
  }, [activeSchedules, todaySchedules])

  const stats = useMemo(() => {
    const runningCount = Math.max(liveVehicles.length, activeSchedules.length)
    const scheduleBaseCount = activeSchedules.length > 0 ? activeSchedules.length : todaySchedules.length
    const warningCount = visibleSchedules.filter((schedule) => {
      const lostGps = schedule.status === 'IN_PROGRESS' && !isScheduleOnline(schedule)
      const crowded = ['FULL', 'CROWDED'].includes(String(schedule.loadStatus || '').toUpperCase())
      return lostGps || crowded
    }).length

    return [
      {
        title: 'Tổng tuyến',
        value: String(routes.length || 0),
        icon: <FaRoute className="text-5xl opacity-30" />,
        classes: 'from-blue-500 to-blue-700 text-white',
      },
      {
        title: 'Xe đang chạy',
        value: `${runningCount}/${scheduleBaseCount || 0}`,
        icon: <FaBus className="text-5xl opacity-30" />,
        classes: 'from-green-500 to-[#23a983] text-white',
      },
      {
        title: 'Cảnh báo',
        value: String(warningCount),
        icon: <FaExclamationTriangle className="text-5xl opacity-20" />,
        classes: 'from-yellow-400 to-yellow-500 text-yellow-900',
      },
      {
        title: 'Doanh thu hôm nay',
        value: formatCurrency(revenueSummary.totalRevenue),
        icon: <FaMoneyBillWave className="text-5xl opacity-30" />,
        classes: 'from-purple-500 to-purple-700 text-white',
      },
    ]
  }, [activeSchedules.length, liveVehicles.length, revenueSummary.totalRevenue, routes.length, todaySchedules.length, visibleSchedules])

  const recentSchedules = useMemo(() => getRecentSchedules(visibleSchedules), [visibleSchedules])

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
                <BaseMapTileLayer />
                <FitLiveBounds vehicles={liveVehicles} />

                {liveVehicles.map((vehicle) => {
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
                          <span
                            className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-white shadow-sm"
                            style={{ backgroundColor: vehicle.loadColor || '#16a34a' }}
                          >
                            {vehicle.isOnline ? 'Đang cập nhật' : 'Mất tín hiệu tạm thời'}
                          </span>
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
            {recentSchedules.length === 0 ? (
              <li className="px-6 py-8 text-center text-gray-400">Chưa có chuyến nào trong hôm nay.</li>
            ) : recentSchedules.map((schedule) => {
              const status = buildScheduleStatus(schedule)
              return (
                <li key={schedule._id} className="px-6 py-4 transition-colors hover:bg-gray-50">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold text-gray-800">
                      <span className="mr-2 rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
                        {schedule.routeId?.routeNumber || '--'}
                      </span>
                      {schedule.busId?.licensePlate || 'Chưa gán biển số'}
                    </div>
                    <span className={status.color}>
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
