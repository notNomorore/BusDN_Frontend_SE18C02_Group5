import React, { useState, useEffect } from 'react';
import { CiSearch } from "react-icons/ci";
import { motion } from "framer-motion";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import api from '../utils/api';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix for default marker icons in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Component to dynamically update map view based on markers
function ChangeView({ bounds }) {
  const map = useMap();
  if (bounds && bounds.length > 0) {
    map.fitBounds(bounds, { padding: [50, 50] });
  }
  return null;
}

const TrackBus = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [routeData, setRouteData] = useState(null);
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [routesList, setRoutesList] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState('');

  // Detail Panel States
  const [activeDirection, setActiveDirection] = useState('OUTBOUND');
  const [activeTab, setActiveTab] = useState('stops');

  useEffect(() => {
    fetchAllRoutes();
  }, []);

  const fetchAllRoutes = async () => {
    setListLoading(true);
    try {
      const res = await api.get('/api/public/routes');
      console.log('API Response for /api/public/routes:', res.data);
      // The backend returns { success: true, data: { routes: [...] } } or { ok: true, routes: [...] }
      const data = res.data;
      const routes = data?.data?.routes || data?.data || data?.routes || data || [];
      console.log('Parsed routes array:', routes);
      setRoutesList(Array.isArray(routes) ? routes : []);
    } catch (err) {
      console.error("Error fetching all routes:", err);
      setRoutesList([]);
    } finally {
      setListLoading(false);
    }
  };

  const handleRouteSelect = async (routeId) => {
    setLoading(true);
    setError('');
    setRouteData(null);
    setGeoJsonData(null);
    setActiveDirection('OUTBOUND');
    setActiveTab('stops');

    try {
      // Fetch the route details
      const detailRes = await api.get(`/api/public/routes/${routeId}`);
      const routeDetail = detailRes.data.route || detailRes.data.data;
      setRouteData(routeDetail);

      // Fetch the GeoJSON for the map
      const geoRes = await api.get(`/api/public/routes/${routeId}/geojson`);
      if (geoRes.data.success && geoRes.data.data) {
        setGeoJsonData(geoRes.data.data);
      } else {
        setError('No map data available for this route.');
      }
    } catch (err) {
      console.error("Error fetching route details:", err);
      setError('An error occurred while fetching route data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 60 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      fetchAllRoutes();
      return;
    }

    setListLoading(true);
    setRouteData(null);
    setGeoJsonData(null);
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
        // Auto select if only 1 matches
        handleRouteSelect(parsedRoutes[0].id || parsedRoutes[0]._id);
      }
    } catch (err) {
      console.error("Error searching routes:", err);
      setError('Lỗi kết nối khi tìm kiếm.');
      setRoutesList([]);
    } finally {
      setListLoading(false);
    }
  };

  // Extract coordinates for Polyline and Bounds from GeoJSON
  let mapPositions = [];
  if (geoJsonData && geoJsonData.features) {
    // GeoJSON is typically [lng, lat], Leaflet wants [lat, lng]
    // Filter and map to [lat, lng]
    mapPositions = geoJsonData.features.map(f => {
      const [lng, lat] = f.geometry.coordinates;
      return [lat, lng];
    });
  }

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
    >
      <div className='flex flex-col md:flex-row w-full h-[calc(100vh-76px)] bg-white overflow-hidden'>

        {/* Sidebar (35%) */}
        <div className="w-full md:w-[35%] bg-gradient-to-br from-[#003366] to-[#004080] text-white p-6 overflow-y-auto shadow-[2px_0_10px_rgba(0,0,0,0.1)] flex flex-col z-0">
          <h2 className="text-2xl font-bold mb-2">🚌 Tra Cứu Tuyến</h2>
          <p className="text-sm opacity-90 mb-6">Tìm tuyến xe và xem lộ trình trên bản đồ</p>

          {/* Search Section */}
          <div className="bg-white/10 p-4 rounded-lg mb-5">
            <label className="block text-xs font-semibold mb-2 uppercase tracking-wide opacity-95">TÌM KIẾM TUYẾN</label>
            <form onSubmit={handleSearch} className="flex flex-col gap-3">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder='Nhập số tuyến hoặc tên...'
                  className='w-full p-3 rounded-md text-sm bg-white text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/30 transition-shadow'
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full bg-[#ff6b35] text-white rounded-md px-4 py-3 hover:bg-[#ff5722] hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(255,107,53,0.3)] font-semibold text-sm transition-all cursor-pointer ${loading ? 'opacity-70' : ''}`}
              >
                {loading ? 'Đang tìm...' : '🔍 Tìm Kiếm'}
              </button>
            </form>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 text-white text-sm rounded-lg">
              {error}
            </div>
          )}

          {/* Results Section */}
          <div className="flex-1 flex flex-col min-h-0">
            <h3 className="text-[15px] font-semibold mb-3 uppercase tracking-wide opacity-95">Danh sách tuyến</h3>
            <div className="overflow-y-auto flex-1 pr-1 custom-scrollbar">
              {listLoading ? (
                <div className="text-center p-5 opacity-80">
                  <div className="animate-spin inline-block w-6 h-6 border-[3px] border-current border-t-transparent text-white rounded-full" role="status" aria-label="loading"></div>
                </div>
              ) : routesList.length > 0 ? (
                routesList.map((route, idx) => {
                  const isActive = routeData && (routeData.id === route._id || routeData._id === route._id);
                  return (
                    <div
                      key={route._id || idx}
                      onClick={() => handleRouteSelect(route._id || route.id)}
                      className={`mb-2 p-3.5 rounded-lg cursor-pointer transition-all border-l-4 ${isActive ? 'bg-white text-[#003366] border-[#ff6b35]' : 'bg-white/10 border-[#ff6b35] hover:bg-white/20 hover:translate-x-1 text-white'}`}
                    >
                      <div className={`font-bold text-[17px] ${isActive ? 'text-[#ff6b35]' : 'text-[#ff6b35]'}`}>
                        {route.routeNumber}
                      </div>
                      <div className={`text-xs mt-1 ${isActive ? 'text-gray-600' : 'text-white opacity-85'}`}>
                        {route.name}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center p-6 opacity-70 text-[13px]">
                  Không có tuyến xe nào để hiển thị
                </div>
              )}
            </div>
          </div>

          {/* Navigation/Other sidebar info removed since Detail Panel exists on Map */}
        </div>

        {/* Map Area (65%) */}
        <div className="w-full md:w-[65%] h-[500px] md:h-full relative z-0">
          <MapContainer
            center={mapPositions.length > 0 ? mapPositions[0] : [16.0544, 108.2022]} // Default Da Nang
            zoom={13}
            scrollWheelZoom={true}
            className="w-full h-full z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {geoJsonData && mapPositions.length > 0 && (
              <Polyline positions={mapPositions} color="#ff6b35" weight={5} opacity={0.8} />
            )}

            {geoJsonData && geoJsonData.features && geoJsonData.features.map((feature, idx) => {
              const [lng, lat] = feature.geometry.coordinates;
              const isTerminal = feature.properties.isTerminal;
              return (
                <Marker
                  key={feature.properties.id || idx}
                  position={[lat, lng]}
                  opacity={isTerminal ? 1 : 0.7}
                >
                  <Popup>
                    <div className="font-sans">
                      <h3 className="font-bold text-[#003366] mb-1 text-[15px]">{feature.properties.name}</h3>
                      {feature.properties.address && (
                        <p className="text-xs text-gray-600 mb-1">{feature.properties.address}</p>
                      )}
                      {isTerminal && (
                        <span className="inline-block bg-[#ff6b35] text-white text-[10px] uppercase px-2 py-0.5 rounded-full font-bold mt-1 shadow-sm">
                          Trạm Cuối
                        </span>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {mapPositions.length > 0 && <ChangeView bounds={mapPositions} />}
          </MapContainer>

          {routeData && (
            <div className="absolute top-5 left-5 w-[320px] bg-white rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.2)] z-[1000] overflow-hidden flex flex-col font-sans max-h-[80vh]">
              <div className="bg-gradient-to-br from-[#003366] to-[#004080] text-white p-4 border-b-[3px] border-[#ff6b35]">
                <h3 className="text-base font-bold m-0 mb-1">{routeData.name}</h3>
                <p className="text-xs m-0 opacity-90">Số hiệu: {routeData.routeNumber}</p>
              </div>

              {/* Direction Toggle */}
              <div className="flex gap-2.5 p-3.5 bg-gray-50 border-b border-gray-100">
                <button
                  onClick={() => setActiveDirection('OUTBOUND')}
                  className={`flex-1 py-2 px-1 border-2 rounded-md text-[13px] font-semibold transition-all ${activeDirection === 'OUTBOUND' ? 'bg-[#003366] text-white border-[#003366]' : 'bg-white text-gray-800 border-gray-200 hover:border-[#003366]'}`}
                >
                  📍 Lượt đi
                </button>
                <button
                  onClick={() => setActiveDirection('INBOUND')}
                  className={`flex-1 py-2 px-1 border-2 rounded-md text-[13px] font-semibold transition-all ${activeDirection === 'INBOUND' ? 'bg-[#003366] text-white border-[#003366]' : 'bg-white text-gray-800 border-gray-200 hover:border-[#003366]'}`}
                >
                  🔙 Lượt về
                </button>
              </div>

              {/* Tabs Header */}
              <div className="p-3.5 flex flex-col min-h-0">
                <div className="flex gap-2 border-b-2 border-gray-100 mb-3.5">
                  <button
                    onClick={() => setActiveTab('stops')}
                    className={`flex-1 py-2 px-2 bg-transparent border-none text-[12px] font-semibold cursor-pointer transition-all border-b-[3px] relative -bottom-[2px] ${activeTab === 'stops' ? 'text-[#003366] border-[#ff6b35]' : 'text-gray-500 border-transparent hover:text-gray-800'}`}
                  >
                    Trạm dừng
                  </button>
                  <button
                    onClick={() => setActiveTab('info')}
                    className={`flex-1 py-2 px-2 bg-transparent border-none text-[12px] font-semibold cursor-pointer transition-all border-b-[3px] relative -bottom-[2px] ${activeTab === 'info' ? 'text-[#003366] border-[#ff6b35]' : 'text-gray-500 border-transparent hover:text-gray-800'}`}
                  >
                    Thông tin
                  </button>
                  <button
                    onClick={() => setActiveTab('reviews')}
                    className={`flex-1 py-2 px-2 bg-transparent border-none text-[12px] font-semibold cursor-pointer transition-all border-b-[3px] relative -bottom-[2px] ${activeTab === 'reviews' ? 'text-[#003366] border-[#ff6b35]' : 'text-gray-500 border-transparent hover:text-gray-800'}`}
                  >
                    Đánh giá
                  </button>
                </div>

                {/* Tabs Content */}
                <div className="overflow-y-auto max-h-[250px] text-[13px] text-gray-800 custom-scrollbar pr-1">

                  {/* Stops Tab */}
                  {activeTab === 'stops' && (
                    <div className="flex flex-col gap-2">
                      {routeData.stops && routeData.stops.filter(s => s.direction === activeDirection).length > 0 ? (
                        routeData.stops
                          .filter(s => s.direction === activeDirection)
                          .sort((a, b) => a.orderIndex - b.orderIndex)
                          .map((stop, idx) => (
                            <div key={idx} className="p-2.5 bg-gray-50 rounded-md border-l-[3px] border-[#ff6b35] flex gap-2.5">
                              <div className="flex items-center justify-center bg-[#ff6b35] text-white w-7 h-7 rounded-full font-bold text-xs shrink-0">
                                {idx + 1}
                              </div>
                              <div className="flex-1">
                                <span className="font-semibold text-[#003366] block mb-0.5">{stop.stopId?.name || 'Trạm chờ'}</span>
                                {stop.stopId?.address && <span className="text-[11px] text-gray-500 leading-tight block">{stop.stopId.address}</span>}
                              </div>
                            </div>
                          ))
                      ) : (
                        <div className="text-center p-5 text-gray-400 italic">Không có trạm dừng cho chiều này.</div>
                      )}
                    </div>
                  )}

                  {/* Info Tab */}
                  {activeTab === 'info' && (
                    <div className="flex flex-col">
                      <div className="py-2.5 border-b border-gray-100 flex flex-col">
                        <span className="font-semibold text-[#003366] text-xs mb-1">Số hiệu tuyến:</span>
                        <span className="text-gray-600 font-medium">{routeData.routeNumber}</span>
                      </div>
                      <div className="py-2.5 border-b border-gray-100 flex flex-col">
                        <span className="font-semibold text-[#003366] text-xs mb-1">Khoảng cách:</span>
                        <span className="text-gray-600 font-medium">{routeData.distance || '--'} km</span>
                      </div>
                      <div className="py-2.5 border-b border-gray-100 flex flex-col">
                        <span className="font-semibold text-[#003366] text-xs mb-1">Thời gian hoạt động:</span>
                        <span className="text-gray-600 font-medium">
                          {routeData.operationTime
                            ? (typeof routeData.operationTime === 'object'
                              ? `${routeData.operationTime.start || ''} - ${routeData.operationTime.end || ''}`
                              : routeData.operationTime)
                            : '--'}
                        </span>
                      </div>
                      <div className="py-2.5 pt-2.5 flex flex-col">
                        <span className="font-semibold text-[#003366] text-xs mb-1">Hướng đi:</span>
                        <span className="text-gray-600 font-medium">{activeDirection === 'OUTBOUND' ? 'Lượt đi' : 'Lượt về'}</span>
                      </div>
                    </div>
                  )}

                  {/* Reviews Tab */}
                  {activeTab === 'reviews' && (
                    <div className="text-center p-5 text-gray-400 italic">
                      Chưa có đánh giá. Hãy là người đầu tiên!
                    </div>
                  )}

                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default TrackBus;