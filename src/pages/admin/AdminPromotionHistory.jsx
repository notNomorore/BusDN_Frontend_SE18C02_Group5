import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiArrowLeft,
  FiClock,
  FiExternalLink,
  FiSearch,
  FiRefreshCw,
  FiUser,
} from 'react-icons/fi';
import api from '../../utils/api';
import {
  buildMonthlyPassDetailsPath,
  formatMonthlyPassDateTime,
  formatMonthlyPassPeriod,
  getMonthlyPassRouteLabel,
} from '../../utils/monthlyPass';

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: 'SUCCESS', label: 'Thành công' },
  { value: 'PENDING', label: 'Đang chờ' },
  { value: 'FAILED', label: 'Thất bại' },
  { value: 'CANCELLED', label: 'Đã huỷ' },
  { value: 'ALL', label: 'Tất cả' },
];

const STATUS_LABELS = {
  SUCCESS: 'Thành công',
  PENDING: 'Đang chờ',
  FAILED: 'Thất bại',
  CANCELLED: 'Đã huỷ',
};

const STATUS_COLORS = {
  SUCCESS: 'bg-emerald-100 text-emerald-700',
  PENDING: 'bg-amber-100 text-amber-700',
  FAILED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-600',
};

const METHOD_LABELS = {
  VNPAY: 'VNPAY',
  MOMO: 'MoMo',
  WALLET: 'Ví BusDN',
  PAYOS: 'PayOS',
};

const formatMoney = (value) => Number(value || 0).toLocaleString('vi-VN');

const buildMonthlyPassSummary = (item) => {
  const monthlyPass = item?.monthlyPass || {};
  const routeSnapshot = monthlyPass.routeSnapshot || {};

  return {
    passType: monthlyPass.passType || item?.rawReturn?.passType || '',
    displayRouteNumber: routeSnapshot.routeNumber || '',
    displayRouteName: routeSnapshot.name || '',
  };
};

