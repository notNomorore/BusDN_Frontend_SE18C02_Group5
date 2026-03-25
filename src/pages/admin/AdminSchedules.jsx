import React, { useState, useEffect, useCallback } from 'react';
import { FaCalendarAlt, FaPlus, FaBus, FaEdit, FaTrash, FaMagic, FaArchive } from 'react-icons/fa';
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
    const [showGenModal, setShowGenModal] = useState(false);
    const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [genLoading, setGenLoading] = useState(false);
    const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
    const [formData, setFormData] = useState({
        routeId: '',
        date: '',
        shiftStart: '',
        shiftEnd: '',
        departureTime: '',
        busId: '',
        driverId: '',
        conductorId: '',
    });

    const [genForm, setGenForm] = useState({
        routeId: '',
        dateFrom: '',
        dateTo: '',
        autoAssign: true,
        replaceScheduled: false,
    });

    const [bulkDeleteForm, setBulkDeleteForm] = useState({
        scope: 'ALL_ROUTES', // ALL_ROUTES | ROUTE
        routeId: '',
        timeMode: 'RANGE', // RANGE | ALL_TIME
        dateFrom: '',
        dateTo: '',
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [schedRes, busRes, driverRes, conductorRes, routeRes] = await Promise.all([
                api.get('/api/admin/schedules'),
                api.get('/api/admin/buses'),
                api.get('/api/admin/users?role=DRIVER&limit=100'),
                api.get('/api/admin/users?role=CONDUCTOR&limit=100'),
                api.get('/api/admin/routes'),
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
    }, [showAlert]);

    useEffect(() => {
        fetchData();
        const today = new Date().toISOString().split('T')[0];
        setFormData((prev) => ({ ...prev, date: today }));
        setGenForm((g) => ({ ...g, dateFrom: today, dateTo: today }));
        setBulkDeleteForm((d) => ({ ...d, dateFrom: today, dateTo: today }));
    }, [fetchData]);

    const handleOpenModal = (item = null) => {
        if (item) {
            setEditingId(item._id);
            setFormData({
                routeId: item.routeId?._id || '',
                date: item.date ? new Date(item.date).toISOString().split('T')[0] : '',
                shiftStart: item.shiftTime?.start || '',
                shiftEnd: item.shiftTime?.end || '',
                departureTime: item.departureTime || '',
                busId: item.busId?._id || '',
                driverId: item.driverId?._id || '',
                conductorId: item.conductorId?._id || '',
            });
        } else {
            setEditingId(null);
            setFormData({
                routeId: routes.length > 0 ? routes[0]._id : '',
                date: new Date().toISOString().split('T')[0],
                shiftStart: '05:30',
                shiftEnd: '13:30',
                departureTime: '',
                busId: '',
                driverId: '',
                conductorId: '',
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
        const payload = {
            routeId: formData.routeId,
            date: formData.date,
            shiftStart: formData.shiftStart,
            shiftEnd: formData.shiftEnd,
            busId: formData.busId || null,
            driverId: formData.driverId || null,
            conductorId: formData.conductorId || null,
        };
        if (formData.departureTime) payload.departureTime = formData.departureTime;

        try {
            let res;
            if (editingId) {
                const impactRes = await api.post(`/api/admin/schedules/${editingId}/update-impact`, payload);
                if (!impactRes.data?.ok) throw new Error('impact_failed');
                const im = impactRes.data.impact || {};
                const lv = im.level === 'DANGER' ? 'Nguy hiểm' : im.level === 'MEDIUM' ? 'Trung bình' : 'An toàn';
                const previewText =
                    `Mức thay đổi: ${lv}\n` +
                    `Trip bị ảnh hưởng: ${im.impactedTrips || 0}\n` +
                    `Driver bị ảnh hưởng: ${im.impactedDrivers || 0}\n` +
                    `Passenger bị ảnh hưởng: ${im.impactedPassengers || 0}\n\n` +
                    `Xác nhận cập nhật?`;
                showConfirm(previewText, async () => {
                    try {
                        const saveRes = await api.put(`/api/admin/schedules/${editingId}`, payload);
                        if (saveRes.data.ok) {
                            const w = saveRes.data.warnings?.length ? `\n${saveRes.data.warnings.join('\n')}` : '';
                            showAlert('Cập nhật phân công thành công' + w, 'Thành công');
                            handleCloseModal();
                            fetchData();
                        }
                    } catch (saveErr) {
                        showAlert(saveErr.response?.data?.message || 'Lỗi lưu thông tin phân công', 'Lỗi');
                    }
                });
                return;
            } else {
                res = await api.post('/api/admin/schedules/create', payload);
            }
            if (res.data.ok) {
                const w = res.data.warnings?.length ? `\n${res.data.warnings.join('\n')}` : '';
                showAlert((editingId ? 'Cập nhật phân công thành công' : 'Tạo lịch thành công') + w, 'Thành công');
                handleCloseModal();
                fetchData();
            }
        } catch (err) {
            showAlert(err.response?.data?.message || 'Lỗi lưu thông tin phân công', 'Lỗi');
        }
    };

    const runDelete = async (id, flags = {}) => {
        const params = new URLSearchParams();
        if (flags.monthly) params.append('acknowledgeMonthlyPass', '1');
        if (flags.trip) params.append('acknowledgeTripTickets', '1');
        const qs = params.toString();
        const url = `/api/admin/schedules/${id}${qs ? `?${qs}` : ''}`;
        const res = await api.delete(url);
        if (res.data.ok) {
            showAlert(res.data.message || 'Đã xử lý', 'Thành công');
            fetchData();
        }
    };

    const tryDeleteWithAcks = async (id, flags = {}) => {
        try {
            await runDelete(id, flags);
        } catch (e) {
            const st = e.response?.status;
            const d = e.response?.data;
            if (st === 409 && d?.code === 'MONTHLY_PASS_WARNING' && !flags.monthly) {
                const n = d.activeMonthlyPassesOnDay;
                showConfirm(`Xác nhận xóa dù có ${n} vé tháng hiệu lực trong ngày?`, () => {
                    tryDeleteWithAcks(id, { ...flags, monthly: true });
                });
                return;
            }
            if (st === 409 && d?.code === 'TRIP_TICKET_WARNING' && !flags.trip) {
                const n = d.activeTripTicketsBooked;
                showConfirm(
                    `Xác nhận xóa dù có ${n} vé lẻ đã đặt? Hành khách đang mở app sẽ nhận thông báo qua socket.`,
                    () => {
                        tryDeleteWithAcks(id, { ...flags, trip: true });
                    }
                );
                return;
            }
            showAlert(d?.message || 'Lỗi khi xóa', 'Lỗi');
        }
    };

    const handleDelete = async (id) => {
        try {
            const { data } = await api.get(`/api/admin/schedules/${id}/delete-impact`);
            if (!data.ok) return;
            const im = data.impact;
            if (im.status === 'COMPLETED') {
                showAlert('Chuyến đã hoàn thành — không xóa. Dùng Lưu trữ (archive).', 'Thông báo');
                return;
            }
            const stVi = { SCHEDULED: 'Đã lên lịch', IN_PROGRESS: 'Đang chạy', COMPLETED: 'Hoàn thành', CANCELLED: 'Đã hủy' };
            let msg = `Trạng thái: ${stVi[im.status] || im.status}.`;
            if (im.departureTime) msg += ` Xuất bến ${im.departureTime}.`;
            if (im.driverName) msg += ` Tài xế: ${im.driverName}.`;
            if (im.activeMonthlyPassesOnDay) msg += `\n⚠ Có ${im.activeMonthlyPassesOnDay} vé tháng hiệu lực trong ngày.`;
            if (im.activeTripTicketsBooked)
                msg += `\n⚠ Có ${im.activeTripTicketsBooked} vé lẻ đã đặt (chưa quét dùng).`;
            else if (im.activeTripTickets)
                msg += `\nℹ Đã có ${im.activeTripTickets} vé lẻ gắn chuyến (đã dùng / lịch sử).`;
            if (im.frequencyGapRisk)
                msg += '\n⚠ Cảnh báo: xóa chuyến này có thể tạo khoảng trống gấp đôi tần suất giữa hai chuyến liền kề.';
            if (im.status === 'IN_PROGRESS') msg += '\nHệ thống sẽ HỦY (cancel) chuyến đang chạy và báo realtime (tài xế + khách có vé lẻ).';
            else msg += '\nXóa chuyến chưa chạy?';

            showConfirm(msg, () => {
                tryDeleteWithAcks(id, {});
            });
        } catch {
            showAlert('Không tải được thông tin tác động xóa', 'Lỗi');
        }
    };

    const handleArchive = async (id) => {
        showConfirm('Chuyển chuyến đã hoàn thành vào lưu trữ?', async () => {
            try {
                const res = await api.patch(`/api/admin/schedules/${id}/archive`);
                if (res.data.ok) {
                    showAlert('Đã archive', 'Thành công');
                    fetchData();
                }
            } catch (e) {
                showAlert(e.response?.data?.message || 'Lỗi', 'Lỗi');
            }
        });
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        if (!genForm.routeId || !genForm.dateFrom || !genForm.dateTo) {
            showAlert('Chọn tuyến và khoảng ngày', 'Lỗi');
            return;
        }
        try {
            setGenLoading(true);
            const res = await api.post('/api/admin/schedules/generate', genForm);
            if (res.data.ok) {
                const sk = res.data.skipped?.length ? ` (Bỏ qua ${res.data.skipped.length} slot)` : '';
                showAlert(res.data.message + sk, 'Thành công');
                setShowGenModal(false);
                fetchData();
            }
        } catch (e) {
            showAlert(e.response?.data?.message || 'Lỗi sinh lịch', 'Lỗi');
        } finally {
            setGenLoading(false);
        }
    };

    const handleBulkDeleteSchedules = async (ackMonthlyPass = false, ackTripTickets = false) => {
        if (bulkDeleteForm.scope === 'ROUTE' && !bulkDeleteForm.routeId) {
            showAlert('Chọn tuyến', 'Lỗi');
            return;
        }
        if (bulkDeleteForm.timeMode === 'RANGE' && (!bulkDeleteForm.dateFrom || !bulkDeleteForm.dateTo)) {
            showAlert('Chọn khoảng ngày', 'Lỗi');
            return;
        }

        try {
            setBulkDeleteLoading(true);
            const payload = {
                scope: bulkDeleteForm.scope,
                routeId: bulkDeleteForm.scope === 'ROUTE' ? bulkDeleteForm.routeId : undefined,
                timeMode: bulkDeleteForm.timeMode,
                dateFrom: bulkDeleteForm.timeMode === 'RANGE' ? bulkDeleteForm.dateFrom : undefined,
                dateTo: bulkDeleteForm.timeMode === 'RANGE' ? bulkDeleteForm.dateTo : undefined,
                acknowledgeMonthlyPass: ackMonthlyPass,
                acknowledgeTripTickets: ackTripTickets,
            };

            const res = await api.post('/api/admin/schedules/bulk-delete', payload);
            if (res.data.ok) {
                showAlert(res.data.message || 'Đã xóa', 'Thành công');
                setShowBulkDeleteModal(false);
                fetchData();
            }
        } catch (e) {
            const st = e.response?.status;
            const d = e.response?.data;

            if (st === 409 && d?.code === 'MONTHLY_PASS_WARNING' && !ackMonthlyPass) {
                const n = d.activeMonthlyPassesOnDay;
                showConfirm(
                    `Xác nhận xóa dù có ${n} vé tháng hiệu lực trong ngày?`,
                    () => handleBulkDeleteSchedules(true, ackTripTickets)
                );
                return;
            }
            if (st === 409 && d?.code === 'TRIP_TICKET_WARNING' && !ackTripTickets) {
                const n = d.activeTripTicketsBooked;
                showConfirm(
                    `Xác nhận xóa dù có ${n} vé lẻ đã đặt?`,
                    () => handleBulkDeleteSchedules(ackMonthlyPass, true)
                );
                return;
            }

            showAlert(d?.message || 'Lỗi khi xóa lịch', 'Lỗi');
        } finally {
            setBulkDeleteLoading(false);
        }
    };

    const getStatusStyle = (schedule) => {
        const st = schedule.effectiveStatus || schedule.status || 'SCHEDULED';
        if (st === 'CANCELLED') return { color: 'bg-red-100 text-red-800 border-red-200', text: 'Đã hủy' };
        if (st === 'COMPLETED') return { color: 'bg-green-100 text-green-800 border-green-200', text: 'Hoàn thành' };
        if (st === 'IN_PROGRESS') return { color: 'bg-amber-100 text-amber-900 border-amber-200', text: 'Đang chạy' };
        if (!schedule.busId || !schedule.driverId) {
            return { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', text: 'Chờ xếp xe/tài' };
        }
        return { color: 'bg-gray-100 text-gray-800 border-gray-200', text: 'Đã lên lịch' };
    };

    const rowConflict = (schedule) => {
        const st = schedule.effectiveStatus || schedule.status;
        if (st === 'CANCELLED' || st === 'COMPLETED') return false;
        return !schedule.busId || !schedule.driverId;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b border-gray-200 text-black">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FaCalendarAlt className="text-[#23a983]" /> Điều phối & Phân công
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Sinh lịch theo tần suất tuyến, validate trùng lịch / 8h tài xế; xóa theo rule nghiệp vụ; realtime cho tài xế (Socket)
                    </p>
                </div>
                <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
                    <button
                        type="button"
                        onClick={() => {
                            const r0 = routes[0]?._id || '';
                            setGenForm((g) => ({
                                ...g,
                                routeId: r0,
                                dateFrom: new Date().toISOString().split('T')[0],
                                dateTo: new Date().toISOString().split('T')[0],
                            }));
                            setShowGenModal(true);
                        }}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 flex items-center gap-2"
                    >
                        <FaMagic /> Sinh lịch theo tuần
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            const r0 = bulkDeleteForm.scope === 'ROUTE' ? (routes[0]?._id || '') : '';
                            setBulkDeleteForm((d) => ({
                                ...d,
                                scope: 'ALL_ROUTES',
                                routeId: r0,
                                timeMode: 'RANGE',
                            }));
                            setShowBulkDeleteModal(true);
                        }}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 flex items-center gap-2"
                    >
                        <FaTrash /> Xóa lịch
                    </button>
                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-[#23a983] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#1bbd8f] flex items-center gap-2"
                    >
                        <FaPlus /> Tạo lịch tay
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden text-black">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider border-b border-gray-200 text-center">
                                <th className="px-6 py-4 font-semibold">Ngày</th>
                                <th className="px-6 py-4 font-semibold">Xuất bến / Ca</th>
                                <th className="px-6 py-4 font-semibold">Tuyến</th>
                                <th className="px-6 py-4 font-semibold">Xe</th>
                                <th className="px-6 py-4 font-semibold">Tài xế</th>
                                <th className="px-6 py-4 font-semibold">Phụ xe</th>
                                <th className="px-6 py-4 font-semibold">Trạng thái</th>
                                <th className="px-6 py-4 font-semibold text-center">Tác vụ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-center">
                            {loading ? (
                                <tr><td colSpan="8" className="py-10 text-gray-500">Đang tải dữ liệu...</td></tr>
                            ) : schedules.length === 0 ? (
                                <tr><td colSpan="8" className="py-10 text-gray-500">Chưa có lịch trình phân công nào</td></tr>
                            ) : (
                                schedules.map((schedule) => {
                                    const st = getStatusStyle(schedule);
                                    const conflict = rowConflict(schedule);
                                    return (
                                        <tr
                                            key={schedule._id}
                                            className={`hover:bg-gray-50 transition-colors ${conflict ? 'bg-amber-50/80' : ''}`}
                                        >
                                            <td className="px-6 py-4 font-bold text-gray-800">
                                                {schedule.date ? new Date(schedule.date).toLocaleDateString('vi-VN') : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {schedule.departureTime ? (
                                                    <>
                                                        <div className="font-bold text-gray-800">{schedule.departureTime}</div>
                                                        <div className="text-xs">→ {schedule.shiftTime?.end || '—'}</div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="font-medium">{schedule.shiftTime?.start || '-'} - {schedule.shiftTime?.end || '-'}</div>
                                                        <div className="text-xs text-gray-400">Ca (không tách trip)</div>
                                                    </>
                                                )}
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
                                                        <span className="text-gray-800 text-sm font-medium">{schedule.driverId.fullName}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-red-500 bg-red-50 px-2 py-1 rounded font-medium text-xs">Thiếu TX</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-left">
                                                {schedule.conductorId ? (
                                                    <span className="text-gray-800 text-sm font-medium">{schedule.conductorId.fullName}</span>
                                                ) : (
                                                    <span className="text-orange-500 bg-orange-50 px-2 py-1 rounded font-medium text-xs">Thiếu PX</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 text-xs font-bold rounded-full border ${st.color}`}>
                                                    {st.text}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-1 flex-wrap">
                                                    <button type="button" onClick={() => handleOpenModal(schedule)} className="text-blue-500 hover:text-blue-700 p-2 bg-blue-50 rounded-md" title="Sửa">
                                                        <FaEdit />
                                                    </button>
                                                    {(schedule.effectiveStatus || schedule.status) === 'COMPLETED' && (
                                                        <button type="button" onClick={() => handleArchive(schedule._id)} className="text-gray-600 hover:text-gray-800 p-2 bg-gray-100 rounded-md" title="Archive">
                                                            <FaArchive />
                                                        </button>
                                                    )}
                                                    <button type="button" onClick={() => handleDelete(schedule._id)} className="text-red-500 hover:text-red-700 p-2 bg-red-50 rounded-md" title="Xóa / Hủy">
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

            {showGenModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 text-black">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><FaMagic /> Sinh lịch theo tần suất tuyến</h3>
                            <button type="button" onClick={() => setShowGenModal(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
                        </div>
                        <form onSubmit={handleGenerate} className="p-6 space-y-4">
                            <p className="text-sm text-gray-600">
                                Dùng giờ hoạt động, tần suất, vòng tuyến và buffer đã cấu hình trên tuyến. Xe về muộn nhất theo khung 19:30 (theo nghiệp vụ).
                            </p>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Tuyến *</label>
                                <select
                                    required
                                    value={genForm.routeId}
                                    onChange={(e) => setGenForm({ ...genForm, routeId: e.target.value })}
                                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 outline-none"
                                >
                                    <option value="">-- Chọn --</option>
                                    {routes.map((r) => (
                                        <option key={r._id} value={r._id}>{r.routeNumber} — {r.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Từ ngày *</label>
                                    <input type="date" required value={genForm.dateFrom} onChange={(e) => setGenForm({ ...genForm, dateFrom: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Đến ngày *</label>
                                    <input type="date" required value={genForm.dateTo} onChange={(e) => setGenForm({ ...genForm, dateTo: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
                                </div>
                            </div>
                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={genForm.autoAssign} onChange={(e) => setGenForm({ ...genForm, autoAssign: e.target.checked })} />
                                Tự gán xe / tài xế / phụ xe (ưu tiên không trùng lịch)
                            </label>
                            <label className="flex items-center gap-2 text-sm text-amber-800">
                                <input type="checkbox" checked={genForm.replaceScheduled} onChange={(e) => setGenForm({ ...genForm, replaceScheduled: e.target.checked })} />
                                Xóa các chuyến SCHEDULED cũ của tuyến trong khoảng ngày (trước khi sinh mới)
                            </label>
                            <div className="flex justify-end gap-2 pt-4">
                                <button type="button" onClick={() => setShowGenModal(false)} className="px-4 py-2 bg-gray-100 rounded-lg font-semibold">Đóng</button>
                                <button
                                    type="submit"
                                    disabled={genLoading}
                                    className={`px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 ${genLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    {genLoading ? 'Đang sinh lịch...' : 'Sinh lịch'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showBulkDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 text-black">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                                <FaTrash /> Xóa lịch hàng loạt
                            </h3>
                            <button type="button" onClick={() => setShowBulkDeleteModal(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
                        </div>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleBulkDeleteSchedules(false, false);
                            }}
                            className="p-6 space-y-4"
                        >
                            <p className="text-sm text-gray-600">
                                Chỉ xóa chuyến trạng thái <b>SCHEDULED</b> (chưa chạy). Hệ thống sẽ yêu cầu xác nhận nếu có vé tháng hoặc vé lẻ đã đặt.
                            </p>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Phạm vi</label>
                                <select
                                    value={bulkDeleteForm.scope}
                                    onChange={(e) => setBulkDeleteForm((d) => ({ ...d, scope: e.target.value }))}
                                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 outline-none"
                                >
                                    <option value="ALL_ROUTES">Toàn bộ tuyến</option>
                                    <option value="ROUTE">Theo tuyến</option>
                                </select>
                            </div>

                            {bulkDeleteForm.scope === 'ROUTE' && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Tuyến *</label>
                                    <select
                                        required
                                        value={bulkDeleteForm.routeId}
                                        onChange={(e) => setBulkDeleteForm((d) => ({ ...d, routeId: e.target.value }))}
                                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 outline-none"
                                    >
                                        <option value="">-- Chọn --</option>
                                        {routes.map((r) => (
                                            <option key={r._id} value={r._id}>{r.routeNumber} — {r.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Thời gian</label>
                                <select
                                    value={bulkDeleteForm.timeMode}
                                    onChange={(e) => setBulkDeleteForm((d) => ({ ...d, timeMode: e.target.value }))}
                                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 outline-none"
                                >
                                    <option value="RANGE">Trong khoảng ngày</option>
                                    <option value="ALL_TIME">Tất cả thời gian</option>
                                </select>
                            </div>

                            {bulkDeleteForm.timeMode === 'RANGE' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Từ ngày *</label>
                                        <input
                                            type="date"
                                            required
                                            value={bulkDeleteForm.dateFrom}
                                            onChange={(e) => setBulkDeleteForm((d) => ({ ...d, dateFrom: e.target.value }))}
                                            className="w-full border rounded-lg px-3 py-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Đến ngày *</label>
                                        <input
                                            type="date"
                                            required
                                            value={bulkDeleteForm.dateTo}
                                            onChange={(e) => setBulkDeleteForm((d) => ({ ...d, dateTo: e.target.value }))}
                                            className="w-full border rounded-lg px-3 py-2"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-4">
                                <button type="button" onClick={() => setShowBulkDeleteModal(false)} className="px-4 py-2 bg-gray-100 rounded-lg font-semibold" disabled={bulkDeleteLoading}>
                                    Đóng
                                </button>
                                <button
                                    type="submit"
                                    disabled={bulkDeleteLoading}
                                    className={`px-4 py-2 bg-red-600 text-white rounded-lg font-semibold ${bulkDeleteLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-red-700'}`}
                                >
                                    {bulkDeleteLoading ? 'Đang xóa...' : 'Xóa lịch'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 text-black">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-800">{editingId ? 'Cập nhật phân công' : 'Tạo lịch chạy mới'}</h3>
                            <button type="button" onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
                        </div>
                        <div className="p-6">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Tuyến đường *</label>
                                    <select
                                        required
                                        value={formData.routeId}
                                        onChange={(e) => setFormData({ ...formData, routeId: e.target.value })}
                                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#23a983] outline-none"
                                    >
                                        <option value="" disabled>-- Chọn tuyến --</option>
                                        {routes.map((r) => (
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
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Giờ xuất bến (trip)</label>
                                        <input
                                            type="time"
                                            value={formData.departureTime}
                                            onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
                                            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 outline-none"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Để trống = chỉ nhập ca bên dưới</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Ca bắt đầu *</label>
                                        <input
                                            type="time"
                                            required
                                            value={formData.shiftStart}
                                            onChange={(e) => setFormData({ ...formData, shiftStart: e.target.value })}
                                            className="w-full bg-white border border-gray-300 rounded-lg px-2 py-2 outline-none text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Ca kết thúc *</label>
                                        <input
                                            type="time"
                                            required
                                            value={formData.shiftEnd}
                                            onChange={(e) => setFormData({ ...formData, shiftEnd: e.target.value })}
                                            max="19:30"
                                            className="w-full bg-white border border-gray-300 rounded-lg px-2 py-2 outline-none text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 pt-4 mt-2">
                                    <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2"><FaBus /> Xe & nhân sự</h4>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Xe buýt</label>
                                            <select
                                                value={formData.busId}
                                                onChange={(e) => setFormData({ ...formData, busId: e.target.value })}
                                                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 outline-none text-sm"
                                            >
                                                <option value="">-- Chưa gắn xe --</option>
                                                {buses.map((b) => (
                                                    <option key={b._id} value={b._id}>{b.licensePlate} ({b.status})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Tài xế</label>
                                            <select
                                                value={formData.driverId}
                                                onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
                                                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 outline-none text-sm"
                                            >
                                                <option value="">-- Chưa phân tài xế --</option>
                                                {drivers.map((d) => (
                                                    <option key={d._id} value={d._id}>{d.fullName}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Phụ xe</label>
                                            <select
                                                value={formData.conductorId}
                                                onChange={(e) => setFormData({ ...formData, conductorId: e.target.value })}
                                                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 outline-none text-sm"
                                            >
                                                <option value="">-- Chưa phân phụ xe --</option>
                                                {conductors.map((c) => (
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
