import React, { useState, useEffect, useContext } from 'react'
import { Link } from 'react-router-dom'
import { FaSearch, FaUserPlus, FaLock, FaLockOpen, FaPhone, FaUpload, FaKey, FaEnvelope } from 'react-icons/fa'
import AuthContext from '../../context/AuthContext'
import { useDialog } from '../../context/DialogContext'
import { fetchStaffList, createStaff, toggleStaffLock, resetStaffPassword } from '../../services/staffService'

const ROLE_LABELS = { DRIVER: 'Lái xe', CONDUCTOR: 'Phụ xe', ADMIN: 'Quản trị' }
const ROLE_COLORS = {
  DRIVER: 'bg-blue-100 text-blue-700',
  CONDUCTOR: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-orange-100 text-orange-700',
}

const AdminUsers = () => {
  const { showAlert, showConfirm } = useDialog()
  const { token } = useContext(AuthContext)

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newStaff, setNewStaff] = useState({ fullName: '', email: '', phone: '', role: 'DRIVER' })
  const [creating, setCreating] = useState(false)
  const [createdAccount, setCreatedAccount] = useState(null)

  // Reset password modal
  const [resetTarget, setResetTarget] = useState(null)
  const [resetting, setResetting] = useState(false)
  const [resetResult, setResetResult] = useState(null)

  useEffect(() => { loadUsers() }, [page, roleFilter])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const data = await fetchStaffList({ page, role: roleFilter, search })
      if (data.ok) {
        setUsers(data.users)
        setTotalPages(data.totalPages)
      }
    } catch (err) {
      console.error('Error fetching users:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    loadUsers()
  }

  const handleToggleLock = (userId, currentStatus) => {
    const action = currentStatus === 'LOCKED' ? 'mở khóa' : 'khóa'
    showConfirm(`Bạn có chắc muốn ${action} tài khoản này?`, async () => {
      try {
        const data = await toggleStaffLock(userId)
        if (data.ok) {
          setUsers((prev) => prev.map((u) =>
            u._id === userId ? { ...u, status: data.user.status, isLocked: data.user.isLocked } : u
          ))
        }
      } catch (err) {
        showAlert(err.response?.data?.message || 'Lỗi khi thay đổi trạng thái', 'Lỗi')
      }
    })
  }

  const handleCreateStaff = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      const data = await createStaff(newStaff)
      if (data.ok) {
        if (data.emailSent) {
          showAlert('Tài khoản đã tạo. Thông tin đăng nhập đã gửi qua email.', 'Thành công')
          setShowCreateModal(false)
        } else {
          setCreatedAccount(data.account)
        }
        loadUsers()
        setNewStaff({ fullName: '', email: '', phone: '', role: 'DRIVER' })
      }
    } catch (err) {
      showAlert(err.response?.data?.message || 'Lỗi khi tạo tài khoản', 'Lỗi')
    } finally {
      setCreating(false)
    }
  }

  const handleResetPassword = async () => {
    if (!resetTarget) return
    setResetting(true)
    try {
      const data = await resetStaffPassword(resetTarget._id)
      if (data.ok) {
        setResetResult(data)
      }
    } catch (err) {
      showAlert(err.response?.data?.message || 'Lỗi khi đặt lại mật khẩu', 'Lỗi')
      setResetTarget(null)
    } finally {
      setResetting(false)
    }
  }

  const closeCreateModal = () => { setShowCreateModal(false); setCreatedAccount(null) }
  const closeResetModal = () => { setResetTarget(null); setResetResult(null) }

  if (!token) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="admin-page-head">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Quản lý nhân sự</h1>
          <p className="mt-1 text-sm text-gray-500">Tìm kiếm, lọc và quản lý tài khoản lái xe, phụ xe.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#23a983] px-4 py-2.5 font-semibold text-white transition hover:bg-[#1bbd8f]"
          >
            <FaUserPlus /> Tạo tài khoản
          </button>
          <Link
            to="/admin/staff/import"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 font-semibold text-[#23a983] transition hover:bg-[#f3fffa]"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
          >
            <FaUpload /> Import hàng loạt
          </Link>
        </div>
      </div>

      {/* Toolbar */}
      <div className="admin-toolbar text-black">
        <form onSubmit={handleSearch} className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_auto]">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Tìm kiếm</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tên, email hoặc SĐT..."
              className="w-full rounded-xl border border-gray-200 bg-[#f8fafc] px-4 py-2.5 outline-none transition focus:border-[#23a983] focus:bg-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Vai trò</label>
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
              className="w-full rounded-xl border border-gray-200 bg-[#f8fafc] px-4 py-2.5 outline-none transition focus:border-[#23a983] focus:bg-white"
            >
              <option value="ALL">Tất cả</option>
              <option value="DRIVER">Lái xe</option>
              <option value="CONDUCTOR">Phụ xe</option>
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 font-semibold text-white transition hover:bg-gray-800">
              <FaSearch /> Lọc
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="admin-surface overflow-hidden text-black">
        <div className="flex items-center justify-between px-6 pt-6">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Danh sách nhân viên</h2>
            <p className="mt-1 text-sm text-gray-500">Thông tin tài khoản và trạng thái hoạt động.</p>
          </div>
          {loading ? <span className="text-sm text-gray-500">Đang tải...</span> : null}
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="text-xs uppercase tracking-[0.18em] text-gray-400">
                <th className="px-6 py-3 font-semibold">Nhân viên</th>
                <th className="px-6 py-3 font-semibold">Đăng nhập</th>
                <th className="px-6 py-3 font-semibold">Vai trò</th>
                <th className="px-6 py-3 font-semibold">Trạng thái</th>
                <th className="px-6 py-3 text-center font-semibold">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.length === 0 && !loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">Không tìm thấy dữ liệu.</td>
                </tr>
              ) : users.map((user) => (
                <tr key={user._id} className="transition-colors hover:bg-[#fbfcfd]">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-full bg-gray-200">
                        <img src={user.avatar || 'https://via.placeholder.com/150'} alt="Avatar" className="h-full w-full object-cover" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{user.fullName}</p>
                        <p className="flex items-center gap-1 text-xs text-gray-500">
                          <FaPhone className="text-gray-400" /> {user.phone || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1.5">
                      {user.email ? <FaEnvelope className="text-gray-400" size={12} /> : <FaPhone className="text-gray-400" size={12} />}
                      {user.email || user.phone}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-700'}`}>
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${user.status === 'LOCKED' || user.isLocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {user.status === 'LOCKED' || user.isLocked ? 'Đã khóa' : 'Hoạt động'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleToggleLock(user._id, user.status)}
                        title={user.status === 'LOCKED' || user.isLocked ? 'Mở khóa' : 'Khóa tài khoản'}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${user.status === 'LOCKED' || user.isLocked ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                      >
                        {user.status === 'LOCKED' || user.isLocked ? <><FaLockOpen /> Mở khóa</> : <><FaLock /> Khóa</>}
                      </button>
                      {user.email ? (
                        <button
                          onClick={() => setResetTarget(user)}
                          title="Đặt lại mật khẩu và gửi email"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-600 transition-colors hover:bg-amber-100"
                        >
                          <FaKey /> Reset
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 ? (
          <div className="flex justify-center gap-2 px-6 pb-6 pt-5">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold transition ${page === i + 1 ? 'bg-[#23a983] text-white' : 'bg-[#f3f5f8] text-gray-700 hover:bg-gray-200'}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Create Staff Modal */}
      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 text-black">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between px-6 pt-6">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Tạo tài khoản nhân viên</h3>
                <p className="mt-1 text-sm text-gray-500">Hệ thống sẽ tự tạo mật khẩu và gửi email nếu có.</p>
              </div>
              <button onClick={closeCreateModal} className="text-xl font-bold text-gray-400 hover:text-gray-600">&times;</button>
            </div>

            <div className="p-6">
              {createdAccount ? (
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-2xl text-green-600">✓</div>
                  <h4 className="text-lg font-bold text-gray-800">Tạo thành công</h4>
                  <p className="mt-2 text-sm text-gray-500">Lưu lại thông tin đăng nhập để gửi cho nhân viên qua Zalo/SMS.</p>
                  <div className="mt-4 space-y-2 rounded-2xl bg-[#f8fafc] p-4 text-left text-sm">
                    <p><strong>Họ tên:</strong> {createdAccount.fullName}</p>
                    <p><strong>Tài khoản:</strong> {createdAccount.username}</p>
                    <p><strong>Mật khẩu:</strong> <span className="rounded bg-yellow-100 px-1.5 py-0.5 font-mono">{createdAccount.password}</span></p>
                  </div>
                  <button onClick={closeCreateModal} className="mt-6 w-full rounded-xl bg-[#23a983] px-6 py-2.5 font-semibold text-white hover:bg-[#1bbd8f]">
                    Đóng
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCreateStaff} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Họ tên *</label>
                    <input
                      type="text" required
                      value={newStaff.fullName}
                      onChange={(e) => setNewStaff({ ...newStaff, fullName: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 bg-[#f8fafc] px-4 py-2.5 outline-none focus:border-[#23a983] focus:bg-white"
                      placeholder="Nhập họ và tên"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-700">Email</label>
                      <input
                        type="email"
                        value={newStaff.email}
                        onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                        className="w-full rounded-xl border border-gray-200 bg-[#f8fafc] px-4 py-2.5 outline-none focus:border-[#23a983] focus:bg-white"
                        placeholder="Tùy chọn"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-700">SĐT</label>
                      <input
                        type="text"
                        value={newStaff.phone}
                        onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                        className="w-full rounded-xl border border-gray-200 bg-[#f8fafc] px-4 py-2.5 outline-none focus:border-[#23a983] focus:bg-white"
                        placeholder="Tùy chọn"
                      />
                    </div>
                  </div>
                  <p className="text-xs italic text-amber-600">Nếu có email, thông tin đăng nhập sẽ được gửi tự động. Nếu chỉ có SĐT, mật khẩu sẽ hiển thị để bạn gửi thủ công.</p>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Vai trò *</label>
                    <select
                      value={newStaff.role}
                      onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 bg-[#f8fafc] px-4 py-2.5 outline-none focus:border-[#23a983] focus:bg-white"
                    >
                      <option value="DRIVER">Lái xe (Driver)</option>
                      <option value="CONDUCTOR">Phụ xe (Conductor)</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={closeCreateModal} className="rounded-xl bg-[#f3f5f8] px-5 py-2.5 font-semibold text-gray-700 hover:bg-gray-200">
                      Hủy
                    </button>
                    <button type="submit" disabled={creating} className="rounded-xl bg-[#23a983] px-5 py-2.5 font-semibold text-white hover:bg-[#1bbd8f] disabled:opacity-50">
                      {creating ? 'Đang tạo...' : 'Tạo tài khoản'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Reset Password Modal */}
      {resetTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 text-black">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between px-6 pt-6">
              <h3 className="text-xl font-bold text-gray-800">Đặt lại mật khẩu</h3>
              <button onClick={closeResetModal} className="text-xl font-bold text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <div className="p-6">
              {resetResult ? (
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-2xl text-amber-600">
                    <FaKey />
                  </div>
                  <h4 className="text-lg font-bold text-gray-800">Đặt lại thành công</h4>
                  {resetResult.emailSent ? (
                    <p className="mt-2 text-sm text-gray-600">Mật khẩu mới đã được gửi đến email của nhân viên.</p>
                  ) : (
                    <>
                      <p className="mt-2 text-sm text-gray-500">Nhân viên không có email. Lưu lại thông tin để gửi thủ công.</p>
                      <div className="mt-4 space-y-2 rounded-2xl bg-[#f8fafc] p-4 text-left text-sm">
                        <p><strong>Tài khoản:</strong> {resetResult.account?.username}</p>
                        <p><strong>Mật khẩu mới:</strong> <span className="rounded bg-yellow-100 px-1.5 py-0.5 font-mono">{resetResult.account?.password}</span></p>
                      </div>
                    </>
                  )}
                  <button onClick={closeResetModal} className="mt-6 w-full rounded-xl bg-[#23a983] px-6 py-2.5 font-semibold text-white hover:bg-[#1bbd8f]">
                    Đóng
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600">
                    Bạn sắp đặt lại mật khẩu cho <strong>{resetTarget.fullName}</strong>.
                    {resetTarget.email
                      ? ` Mật khẩu mới sẽ được gửi đến ${resetTarget.email}.`
                      : ' Nhân viên không có email, mật khẩu mới sẽ hiển thị để bạn gửi thủ công.'}
                  </p>
                  <div className="mt-6 flex justify-end gap-3">
                    <button onClick={closeResetModal} className="rounded-xl bg-[#f3f5f8] px-5 py-2.5 font-semibold text-gray-700 hover:bg-gray-200">
                      Hủy
                    </button>
                    <button
                      onClick={handleResetPassword}
                      disabled={resetting}
                      className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
                    >
                      <FaKey /> {resetting ? 'Đang xử lý...' : 'Xác nhận đặt lại'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default AdminUsers