export default function AdminPromotionHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');

  const loadHistory = useCallback(async ({ showLoading = true } = {}) => {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(PAGE_SIZE));
      if (query) params.set('q', query);
      if (statusFilter) params.set('status', statusFilter);

      const res = await api.get(`/api/admin/promotions/usage-history?${params}`);
      if (res.data.ok) {
        const nextTotalPages = res.data.totalPages || 1;
        setHistory(res.data.history || []);
        setTotal(res.data.total || 0);
        setTotalPages(nextTotalPages);
        if (page > nextTotalPages) {
          setPage(nextTotalPages);
        }
        setLastUpdated(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
      }
    } catch (error) {
      console.error('Error fetching promotion usage history:', error);
    } finally {
      if (showLoading) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  }, [page, query, statusFilter]);

  useEffect(() => {
    loadHistory({ showLoading: true });
  }, [loadHistory]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      loadHistory({ showLoading: false });
    }, 15000);
    return () => window.clearInterval(timer);
  }, [loadHistory]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setQuery(search.trim());
    setPage(1);
  };

  const statusBadge = (status) => STATUS_COLORS[status] || 'bg-slate-100 text-slate-600';

  const renderRows = () => {
    if (loading) {
      return (
        <tr>
          <td colSpan={8} className="px-6 py-12 text-center">
            <div className="flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            </div>
          </td>
        </tr>
      );
    }

    if (history.length === 0) {
      return (
        <tr>
          <td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-400">
            Không có lịch sử sử dụng mã giảm giá.
          </td>
        </tr>
      );
    }

    return history.map((item) => {
      const monthlyPass = item.monthlyPass || null;
      const passSummary = buildMonthlyPassSummary(item);
      const passPeriod = formatMonthlyPassPeriod(monthlyPass?.month ?? item?.rawReturn?.month, monthlyPass?.year ?? item?.rawReturn?.year);
      const routeLabel = getMonthlyPassRouteLabel(passSummary);
      const discountText = item.discountAmount ? `-${formatMoney(item.discountAmount)}đ` : '0đ';
      const customerName = item.user?.fullName || 'Khách hàng';
      const customerContact = item.user?.email || item.user?.phone || '--';
      const statusLabel = STATUS_LABELS[item.status] || item.status;
      const statusClass = statusBadge(item.status);
      const paymentMethod = METHOD_LABELS[item.method] || item.method || '--';
      const timeLabel = formatMonthlyPassDateTime(item.paidAt || item.createdAt);

      return (
        <tr key={item._id} className="transition-colors hover:bg-slate-50/80">
          <td className="px-4 py-3 font-mono text-sm font-bold text-slate-800 whitespace-nowrap">
            <div>{item.rawReturn?.promoCode || '--'}</div>
            <div className="text-[11px] font-normal text-slate-400">{item.txnRef || ''}</div>
          </td>
          <td className="px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <FiUser />
              </div>
              <div className="min-w-0">
                <div className="truncate font-semibold text-slate-800">{customerName}</div>
                <div className="truncate text-xs text-slate-400">{customerContact}</div>
              </div>
            </div>
          </td>
          <td className="px-4 py-3">
            <div className="leading-tight">
              <div className="truncate font-semibold text-slate-800">{monthlyPass?.passCode || '--'}</div>
              <div className="truncate text-xs text-slate-400">{passPeriod}</div>
              <div className="truncate text-xs text-slate-500">{routeLabel}</div>
            </div>
          </td>
          <td className="px-4 py-3 font-bold text-emerald-700">{discountText}</td>
          <td className="px-4 py-3 text-slate-600">{paymentMethod}</td>
          <td className="px-4 py-3">
            <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${statusClass}`}>
              {statusLabel}
            </span>
          </td>
          <td className="px-4 py-3 text-[11px] leading-tight text-slate-500">
            <div className="flex items-center gap-1.5">
              <FiClock className="text-slate-400" size={12} />
              <span>{timeLabel}</span>
            </div>
          </td>
          <td className="px-4 py-3 text-right">
            {monthlyPass?._id ? (
              <Link
                to={buildMonthlyPassDetailsPath(monthlyPass._id)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                <FiExternalLink size={14} /> Xem vé
              </Link>
            ) : (
              <span className="text-xs text-slate-400">--</span>
            )}
          </td>
        </tr>
      );
    });
  };

  return (
    <div className="space-y-6">
      <div className="admin-page-head">
        <div>
          <Link
            to="/admin/promotions"
            className="mb-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            <FiArrowLeft size={14} /> Quay lại khuyến mãi
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">Lịch sử sử dụng mã giảm giá</h1>
          <p className="mt-1 text-sm text-gray-500">
            Theo dõi các giao dịch đã dùng mã giảm giá vé tháng, có phân trang theo 10 dòng mỗi trang.
          </p>
        </div>
        <div className="flex items-end gap-3">
          <button
            type="button"
            onClick={() => loadHistory({ showLoading: false })}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
          >
            <FiRefreshCw className={refreshing ? 'animate-spin' : ''} size={14} />
            Làm mới
          </button>
          <div className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm">
            Tổng {total.toLocaleString('vi-VN')} lượt
            {lastUpdated ? <div className="mt-1 text-[11px] font-normal text-slate-400">Cập nhật lúc {lastUpdated}</div> : null}
          </div>
        </div>
      </div>

      <div className="admin-toolbar text-black">
        <form onSubmit={handleSearchSubmit} className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_auto]">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Tìm kiếm</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Mã KM, mã vé, tên khách hàng..."
              className="w-full rounded-xl border border-gray-200 bg-[#f8fafc] px-4 py-2.5 outline-none transition focus:border-[#23a983] focus:bg-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Trạng thái</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="admin-promotions-select h-11 w-full rounded-xl border border-gray-200 bg-[#f8fafc] px-4 outline-none transition focus:border-[#23a983] focus:bg-white"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 font-semibold text-white transition hover:bg-gray-800"
            >
              <FiSearch /> Lọc
            </button>
          </div>
        </form>
      </div>

      <div className="admin-surface overflow-hidden text-black">
        <div className="mt-5 overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="text-xs uppercase tracking-[0.18em] text-gray-400">
                <th className="px-4 py-3 font-semibold">Mã KM</th>
                <th className="px-4 py-3 font-semibold">Khách hàng</th>
                <th className="px-4 py-3 font-semibold">Vé tháng</th>
                <th className="px-4 py-3 font-semibold">Giảm</th>
                <th className="px-4 py-3 font-semibold">Thanh toán</th>
                <th className="px-4 py-3 font-semibold">Trạng thái</th>
                <th className="px-4 py-3 font-semibold">Thời gian</th>
                <th className="px-4 py-3 text-center font-semibold">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {renderRows()}
            </tbody>
          </table>
        </div>

        {totalPages > 1 ? (
          <div className="flex justify-center gap-2 px-6 pb-6 pt-5">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPage(i + 1)}
                className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold transition ${
                  page === i + 1
                    ? 'bg-[#23a983] text-white'
                    : 'bg-[#f3f5f8] text-gray-700 hover:bg-gray-200'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
