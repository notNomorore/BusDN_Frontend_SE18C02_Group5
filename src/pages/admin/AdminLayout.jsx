import React, { useContext, useEffect, useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  FaBus,
  FaTachometerAlt,
  FaMapMarkedAlt,
  FaCalendarAlt,
  FaUsersCog,
  FaList,
  FaUserPlus,
  FaIdCard,
  FaChartLine,
  FaBoxOpen,
  FaBullhorn,
  FaDollarSign,
  FaClipboardList,
  FaComments,
  FaFileImport,
} from 'react-icons/fa'
import AuthContext from '../../context/AuthContext'
import api from '../../utils/api'

const AdminLayout = () => {
  const { userRole, token, logout } = useContext(AuthContext)
  const location = useLocation()
  const navigate = useNavigate()
  const path = location.pathname

  const [pendingCount, setPendingCount] = useState(0)
  const [showStaffSubmenu, setShowStaffSubmenu] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    if (!token || (userRole !== 'ADMIN' && userRole !== 'STAFF')) {
      navigate('/')
    }
  }, [token, userRole, navigate])

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await api.get('/api/user/profile')
        if (res.data.ok) {
          setUser(res.data.user)
        }
      } catch (err) {
        console.error('Error fetching admin profile:', err)
      }
    }

    if (token && (userRole === 'ADMIN' || userRole === 'STAFF')) {
      fetchUserData()
    }
  }, [token, userRole])

  useEffect(() => {
    if (path.includes('/admin/staff')) {
      setShowStaffSubmenu(true)
    }
  }, [path])

  const isActive = (routePath) => {
    if (routePath === '/admin/dashboard' && path === '/admin') return true
    return path.startsWith(routePath)
  }

  const navItemClass = (active) => (
    `mx-3 flex items-center gap-3 rounded-xl px-4 py-3 transition-all ${
      active
        ? 'bg-[#495057] text-white shadow-[0_2px_8px_rgba(0,0,0,0.18)]'
        : 'text-gray-300 hover:bg-[#495057] hover:text-white'
    }`
  )

  const subNavItemClass = (active) => (
    `mx-3 flex items-center gap-3 rounded-lg pl-11 pr-4 py-2.5 text-sm transition-all ${
      active
        ? 'bg-[#3b4249] text-white'
        : 'text-gray-400 hover:bg-[#3b4249] hover:text-white'
    }`
  )

  const menuItems = [
    { name: 'Tong quan', path: '/admin/dashboard', icon: <FaTachometerAlt className="w-5 h-5" /> },
    { name: 'Quan ly tuyen', path: '/admin/routes', icon: <FaMapMarkedAlt className="w-5 h-5" /> },
    { name: 'Dieu phoi lich', path: '/admin/schedules', icon: <FaCalendarAlt className="w-5 h-5" /> },
    { name: 'Giam sat doi xe', path: '/admin/fleet-status', icon: <FaBus className="w-5 h-5" /> },
    { name: 'Nhat ky chuyen', path: '/admin/trip-logs', icon: <FaClipboardList className="w-5 h-5" /> },
    { name: 'Lost and found', path: '/admin/lost-and-found', icon: <FaBoxOpen className="w-5 h-5" /> },
    { name: 'Thong bao', path: '/admin/broadcast', icon: <FaBullhorn className="w-5 h-5" /> },
    { name: 'Bang gia ve', path: '/admin/fare-matrix', icon: <FaDollarSign className="w-5 h-5" /> },
  ]

  if (!token || (userRole !== 'ADMIN' && userRole !== 'STAFF')) return null

  return (
    <div className="admin-shell">
      <aside className="fixed inset-y-0 left-0 z-30 flex h-screen w-60 flex-col overflow-hidden bg-[#343a40] text-white shadow-[0_12px_32px_rgba(15,23,42,0.16)]">
        <div className="px-5 py-5">
          <Link to="/admin/dashboard" className="flex items-center gap-3 text-xl font-bold text-white outline-none">
            <FaBus className="text-[#23a983]" /> BusDN Admin
          </Link>
        </div>

        <div className="admin-sidebar-scroll flex-1 min-h-0 py-2">
          <ul className="space-y-1 font-medium">
            {menuItems.map((item) => (
              <li key={item.path}>
                <Link to={item.path} className={navItemClass(isActive(item.path))}>
                  {item.icon}
                  {item.name}
                </Link>
              </li>
            ))}

            <li className="pt-1">
              <button
                onClick={() => setShowStaffSubmenu((current) => !current)}
                className={`${navItemClass(path.includes('/admin/staff'))} w-[calc(100%-1.5rem)] justify-between`}
              >
                <span className="flex items-center gap-3">
                  <FaUsersCog className="w-5 h-5" />
                  <span>Nhan su</span>
                </span>
                <span
                  className="text-xs transition-transform duration-200"
                  style={{ transform: showStaffSubmenu ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  ▼
                </span>
              </button>

              {showStaffSubmenu ? (
                <ul className="mt-2 space-y-1">
                  <li>
                    <Link to="/admin/staff" className={subNavItemClass(path === '/admin/staff')}>
                      <FaList />
                      Danh sach
                    </Link>
                  </li>
                  <li>
                    <Link to="/admin/staff/create" className={subNavItemClass(path === '/admin/staff/create')}>
                      <FaUserPlus />
                      Tao tai khoan
                    </Link>
                  </li>
                  <li>
                    <Link to="/admin/staff/import" className={subNavItemClass(path === '/admin/staff/import')}>
                      <FaFileImport />
                      Import file
                    </Link>
                  </li>
                </ul>
              ) : null}
            </li>

            <li className="pt-1">
              <Link to="/admin/priority-profiles" className={`${navItemClass(isActive('/admin/priority-profiles'))} justify-between`}>
                <span className="flex items-center gap-3">
                  <FaIdCard className="w-5 h-5" />
                  <span>Duyet ho so</span>
                </span>
                {pendingCount > 0 ? (
                  <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">!</span>
                ) : null}
              </Link>
            </li>

            <li>
              <Link to="/admin/reports" className={navItemClass(isActive('/admin/reports'))}>
                <FaChartLine className="w-5 h-5" />
                <span>Bao cao doanh thu</span>
              </Link>
            </li>

            <li>
              <Link to="/admin/feedback" className={navItemClass(isActive('/admin/feedback'))}>
                <FaComments className="w-5 h-5" />
                <span>Phan hoi khach hang</span>
              </Link>
            </li>
          </ul>
        </div>

        <div className="bg-[#2b3035] px-4 pb-4 pt-2">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-3">
            <div className="h-10 w-10 overflow-hidden rounded-full bg-gray-500">
              {user?.avatar ? (
                <img src={user.avatar} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-bold">
                  {user?.fullName?.charAt(0) || 'A'}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{user?.fullName || 'Admin'}</p>
              <button
                onClick={() => {
                  logout()
                  navigate('/')
                }}
                className="text-xs text-red-300 transition-colors hover:text-red-200"
              >
                Dang xuat
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="ml-60 min-h-screen overflow-x-hidden bg-[#f3f5f8]">
        {pendingCount > 0 ? (
          <div className="mx-6 mt-6 rounded-2xl bg-[#fff7db] px-6 py-3 text-sm font-semibold text-[#664d03] shadow-[0_2px_8px_rgba(0,0,0,0.05)] lg:mx-8">
            <div className="flex items-center justify-between gap-4">
              <span>Co {pendingCount} ho so uu tien dang cho duyet</span>
              <Link to="/admin/priority-profiles" className="text-blue-600 hover:underline">
                Xem ngay
              </Link>
            </div>
          </div>
        ) : null}

        <div className="min-h-screen px-5 py-5 lg:px-7 lg:py-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default AdminLayout
