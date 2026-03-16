import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaRoute, FaPlus, FaSearch, FaEye, FaEdit, FaBan, FaUndo } from 'react-icons/fa';
import api from '../../utils/api';
import { useDialog } from '../../context/DialogContext';
import AuthContext from '../../context/AuthContext';

const AdminRoutes = () => {
    const [routes, setRoutes] = useState([]);
    const { showAlert, showConfirm } = useDialog();
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const { token } = useContext(AuthContext);
    const navigate = useNavigate();

    // Modal state
    const [modalConfig, setModalConfig] = useState({ isOpen: false, type: null, route: null });

    // Form state
    const [formData, setFormData] = useState({
        routeNumber: '', name: '', distance: '', startTime: '', endTime: '', status: 'ACTIVE', monthlyPassPrice: 200000, description: ''
    });
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchRoutes();
    }, [statusFilter]);

    const fetchRoutes = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/api/admin/routes?status=${statusFilter}&q=${search}`);
            if (res.data.ok) {
                setRoutes(res.data.routes);
            }
        } catch (err) {
            console.error('Error fetching routes:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchRoutes();
    };

    const openModal = (type, route = null) => {
        setModalConfig({ isOpen: true, type, route });
        if (type === 'create') {
            setFormData({ routeNumber: '', name: '', distance: '', startTime: '', endTime: '', status: 'ACTIVE', monthlyPassPrice: 200000, description: '' });
        } else if (type === 'edit' && route) {
            setFormData({
                routeNumber: route.routeNumber,
                name: route.name,
                distance: route.distance,
                startTime: route.operationTime?.start || '',
                endTime: route.operationTime?.end || '',
                status: route.status,
                monthlyPassPrice: route.monthlyPassPrice,
                description: route.description || ''
            });
        }
    };

    const closeModal = () => {
        setModalConfig({ isOpen: false, type: null, route: null });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setProcessing(true);
        try {
            if (modalConfig.type === 'create') {
                await api.post('/api/admin/routes/create', formData);
                showAlert('Tạo tuyến thành công');
            } else if (modalConfig.type === 'edit') {
                await api.put(`/api/admin/routes/${modalConfig.route._id}`, formData);
                showAlert('Cập nhật tuyến thành công');
            }
            closeModal();
            fetchRoutes();
        } catch (err) {
            showAlert(err.response?.data?.message || 'Có lỗi xảy ra', 'Lỗi');
        } finally {
            setProcessing(false);
        }
    };

    const toggleStatus = async (route) => {
        const actionText = route.status === 'ACTIVE' ? 'tạm ngưng' : 'kích hoạt lại';
        showConfirm(`Bạn có chắc muốn ${actionText} tuyến ${route.routeNumber}?`, async () => {
            try {
                const res = await api.post(`/api/admin/routes/${route._id}/toggle-status`);
                if (res.data.ok) {
                    setRoutes(routes.map(r => r._id === route._id ? { ...r, status: res.data.status } : r));
                }
            } catch (err) {
                showAlert('Lỗi cập nhật trạng thái', 'Lỗi');
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b border-gray-200">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FaRoute className="text-[#23a983]" /> Quản lý Tuyến xe
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Quản lý mạng lưới và thông tin các tuyến</p>
                </div>
                <div className="flex gap-2 mt-4 md:mt-0">
                    <button
                        onClick={() => navigate('/admin/stops')}
                        className="bg-white border border-info text-cyan-600 px-4 py-2 rounded-lg font-semibold hover:bg-cyan-50 flex items-center gap-2"
                    >
                        Quản lý Trạm dừng
                    </button>
                    <button
                        onClick={() => openModal('create')}
                        className="bg-[#23a983] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#1bbd8f] flex items-center gap-2"
                    >
                        <FaPlus /> Thêm Tuyến
                    </button>
                </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
                <form onSubmit={handleSearch} className="flex-1 flex gap-4 text-black">
                    <div className="flex-1">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Tìm tuyến</label>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Mã tuyến, tên tuyến..."
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
                                <th className="px-6 py-4 font-semibold">Tuyến</th>
                                <th className="px-6 py-4 font-semibold">Cự ly</th>
                                <th className="px-6 py-4 font-semibold">Giờ HĐ</th>
                                <th className="px-6 py-4 font-semibold">Vé tháng</th>
                                <th className="px-6 py-4 font-semibold">Trạng thái</th>
                                <th className="px-6 py-4 font-semibold text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {routes.length === 0 && !loading ? (
                                <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-500">Chưa có tuyến nào.</td></tr>
                            ) : (
                                routes.map((route) => (
                                    <tr key={route._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <span className={`px-3 py-1.5 rounded-md font-bold text-white text-sm ${route.status === 'ACTIVE' ? 'bg-[#23a983]' : 'bg-gray-400'}`}>
                                                    {route.routeNumber}
                                                </span>
                                                <div>
                                                    <p className="font-bold text-gray-800 text-sm">{route.name}</p>
                                                    <p className="text-xs text-gray-500 truncate max-w-[200px]">{route.description || 'Không có mô tả'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm">{route.distance} km</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {route.operationTime?.start && route.operationTime?.end
                                                ? `${route.operationTime.start} - ${route.operationTime.end}`
                                                : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-[#23a983]">
                                            {Number(route.monthlyPassPrice).toLocaleString('vi-VN')} đ
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${route.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {route.status === 'ACTIVE' ? 'HOẠT ĐỘNG' : 'TẠM NGƯNG'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-1">
                                                <button onClick={() => openModal('view', route)} className="p-2 text-blue-600 hover:bg-blue-50 rounded transition">
                                                    <FaEye />
                                                </button>
                                                <button onClick={() => openModal('edit', route)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded transition">
                                                    <FaEdit />
                                                </button>
                                                <button onClick={() => toggleStatus(route)} className={`p-2 rounded transition ${route.status === 'ACTIVE' ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
                                                    {route.status === 'ACTIVE' ? <FaBan title="Tạm ngưng" /> : <FaUndo title="Kích hoạt lại" />}
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

            {/* CREATE / EDIT / VIEW MODAL */}
            {modalConfig.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 text-black">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-800">
                                {modalConfig.type === 'create' && 'Thêm Tuyến Mới'}
                                {modalConfig.type === 'edit' && `Sửa Tuyến ${modalConfig.route?.routeNumber}`}
                                {modalConfig.type === 'view' && `Chi tiết Tuyến ${modalConfig.route?.routeNumber}`}
                            </h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            {modalConfig.type === 'view' ? (
                                <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                                    <div><span className="text-gray-500 text-sm block">Mã tuyến</span><p className="font-medium">{modalConfig.route?.routeNumber}</p></div>
                                    <div><span className="text-gray-500 text-sm block">Tên tuyến</span><p className="font-medium">{modalConfig.route?.name}</p></div>
                                    <div><span className="text-gray-500 text-sm block">Cự ly</span><p className="font-medium">{modalConfig.route?.distance} km</p></div>
                                    <div><span className="text-gray-500 text-sm block">Giá vé tháng</span><p className="font-medium text-[#23a983]">{Number(modalConfig.route?.monthlyPassPrice).toLocaleString()} đ</p></div>
                                    <div><span className="text-gray-500 text-sm block">Giờ hoạt động</span><p className="font-medium">{modalConfig.route?.operationTime?.start || '-'} đến {modalConfig.route?.operationTime?.end || '-'}</p></div>
                                    <div>
                                        <span className="text-gray-500 text-sm block">Trạng thái</span>
                                        <span className={`px-2 py-0.5 mt-1 block w-max text-xs font-bold rounded ${modalConfig.route?.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {modalConfig.route?.status}
                                        </span>
                                    </div>
                                    <div className="col-span-2"><span className="text-gray-500 text-sm block">Mô tả</span><p className="font-medium text-sm p-3 bg-gray-50 rounded-lg whitespace-pre-wrap">{modalConfig.route?.description || 'Không'}</p></div>
                                </div>
                            ) : (
                                <form id="routeForm" onSubmit={handleSubmit} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Mã tuyến *</label>
                                            <input type="text" required value={formData.routeNumber} onChange={e => setFormData({ ...formData, routeNumber: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-[#23a983]" placeholder="VD: R01" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Tên tuyến *</label>
                                            <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-[#23a983]" placeholder="Bến xe - Trung tâm" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Cự ly (km) *</label>
                                            <input type="number" step="0.1" required value={formData.distance} onChange={e => setFormData({ ...formData, distance: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-[#23a983]" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Vé tháng</label>
                                            <input type="number" step="1000" value={formData.monthlyPassPrice} onChange={e => setFormData({ ...formData, monthlyPassPrice: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-[#23a983]" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Giờ bắt đầu</label>
                                            <input type="time" value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-[#23a983]" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Giờ kết thúc</label>
                                            <input type="time" value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-[#23a983]" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 text-left">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Trạng thái</label>
                                            <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-[#23a983] bg-white">
                                                <option value="ACTIVE">Đang hoạt động</option>
                                                <option value="INACTIVE">Tạm ngưng</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Mô tả</label>
                                            <textarea rows="3" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-[#23a983]"></textarea>
                                        </div>
                                    </div>
                                </form>
                            )}
                        </div>

                        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
                            <button type="button" onClick={closeModal} className="px-5 py-2 text-gray-600 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg font-semibold">Đóng</button>
                            {modalConfig.type !== 'view' && (
                                <button type="submit" form="routeForm" disabled={processing} className="px-5 py-2 bg-[#23a983] text-white hover:bg-[#1bbd8f] rounded-lg font-semibold disabled:opacity-50">
                                    {processing ? 'Đang lưu...' : 'Lưu lại'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminRoutes;
