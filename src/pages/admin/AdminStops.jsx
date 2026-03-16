import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaMapMarkerAlt, FaPlus, FaSearch, FaEdit, FaBan, FaUndo, FaRoute } from 'react-icons/fa';
import api from '../../utils/api';
import AuthContext from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';

const AdminStops = () => {
    const [stops, setStops] = useState([]);
    const { showAlert, showConfirm } = useDialog();
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const { token } = useContext(AuthContext);
    const navigate = useNavigate();

    // Modal state
    const [modalConfig, setModalConfig] = useState({ isOpen: false, type: null, stop: null });

    // Form state
    const [formData, setFormData] = useState({
        name: '', address: '', lat: '', lng: '', isTerminal: false, status: 'ACTIVE'
    });
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchStops();
    }, [statusFilter]);

    const fetchStops = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/api/admin/stops?status=${statusFilter}&q=${search}`);
            if (res.data.ok) {
                setStops(res.data.stops);
            }
        } catch (err) {
            console.error('Error fetching stops:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchStops();
    };

    const openModal = (type, stop = null) => {
        setModalConfig({ isOpen: true, type, stop });
        if (type === 'create') {
            setFormData({ name: '', address: '', lat: '', lng: '', isTerminal: false, status: 'ACTIVE' });
        } else if (type === 'edit' && stop) {
            setFormData({
                name: stop.name,
                address: stop.address || '',
                lat: stop.lat,
                lng: stop.lng,
                isTerminal: stop.isTerminal || false,
                status: stop.status
            });
        }
    };

    const closeModal = () => {
        setModalConfig({ isOpen: false, type: null, stop: null });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setProcessing(true);
        try {
            if (modalConfig.type === 'create') {
                await api.post('/api/admin/stops/create', formData);
                showAlert('Tạo trạm thành công', 'Thành công');
            } else if (modalConfig.type === 'edit') {
                await api.put(`/api/admin/stops/${modalConfig.stop._id}`, formData);
                showAlert('Cập nhật trạm thành công', 'Thành công');
            }
            closeModal();
            fetchStops();
        } catch (err) {
            showAlert(err.response?.data?.message || 'Có lỗi xảy ra', 'Lỗi');
        } finally {
            setProcessing(false);
        }
    };

    const toggleStatus = async (stop) => {
        const actionText = stop.status === 'ACTIVE' ? 'tạm ngưng' : 'kích hoạt lại';
        showConfirm(`Bạn có chắc muốn ${actionText} trạm ${stop.name}?`, async () => {
            try {
                const res = await api.post(`/api/admin/stops/${stop._id}/toggle-status`);
                if (res.data.ok) {
                    setStops(stops.map(s => s._id === stop._id ? { ...s, status: res.data.status } : s));
                }
            } catch (err) {
                showAlert('Lỗi cập nhật trạng thái', 'Lỗi');
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b border-gray-200 text-black">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FaMapMarkerAlt className="text-red-500" /> Quản lý Trạm dừng
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Hệ thống các nhà chờ, điểm dừng xe buýt</p>
                </div>
                <div className="flex gap-2 mt-4 md:mt-0">
                    <button
                        onClick={() => navigate('/admin/routes')}
                        className="bg-white border border-info text-cyan-600 px-4 py-2 rounded-lg font-semibold hover:bg-cyan-50 flex items-center gap-2"
                    >
                        <FaRoute /> Quản lý Tuyến
                    </button>
                    <button
                        onClick={() => openModal('create')}
                        className="bg-[#23a983] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#1bbd8f] flex items-center gap-2"
                    >
                        <FaPlus /> Thêm Trạm
                    </button>
                </div>
            </div>

            <div className="bg-white p-5 rounded-xl text-black shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
                <form onSubmit={handleSearch} className="flex-1 flex gap-4 text-black">
                    <div className="flex-1">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Tìm trạm</label>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Tên trạm, địa chỉ..."
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 bg-white focus:ring-[#23a983] outline-none"
                        />
                    </div>
                    <div className="w-1/3">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Trạng thái</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); }}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 bg-white focus:ring-[#23a983] outline-none"
                        >
                            <option value="">Tất cả</option>
                            <option value="ACTIVE">Đang hoạt động</option>
                            <option value="INACTIVE">Tạm ngưng</option>
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button type="submit" className="bg-gray-800 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-700 flex items-center gap-2">
                            <FaSearch /> Lọc
                        </button>
                    </div>
                </form>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden text-black">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider border-b border-gray-200">
                                <th className="px-6 py-4 font-semibold">Tên trạm</th>
                                <th className="px-6 py-4 font-semibold">Tọa độ</th>
                                <th className="px-6 py-4 font-semibold">Trạng thái</th>
                                <th className="px-6 py-4 font-semibold text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {stops.length === 0 && !loading ? (
                                <tr><td colSpan="4" className="px-6 py-10 text-center text-gray-500">Chưa có trạm nào.</td></tr>
                            ) : (
                                stops.map((stop) => (
                                    <tr key={stop._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-start gap-3">
                                                <div className="mt-1"><FaMapMarkerAlt className={stop.isTerminal ? "text-red-500 text-lg" : "text-gray-400 text-lg"} /></div>
                                                <div>
                                                    <p className="font-bold text-gray-800 text-sm">{stop.name}</p>
                                                    <p className="text-xs text-gray-500 truncate max-w-[250px]">{stop.address || 'Chưa có địa chỉ'}</p>
                                                    {stop.isTerminal && <span className="inline-block mt-1 bg-red-50 border border-red-200 text-red-600 px-2 py-0.5 rounded text-[10px] uppercase font-bold">Điểm đầu/cuối</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs font-mono text-gray-600">{Number(stop.lat).toFixed(6)}</p>
                                            <p className="text-xs font-mono text-gray-600">{Number(stop.lng).toFixed(6)}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${stop.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {stop.status === 'ACTIVE' ? 'HOẠT ĐỘNG' : 'TẠM NGƯNG'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-1">
                                                <button onClick={() => openModal('edit', stop)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded transition">
                                                    <FaEdit />
                                                </button>
                                                <button onClick={() => toggleStatus(stop)} className={`p-2 rounded transition ${stop.status === 'ACTIVE' ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
                                                    {stop.status === 'ACTIVE' ? <FaBan title="Tạm ngưng" /> : <FaUndo title="Kích hoạt lại" />}
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

            {/* CREATE / EDIT MODAL */}
            {modalConfig.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 text-black">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-800">
                                {modalConfig.type === 'create' ? 'Thêm Trạm Mới' : `Sửa Trạm: ${modalConfig.stop?.name}`}
                            </h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
                        </div>

                        <div className="p-6 overflow-y-auto w-full">
                            <form id="stopForm" onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Tên trạm *</label>
                                        <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-[#23a983]" placeholder="VD: Bến xe TT" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Địa chỉ</label>
                                        <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-[#23a983]" placeholder="Địa chỉ chi tiết" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Vĩ độ (lat) *</label>
                                        <input type="number" step="any" required value={formData.lat} onChange={e => setFormData({ ...formData, lat: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-[#23a983]" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Kinh độ (lng) *</label>
                                        <input type="number" step="any" required value={formData.lng} onChange={e => setFormData({ ...formData, lng: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-[#23a983]" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Trạng thái</label>
                                        <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-[#23a983] bg-white">
                                            <option value="ACTIVE">Đang hoạt động</option>
                                            <option value="INACTIVE">Tạm ngưng</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center mt-6">
                                        <input type="checkbox" id="isTerminal" checked={formData.isTerminal} onChange={e => setFormData({ ...formData, isTerminal: e.target.checked })} className="w-4 h-4 text-[#23a983] border-gray-300 rounded focus:ring-[#23a983]" />
                                        <label htmlFor="isTerminal" className="ml-2 text-sm font-semibold text-gray-800 cursor-pointer">Là điểm đầu / cuối tuyến</label>
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
                            <button type="button" onClick={closeModal} className="px-5 py-2 text-gray-600 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg font-semibold">Đóng</button>
                            <button type="submit" form="stopForm" disabled={processing} className="px-5 py-2 bg-[#23a983] text-white hover:bg-[#1bbd8f] rounded-lg font-semibold disabled:opacity-50">
                                {processing ? 'Đang lưu...' : 'Lưu lại'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminStops;
