import React, { useState, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaMapMarkerAlt, FaPlus, FaSearch, FaEdit, FaBan, FaUndo, FaRoute } from 'react-icons/fa'
import api from '../../utils/api'
import AuthContext from '../../context/AuthContext'
import { useDialog } from '../../context/DialogContext'

const modalShadow = 'shadow-[0_2px_8px_rgba(0,0,0,0.05)]'

const AdminStops = () => {
  const [stops, setStops] = useState([])
  const { showAlert, showConfirm } = useDialog()
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const { token } = useContext(AuthContext)
  const navigate = useNavigate()

  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: null, stop: null })
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    lat: '',
    lng: '',
    isTerminal: false,
    status: 'ACTIVE',
  })
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchStops()
  }, [statusFilter])

  const fetchStops = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/api/admin/stops?status=${statusFilter}&q=${search}`)
      if (res.data.ok) {
        setStops(res.data.stops)
      }
    } catch (err) {
      console.error('Error fetching stops:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (event) => {
    event.preventDefault()
    fetchStops()
  }

  const openModal = (type, stop = null) => {
    setModalConfig({ isOpen: true, type, stop })
    if (type === 'create') {
      setFormData({ name: '', address: '', lat: '', lng: '', isTerminal: false, status: 'ACTIVE' })
    } else if (type === 'edit' && stop) {
      setFormData({
        name: stop.name,
        address: stop.address || '',
        lat: stop.lat,
        lng: stop.lng,
        isTerminal: stop.isTerminal || false,
        status: stop.status,
      })
    }
  }

  const closeModal = () => {
    setModalConfig({ isOpen: false, type: null, stop: null })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setProcessing(true)
    try {
      if (modalConfig.type === 'create') {
        await api.post('/api/admin/stops/create', formData)
        showAlert('Tao tram thanh cong', 'Thanh cong')
      } else if (modalConfig.type === 'edit') {
        await api.put(`/api/admin/stops/${modalConfig.stop._id}`, formData)
        showAlert('Cap nhat tram thanh cong', 'Thanh cong')
      }
      closeModal()
      fetchStops()
    } catch (err) {
      showAlert(err.response?.data?.message || 'Co loi xay ra', 'Loi')
    } finally {
      setProcessing(false)
    }
  }

  const toggleStatus = async (stop) => {
    const actionText = stop.status === 'ACTIVE' ? 'tam ngung' : 'kich hoat lai'
    showConfirm(`Ban co chac muon ${actionText} tram ${stop.name}?`, async () => {
      try {
        const res = await api.post(`/api/admin/stops/${stop._id}/toggle-status`)
        if (res.data.ok) {
          setStops((current) => current.map((item) => (
            item._id === stop._id ? { ...item, status: res.data.status } : item
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
      <div className="admin-page-head text-black">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-800">
            <FaMapMarkerAlt className="text-red-500" />
            Quan ly tram dung
          </h1>
          <p className="mt-1 text-sm text-gray-500">He thong nha cho, diem dung va tram dau cuoi tuyen.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate('/admin/routes')}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 font-semibold text-cyan-700 transition hover:bg-cyan-50"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
          >
            <FaRoute />
            Quan ly tuyen
          </button>
          <button
            onClick={() => openModal('create')}
            className="inline-flex items-center gap-2 rounded-xl bg-[#23a983] px-4 py-2.5 font-semibold text-white transition hover:bg-[#1bbd8f]"
          >
            <FaPlus />
            Them tram
          </button>
        </div>
      </div>

      <div className="admin-toolbar text-black">
        <form onSubmit={handleSearch} className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_auto]">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Tim tram</label>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ten tram, dia chi..."
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
            <h2 className="text-lg font-bold text-gray-800">Danh sach tram dung</h2>
            <p className="mt-1 text-sm text-gray-500">Thong tin vi tri, toa do va tinh trang hoat dong.</p>
          </div>
          {loading ? <span className="text-sm text-gray-500">Dang tai...</span> : null}
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="text-xs uppercase tracking-[0.18em] text-gray-400">
                <th className="px-6 py-3 font-semibold">Ten tram</th>
                <th className="px-6 py-3 font-semibold">Toa do</th>
                <th className="px-6 py-3 font-semibold">Trang thai</th>
                <th className="px-6 py-3 text-right font-semibold">Thao tac</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stops.length === 0 && !loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-500">Chua co tram nao.</td>
                </tr>
              ) : (
                stops.map((stop) => (
                  <tr key={stop._id} className="transition-colors hover:bg-[#fbfcfd]">
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          <FaMapMarkerAlt className={stop.isTerminal ? 'text-lg text-red-500' : 'text-lg text-gray-400'} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-800">{stop.name}</p>
                          <p className="max-w-[260px] truncate text-xs text-gray-500">{stop.address || 'Chua co dia chi'}</p>
                          {stop.isTerminal ? (
                            <span className="mt-1 inline-block rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase text-red-600">
                              Diem dau cuoi
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-mono text-xs text-gray-600">{Number(stop.lat).toFixed(6)}</p>
                      <p className="font-mono text-xs text-gray-600">{Number(stop.lng).toFixed(6)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${stop.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {stop.status === 'ACTIVE' ? 'HOAT DONG' : 'TAM NGUNG'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openModal('edit', stop)} className="rounded-lg p-2 text-indigo-600 transition hover:bg-indigo-50">
                          <FaEdit />
                        </button>
                        <button onClick={() => toggleStatus(stop)} className={`rounded-lg p-2 transition ${stop.status === 'ACTIVE' ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
                          {stop.status === 'ACTIVE' ? <FaBan title="Tam ngung" /> : <FaUndo title="Kich hoat lai" />}
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
                  {modalConfig.type === 'create' ? 'Them tram moi' : `Sua tram ${modalConfig.stop?.name}`}
                </h3>
                <p className="mt-1 text-sm text-gray-500">Cap nhat thong tin vi tri va trang thai tram.</p>
              </div>
              <button onClick={closeModal} className="text-xl font-bold text-gray-400 transition hover:text-gray-600">&times;</button>
            </div>

            <div className="overflow-y-auto p-6">
              <form id="stopForm" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Ten tram *</label>
                    <input type="text" required value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} className="w-full rounded-xl border border-gray-200 bg-[#f8fafc] px-3 py-2.5 outline-none transition focus:border-[#23a983] focus:bg-white" placeholder="VD: Ben xe TT" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Dia chi</label>
                    <input type="text" value={formData.address} onChange={(event) => setFormData({ ...formData, address: event.target.value })} className="w-full rounded-xl border border-gray-200 bg-[#f8fafc] px-3 py-2.5 outline-none transition focus:border-[#23a983] focus:bg-white" placeholder="Dia chi chi tiet" />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Vi do (lat) *</label>
                    <input type="number" step="any" required value={formData.lat} onChange={(event) => setFormData({ ...formData, lat: event.target.value })} className="w-full rounded-xl border border-gray-200 bg-[#f8fafc] px-3 py-2.5 outline-none transition focus:border-[#23a983] focus:bg-white" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Kinh do (lng) *</label>
                    <input type="number" step="any" required value={formData.lng} onChange={(event) => setFormData({ ...formData, lng: event.target.value })} className="w-full rounded-xl border border-gray-200 bg-[#f8fafc] px-3 py-2.5 outline-none transition focus:border-[#23a983] focus:bg-white" />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Trang thai</label>
                    <select value={formData.status} onChange={(event) => setFormData({ ...formData, status: event.target.value })} className="w-full rounded-xl border border-gray-200 bg-[#f8fafc] px-3 py-2.5 outline-none transition focus:border-[#23a983] focus:bg-white">
                      <option value="ACTIVE">Dang hoat dong</option>
                      <option value="INACTIVE">Tam ngung</option>
                    </select>
                  </div>
                  <label className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-gray-800">
                    <input type="checkbox" checked={formData.isTerminal} onChange={(event) => setFormData({ ...formData, isTerminal: event.target.checked })} className="h-4 w-4 rounded border-gray-300 text-[#23a983] focus:ring-[#23a983]" />
                    La diem dau / cuoi tuyen
                  </label>
                </div>
              </form>
            </div>

            <div className="flex justify-end gap-3 px-6 pb-6">
              <button type="button" onClick={closeModal} className="rounded-xl bg-[#f3f5f8] px-5 py-2.5 font-semibold text-gray-700 transition hover:bg-gray-200">
                Dong
              </button>
              <button type="submit" form="stopForm" disabled={processing} className="rounded-xl bg-[#23a983] px-5 py-2.5 font-semibold text-white transition hover:bg-[#1bbd8f] disabled:opacity-50">
                {processing ? 'Dang luu...' : 'Luu lai'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default AdminStops
