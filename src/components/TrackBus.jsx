import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { io } from 'socket.io-client';
import api from '../utils/api';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function ChangeView({ bounds }) {
  const map = useMap();
  if (bounds && bounds.length > 0) {
    map.fitBounds(bounds, { padding: [50, 50] });
  }
  return null;
}

const buildNumberedMarker = (index, direction, isTerminal) => L.divIcon({
  className: 'custom-route-marker',
  html: `
    <div style="
      width: 30px;
      height: 30px;
      border-radius: 9999px;
      background: ${direction === 'OUTBOUND' ? '#ff6b35' : '#1d4ed8'};
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 12px;
      border: 3px solid ${isTerminal ? '#111827' : '#ffffff'};
      box-shadow: 0 4px 10px rgba(0,0,0,0.25);
    ">${index + 1}</div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15],
});

const buildBusMarker = (vehicle) => L.divIcon({
  className: 'custom-bus-marker',
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
        <div style="
          position: absolute;
          top: 6px;
          left: 7px;
          width: 10px;
          height: 10px;
          background: rgba(255,255,255,0.9);
          border-radius: 3px;
        "></div>
        <div style="
          position: absolute;
          top: 6px;
          left: 20px;
          width: 10px;
          height: 10px;
          background: rgba(255,255,255,0.9);
          border-radius: 3px;
        "></div>
        <div style="
          position: absolute;
          top: 6px;
          left: 33px;
          width: 8px;
          height: 10px;
          background: rgba(255,255,255,0.9);
          border-radius: 3px;
        "></div>
        <div style="
          position: absolute;
          bottom: 6px;
          left: 8px;
          width: 22px;
          height: 4px;
          background: rgba(255,255,255,0.88);
          border-radius: 999px;
        "></div>
        <div style="
          position: absolute;
          bottom: -7px;
          left: 6px;
          width: 11px;
          height: 11px;
          background: #1f2937;
          border: 2px solid #ffffff;
          border-radius: 999px;
        "></div>
        <div style="
          position: absolute;
          bottom: -7px;
          right: 6px;
          width: 11px;
          height: 11px;
          background: #1f2937;
          border: 2px solid #ffffff;
          border-radius: 999px;
        "></div>
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
});

const getCurrentDirectionStops = (routeData, activeDirection) => (
  activeDirection === 'OUTBOUND'
    ? (routeData?.outboundStops || [])
    : (routeData?.inboundStops || [])
);

const buildFallbackPath = (stops = []) => (
  stops
    .filter((stop) => Number.isFinite(Number(stop.lat)) && Number.isFinite(Number(stop.lng)))
    .map((stop) => [Number(stop.lat), Number(stop.lng)])
);

const TrackBus = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [routesList, setRoutesList] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeDirection, setActiveDirection] = useState('OUTBOUND');
  const [activeTab, setActiveTab] = useState('stops');
  const [routePath, setRoutePath] = useState([]);
  const [liveVehicles, setLiveVehicles] = useState([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveLastUpdated, setLiveLastUpdated] = useState('');

  useEffect(() => {
    fetchAllRoutes();
  }, []);

  useEffect(() => {
    const socket = io('/', {
      transports: ['websocket'],
      withCredentials: true,
    });

    const handleLiveRefresh = () => {
      if (routeData?._id || routeData?.id) {
        fetchLiveVehicles(routeData._id || routeData.id, false);
      }
    };

    socket.on('connect', () => {
      const routeId = routeData?._id || routeData?.id;
      if (routeId) {
        socket.emit('tracking:subscribe-route', { routeId });
      }
    });

    socket.on('tracking:route-update', handleLiveRefresh);
    socket.on('schedule:changed', handleLiveRefresh);

    return () => {
      const routeId = routeData?._id || routeData?.id;
      if (routeId) {
        socket.emit('tracking:unsubscribe-route', { routeId });
      }
      socket.off('tracking:route-update', handleLiveRefresh);
      socket.off('schedule:changed', handleLiveRefresh);
      socket.disconnect();
    };
  }, [routeData?._id, routeData?.id]);

  useEffect(() => {
    let timerId;

    const tick = async () => {
      const routeId = routeData?._id || routeData?.id;
      await fetchLiveVehicles(routeId, false);
      timerId = window.setTimeout(tick, 15000);
    };

    tick();

    return () => {
      if (timerId) window.clearTimeout(timerId);
    };
  }, [routeData?._id, routeData?.id]);

  const fetchAllRoutes = async () => {
    setListLoading(true);
    try {
      const res = await api.get('/api/public/routes');
      const data = res.data;
      const routes = data?.data?.routes || data?.data || data?.routes || data || [];
      setRoutesList(Array.isArray(routes) ? routes : []);
    } catch (err) {
      console.error('Error fetching all routes:', err);
      setRoutesList([]);
    } finally {
      setListLoading(false);
    }
  };

  const fetchLiveVehicles = async (routeId, withLoading = true) => {
    if (withLoading) setLiveLoading(true);

    try {
      const endpoint = routeId
        ? `/api/public/routes/${routeId}/live`
        : '/api/public/tracking/live';
      const res = await api.get(endpoint);
      const vehicles = Array.isArray(res.data?.vehicles) ? res.data.vehicles : [];
      setLiveVehicles(vehicles);
      setLiveLastUpdated(res.data?.lastUpdatedAt || new Date().toISOString());
    } catch (err) {
      console.error('Error fetching live vehicles:', err);
      if (routeId) {
        setLiveVehicles([]);
      }
    } finally {
      if (withLoading) setLiveLoading(false);
    }
  };

  const handleRouteSelect = async (routeId) => {
    setLoading(true);
    setError('');
    setRouteData(null);
    setActiveDirection('OUTBOUND');
    setActiveTab('stops');

    try {
      const detailRes = await api.get(`/api/public/routes/${routeId}`);
      const routeDetail = detailRes.data.route || detailRes.data.data;
      setRouteData(routeDetail);
      await fetchLiveVehicles(routeId, false);
    } catch (err) {
      console.error('Error fetching route details:', err);
      setError('Có lỗi khi tải dữ liệu tuyến. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    if (!searchQuery.trim()) {
      fetchAllRoutes();
      return;
    }

    setListLoading(true);
    setRouteData(null);
    setError('');

    try {
      const searchRes = await api.get(`/api/public/routes?search=${searchQuery}`);
      const data = searchRes.data;
      const routes = data?.data?.routes || data?.routes || data || [];
      const parsedRoutes = Array.isArray(routes) ? routes : [];
      setRoutesList(parsedRoutes);

      if (parsedRoutes.length === 0) {
        setError('Không tìm thấy tuyến xe nào phù hợp.');
      } else if (parsedRoutes.length === 1) {
        handleRouteSelect(parsedRoutes[0].id || parsedRoutes[0]._id);
      }
    } catch (err) {
      console.error('Error searching routes:', err);
      setError('Lỗi kết nối khi tìm kiếm.');
      setRoutesList([]);
    } finally {
      setListLoading(false);
    }
  };

  const currentDirectionStops = getCurrentDirectionStops(routeData, activeDirection);
  const mapPositions = currentDirectionStops
    .filter((stop) => Number.isFinite(Number(stop.lat)) && Number.isFinite(Number(stop.lng)))
    .map((stop) => [Number(stop.lat), Number(stop.lng)]);
  const liveMapPositions = liveVehicles
    .filter((vehicle) => Number.isFinite(Number(vehicle.currentLocation?.lat)) && Number.isFinite(Number(vehicle.currentLocation?.lng)))
    .map((vehicle) => [Number(vehicle.currentLocation.lat), Number(vehicle.currentLocation.lng)]);
  const combinedBounds = [...routePath, ...mapPositions, ...liveMapPositions];

  useEffect(() => {
    let cancelled = false;

    const fetchRoadPath = async () => {
      if (mapPositions.length < 2) {
        setRoutePath(mapPositions);
        return;
      }

      const coordPairs = currentDirectionStops
        .filter((stop) => Number.isFinite(Number(stop.lat)) && Number.isFinite(Number(stop.lng)))
        .map((stop) => `${Number(stop.lng)},${Number(stop.lat)}`);

      const uniquePairs = coordPairs.filter((pair, index) => index === 0 || pair !== coordPairs[index - 1]);
      if (uniquePairs.length < 2) {
        setRoutePath(mapPositions);
        return;
      }

      try {
        const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${uniquePairs.join(';')}?overview=full&geometries=geojson`);
        if (!response.ok) throw new Error(`OSRM ${response.status}`);
        const data = await response.json();
        const coordinates = data?.routes?.[0]?.geometry?.coordinates;
        if (!Array.isArray(coordinates) || coordinates.length < 2) {
          throw new Error('No route geometry');
        }

        const resolvedPath = coordinates
          .map((item) => [Number(item[1]), Number(item[0])])
          .filter((item) => Number.isFinite(item[0]) && Number.isFinite(item[1]));

        if (!cancelled) {
          setRoutePath(resolvedPath.length >= 2 ? resolvedPath : buildFallbackPath(currentDirectionStops));
        }
      } catch (routingError) {
        console.error('Error fetching routed path:', routingError);
        if (!cancelled) {
          setRoutePath(buildFallbackPath(currentDirectionStops));
        }
      }
    };

    fetchRoadPath();

    return () => {
      cancelled = true;
    };
  }, [activeDirection, routeData]);

  const fadeInUp = {
    hidden: { opacity: 0, y: 60 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
  };

  return (
    <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
      <div className="flex h-[calc(100vh-76px)] w-full flex-col overflow-hidden bg-white md:flex-row">
        <div className="z-0 flex w-full flex-col overflow-y-auto bg-gradient-to-br from-[#003366] to-[#004080] p-6 text-white shadow-[2px_0_10px_rgba(0,0,0,0.1)] md:w-[35%]">
          <h2 className="mb-2 text-2xl font-bold">Tra Cứu Tuyến</h2>
          <p className="mb-6 text-sm opacity-90">Tìm tuyến xe và xem lộ trình trên bản đồ</p>

          <div className="mb-5 rounded-lg bg-white/10 p-4">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide opacity-95">Tìm kiếm tuyến</label>
            <form onSubmit={handleSearch} className="flex flex-col gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Nhập số tuyến hoặc tên..."
                className="w-full rounded-md bg-white p-3 text-sm text-gray-800 placeholder-gray-500 transition-shadow focus:outline-none focus:ring-2 focus:ring-white/30"
              />
              <button
                type="submit"
                disabled={loading}
                className={`w-full cursor-pointer rounded-md bg-[#ff6b35] px-4 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#ff5722] hover:shadow-[0_4px_12px_rgba(255,107,53,0.3)] ${loading ? 'opacity-70' : ''}`}
              >
                {loading ? 'Đang tìm...' : 'Tìm Kiếm'}
              </button>
            </form>
          </div>

          {error ? (
            <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/20 p-3 text-sm text-white">
              {error}
            </div>
          ) : null}

          <div className="flex min-h-0 flex-1 flex-col">
            <h3 className="mb-3 text-[15px] font-semibold uppercase tracking-wide opacity-95">Danh sách tuyến</h3>
            <div className="custom-scrollbar flex-1 overflow-y-auto pr-1">
              {listLoading ? (
                <div className="p-5 text-center opacity-80">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-[3px] border-current border-t-transparent text-white" role="status" aria-label="loading" />
                </div>
              ) : routesList.length > 0 ? (
                routesList.map((route, index) => {
                  const routeId = route._id || route.id;
                  const isActive = routeData && (routeData.id === routeId || routeData._id === routeId);
                  return (
                    <div
                      key={routeId || index}
                      onClick={() => handleRouteSelect(routeId)}
                      className={`mb-2 cursor-pointer rounded-lg border-l-4 p-3.5 transition-all ${isActive ? 'border-[#ff6b35] bg-white text-[#003366]' : 'border-[#ff6b35] bg-white/10 text-white hover:translate-x-1 hover:bg-white/20'}`}
                    >
                      <div className="text-[17px] font-bold text-[#ff6b35]">{route.routeNumber}</div>
                      <div className={`mt-1 text-xs ${isActive ? 'text-gray-600' : 'opacity-85'}`}>{route.name}</div>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center text-[13px] opacity-70">Không có tuyến xe nào để hiển thị</div>
              )}
            </div>
          </div>
        </div>

        <div className="relative z-0 h-[500px] w-full md:h-full md:w-[65%]">
          <MapContainer
            center={mapPositions.length > 0 ? mapPositions[0] : [16.0544, 108.2022]}
            zoom={13}
            scrollWheelZoom
            className="h-full w-full z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {routeData && routePath.length > 1 ? (
              <Polyline
                positions={routePath}
                color={activeDirection === 'OUTBOUND' ? '#ff6b35' : '#1d4ed8'}
                weight={5}
                opacity={0.85}
              />
            ) : null}

            {currentDirectionStops.map((stop, index) => {
              const lat = Number(stop.lat);
              const lng = Number(stop.lng);
              if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

              return (
                <Marker
                  key={stop.id || stop.stopId || index}
                  position={[lat, lng]}
                  icon={buildNumberedMarker(index, activeDirection, Boolean(stop.isTerminal))}
                >
                  <Popup>
                    <div className="font-sans">
                      <h3 className="mb-1 text-[15px] font-bold text-[#003366]">{stop.name}</h3>
                      {stop.address ? <p className="mb-1 text-xs text-gray-600">{stop.address}</p> : null}
                      <p className="mb-1 text-xs text-gray-500">
                        Thứ tự: {index + 1} · {activeDirection === 'OUTBOUND' ? 'Lượt đi' : 'Lượt về'}
                      </p>
                      {stop.isTerminal ? (
                        <span className="mt-1 inline-block rounded-full bg-[#ff6b35] px-2 py-0.5 text-[10px] font-bold uppercase text-white shadow-sm">
                          Trạm đầu cuối
                        </span>
                      ) : null}
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {liveVehicles.map((vehicle) => {
              const lat = Number(vehicle.currentLocation?.lat);
              const lng = Number(vehicle.currentLocation?.lng);
              if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

              return (
                <Marker
                  key={vehicle.scheduleId}
                  position={[lat, lng]}
                  icon={buildBusMarker(vehicle)}
                >
                  <Popup>
                    <div className="font-sans min-w-[190px]">
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
              );
            })}

            {combinedBounds.length > 0 ? <ChangeView bounds={combinedBounds} /> : null}
          </MapContainer>

          <div className="absolute bottom-5 left-5 z-[1000] w-[280px] rounded-xl bg-white/95 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.18)] backdrop-blur">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#003366]">Theo dõi xe realtime</h4>
              <span className="text-[11px] text-gray-500">{liveVehicles.length} xe</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-semibold text-gray-700">
              <div className="rounded-lg bg-gray-50 px-3 py-2">
                <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-[#16a34a]" />
                Thoáng
              </div>
              <div className="rounded-lg bg-gray-50 px-3 py-2">
                <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-[#3b82f6]" />
                Vừa
              </div>
              <div className="rounded-lg bg-gray-50 px-3 py-2">
                <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />
                Đông
              </div>
              <div className="rounded-lg bg-gray-50 px-3 py-2">
                <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-[#dc2626]" />
                Gần đầy
              </div>
            </div>
            <p className="mt-3 text-[11px] text-gray-500">
              {liveLoading
                ? 'Đang tải vị trí xe...'
                : `Cập nhật: ${liveLastUpdated ? new Date(liveLastUpdated).toLocaleTimeString('vi-VN') : '--:--'}`}
            </p>
          </div>

          {routeData ? (
            <div className="absolute left-5 top-5 z-[1000] flex max-h-[80vh] w-[320px] flex-col overflow-hidden rounded-xl bg-white font-sans shadow-[0_4px_15px_rgba(0,0,0,0.2)]">
              <div className="border-b-[3px] border-[#ff6b35] bg-gradient-to-br from-[#003366] to-[#004080] p-4 text-white">
                <h3 className="mb-1 text-base font-bold">{routeData.name}</h3>
                <p className="text-xs opacity-90">Số hiệu: {routeData.routeNumber}</p>
              </div>

              <div className="flex gap-2.5 border-b border-gray-100 bg-gray-50 p-3.5">
                <button
                  onClick={() => setActiveDirection('OUTBOUND')}
                  className={`flex-1 rounded-md border-2 px-1 py-2 text-[13px] font-semibold transition-all ${activeDirection === 'OUTBOUND' ? 'border-[#003366] bg-[#003366] text-white' : 'border-gray-200 bg-white text-gray-800 hover:border-[#003366]'}`}
                >
                  Lượt đi
                </button>
                <button
                  onClick={() => setActiveDirection('INBOUND')}
                  className={`flex-1 rounded-md border-2 px-1 py-2 text-[13px] font-semibold transition-all ${activeDirection === 'INBOUND' ? 'border-[#003366] bg-[#003366] text-white' : 'border-gray-200 bg-white text-gray-800 hover:border-[#003366]'}`}
                >
                  Lượt về
                </button>
              </div>

              <div className="flex min-h-0 flex-col p-3.5">
                <div className="mb-3.5 flex gap-2 border-b-2 border-gray-100">
                  <button
                    onClick={() => setActiveTab('stops')}
                    className={`relative -bottom-[2px] flex-1 border-b-[3px] bg-transparent px-2 py-2 text-[12px] font-semibold transition-all ${activeTab === 'stops' ? 'border-[#ff6b35] text-[#003366]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                  >
                    Trạm dừng
                  </button>
                  <button
                    onClick={() => setActiveTab('info')}
                    className={`relative -bottom-[2px] flex-1 border-b-[3px] bg-transparent px-2 py-2 text-[12px] font-semibold transition-all ${activeTab === 'info' ? 'border-[#ff6b35] text-[#003366]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                  >
                    Thông tin
                  </button>
                  <button
                    onClick={() => setActiveTab('reviews')}
                    className={`relative -bottom-[2px] flex-1 border-b-[3px] bg-transparent px-2 py-2 text-[12px] font-semibold transition-all ${activeTab === 'reviews' ? 'border-[#ff6b35] text-[#003366]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                  >
                    Đánh giá
                  </button>
                  <button
                    onClick={() => setActiveTab('live')}
                    className={`relative -bottom-[2px] flex-1 border-b-[3px] bg-transparent px-2 py-2 text-[12px] font-semibold transition-all ${activeTab === 'live' ? 'border-[#ff6b35] text-[#003366]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                  >
                    Realtime
                  </button>
                </div>

                <div className="custom-scrollbar max-h-[250px] overflow-y-auto pr-1 text-[13px] text-gray-800">
                  {activeTab === 'stops' ? (
                    <div className="flex flex-col gap-2">
                      {currentDirectionStops.length > 0 ? (
                        currentDirectionStops.map((stop, index) => (
                          <div
                            key={stop.id || stop.stopId || index}
                            className={`flex gap-2.5 rounded-md bg-gray-50 p-2.5 border-l-[3px] ${activeDirection === 'OUTBOUND' ? 'border-[#ff6b35]' : 'border-[#1d4ed8]'}`}
                          >
                            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${activeDirection === 'OUTBOUND' ? 'bg-[#ff6b35]' : 'bg-[#1d4ed8]'}`}>
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <span className="mb-0.5 block font-semibold text-[#003366]">{stop.name || 'Trạm chờ'}</span>
                              {stop.address ? <span className="block text-[11px] leading-tight text-gray-500">{stop.address}</span> : null}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-5 text-center italic text-gray-400">Không có trạm dừng cho chiều này.</div>
                      )}
                    </div>
                  ) : null}

                  {activeTab === 'info' ? (
                    <div className="flex flex-col">
                      <div className="flex flex-col border-b border-gray-100 py-2.5">
                        <span className="mb-1 text-xs font-semibold text-[#003366]">Số hiệu tuyến:</span>
                        <span className="font-medium text-gray-600">{routeData.routeNumber}</span>
                      </div>
                      <div className="flex flex-col border-b border-gray-100 py-2.5">
                        <span className="mb-1 text-xs font-semibold text-[#003366]">Khoảng cách:</span>
                        <span className="font-medium text-gray-600">{routeData.distance || '--'} km</span>
                      </div>
                      <div className="flex flex-col border-b border-gray-100 py-2.5">
                        <span className="mb-1 text-xs font-semibold text-[#003366]">Thời gian hoạt động:</span>
                        <span className="font-medium text-gray-600">
                          {routeData.operationTime
                            ? (typeof routeData.operationTime === 'object'
                              ? `${routeData.operationTime.start || ''} - ${routeData.operationTime.end || ''}`
                              : routeData.operationTime)
                            : '--'}
                        </span>
                      </div>
                      <div className="flex flex-col py-2.5">
                        <span className="mb-1 text-xs font-semibold text-[#003366]">Hướng đi:</span>
                        <span className="font-medium text-gray-600">{activeDirection === 'OUTBOUND' ? 'Lượt đi' : 'Lượt về'}</span>
                      </div>
                    </div>
                  ) : null}

                  {activeTab === 'reviews' ? (
                    <div className="p-5 text-center italic text-gray-400">Chưa có đánh giá. Hãy là người đầu tiên!</div>
                  ) : null}

                  {activeTab === 'live' ? (
                    <div className="flex flex-col gap-2">
                      {liveVehicles.length > 0 ? (
                        liveVehicles.map((vehicle) => (
                          <div
                            key={vehicle.scheduleId}
                            className="rounded-lg border border-gray-100 bg-gray-50 p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-[#003366]">
                                  {vehicle.licensePlate || 'Xe đang hoạt động'}
                                </p>
                                <p className="text-[11px] text-gray-500">
                                  {vehicle.driverName || 'Chưa có tài xế'}
                                </p>
                              </div>
                              <span
                                className="rounded-full px-2 py-1 text-[10px] font-bold text-white"
                                style={{ backgroundColor: vehicle.loadColor || '#16a34a' }}
                              >
                                {Math.round(Number(vehicle.occupancyPercentage || 0))}%
                              </span>
                            </div>
                            <p className="mt-2 text-[11px] text-gray-600">
                              {vehicle.passengerCount || 0}/{vehicle.capacity || 45} khách · {vehicle.loadStatus || 'NORMAL'}
                            </p>
                            <p className="mt-1 text-[11px] text-gray-500">
                              {vehicle.isOnline ? 'Đang gửi GPS' : 'Chưa có cập nhật mới'}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="p-5 text-center italic text-gray-400">
                          Chưa có xe nào gửi vị trí trên tuyến này.
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
};

export default TrackBus;
