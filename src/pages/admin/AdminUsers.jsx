import React, { useState, useEffect, useContext } from 'react'
import { Link } from 'react-router-dom'
import { FaSearch, FaUserPlus, FaLock, FaLockOpen, FaPhone, FaUpload } from 'react-icons/fa'
import api from '../../utils/api'
import AuthContext from '../../context/AuthContext'
import { useDialog } from '../../context/DialogContext'

const panelShadow = 'shadow-[0_2px_8px_rgba(0,0,0,0.05)]'

const AdminUsers = () => {
  const { showAlert, showConfirm } = useDialog()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const { token } = useContext(AuthContext)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newStaff, setNewStaff] = useState({ fullName: '', email: '', phone: '', role: 'DRIVER' })
  const [creating, setCreating] = useState(false)
  const [createdAccount, setCreatedAccount] = useState(null)

  useEffect(() => {
    fetchUsers()
  }, [page, roleFilter])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/api/admin/users?page=${page}&limit=10&role=${roleFilter}&search=${search}`)
      if (res.data.ok) {
        setUsers(res.data.users)
        setTotalPages(res.data.totalPages)
      }
    } catch (err) {
      console.error('Error fetching users:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (event) => {
    event.preventDefault()
    setPage(1)
    fetchUsers()
  }

  const toggleLock = async (userId, currentStatus) => {
    showConfirm(`Ban co chac muon ${currentStatus === 'LOCKED' ? 'mo khoa' : 'khoa'} tai khoan nay?`, async () => {
      try {
        const res = await api.post(`/api/admin/users/${userId}/toggle-lock`)
        if (res.data.ok) {
          setUsers((current) => current.map((user) => (
            user._id === userId
              ? { ...user, status: res.data.user.status, isLocked: res.data.user.isLocked }
              : user
          )))
        }
      } catch (err) {
        showAlert(err.response?.data?.message || 'Loi khi thay doi trang thai', 'Loi')
      }
    })
  }

  const handleCreateStaff = async (event) => {
    event.preventDefault()
    setCreating(true)
    try {
      const res = await api.post('/api/admin/users/create', newStaff)
      if (res.data.ok) {
        if (newStaff.email) {
          showAlert('Staff account created. Credentials have been sent via email.', 'Success')
          setShowCreateModal(false)
          setCreatedAccount(null)
        } else {
          setCreatedAccount(res.data.account)
        }
        fetchUsers()
        setNewStaff({ fullName: '', email: '', phone: '', role: 'DRIVER' })
      }
    } catch (err) {
      showAlert(err.response?.data?.message || 'Loi khi tao tai khoan', 'Loi')
    } finally {
      setCreating(false)
    }
  }

  const closeCreateModal = () => {
    setShowCreateModal(false)
    setCreatedAccount(null)
  }

  if (!token) return null

  return (
    <div className="space-y-6">
      <div className="admin-page-head">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Quan ly nhan su</h1>
          <p className="mt-1 text-sm text-gray-500">Tim kiem, loc va quan ly tai khoan lai xe, phu xe.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#23a983] px-4 py-2.5 font-semibold text-white transition hover:bg-[#1bbd8f]"
          >
            <FaUserPlus />
            Tao tai khoan
          </button>
          <Link
            to="/admin/staff/import"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 font-semibold text-[#23a983] transition hover:bg-[#f3fffa]"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
          >
            <FaUpload />
            Import staff
          </Link>
        </div>
      </div>

      <div className="admin-toolbar text-black">
        <form onSubmit={handleSearch} className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_auto]">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Tim kiem</label>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ten, email hoac SDT..."
              className="w-full rounded-xl border border-gray-200 bg-[#f8fafc] px-4 py-2.5 outline-none transition focus:border-[#23a983] focus:bg-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Vai tro</label>
            <select
              value={roleFilter}
              onChange={(event) => {
                setRoleFilter(event.target.value)
                setPage(1)
              }}
              className="w-full rounded-xl border border-gray-200 bg-[#f8fafc] px-4 py-2.5 outline-none transition focus:border-[#23a983] focus:bg-white"
            >
              <option value="ALL">Tat ca</option>
              <option value="DRIVER">Lai xe</option>
              <option value="CONDUCTOR">Phu xe</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 font-semibold text-white transition hover:bg-gray-800"
            >
              <FaSearch />
              Loc
            </button>
          </div>
        </form>
      </div>

      <div className="admin-surface overflow-hidden text-black">
        <div className="flex items-center justify-between px-6 pt-6">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Danh sach nhan vien</h2>
            <p className="mt-1 text-sm text-gray-500">Thong tin tai khoan va trang thai hoat dong.</p>
          </div>
          {loading ? <span className="text-sm text-gray-500">Dang tai...</span> : null}
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="text-xs uppercase tracking-[0.18em] text-gray-400">
                <th className="px-6 py-3 font-semibold">Nhan vien</th>
                <th className="px-6 py-3 font-semibold">Dang nhap</th>
                <th className="px-6 py-3 font-semibold">Vai tro</th>
                <th className="px-6 py-3 font-semibold">Trang thai</th>
                <th className="px-6 py-3 text-center font-semibold">Hanh dong</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.length === 0 && !loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    Khong tim thay du lieu.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id} className="transition-colors hover:bg-[#fbfcfd]">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-full bg-gray-200">
                          <img
                            src={user.avatar || 'https://via.placeholder.com/150'}
                            alt="Avatar"
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{user.fullName}</p>
                          <p className="flex items-center gap-1 text-xs text-gray-500">
                            <FaPhone className="text-gray-400" />
                            {user.phone || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{user.email || user.phone}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${user.role === 'DRIVER' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${user.status === 'LOCKED' || user.isLocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {user.status === 'LOCKED' || user.isLocked ? 'DA KHOA' : 'HOAT DONG'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => toggleLock(user._id, user.status)}
                        className={`mx-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${user.status === 'LOCKED' || user.isLocked ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                      >
                        {user.status === 'LOCKED' || user.isLocked ? (
                          <>
                            <FaLockOpen />
                            Mo khoa
                          </>
                        ) : (
                          <>
                            <FaLock />
                            Khoa
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 ? (
          <div className="flex justify-center gap-2 px-6 pb-6 pt-5">
            {Array.from({ length: totalPages }).map((_, index) => (
              <button
                key={index}
                onClick={() => setPage(index + 1)}
                className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold transition ${page === index + 1 ? 'bg-[#23a983] text-white' : 'bg-[#f3f5f8] text-gray-700 hover:bg-gray-200'}`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 text-black">
          <div className={`w-full max-w-lg overflow-hidden rounded-2xl bg-white ${panelShadow}`}>
            <div className="flex items-center justify-between px-6 pt-6">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Tao tai khoan nhan vien</h3>
                <p className="mt-1 text-sm text-gray-500">Nhap thong tin co ban de tao tai khoan moi.</p>
              </div>
              <button onClick={closeCreateModal} className="text-xl font-bold text-gray-400 transition hover:text-gray-600">
                &times;
              </button>
            </div>

            <div className="p-6">
              {createdAccount ? (
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-2xl text-green-600">
                    ✓
                  </div>
                  <h4 className="text-lg font-bold text-gray-800">Tao thanh cong</h4>
                  <p className="mt-2 text-sm text-gray-500">Luu lai thong tin dang nhap de gui cho nhan vien.</p>
                  <div className="mt-4 space-y-2 rounded-2xl bg-[#f8fafc] p-4 text-left text-sm">
                    <p><strong>Ho ten:</strong> {createdAccount.fullName}</p>
                    <p><strong>Tai khoan:</strong> {createdAccount.username}</p>
                    <p><strong>Mat khau:</strong> <span className="rounded bg-yellow-100 px-1.5 py-0.5">{createdAccount.password}</span></p>
                  </div>
                  <button
                    onClick={closeCreateModal}
                    className="mt-6 w-full rounded-xl bg-[#23a983] px-6 py-2.5 font-semibold text-white transition hover:bg-[#1bbd8f]"
                  >
                    Dong
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCreateStaff} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Ho ten *</label>
                    <input
                      type="text"
                      required
                      value={newStaff.fullName}
                      onChange={(event) => setNewStaff({ ...newStaff, fullName: event.target.value })}
                      className="w-full rounded-xl border border-gray-200 bg-[#f8fafc] px-4 py-2.5 outline-none transition focus:border-[#23a983] focus:bg-white"
                      placeholder="Nhap ho va ten"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-700">Email</label>
                      <input
                        type="email"
                        value={newStaff.email}
                        onChange={(event) => setNewStaff({ ...newStaff, email: event.target.value })}
                        className="w-full rounded-xl border border-gray-200 bg-[#f8fafc] px-4 py-2.5 outline-none transition focus:border-[#23a983] focus:bg-white"
                        placeholder="Tuy chon"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-700">SDT</label>
                      <input
                        type="text"
                        value={newStaff.phone}
                        onChange={(event) => setNewStaff({ ...newStaff, phone: event.target.value })}
                        className="w-full rounded-xl border border-gray-200 bg-[#f8fafc] px-4 py-2.5 outline-none transition focus:border-[#23a983] focus:bg-white"
                        placeholder="Tuy chon"
                      />
                    </div>
                  </div>

                  <p className="text-xs italic text-red-500">Can nhap it nhat Email hoac SDT de lam tai khoan dang nhap.</p>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Vai tro *</label>
                    <select
                      value={newStaff.role}
                      onChange={(event) => setNewStaff({ ...newStaff, role: event.target.value })}
                      className="w-full rounded-xl border border-gray-200 bg-[#f8fafc] px-4 py-2.5 outline-none transition focus:border-[#23a983] focus:bg-white"
                    >
                      <option value="DRIVER">Lai xe (Driver)</option>
                      <option value="CONDUCTOR">Phu xe (Conductor)</option>
                      <option value="ADMIN">Quan tri (Admin)</option>
                    </select>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={closeCreateModal}
                      className="rounded-xl bg-[#f3f5f8] px-5 py-2.5 font-semibold text-gray-700 transition hover:bg-gray-200"
                    >
                      Huy
                    </button>
                    <button
                      type="submit"
                      disabled={creating}
                      className="rounded-xl bg-[#23a983] px-5 py-2.5 font-semibold text-white transition hover:bg-[#1bbd8f] disabled:opacity-50"
                    >
                      {creating ? 'Dang tao...' : 'Tao tai khoan'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default AdminUsers
