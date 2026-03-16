import React, { useContext } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import { FaBus, FaCalendarAlt, FaExclamationTriangle, FaTachometerAlt, FaQrcode, FaSignOutAlt } from 'react-icons/fa';

const DriverLayout = () => {
    const { userRole, user, logout } = useContext(AuthContext);
    const { pathname } = useLocation();
    const navigate = useNavigate();

    const isDriver = userRole === 'DRIVER';
    const isConductor = userRole === 'CONDUCTOR';

    const isActive = (path) => pathname.startsWith(path);

    const driverMenu = [
        { path: '/driver/schedule', label: 'Lịch phân công', icon: <FaCalendarAlt /> },
        { path: '/driver/start-trip', label: 'Bắt đầu chuyến', icon: <FaTachometerAlt /> },
        { path: '/driver/incident', label: 'Báo cáo sự cố', icon: <FaExclamationTriangle /> },
    ];

    const conductorMenu = [
        { path: '/conductor/schedule', label: 'Lịch phân công', icon: <FaCalendarAlt /> },
        { path: '/conductor/validate-qr', label: 'Quét QR vé', icon: <FaQrcode /> },
        { path: '/conductor/full-load', label: 'Báo xe đầy', icon: <FaBus /> },
    ];

    const menu = isDriver ? driverMenu : conductorMenu;
    const rootPath = isDriver ? '/driver' : '/conductor';

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden text-gray-800 font-sans">
            {/* Sidebar */}
            <div className="w-60 bg-[#1a2e3b] text-white flex flex-col flex-shrink-0 shadow-xl z-20">
                <div className="p-4 border-b border-gray-600">
                    <Link to={`${rootPath}/schedule`} className="flex items-center text-white text-lg font-bold gap-2 outline-none">
                        <FaBus className="text-[#23a983]" />
                        {isDriver ? 'Tài xế' : 'Phụ xe'}
                    </Link>
                    <p className="text-xs text-gray-400 mt-1">BusDN Driver Portal</p>
                </div>

                <nav className="flex-1 py-4 space-y-1">
                    {menu.map(item => (
                        <Link key={item.path} to={item.path}
                            className={`flex items-center gap-3 px-5 py-3 transition-colors border-l-4 text-sm
                                ${isActive(item.path)
                                    ? 'bg-[#263d4d] text-[#23a983] border-[#23a983]'
                                    : 'text-gray-300 hover:bg-[#263d4d] hover:text-white border-transparent'}`}>
                            {item.icon}
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-600">
                    <button onClick={() => { logout(); navigate('/'); }}
                        className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm transition-colors">
                        <FaSignOutAlt /> Đăng xuất
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-[#f4f7f9]">
                <Outlet />
            </div>
        </div>
    );
};

export default DriverLayout;
