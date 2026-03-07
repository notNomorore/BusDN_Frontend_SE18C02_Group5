import React from 'react';
import { FaRoute, FaBus, FaExclamationTriangle, FaMoneyBillWave, FaMapMarkerAlt, FaMap } from 'react-icons/fa';

const Dashboard = () => {
    return (
        <div className="space-y-6">
            <div className="flex justify-between flex-wrap items-center pb-2 border-b border-gray-200">
                <h1 className="text-2xl font-bold text-gray-800">Dashboard Tổng Quan</h1>
            </div>

            {/* Top Value Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-blue-600 rounded-xl p-5 text-white shadow-sm flex justify-between items-center bg-gradient-to-br from-blue-500 to-blue-700">
                    <div>
                        <h5 className="text-blue-100 font-medium text-sm uppercase tracking-wider">Tổng Tuyến</h5>
                        <h3 className="text-3xl font-bold mt-1">12</h3>
                    </div>
                    <FaRoute className="text-5xl opacity-30" />
                </div>

                <div className="bg-green-600 rounded-xl p-5 text-white shadow-sm flex justify-between items-center bg-gradient-to-br from-green-500 to-[#23a983]">
                    <div>
                        <h5 className="text-green-100 font-medium text-sm uppercase tracking-wider">Xe Đang Chạy</h5>
                        <h3 className="text-3xl font-bold mt-1">45/50</h3>
                    </div>
                    <FaBus className="text-5xl opacity-30" />
                </div>

                <div className="bg-yellow-500 rounded-xl p-5 text-yellow-900 shadow-sm flex justify-between items-center bg-gradient-to-br from-yellow-400 to-yellow-500">
                    <div>
                        <h5 className="text-yellow-800 font-medium text-sm uppercase tracking-wider">Cảnh báo</h5>
                        <h3 className="text-3xl font-bold mt-1">2</h3>
                    </div>
                    <FaExclamationTriangle className="text-5xl opacity-20" />
                </div>

                <div className="bg-purple-600 rounded-xl p-5 text-white shadow-sm flex justify-between items-center bg-gradient-to-br from-purple-500 to-purple-700">
                    <div>
                        <h5 className="text-purple-100 font-medium text-sm uppercase tracking-wider">Doanh thu (Hôm nay)</h5>
                        <h3 className="text-3xl font-bold mt-1">12.5 tr</h3>
                    </div>
                    <FaMoneyBillWave className="text-5xl opacity-30" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Map Placeholder */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-full flex flex-col overflow-hidden">
                        <div className="bg-gray-50 px-5 py-4 border-b border-gray-100 font-bold text-gray-700 flex items-center">
                            <FaMapMarkerAlt className="text-red-500 mr-2" /> Giám sát đội xe (Real-time Fleet Map)
                        </div>
                        <div className="flex-1 bg-gray-100 min-h-[400px] flex items-center justify-center text-gray-400">
                            <div className="text-center">
                                <FaMap className="text-6xl mx-auto mb-4 opacity-50" />
                                <p className="font-medium px-4">[Khu vực hiển thị Bản đồ số và Vị trí xe theo thời gian thực]</p>
                                <p className="text-sm mt-2 opacity-75">Tích hợp từ React-Leaflet</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Live Status Feed */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-full">
                        <div className="bg-gray-50 px-5 py-4 border-b border-gray-100 font-bold text-gray-700">
                            Trạng thái chuyến gần nhất
                        </div>
                        <div className="p-0">
                            <ul className="divide-y divide-gray-100 text-sm">
                                <li className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                    <div className="font-semibold text-gray-800">
                                        <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded mr-2 text-xs">R16</span>
                                        43B-123.45
                                    </div>
                                    <span className="text-green-600 font-medium">Đang chạy (40km/h)</span>
                                </li>
                                <li className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                    <div className="font-semibold text-gray-800">
                                        <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded mr-2 text-xs">R05</span>
                                        43B-999.88
                                    </div>
                                    <span className="text-yellow-600 font-medium">Sắp về bến</span>
                                </li>
                                <li className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                    <div className="font-semibold text-gray-800">
                                        <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded mr-2 text-xs">R11</span>
                                        43B-567.99
                                    </div>
                                    <span className="text-red-600 font-medium font-bold">Mất tín hiệu GPS</span>
                                </li>
                                <li className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                    <div className="font-semibold text-gray-800">
                                        <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded mr-2 text-xs">R16</span>
                                        43B-111.22
                                    </div>
                                    <span className="text-green-600 font-medium">Đang chạy (35km/h)</span>
                                </li>
                                <li className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                    <div className="font-semibold text-gray-800">
                                        <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded mr-2 text-xs">R12</span>
                                        43B-444.22
                                    </div>
                                    <span className="text-yellow-600 font-medium">Đang chuẩn bị</span>
                                </li>
                                <li className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                    <div className="font-semibold text-gray-800">
                                        <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded mr-2 text-xs">R02</span>
                                        43B-666.22
                                    </div>
                                    <span className="text-green-600 font-medium">Đang chạy (30km/h)</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
