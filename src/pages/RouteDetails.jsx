import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import CircularProgress from '@mui/material/CircularProgress';
import { IoArrowBackOutline, IoLocationOutline } from "react-icons/io5";
import { TbMap2 } from "react-icons/tb";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useDialog } from '../context/DialogContext';

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

function ChangeView({ bounds }) {
    const map = useMap();
    if (bounds && bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50] });
    }
    return null;
}

const RouteDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [route, setRoute] = useState(null);
    const [geoJsonData, setGeoJsonData] = useState(null);
    const [loading, setLoading] = useState(true);
    const { showAlert } = useDialog();

    useEffect(() => {
        const fetchRouteInfo = async () => {
            try {
                // Fetch basic route info with stops array
                const res = await api.get(`/api/routes/${id}`);
                if (res.data.ok) {
                    setRoute(res.data.route);
                }

                // Fetch GeoJSON for the map
                const geoRes = await api.get(`/api/public/routes/${id}/geojson`);
                if (geoRes.data.success && geoRes.data.data) {
                    setGeoJsonData(geoRes.data.data);
                }
            } catch (err) {
                console.error("Error fetching route info:", err.message);
                if (err.name !== "AbortError") {
                    showAlert("Failed to fetch route info.", "Lỗi");
                }
            } finally {
                setLoading(false);
            }
        }
        fetchRouteInfo();
    }, [id]);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-[#f5fefa]">
                <CircularProgress style={{ color: '#23a983' }} />
            </div>
        );
    }

    if (!route) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen bg-[#f5fefa]">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Route Not Found</h2>
                <button
                    onClick={() => navigate(-1)}
                    className="bg-[#23a983] text-white px-6 py-2 rounded-lg font-semibold"
                >
                    Go Back
                </button>
            </div>
        );
    }

    // Extract map coordinates
    let mapPositions = [];
    if (geoJsonData && geoJsonData.features) {
        mapPositions = geoJsonData.features.map(f => {
            const [lng, lat] = f.geometry.coordinates;
            return [lat, lng];
        });
    }

    return (
        <div className="min-h-screen bg-[#f5fefa] py-8 px-4 md:px-12">
            <div className="max-w-6xl mx-auto">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center text-gray-600 hover:text-[#23a983] mb-6 font-semibold transition-colors disabled:opacity-50"
                >
                    <IoArrowBackOutline className="mr-2 text-xl" />
                    Back to List
                </button>

                <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 mb-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-6 mb-6">
                        <div className="flex items-center gap-4">
                            <div className="bg-[#23a983] text-white font-bold text-3xl px-6 py-3 rounded-xl shadow-md">
                                {route.routeNumber}
                            </div>
                            <div>
                                <h1 className="font-bold text-2xl md:text-3xl text-gray-800">{route.name}</h1>
                                <p className="text-gray-500 font-medium mt-1 flex items-center">
                                    <TbMap2 className="mr-1" /> Operation Time: {route.operationTime || '--'}
                                </p>
                            </div>
                        </div>
                        <div className="bg-green-50 text-green-700 font-bold px-4 py-2 rounded-lg mt-4 md:mt-0 text-lg border border-green-200">
                            {route.distance || '--'} km
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Map Section */}
                        <div className="w-full h-[500px] bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
                            {geoJsonData && mapPositions.length > 0 ? (
                                <MapContainer
                                    center={mapPositions[0]}
                                    zoom={13}
                                    scrollWheelZoom={true}
                                    className="h-full w-full z-0 relative"
                                >
                                    <TileLayer
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                    <Polyline positions={mapPositions} color="#059669" weight={5} opacity={0.8} />

                                    {geoJsonData.features.map((feature, idx) => {
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
                                                        <h3 className="font-bold text-[#101828] mb-1">{feature.properties.name}</h3>
                                                        <p className="text-sm text-gray-600">{feature.properties.address}</p>
                                                    </div>
                                                </Popup>
                                            </Marker>
                                        );
                                    })}
                                    <ChangeView bounds={mapPositions} />
                                </MapContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-500">
                                    <p>Map data not available for this route</p>
                                </div>
                            )}
                        </div>

                        {/* Timeline Section */}
                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 max-h-[500px] overflow-y-auto">
                            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center sticky top-0 bg-gray-50 py-2 z-10">
                                <IoLocationOutline className="mr-2 text-[#23a983]" /> Route Stops ({route.stops?.length || 0})
                            </h2>

                            <div className="relative border-l-2 border-[#23a983] ml-4 md:ml-6 mt-4">
                                {route.stops && route.stops.map((stop, index) => (
                                    <div key={stop.stopId || index} className="mb-8 ml-6 relative">
                                        <span className={`absolute flex items-center justify-center w-5 h-5 rounded-full -left-[35px] ring-4 ring-gray-50 ${stop.isTerminal ? 'bg-red-500' : 'bg-[#23a983]'}`}>
                                            <div className="w-2 h-2 bg-white rounded-full"></div>
                                        </span>

                                        <h3 className="flex items-center mb-1 text-lg font-bold text-gray-900">
                                            {stop.name}
                                            {stop.isTerminal && (
                                                <span className="bg-red-100 text-red-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded ml-3">Terminal</span>
                                            )}
                                        </h3>
                                        <time className="block mb-2 text-sm font-normal leading-none text-gray-500">
                                            {stop.address || 'Address not listed'}
                                        </time>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RouteDetails;
