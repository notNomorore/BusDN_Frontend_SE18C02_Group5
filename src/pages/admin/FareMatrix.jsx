import React, { useState, useEffect } from 'react';
import { FaDollarSign, FaSave, FaMoneyBillWave, FaTag } from 'react-icons/fa';
import api from '../../utils/api';
import { useDialog } from '../../context/DialogContext';

// Reads the monthlyPassPrice from existing routes and allows Admins to edit them.
// Also provides a simple panel for configuring fare rules (stored in localStorage as a stub
// until a dedicated backend endpoint is available).

const FareMatrix = () => {
    const { showAlert } = useDialog();
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(null);

    // Local fare rules (stub – no backend yet)
    const [rules, setRules] = useState(() => {
        const saved = localStorage.getItem('fareRules');
        return saved ? JSON.parse(saved) : {
            baseFare: 7000,
            priorityDiscount: 50,
            freeRideCategories: 'War Veteran, Disabled',
        };
    });

    useEffect(() => { fetchRoutes(); }, []);

    const fetchRoutes = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/admin/routes');
            if (res.data.ok) setRoutes(res.data.routes.map(r => ({ ...r, _editPrice: r.monthlyPassPrice })));
        } catch {
            showAlert('Lỗi khi tải danh sách tuyến', 'Lỗi');
        } finally { setLoading(false); }
    };

    const updatePrice = (id, val) => {
        setRoutes(prev => prev.map(r => r._id === id ? { ...r, _editPrice: val } : r));
    };

    const savePrice = async (route) => {
        setSaving(route._id);
        try {
            const res = await api.put(`/api/admin/routes/${route._id}`, { monthlyPassPrice: Number(route._editPrice) });
            if (res.data.ok) {
                showAlert(`Đã cập nhật giá vé tháng tuyến ${route.routeNumber}`, 'Thành công');
                fetchRoutes();
            }
        } catch (err) {
            showAlert(err.response?.data?.message || 'Lỗi cập nhật giá', 'Lỗi');
        } finally { setSaving(null); }
    };

    const saveRules = () => {
        localStorage.setItem('fareRules', JSON.stringify(rules));
        showAlert('Đã lưu cấu hình quy tắc giá vé (lưu cục bộ, chờ API backend)', 'Thành công');
    };

    return (
        <div className="space-y-6">
            <div className="pb-4 border-b border-gray-200">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FaDollarSign className="text-[#23a983]" /> Cấu hình Bảng giá vé
                </h1>
                <p className="text-gray-500 text-sm mt-1">Quản lý giá vé lượt, vé tháng và quy tắc miễn giảm</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Monthly pass price per route */}
                <div>
                    <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2"><FaMoneyBillWave className="text-[#23a983]" /> Giá vé tháng theo tuyến</h2>
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden text-black">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider border-b">
                                    <th className="px-4 py-3 font-semibold text-left">Tuyến</th>
                                    <th className="px-4 py-3 font-semibold text-right">Giá/tháng (VNĐ)</th>
                                    <th className="px-4 py-3 font-semibold text-center">Lưu</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr><td colSpan="3" className="py-8 text-center text-gray-400">Đang tải...</td></tr>
                                ) : routes.map(r => (
                                    <tr key={r._id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <span className="bg-[#23a983] text-white px-2 py-0.5 rounded text-xs font-bold mr-2">{r.routeNumber}</span>
                                            <span className="text-sm text-gray-600">{r.name}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="number" min="0" step="1000"
                                                value={r._editPrice}
                                                onChange={e => updatePrice(r._id, e.target.value)}
                                                className="w-full text-right bg-white border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-[#23a983] outline-none text-sm"
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button onClick={() => savePrice(r)} disabled={saving === r._id}
                                                className="bg-[#23a983] hover:bg-[#1bbd8f] text-white px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1 mx-auto">
                                                <FaSave /> {saving === r._id ? '...' : 'Lưu'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* General fare rules */}
                <div>
                    <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2"><FaTag className="text-blue-500" /> Quy tắc giá vé chung</h2>
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-black space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Giá vé lượt cơ bản (VNĐ)</label>
                            <input type="number" min="0" step="500" value={rules.baseFare}
                                onChange={e => setRules({ ...rules, baseFare: Number(e.target.value) })}
                                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                            <p className="text-xs text-gray-400 mt-1">Giá vé lượt mặc định khi không áp dụng ưu tiên</p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Tỷ lệ giảm giá ưu tiên (%)</label>
                            <input type="number" min="0" max="100" value={rules.priorityDiscount}
                                onChange={e => setRules({ ...rules, priorityDiscount: Number(e.target.value) })}
                                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                            <p className="text-xs text-gray-400 mt-1">Áp dụng cho đối tượng có thẻ ưu tiên hợp lệ</p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Đối tượng đi miễn phí</label>
                            <input value={rules.freeRideCategories}
                                onChange={e => setRules({ ...rules, freeRideCategories: e.target.value })}
                                placeholder="War Veteran, Disabled..."
                                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                            <p className="text-xs text-gray-400 mt-1">Phân cách bằng dấu phẩy. Khớp với trường "category" trong hồ sơ ưu tiên.</p>
                        </div>

                        <button onClick={saveRules}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all">
                            <FaSave /> Lưu cấu hình quy tắc
                        </button>

                        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-3">
                            ⚠️ Cấu hình quy tắc hiện lưu cục bộ. Khi backend endpoint <code>/api/admin/fare-rules</code> được tích hợp, dữ liệu sẽ đồng bộ lên server.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FareMatrix;
