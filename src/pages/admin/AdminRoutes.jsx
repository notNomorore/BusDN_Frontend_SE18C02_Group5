import React, { useState, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaRoute, FaPlus, FaSearch, FaEye, FaEdit, FaBan, FaUndo } from 'react-icons/fa'
import api from '../../utils/api'
import { useDialog } from '../../context/DialogContext'
import AuthContext from '../../context/AuthContext'

const modalShadow = 'shadow-[0_2px_8px_rgba(0,0,0,0.05)]'

const AdminRoutes = () => {
  const [routes, setRoutes] = useState([])
  const { showAlert, showConfirm } = useDialog()
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const { token } = useContext(AuthContext)
  const navigate = useNavigate()

  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: null, route: null })
  const [formData, setFormData] = useState({
    routeNumber: '',
    name: '',
    distance: '',
    startTime: '',
    endTime: '',
    status: 'ACTIVE',
    monthlyPassPrice: 200000,
    description: '',
  })
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchRoutes()
  }, [statusFilter])

  const fetchRoutes = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/api/admin/routes?status=${statusFilter}&q=${search}`)
      if (res.data.ok) {
        setRoutes(res.data.routes)
      }
    } catch (err) {
      console.error('Error fetching routes:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (event) => {
    event.preventDefault()
    fetchRoutes()
  }

  const openModal = (type, route = null) => {
    setModalConfig({ isOpen: true, type, route })
    if (type === 'create') {
      setFormData({
        routeNumber: '',
        name: '',
        distance: '',
        startTime: '',
        endTime: '',
        status: 'ACTIVE',
        monthlyPassPrice: 200000,
        description: '',
      })
    } else if (type === 'edit' && route) {
      setFormData({
        routeNumber: route.routeNumber,
        name: route.name,
        distance: route.distance,
        startTime: route.operationTime?.start || '',
        endTime: route.operationTime?.end || '',
        status: route.status,
        monthlyPassPrice: route.monthlyPassPrice,
        description: route.description || '',
      })
    }
  }

  const closeModal = () => {
    setModalConfig({ isOpen: false, type: null, route: null })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setProcessing(true)
    try {
      if (modalConfig.type === 'create') {
        await api.post('/api/admin/routes/create', formData)
        showAlert('Tao tuyen thanh cong')
      } else if (modalConfig.type === 'edit') {
        await api.put(`/api/admin/routes/${modalConfig.route._id}`, formData)
        showAlert('Cap nhat tuyen thanh cong')
      }
      closeModal()
      fetchRoutes()
    } catch (err) {
      showAlert(err.response?.data?.message || 'Co loi xay ra', 'Loi')
    } finally {
      setProcessing(false)
    }
  }

  const toggleStatus = async (route) => {
    const actionText = route.status === 'ACTIVE' ? 'tam ngung' : 'kich hoat lai'
    showConfirm(`Ban co chac muon ${actionText} tuyen ${route.routeNumber}?`, async () => {
      try {
        const res = await api.post(`/api/admin/routes/${route._id}/toggle-status`)
        if (res.data.ok) {
          setRoutes((current) => current.map((item) => (
            item._id === route._id ? { ...item, status: res.data.status } : item
          )))
        }
      } catch (err) {
        showAlert('Loi cap nhat trang thai', 'Loi')
      }
    })
  }

  if (!token) return null

  return (
    <div className="space-y-6">
      <div className="admin-page-head">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-800">
            <FaRoute className="text-[#23a983]" />
            Quan ly tuyen xe
          </h1>
          <p className="mt-1 text-sm text-gray-500">Quan ly mang luoi va thong tin chi tiet cac tuyen.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate('/admin/stops')}
            className="rounded-xl bg-white px-4 py-2.5 font-semibold text-cyan-700 transition hover:bg-cyan-50"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
          >
            Quan ly tram dung
          </button>
          <button
            onClick={() => openModal('create')}
            className="inline-flex items-center gap-2 rounded-xl bg-[#23a983] px-4 py-2.5 font-semibold text-white transition hover:bg-[#1bbd8f]"
          >
            <FaPlus />
            Them tuyen
          </button>
        </div>
      </div>

      <div className="admin-toolbar text-black">
        <form onSubmit={handleSearch} className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_auto]">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Tim tuyen</label>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ma tuyen, ten tuyen..."
              className="w-full rounded-xl border border-gray-200 bg-[#f8fafc] px-4 py-2.5 outline-none transition focus:border-[#23a983] focus:bg-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Trang thai</label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-[#f8fafc] px-4 py-2.5 outline-none transition focus:border-[#23a983] focus:bg-white"
            >
              <option value="">Tat ca</option>
              <option value="ACTIVE">Dang hoat dong</option>
              <option value="INACTIVE">Tam ngung</option>
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 font-semibold text-white transition hover:bg-gray-800">
              <FaSearch />
              Loc
            </button>
          </div>
        </form>
      </div>

      <div className="admin-surface overflow-hidden text-black">
        <div className="flex items-center justify-between px-6 pt-6">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Danh sach tuyen</h2>
            <p className="mt-1 text-sm text-gray-500">Thong tin van hanh, khoang cach va gia ve thang.</p>
          </div>
          {loading ? <span className="text-sm text-gray-500">Dang tai...</span> : null}
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="text-xs uppercase tracking-[0.18em] text-gray-400">
                <th className="px-6 py-3 font-semibold">Tuyen</th>
                <th className="px-6 py-3 font-semibold">Cu ly</th>
                <th className="px-6 py-3 font-semibold">Gio HD</th>
                <th className="px-6 py-3 font-semibold">Ve thang</th>
                <th className="px-6 py-3 font-semibold">Trang thai</th>
                <th className="px-6 py-3 text-right font-semibold">Thao tac</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {routes.length === 0 && !loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">Chua co tuyen nao.</td>
                </tr>
              ) : (
                routes.map((route) => (
                  <tr key={route._id} className="transition-colors hover:bg-[#fbfcfd]">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className={`rounded-lg px-3 py-1.5 text-sm font-bold text-white ${route.status === 'ACTIVE' ? 'bg-[#23a983]' : 'bg-gray-400'}`}>
                          {route.routeNumber}
                        </span>
                        <div>
                          <p className="text-sm font-bold text-gray-800">{route.name}</p>
                          <p className="max-w-[220px] truncate text-xs text-gray-500">{route.description || 'Khong co mo ta'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{route.distance} km</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {route.operationTime?.start && route.operationTime?.end
                        ? `${route.operationTime.start} - ${route.operationTime.end}`
                        : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-[#23a983]">
                      {Number(route.monthlyPassPrice).toLocaleString('vi-VN')} d
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${route.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {route.status === 'ACTIVE' ? 'HOAT DONG' : 'TAM NGUNG'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openModal('view', route)} className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50">
                          <FaEye />
                        </button>
                        <button onClick={() => openModal('edit', route)} className="rounded-lg p-2 text-indigo-600 transition hover:bg-indigo-50">
                          <FaEdit />
                        </button>
                        <button onClick={() => toggleStatus(route)} className={`rounded-lg p-2 transition ${route.status === 'ACTIVE' ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
                          {route.status === 'ACTIVE' ? <FaBan title="Tam ngung" /> : <FaUndo title="Kich hoat lai" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalConfig.isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 text-black">
          <div className={`flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white ${modalShadow}`}>
            <div className="flex items-start justify-between px-6 pt-6">
              <div>
                <h3 className="text-xl font-bold text-gray-800">
                  {modalConfig.type === 'create' && 'Them tuyen moi'}
                  {modalConfig.type === 'edit' && `Sua tuyen ${modalConfig.route?.routeNumber}`}
                  {modalConfig.type === 'view' && `Chi tiet tuyen ${modalConfig.route?.routeNumber}`}
                </h3>
                <p className="mt-1 text-sm text-gray-500">Cap nhat cau hinh va thong tin van hanh.</p>
              </div>
              <button onClick={closeModal} className="text-xl font-bold text-gray-400 transition hover:text-gray-600">&times;</button>
            </div>

            <div className="overflow-y-auto p-6">
              {modalConfig.type === 'view' ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div><span className="block text-sm text-gray-500">Ma tuyen</span><p className="font-medium">{modalConfig.route?.routeNumber}</p></div>
                  <div><span className="block text-sm text-gray-500">Ten tuyen</span><p className="font-medium">{modalConfig.route?.name}</p></div>
                  <div><span className="block text-sm text-gray-500">Cu ly</span><p className="font-medium">{modalConfig.route?.distance} km</p></div>
                  <div><span className="block text-sm text-gray-500">Ve thang</span><p className="font-medium text-[#23a983]">{Number(modalConfig.route?.monthlyPassPrice).toLocaleString('vi-VN')} d</p></div>
                  <div><span className="block text-sm text-gray-500">Gio hoat dong</span><p className="font-medium">{modalConfig.route?.operationTime?.start || '-'} den {modalConfig.route?.operationTime?.end || '-'}</p></div>
                  <div>
                    <span className="block text-sm text-gray-500">Trang thai</span>
                    <span className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-bold ${modalConfig.route?.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {modalConfig.route?.status}
                    </span>
                  </div>
                  <div className="md:col-span-2">
                    <span className="block text-sm text-gray-500">Mo ta</span>
                    <p className="mt-1 rounded-xl bg-[#f8fafc] p-4 text-sm">{modalConfig.route?.description || 'Khong co mo ta'}</p>
                  </div>
                </div>
              ) : (
                <form id="routeForm" onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-700">Ma tuyen *</label>
                      <input type="text" required value={formData.routeNumber} onChange={(event) => setFormData({ ...formData, routeNumber: event.target.value })} className="w-full rounded-xl border border-gray-200 bg-[#f8fafc] px-3 py-2.5 outline-none transition focus:border-[#23a983] focus:bg-white" placeholder="VD: R01" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-semibold text-gray-700">Ten tuyen *</label>
                      <input type="text" required value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} className="w-full rounded-xl border border-gray-200 bg-[#f8fafc] px-3 py-2.5 outline-none transition focus:border-[#23a983] focus:bg-white" placeholder="Ben xe - Trung tam" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-700">Cu ly (km) *</label>
                      <input type="number" step="0.1" required value={formData.distance} onChange={(event) => setFormData({ ...formData, distance: event.target.value })} className="w-full rounded-xl border border-gray-200 bg-[#f8fafc] px-3 py-2.5 outline-none transition focus:border-[#23a983] focus:bg-white" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-700">Ve thang</label>
                      <input type="number" step="1000" value={formData.monthlyPassPrice} onChange={(event) => setFormData({ ...formData, monthlyPassPrice: event.target.value })} className="w-full rounded-xl border border-gray-200 bg-[#f8fafc] px-3 py-2.5 outline-none transition focus:border-[#23a983] focus:bg-white" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-700">Gio bat dau</label>
                      <input type="time" value={formData.startTime} onChange={(event) => setFormData({ ...formData, startTime: event.target.value })} className="w-full rounded-xl border border-gray-200 bg-[#f8fafc] px-3 py-2.5 outline-none transition focus:border-[#23a983] focus:bg-white" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-700">Gio ket thuc</label>
                      <input type="time" value={formData.endTime} onChange={(event) => setFormData({ ...formData, endTime: event.target.value })} className="w-full rounded-xl border border-gray-200 bg-[#f8fafc] px-3 py-2.5 outline-none transition focus:border-[#23a983] focus:bg-white" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-700">Trang thai</label>
                      <select value={formData.status} onChange={(event) => setFormData({ ...formData, status: event.target.value })} className="w-full rounded-xl border border-gray-200 bg-[#f8fafc] px-3 py-2.5 outline-none transition focus:border-[#23a983] focus:bg-white">
                        <option value="ACTIVE">Dang hoat dong</option>
                        <option value="INACTIVE">Tam ngung</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-gray-700">Mo ta</label>
                      <textarea rows="3" value={formData.description} onChange={(event) => setFormData({ ...formData, description: event.target.value })} className="w-full rounded-xl border border-gray-200 bg-[#f8fafc] px-3 py-2.5 outline-none transition focus:border-[#23a983] focus:bg-white" />
                    </div>
                  </div>
                </form>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 pb-6">
              <button type="button" onClick={closeModal} className="rounded-xl bg-[#f3f5f8] px-5 py-2.5 font-semibold text-gray-700 transition hover:bg-gray-200">
                Dong
              </button>
              {modalConfig.type !== 'view' ? (
                <button type="submit" form="routeForm" disabled={processing} className="rounded-xl bg-[#23a983] px-5 py-2.5 font-semibold text-white transition hover:bg-[#1bbd8f] disabled:opacity-50">
                  {processing ? 'Dang luu...' : 'Luu lai'}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default AdminRoutes
