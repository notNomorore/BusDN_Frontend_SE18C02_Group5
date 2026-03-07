import React, { useContext, useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import { FaBus, FaTachometerAlt, FaMapMarkedAlt, FaCalendarAlt, FaUsersCog, FaList, FaUserPlus, FaIdCard, FaChartLine, FaBoxOpen, FaBullhorn, FaDollarSign, FaClipboardList } from 'react-icons/fa';
import api from '../../utils/api';

const AdminLayout = () => {
    const { userRole, token, logout } = useContext(AuthContext);
    const location = useLocation();
    const navigate = useNavigate();
    const path = location.pathname;

    const [pendingCount, setPendingCount] = useState(0);
    const [showStaffSubmenu, setShowStaffSubmenu] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        if (!token || (userRole !== 'ADMIN' && userRole !== 'STAFF')) {
            navigate('/');
        }
    }, [token, userRole, navigate]);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const res = await api.get('/api/user/profile');
                if (res.data.ok) {
                    setUser(res.data.user);
                }
            } catch (err) {
                console.error("Error fetching admin profile:", err);
            }
        };

        const fetchPendingCount = async () => {
            try {
                // Future API integration
            } catch (err) {
                console.error(err);
            }
        };

        if (token && (userRole === 'ADMIN' || userRole === 'STAFF')) {
            fetchUserData();
            if (userRole === 'ADMIN') {
                fetchPendingCount();
            }
        }
    }, [token, userRole]);

    useEffect(() => {
        if (path.includes('/admin/staff')) {
            setShowStaffSubmenu(true);
        }
    }, [path]);

    const isActive = (routePath) => {
        if (routePath === '/admin/dashboard' && path === '/admin') return true;
        return path.startsWith(routePath);
    };

    const menuItems = [
        { name: 'Tổng quan', path: '/admin/dashboard', icon: <FaTachometerAlt className="w-5 h-5" /> },
        { name: 'Quản lý Tuyến', path: '/admin/routes', icon: <FaMapMarkedAlt className="w-5 h-5" /> },
        { name: 'Điều phối Lịch', path: '/admin/schedules', icon: <FaCalendarAlt className="w-5 h-5" /> },
        { name: 'Giám sát Đội xe', path: '/admin/fleet-status', icon: <FaBus className="w-5 h-5" /> },
        { name: 'Nhật ký Chuyến', path: '/admin/trip-logs', icon: <FaClipboardList className="w-5 h-5" /> },
        { name: 'Mất đồ / Nhặt', path: '/admin/lost-and-found', icon: <FaBoxOpen className="w-5 h-5" /> },
        { name: 'Gửi Thông báo', path: '/admin/broadcast', icon: <FaBullhorn className="w-5 h-5" /> },
        { name: 'Bảng giá vé', path: '/admin/fare-matrix', icon: <FaDollarSign className="w-5 h-5" /> },
    ];

    if (!token || (userRole !== 'ADMIN' && userRole !== 'STAFF')) return null;

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden text-gray-800 font-sans">
            {/* Sidebar */}
            <div className="w-64 bg-[#343a40] text-white flex flex-col flex-shrink-0 shadow-xl z-20">
                <div className="p-4 border-b border-gray-600">
                    <Link to="/admin/dashboard" className="flex items-center text-white text-xl font-bold gap-3 outline-none">
                        <FaBus className="text-[#23a983]" /> BusDN Admin
                    </Link>
                </div>

                <div className="flex-1 overflow-y-auto py-4">
                    <ul className="space-y-1 font-medium">
                        {menuItems.map((item) => (
                            <li key={item.path}>
                                <Link
                                    to={item.path}
                                    className={`flex items-center gap-3 px-6 py-3 transition-colors ${isActive(item.path) ? 'bg-[#495057] text-[#23a983] border-l-4 border-[#23a983]' : 'text-gray-300 hover:bg-[#495057] hover:text-white border-l-4 border-transparent'
                                        }`}
                                >
                                    {item.icon}
                                    {item.name}
                                </Link>
                            </li>
                        ))}

                        {/* Staff Menu */}
                        <li>
                            <button
                                onClick={() => setShowStaffSubmenu(!showStaffSubmenu)}
                                className={`w-full flex justify-between items-center px-6 py-3 transition-colors ${path.includes('/admin/staff') ? 'bg-[#495057] text-[#23a983] border-l-4 border-[#23a983]' : 'text-gray-300 hover:bg-[#495057] hover:text-white border-l-4 border-transparent'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <FaUsersCog className="w-5 h-5" />
                                    <span>Nhân sự</span>
                                </div>
                                <span className="text-xs transition-transform duration-200" style={{ transform: showStaffSubmenu ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
                            </button>

                            {/* Submenu */}
                            {showStaffSubmenu && (
                                <ul className="bg-[#2c3136] py-2 space-y-1 border-l-4 border-transparent">
                                    <li>
                                        <Link
                                            to="/admin/staff"
                                            className={`flex items-center gap-3 pl-14 pr-6 py-2 text-sm transition-colors ${path === '/admin/staff' ? 'text-[#23a983] font-bold' : 'text-gray-400 hover:text-white'
                                                }`}
                                        >
                                            <FaList /> Danh sách
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            to="/admin/staff/create"
                                            className={`flex items-center gap-3 pl-14 pr-6 py-2 text-sm transition-colors ${path === '/admin/staff/create' ? 'text-[#23a983] font-bold' : 'text-gray-400 hover:text-white'
                                                }`}
                                        >
                                            <FaUserPlus /> Tạo tài khoản
                                        </Link>
                                    </li>
                                </ul>
                            )}
                        </li>

                        {/* Priority Profiles */}
                        <li>
                            <Link
                                to="/admin/priority-profiles"
                                className={`flex items-center justify-between px-6 py-3 transition-colors ${isActive('/admin/priority-profiles') ? 'bg-[#495057] text-[#23a983] border-l-4 border-[#23a983]' : 'text-gray-300 hover:bg-[#495057] hover:text-white border-l-4 border-transparent'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <FaIdCard className="w-5 h-5" />
                                    <span>Duyệt hồ sơ</span>
                                </div>
                                {pendingCount > 0 && (
                                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                        !
                                    </span>
                                )}
                            </Link>
                        </li>

                        {/* Reports */}
                        <li>
                            <Link
                                to="/admin/reports"
                                className={`flex items-center gap-3 px-6 py-3 transition-colors ${isActive('/admin/reports') ? 'bg-[#495057] text-[#23a983] border-l-4 border-[#23a983]' : 'text-gray-300 hover:bg-[#495057] hover:text-white border-l-4 border-transparent'
                                    }`}
                            >
                                <FaChartLine className="w-5 h-5" />
                                <span>Báo cáo Doanh thu</span>
                            </Link>
                        </li>
                    </ul>
                </div>

                {/* User Profile Footer */}
                <div className="p-4 border-t border-gray-600 bg-[#2b3035]">
                    <div className="flex items-center gap-3 w-full text-left outline-none cursor-pointer">
                        <div className="h-10 w-10 rounded-full bg-gray-500 flex items-center justify-center overflow-hidden border-2 border-transparent hover:border-[#23a983] transition-colors">
                            {user?.avatar ? (
                                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-sm font-bold">{user?.fullName?.charAt(0) || 'A'}</span>
                            )}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-semibold truncate group-hover:text-white">{user?.fullName || 'Admin'}</p>
                            <button onClick={() => { logout(); navigate('/') }} className="text-xs text-red-400 hover:text-red-300 transition-colors">Đăng xuất</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#f8f9fa]">

                {/* Top Notification Banner (If Any Pending Profiles) */}
                {pendingCount > 0 && (
                    <div className="bg-[#fff3cd] border-b border-[#ffe69c] text-[#664d03] px-6 py-3 font-semibold flex items-center justify-between shadow-sm z-10">
                        <span>Có {pendingCount} hồ sơ ưu tiên đang chờ duyệt</span>
                        <Link to="/admin/priority-profiles" className="text-blue-600 hover:underline text-sm font-bold">Xem ngay</Link>
                    </div>
                )}

                {/* Dynamic Page Content */}
                <div className="flex-1 overflow-y-auto p-6 lg:p-8">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default AdminLayout;
