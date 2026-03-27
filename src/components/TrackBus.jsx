import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
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

  useEffect(() => {
    fetchAllRoutes();
  }, []);

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
    } catch (err) {
      console.error('Error fetching route details:', err);
      setError('An error occurred while fetching route data. Please try again.');
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
        setError('Khong tim thay tuyen xe nao phu hop.');
      } else if (parsedRoutes.length === 1) {
        handleRouteSelect(parsedRoutes[0].id || parsedRoutes[0]._id);
      }
    } catch (err) {
      console.error('Error searching routes:', err);
      setError('Loi ket noi khi tim kiem.');
      setRoutesList([]);
    } finally {
      setListLoading(false);
    }
  };

  const currentDirectionStops = getCurrentDirectionStops(routeData, activeDirection);
  const mapPositions = currentDirectionStops
    .filter((stop) => Number.isFinite(Number(stop.lat)) && Number.isFinite(Number(stop.lng)))
    .map((stop) => [Number(stop.lat), Number(stop.lng)]);

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
          <h2 className="mb-2 text-2xl font-bold">Tra Cuu Tuyen</h2>
          <p className="mb-6 text-sm opacity-90">Tim tuyen xe va xem lo trinh tren ban do</p>

          <div className="mb-5 rounded-lg bg-white/10 p-4">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide opacity-95">Tim kiem tuyen</label>
            <form onSubmit={handleSearch} className="flex flex-col gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Nhap so tuyen hoac ten..."
                className="w-full rounded-md bg-white p-3 text-sm text-gray-800 placeholder-gray-500 transition-shadow focus:outline-none focus:ring-2 focus:ring-white/30"
              />
              <button
                type="submit"
                disabled={loading}
                className={`w-full cursor-pointer rounded-md bg-[#ff6b35] px-4 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#ff5722] hover:shadow-[0_4px_12px_rgba(255,107,53,0.3)] ${loading ? 'opacity-70' : ''}`}
              >
                {loading ? 'Dang tim...' : 'Tim Kiem'}
              </button>
            </form>
          </div>

          {error ? (
            <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/20 p-3 text-sm text-white">
              {error}
            </div>
          ) : null}

          <div className="flex min-h-0 flex-1 flex-col">
            <h3 className="mb-3 text-[15px] font-semibold uppercase tracking-wide opacity-95">Danh sach tuyen</h3>
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
                <div className="p-6 text-center text-[13px] opacity-70">Khong co tuyen xe nao de hien thi</div>
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
                        Thu tu: {index + 1} · {activeDirection === 'OUTBOUND' ? 'Luot di' : 'Luot ve'}
                      </p>
                      {stop.isTerminal ? (
                        <span className="mt-1 inline-block rounded-full bg-[#ff6b35] px-2 py-0.5 text-[10px] font-bold uppercase text-white shadow-sm">
                          Tram dau cuoi
                        </span>
                      ) : null}
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {(routePath.length > 0 || mapPositions.length > 0) ? <ChangeView bounds={routePath.length > 0 ? routePath : mapPositions} /> : null}
          </MapContainer>

          {routeData ? (
            <div className="absolute left-5 top-5 z-[1000] flex max-h-[80vh] w-[320px] flex-col overflow-hidden rounded-xl bg-white font-sans shadow-[0_4px_15px_rgba(0,0,0,0.2)]">
              <div className="border-b-[3px] border-[#ff6b35] bg-gradient-to-br from-[#003366] to-[#004080] p-4 text-white">
                <h3 className="mb-1 text-base font-bold">{routeData.name}</h3>
                <p className="text-xs opacity-90">So hieu: {routeData.routeNumber}</p>
              </div>

              <div className="flex gap-2.5 border-b border-gray-100 bg-gray-50 p-3.5">
                <button
                  onClick={() => setActiveDirection('OUTBOUND')}
                  className={`flex-1 rounded-md border-2 px-1 py-2 text-[13px] font-semibold transition-all ${activeDirection === 'OUTBOUND' ? 'border-[#003366] bg-[#003366] text-white' : 'border-gray-200 bg-white text-gray-800 hover:border-[#003366]'}`}
                >
                  Luot di
                </button>
                <button
                  onClick={() => setActiveDirection('INBOUND')}
                  className={`flex-1 rounded-md border-2 px-1 py-2 text-[13px] font-semibold transition-all ${activeDirection === 'INBOUND' ? 'border-[#003366] bg-[#003366] text-white' : 'border-gray-200 bg-white text-gray-800 hover:border-[#003366]'}`}
                >
                  Luot ve
                </button>
              </div>

              <div className="flex min-h-0 flex-col p-3.5">
                <div className="mb-3.5 flex gap-2 border-b-2 border-gray-100">
                  <button
                    onClick={() => setActiveTab('stops')}
                    className={`relative -bottom-[2px] flex-1 border-b-[3px] bg-transparent px-2 py-2 text-[12px] font-semibold transition-all ${activeTab === 'stops' ? 'border-[#ff6b35] text-[#003366]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                  >
                    Tram dung
                  </button>
                  <button
                    onClick={() => setActiveTab('info')}
                    className={`relative -bottom-[2px] flex-1 border-b-[3px] bg-transparent px-2 py-2 text-[12px] font-semibold transition-all ${activeTab === 'info' ? 'border-[#ff6b35] text-[#003366]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                  >
                    Thong tin
                  </button>
                  <button
                    onClick={() => setActiveTab('reviews')}
                    className={`relative -bottom-[2px] flex-1 border-b-[3px] bg-transparent px-2 py-2 text-[12px] font-semibold transition-all ${activeTab === 'reviews' ? 'border-[#ff6b35] text-[#003366]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                  >
                    Danh gia
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
                              <span className="mb-0.5 block font-semibold text-[#003366]">{stop.name || 'Tram cho'}</span>
                              {stop.address ? <span className="block text-[11px] leading-tight text-gray-500">{stop.address}</span> : null}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-5 text-center italic text-gray-400">Khong co tram dung cho chieu nay.</div>
                      )}
                    </div>
                  ) : null}

                  {activeTab === 'info' ? (
                    <div className="flex flex-col">
                      <div className="flex flex-col border-b border-gray-100 py-2.5">
                        <span className="mb-1 text-xs font-semibold text-[#003366]">So hieu tuyen:</span>
                        <span className="font-medium text-gray-600">{routeData.routeNumber}</span>
                      </div>
                      <div className="flex flex-col border-b border-gray-100 py-2.5">
                        <span className="mb-1 text-xs font-semibold text-[#003366]">Khoang cach:</span>
                        <span className="font-medium text-gray-600">{routeData.distance || '--'} km</span>
                      </div>
                      <div className="flex flex-col border-b border-gray-100 py-2.5">
                        <span className="mb-1 text-xs font-semibold text-[#003366]">Thoi gian hoat dong:</span>
                        <span className="font-medium text-gray-600">
                          {routeData.operationTime
                            ? (typeof routeData.operationTime === 'object'
                              ? `${routeData.operationTime.start || ''} - ${routeData.operationTime.end || ''}`
                              : routeData.operationTime)
                            : '--'}
                        </span>
                      </div>
                      <div className="flex flex-col py-2.5">
                        <span className="mb-1 text-xs font-semibold text-[#003366]">Huong di:</span>
                        <span className="font-medium text-gray-600">{activeDirection === 'OUTBOUND' ? 'Luot di' : 'Luot ve'}</span>
                      </div>
                    </div>
                  ) : null}

                  {activeTab === 'reviews' ? (
                    <div className="p-5 text-center italic text-gray-400">Chua co danh gia. Hay la nguoi dau tien!</div>
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
