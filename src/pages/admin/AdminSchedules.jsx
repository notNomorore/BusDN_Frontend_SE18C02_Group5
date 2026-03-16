import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaPlus, FaBus, FaEdit, FaTrash } from 'react-icons/fa';
import api from '../../utils/api';
import { useDialog } from '../../context/DialogContext';

const AdminSchedules = () => {
    const { showAlert, showConfirm } = useDialog();
    const [schedules, setSchedules] = useState([]);
    const [buses, setBuses] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [conductors, setConductors] = useState([]);
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        routeId: '',
        date: '',
        shiftStart: '',
        shiftEnd: '',
        busId: '',
        driverId: '',
        conductorId: ''
    });

    useEffect(() => {
        fetchData();
        // Default date to today
        const today = new Date().toISOString().split('T')[0];
        setFormData(prev => ({ ...prev, date: today }));
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [schedRes, busRes, driverRes, conductorRes, routeRes] = await Promise.all([
                api.get('/api/admin/schedules'),
                api.get('/api/admin/buses'),
                api.get('/api/admin/users?role=DRIVER&limit=100'),
                api.get('/api/admin/users?role=CONDUCTOR&limit=100'),
                api.get('/api/admin/routes')
            ]);

            if (schedRes.data.ok) setSchedules(schedRes.data.schedules);
            if (busRes.data.ok) setBuses(busRes.data.buses);
            if (driverRes.data.ok) setDrivers(driverRes.data.users);
            if (conductorRes.data.ok) setConductors(conductorRes.data.users);
            if (routeRes.data.ok) setRoutes(routeRes.data.routes);
        } catch (err) {
            console.error('Error fetching schedules data:', err);
            showAlert('Lỗi khi tải dữ liệu phân công', 'Lỗi');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (item = null) => {
        if (item) {
            setEditingId(item._id);
            setFormData({
                routeId: item.routeId?._id || '',
                date: item.date ? new Date(item.date).toISOString().split('T')[0] : '',
                shiftStart: item.shiftTime?.start || '',
                shiftEnd: item.shiftTime?.end || '',
                busId: item.busId?._id || '',
                driverId: item.driverId?._id || '',
                conductorId: item.conductorId?._id || ''
            });
        } else {
            setEditingId(null);
            setFormData({
                routeId: routes.length > 0 ? routes[0]._id : '',
                date: new Date().toISOString().split('T')[0],
                shiftStart: '05:30',
                shiftEnd: '13:30',
                busId: '',
                driverId: '',
                conductorId: ''
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingId(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let res;
            if (editingId) {
                res = await api.put(`/api/admin/schedules/${editingId}`, formData);
            } else {
                res = await api.post('/api/admin/schedules/create', formData);
            }
            if (res.data.ok) {
                showAlert(editingId ? 'Cập nhật phân công thành công' : 'Tạo lịch thành công', 'Thành công');
                handleCloseModal();
                fetchData();
            }
        } catch (err) {
            showAlert(err.response?.data?.message || 'Lỗi lưu thông tin phân công', 'Lỗi');
        }
    };

    const handleDelete = async (id) => {
        showConfirm('Bạn có chắc muốn xóa lịch trình này?', async () => {
            try {
                const res = await api.delete(`/api/admin/schedules/${id}`);
                if (res.data.ok) {
                    showAlert('Chuyến xe đã bị hủy', 'Thành công');
                    fetchData();
                }
            } catch {
                showAlert('Lỗi khi xóa lịch', 'Lỗi');
            }
        });
    };

    const getStatusStyle = (schedule) => {
        if (!schedule.busId || !schedule.driverId) {
            return { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', text: 'Chờ xếp xe/tài' };
        }
        const todayStr = new Date().toISOString().split('T')[0];
        const schedTime = schedule.date ? new Date(schedule.date).toISOString().split('T')[0] : '';
        if (schedTime < todayStr) return { color: 'bg-green-100 text-green-800 border-green-200', text: 'Đã hoàn thành' };
        if (schedTime === todayStr) return { color: 'bg-blue-100 text-blue-800 border-blue-200', text: 'Chuyến hôm nay' };
        return { color: 'bg-gray-100 text-gray-800 border-gray-200', text: 'Sắp chạy' };
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b border-gray-200 text-black">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FaCalendarAlt className="text-[#23a983]" /> Điều phối & Phân công
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Quản lý lịch trình, tạo ca làm việc và phân công xe/tài xế</p>
                </div>
                <div className="flex gap-2 mt-4 md:mt-0">
                    <input
                        type="date"
                        defaultValue={new Date().toISOString().split('T')[0]}
                        className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 bg-white focus:ring-[#23a983] outline-none"
                    />
                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-[#23a983] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#1bbd8f] flex items-center gap-2"
                    >
                        <FaPlus /> Tạo Lịch Mới
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden text-black">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider border-b border-gray-200 text-center">
                                <th className="px-6 py-4 font-semibold">Ngày & Giờ</th>
                                <th className="px-6 py-4 font-semibold">Tuyến</th>
                                <th className="px-6 py-4 font-semibold">Xe (Biển số)</th>
                                <th className="px-6 py-4 font-semibold">Tài xế chính</th>
                                <th className="px-6 py-4 font-semibold">Phụ xe</th>
                                <th className="px-6 py-4 font-semibold">Trạng thái</th>
                                <th className="px-6 py-4 font-semibold text-center">Tác vụ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-center">
                            {loading ? (
                                <tr><td colSpan="7" className="py-10 text-gray-500">Đang tải dữ liệu...</td></tr>
                            ) : schedules.length === 0 ? (
                                <tr><td colSpan="7" className="py-10 text-gray-500">Chưa có lịch trình phân công nào</td></tr>
                            ) : (
                                schedules.map((schedule) => {
                                    const st = getStatusStyle(schedule);
                                    return (
                                        <tr key={schedule._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-800">
                                                    {schedule.date ? new Date(schedule.date).toLocaleDateString('vi-VN') : '-'}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {schedule.shiftTime?.start || '-'} - {schedule.shiftTime?.end || '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="bg-[#23a983] text-white px-3 py-1 rounded text-sm font-bold">
                                                    {schedule.routeId?.routeNumber || '?'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {schedule.busId ? (
                                                    <>
                                                        <div className="font-bold text-gray-800">{schedule.busId.licensePlate}</div>
                                                        <div className="text-xs text-gray-500">{schedule.busId.capacity} chỗ</div>
                                                    </>
                                                ) : (
                                                    <span className="text-yellow-600 bg-yellow-50 px-2 py-1 rounded text-xs font-semibold">Chưa gán xe</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-left">
                                                {schedule.driverId ? (
                                                    <div className="flex items-center gap-2 justify-center">
                                                        <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                                                            <img
                                                                src={schedule.driverId.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(schedule.driverId.fullName)}&background=random`}
                                                                alt={schedule.driverId.fullName}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    e.target.onerror = null;
                                                                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(schedule.driverId.fullName)}&background=random`;
                                                                }}
                                                            />
                                                        </div>
                                                        <span className="text-gray-800 text-sm font-medium">{schedule.driverId.fullName}</span>
                                                    </div>
                                                ) : (
                                                    <div className="text-center">
                                                        <span className="text-red-500 bg-red-50 px-2 py-1 rounded font-medium text-xs">Phân công TX</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-left">
                                                {schedule.conductorId ? (
                                                    <div className="flex items-center gap-2 justify-center">
                                                        <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                                                            <img
                                                                src={schedule.conductorId.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(schedule.conductorId.fullName)}&background=random`}
                                                                alt={schedule.conductorId.fullName}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    e.target.onerror = null;
                                                                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(schedule.conductorId.fullName)}&background=random`;
                                                                }}
                                                            />
                                                        </div>
                                                        <span className="text-gray-800 text-sm font-medium">{schedule.conductorId.fullName}</span>
                                                    </div>
                                                ) : (
                                                    <div className="text-center">
                                                        <span className="text-orange-500 bg-orange-50 px-2 py-1 rounded font-medium text-xs">Phân công PX</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 text-xs font-bold rounded-full border ${st.color}`}>
                                                    {st.text}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={() => handleOpenModal(schedule)} className="text-blue-500 hover:text-blue-700 p-2 bg-blue-50 rounded-md">
                                                        <FaEdit />
                                                    </button>
                                                    <button onClick={() => handleDelete(schedule._id)} className="text-red-500 hover:text-red-700 p-2 bg-red-50 rounded-md">
                                                        <FaTrash />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Phân công */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 text-black">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-800">{editingId ? 'Cập nhật phân công' : 'Tạo lịch chạy mới'}</h3>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
                        </div>
                        <div className="p-6">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Tuyến đường *</label>
                                    <select
                                        required
                                        value={formData.routeId}
                                        onChange={e => setFormData({ ...formData, routeId: e.target.value })}
                                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#23a983] outline-none"
                                    >
                                        <option value="" disabled>-- Chọn tuyến --</option>
                                        {routes.map(r => (
                                            <option key={r._id} value={r._id}>{r.routeNumber} - {r.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Ngày chạy *</label>
                                        <input
                                            type="date"
                                            required
                                            value={formData.date}
                                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                                            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#23a983] outline-none"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Bắt đầu</label>
                                            <input
                                                type="time"
                                                required
                                                value={formData.shiftStart}
                                                onChange={e => setFormData({ ...formData, shiftStart: e.target.value })}
                                                className="w-full bg-white border border-gray-300 rounded-lg px-2 py-2 focus:ring-2 focus:ring-[#23a983] outline-none text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Kết thúc</label>
                                            <input
                                                type="time"
                                                required
                                                value={formData.shiftEnd}
                                                onChange={e => setFormData({ ...formData, shiftEnd: e.target.value })}
                                                className="w-full bg-white border border-gray-300 rounded-lg px-2 py-2 focus:ring-2 focus:ring-[#23a983] outline-none text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 pt-4 mt-2">
                                    <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2"><FaBus /> Phân công nhân sự & phương tiện (Tùy chọn)</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Xe buýt</label>
                                            <select
                                                value={formData.busId}
                                                onChange={e => setFormData({ ...formData, busId: e.target.value })}
                                                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                            >
                                                <option value="">-- Chưa gắn xe --</option>
                                                {buses.map(b => (
                                                    <option key={b._id} value={b._id}>{b.licensePlate} ({b.capacity} chỗ)</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Tài xế</label>
                                            <select
                                                value={formData.driverId}
                                                onChange={e => setFormData({ ...formData, driverId: e.target.value })}
                                                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                            >
                                                <option value="">-- Chưa phân tài xế --</option>
                                                {drivers.map(d => (
                                                    <option key={d._id} value={d._id}>{d.fullName}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Phụ xe</label>
                                            <select
                                                value={formData.conductorId}
                                                onChange={e => setFormData({ ...formData, conductorId: e.target.value })}
                                                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                            >
                                                <option value="">-- Chưa phân phụ xe --</option>
                                                {conductors.map(c => (
                                                    <option key={c._id} value={c._id}>{c.fullName}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end gap-3 mt-6 border-t border-gray-100">
                                    <button type="button" onClick={handleCloseModal} className="px-5 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold">Hủy</button>
                                    <button type="submit" className="px-5 py-2 bg-[#23a983] hover:bg-[#1bbd8f] text-white rounded-lg font-semibold shadow-md">
                                        {editingId ? 'Lưu cập nhật' : 'Tạo lịch'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminSchedules;
