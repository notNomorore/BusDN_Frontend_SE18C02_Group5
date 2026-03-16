import React, { useEffect, useState } from 'react';
import { FaChartLine, FaDownload, FaFilePdf, FaSync } from 'react-icons/fa';
import api from '../../utils/api';
import { useDialog } from '../../context/DialogContext';

const groupOptions = [
    { value: 'day', label: 'Theo ngày' },
    { value: 'route', label: 'Theo tuyến' },
];

const RevenueReports = () => {
    const { showAlert } = useDialog();

    const [filters, setFilters] = useState(() => {
        const today = new Date().toISOString().substring(0, 10);
        return { from: today, to: today, groupBy: 'day' };
    });
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState({ totalRevenue: 0, totalPassengers: 0, totalTrips: 0 });
    const [rows, setRows] = useState([]);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/admin/reports/revenue', {
                params: {
                    from: filters.from || undefined,
                    to: filters.to || undefined,
                    group: filters.groupBy || 'day',
                },
            });
            if (res.data.ok) {
                setSummary(res.data.summary || { totalRevenue: 0, totalPassengers: 0, totalTrips: 0 });
                setRows(res.data.rows || []);
            } else {
                showAlert(res.data.message || 'Không thể tải báo cáo doanh thu', 'Lỗi');
            }
        } catch (err) {
            console.error(err);
            showAlert('Lỗi kết nối khi tải báo cáo doanh thu', 'Lỗi');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const maxRevenue = rows.reduce((max, r) => Math.max(max, r.revenue || 0), 0) || 1;

    const formatCurrency = (value) =>
        (value || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });

    const handleChangeFilter = (field, value) => {
        setFilters((prev) => ({ ...prev, [field]: value }));
    };

    const handleApplyFilters = () => {
        fetchReports();
    };

    const buildCsvContent = () => {
        const header = 'Nhóm,Doanh thu,Tổng khách,Số chuyến\n';
        const lines = rows.map((r) =>
            [
                `"${r.label.replace(/"/g, '""')}"`,
                r.revenue || 0,
                r.passengers || 0,
                r.trips || 0,
            ].join(',')
        );
        const summaryLine = [
            '"TỔNG"',
            summary.totalRevenue || 0,
            summary.totalPassengers || 0,
            summary.totalTrips || 0,
        ].join(',');
        return header + lines.join('\n') + '\n' + summaryLine;
    };

    const handleExportExcel = () => {
        if (!rows.length) {
            showAlert('Không có dữ liệu để xuất báo cáo', 'Thông báo');
            return;
        }
        const csv = buildCsvContent();
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');

        const from = filters.from || '';
        const to = filters.to || '';
        const range = from && to ? `${from}_to_${to}` : from || to || 'all';

        a.href = url;
        a.download = `revenue-report_${filters.groupBy}_${range}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleExportPdf = () => {
        if (!rows.length) {
            showAlert('Không có dữ liệu để xuất báo cáo', 'Thông báo');
            return;
        }
        // Sử dụng hộp thoại in của trình duyệt, cho phép lưu thành PDF
        showAlert('Vui lòng chọn máy in \"Lưu thành PDF\" trong hộp thoại in.', 'Hướng dẫn');
        setTimeout(() => {
            window.print();
        }, 300);
    };

    return (
        <div className="space-y-6">
            <div className="pb-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FaChartLine className="text-[#23a983]" /> Báo cáo Doanh thu
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Xem biểu đồ doanh thu theo thời gian hoặc theo tuyến, hỗ trợ xuất Excel / PDF.
                    </p>
                </div>
            </div>

            {/* Bộ lọc + nút xuất */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-4 items-end text-black">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Từ ngày</label>
                    <input
                        type="date"
                        value={filters.from}
                        onChange={(e) => handleChangeFilter('from', e.target.value)}
                        className="bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#23a983] outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Đến ngày</label>
                    <input
                        type="date"
                        value={filters.to}
                        onChange={(e) => handleChangeFilter('to', e.target.value)}
                        className="bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#23a983] outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Nhóm theo</label>
                    <select
                        value={filters.groupBy}
                        onChange={(e) => handleChangeFilter('groupBy', e.target.value)}
                        className="bg-white border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#23a983] outline-none text-sm"
                    >
                        {groupOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={handleApplyFilters}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#23a983] hover:bg-[#1a8a6a] text-white font-semibold disabled:opacity-60"
                >
                    <FaSync className={loading ? 'animate-spin' : ''} />
                    Xem báo cáo
                </button>

                <div className="ml-auto flex flex-wrap gap-3">
                    <button
                        onClick={handleExportExcel}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
                    >
                        <FaDownload /> Xuất Excel
                    </button>
                    <button
                        onClick={handleExportPdf}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold"
                    >
                        <FaFilePdf /> Xuất PDF
                    </button>
                </div>
            </div>

            {/* Thống kê tổng quan */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#f0fdf9] border border-[#23a983]/40 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Tổng doanh thu</p>
                    <p className="text-2xl font-bold text-[#23a983] mt-1">
                        {formatCurrency(summary.totalRevenue)}
                    </p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Tổng lượt khách</p>
                    <p className="text-2xl font-bold text-blue-700 mt-1">
                        {(summary.totalPassengers || 0).toLocaleString('vi-VN')}
                    </p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Số chuyến</p>
                    <p className="text-2xl font-bold text-gray-800 mt-1">
                        {(summary.totalTrips || 0).toLocaleString('vi-VN')}
                    </p>
                </div>
            </div>

            {/* Biểu đồ thanh đơn giản */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-black">
                <h2 className="text-base font-semibold text-gray-800 mb-3">Biểu đồ doanh thu</h2>
                {loading ? (
                    <p className="text-center text-gray-400 py-8 text-sm">Đang tải dữ liệu...</p>
                ) : rows.length === 0 ? (
                    <p className="text-center text-gray-400 py-8 text-sm">Không có dữ liệu trong khoảng thời gian đã chọn.</p>
                ) : (
                    <div className="space-y-3">
                        {rows.map((r) => {
                            const width = Math.max(6, Math.round(((r.revenue || 0) / maxRevenue) * 100));
                            return (
                                <div key={r.key} className="space-y-1">
                                    <div className="flex justify-between text-xs text-gray-600">
                                        <span className="font-medium truncate max-w-[60%]" title={r.label}>
                                            {r.label}
                                        </span>
                                        <span className="font-semibold text-gray-800">
                                            {formatCurrency(r.revenue || 0)}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                        <div
                                            className="h-3 bg-gradient-to-r from-[#23a983] to-blue-500 rounded-full"
                                            style={{ width: `${width}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Bảng chi tiết */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden text-black">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b">
                                <th className="px-4 py-3 font-semibold w-1/3">
                                    {filters.groupBy === 'route' ? 'Tuyến' : 'Ngày'}
                                </th>
                                <th className="px-4 py-3 font-semibold text-right">Doanh thu</th>
                                <th className="px-4 py-3 font-semibold text-center">Lượt khách</th>
                                <th className="px-4 py-3 font-semibold text-center">Số chuyến</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="4" className="py-8 text-center text-gray-400">
                                        Đang tải dữ liệu...
                                    </td>
                                </tr>
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="py-8 text-center text-gray-400">
                                        Không có dữ liệu
                                    </td>
                                </tr>
                            ) : (
                                rows.map((r) => (
                                    <tr key={r.key} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 text-gray-800">{r.label}</td>
                                        <td className="px-4 py-3 text-right font-semibold text-green-700">
                                            {formatCurrency(r.revenue || 0)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {(r.passengers || 0).toLocaleString('vi-VN')}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {(r.trips || 0).toLocaleString('vi-VN')}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default RevenueReports;

