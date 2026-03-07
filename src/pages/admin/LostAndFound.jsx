import React, { useState, useEffect } from 'react';
import { FaSearch, FaPlus, FaBoxOpen, FaEdit, FaTrash } from 'react-icons/fa';
import api from '../../utils/api';
import { useDialog } from '../../context/DialogContext';

const statusConfig = {
    PENDING: { color: 'bg-yellow-100 text-yellow-800', label: 'Đang xử lý' },
    RESOLVED: { color: 'bg-green-100  text-green-800', label: 'Đã giải quyết' },
    CLOSED: { color: 'bg-gray-100   text-gray-600', label: 'Đóng' },
};

const emptyForm = {
    description: '',
    location: '',
    reporter: '',
    phone: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
};

const LostAndFound = () => {
    const { showAlert, showConfirm } = useDialog();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchItems(); }, []);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/admin/lost-found');
            if (res.data.ok) setItems(res.data.reports);
        } catch (err) {
            showAlert('Lỗi khi tải danh sách báo cáo', 'Lỗi');
        } finally { setLoading(false); }
    };

    const openModal = (item = null) => {
        if (item) {
            setEditingId(item._id);
            setForm({
                description: item.description || '',
                location: item.location || '',
                reporter: item.reporter || '',
                phone: item.phone || '',
                date: item.date ? item.date.substring(0, 10) : new Date().toISOString().split('T')[0],
                notes: item.notes || ''
            });
        } else {
            setEditingId(null);
            setForm(emptyForm);
        }
        setShowModal(true);
    };

    const closeModal = () => { setShowModal(false); setEditingId(null); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            let res;
            if (editingId) {
                res = await api.put(`/api/admin/lost-found/${editingId}`, form);
            } else {
                res = await api.post('/api/admin/lost-found', form);
            }
            if (res.data.ok) {
                showAlert(editingId ? 'Đã cập nhật báo cáo' : 'Đã ghi nhận báo cáo mất đồ', 'Thành công');
                closeModal();
                fetchItems();
            }
        } catch (err) {
            showAlert(err.response?.data?.message || 'Lỗi lưu báo cáo', 'Lỗi');
        } finally { setSaving(false); }
    };

    const handleStatusChange = (item) => {
        const nextStatus = item.status === 'PENDING' ? 'RESOLVED' : 'CLOSED';
        const nextLabel = statusConfig[nextStatus]?.label;
        showConfirm(`Chuyển trạng thái báo cáo sang "${nextLabel}"?`, async () => {
            try {
                const res = await api.put(`/api/admin/lost-found/${item._id}`, { status: nextStatus, notes: item.notes });
                if (res.data.ok) fetchItems();
            } catch { showAlert('Lỗi cập nhật trạng thái', 'Lỗi'); }
        });
    };

    const handleDelete = (id) => {
        showConfirm('Xóa báo cáo này?', async () => {
            try {
                const res = await api.delete(`/api/admin/lost-found/${id}`);
                if (res.data.ok) { showAlert('Đã xóa báo cáo', 'Thành công'); fetchItems(); }
            } catch { showAlert('Lỗi xóa báo cáo', 'Lỗi'); }
        });
    };

    const filtered = items.filter(i =>
        (i.description || '').toLowerCase().includes(search.toLowerCase()) ||
        (i.reporter || '').toLowerCase().includes(search.toLowerCase()) ||
        (i.location || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b border-gray-200">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FaBoxOpen className="text-[#23a983]" /> Quản lý Mất đồ / Nhặt được
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Theo dõi và xử lý các báo cáo mất đồ trên xe</p>
                </div>
                <button onClick={() => openModal()}
                    className="mt-4 md:mt-0 bg-[#23a983] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#1bbd8f] flex items-center gap-2">
                    <FaPlus /> Ghi nhận báo cáo
                </button>
            </div>

            {/* Search */}
            <div className="relative text-black">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Tìm theo mô tả, vị trí, người báo cáo..."
                    className="w-full bg-white border border-gray-300 rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-[#23a983] outline-none"
                />
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden text-black">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider border-b">
                                <th className="px-6 py-3 font-semibold">Mô tả đồ vật</th>
                                <th className="px-6 py-3 font-semibold">Vị trí / Tuyến</th>
                                <th className="px-6 py-3 font-semibold">Người báo cáo</th>
                                <th className="px-6 py-3 font-semibold">Ngày</th>
                                <th className="px-6 py-3 font-semibold">Trạng thái</th>
                                <th className="px-6 py-3 font-semibold text-center">Tác vụ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan="6" className="py-10 text-center text-gray-400">Đang tải...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan="6" className="py-10 text-center text-gray-400">Không có báo cáo nào</td></tr>
                            ) : filtered.map(item => {
                                const cfg = statusConfig[item.status] || statusConfig.PENDING;
                                return (
                                    <tr key={item._id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-semibold text-gray-800 max-w-[200px]">
                                            <p className="truncate">{item.description}</p>
                                            {item.notes && <p className="text-xs text-gray-400 truncate mt-0.5">{item.notes}</p>}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{item.location}</td>
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-gray-800">{item.reporter || '—'}</p>
                                            <p className="text-xs text-gray-500">{item.phone}</p>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {item.date ? new Date(item.date).toLocaleDateString('vi-VN') : '—'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${cfg.color}`}>{cfg.label}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => openModal(item)} className="p-2 bg-blue-50 text-blue-500 hover:text-blue-700 rounded-md">
                                                    <FaEdit />
                                                </button>
                                                {item.status !== 'CLOSED' && (
                                                    <button onClick={() => handleStatusChange(item)}
                                                        className={`px-2 py-1.5 rounded-md text-xs font-semibold ${item.status === 'PENDING' ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                                                        {item.status === 'PENDING' ? 'Xử lý xong' : 'Đóng'}
                                                    </button>
                                                )}
                                                <button onClick={() => handleDelete(item._id)} className="p-2 bg-red-50 text-red-400 hover:text-red-600 rounded-md">
                                                    <FaTrash />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-3 bg-gray-50 border-t text-sm text-gray-500">
                    Hiển thị {filtered.length} / {items.length} báo cáo
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 text-black">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-800">{editingId ? 'Sửa báo cáo' : 'Ghi nhận báo cáo mất đồ'}</h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Mô tả đồ vật *</label>
                                <input required value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                    placeholder="VD: Chiếc ví màu đen, điện thoại iPhone..."
                                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#23a983] outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Vị trí / Tuyến xe *</label>
                                <input required value={form.location}
                                    onChange={e => setForm({ ...form, location: e.target.value })}
                                    placeholder="VD: Tuyến R16, trạm Đại học Đà Nẵng"
                                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#23a983] outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Người báo cáo</label>
                                    <input value={form.reporter}
                                        onChange={e => setForm({ ...form, reporter: e.target.value })}
                                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#23a983] outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">SĐT liên hệ</label>
                                    <input value={form.phone}
                                        onChange={e => setForm({ ...form, phone: e.target.value })}
                                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#23a983] outline-none" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Ngày xảy ra</label>
                                    <input type="date" value={form.date}
                                        onChange={e => setForm({ ...form, date: e.target.value })}
                                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#23a983] outline-none" />
                                </div>
                                {editingId && (
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Trạng thái</label>
                                        <select value={form.status || 'PENDING'}
                                            onChange={e => setForm({ ...form, status: e.target.value })}
                                            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#23a983] outline-none">
                                            <option value="PENDING">Đang xử lý</option>
                                            <option value="RESOLVED">Đã giải quyết</option>
                                            <option value="CLOSED">Đóng</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Ghi chú thêm</label>
                                <textarea value={form.notes}
                                    onChange={e => setForm({ ...form, notes: e.target.value })}
                                    rows={2} placeholder="Thông tin liên quan, hướng xử lý..."
                                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#23a983] outline-none resize-none" />
                            </div>
                            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                                <button type="button" onClick={closeModal}
                                    className="px-5 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold">Hủy</button>
                                <button type="submit" disabled={saving}
                                    className="px-5 py-2 bg-[#23a983] hover:bg-[#1bbd8f] text-white rounded-lg font-semibold disabled:opacity-50">
                                    {saving ? 'Đang lưu...' : editingId ? 'Lưu cập nhật' : 'Ghi nhận'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LostAndFound;
