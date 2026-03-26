import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaHistory, FaPlus, FaSearch, FaEdit, FaStopCircle } from 'react-icons/fa';
import api from '../../utils/api';

const SCOPE_LABELS = {
  ALL: 'Tất cả vé tháng',
  SINGLE_ROUTE: 'Vé đơn tuyến',
  INTER_ROUTE: 'Vé liên tuyến',
};

const STATUS_LABELS = {
  DRAFT: 'Bản nháp',
  SCHEDULED: 'Sắp diễn ra',
  ACTIVE: 'Đang hoạt động',
  ENDED: 'Đã kết thúc',
  CANCELLED: 'Đã huỷ',
};

const STATUS_COLORS = {
  DRAFT: 'bg-slate-100 text-slate-600',
  SCHEDULED: 'bg-blue-100 text-blue-700',
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  ENDED: 'bg-gray-100 text-gray-500',
  CANCELLED: 'bg-red-100 text-red-600',
};

const PAGE_SIZE = 10;

const fmt = (value) => Number(value || 0).toLocaleString('vi-VN');

const fmtDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
};

const toDateTimeLocalValue = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const EMPTY_FORM = {
  code: '',
  name: '',
  description: '',
  discountType: 'PERCENT',
  discountValue: '',
  maxDiscountValue: '',
  minOrderValue: 0,
  usageLimitTotal: '',
  usageLimitPerUser: 1,
  applyScope: 'ALL',
  routeId: '',
  startAt: '',
  endAt: '',
  status: 'DRAFT',
};

export default function AdminPromotions() {
  const [promotions, setPromotions] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterQ, setFilterQ] = useState('');
  const [page, setPage] = useState(1);

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchPromotions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (filterQ) params.set('q', filterQ);

      const res = await api.get(`/api/admin/promotions?${params.toString()}`);
      if (res.data.ok) {
        setPromotions(res.data.promotions || []);
        setRoutes(res.data.routes || []);
      }
    } catch (error) {
      console.error('Error loading promotions:', error);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterQ]);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  useEffect(() => {
    setPage(1);
  }, [filterStatus, filterQ]);

  useEffect(() => {
    const nextTotalPages = Math.max(1, Math.ceil(promotions.length / PAGE_SIZE));
    setPage((current) => Math.min(current, nextTotalPages));
  }, [promotions.length]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setFormError('');
    setModal('create');
  };

  const openEdit = (promo) => {
    setForm({
      code: promo.code || '',
      name: promo.name || '',
      description: promo.description || '',
      discountType: promo.discountType || 'PERCENT',
      discountValue: promo.discountValue ?? '',
      maxDiscountValue: promo.maxDiscountValue ?? '',
      minOrderValue: promo.minOrderValue ?? 0,
      usageLimitTotal: promo.usageLimitTotal ?? '',
      usageLimitPerUser: promo.usageLimitPerUser ?? 1,
      applyScope: promo.applyScope || 'ALL',
      routeId: promo.routeId?._id || promo.routeId || '',
      startAt: toDateTimeLocalValue(promo.startAt),
      endAt: toDateTimeLocalValue(promo.endAt),
      status: promo.status || 'DRAFT',
    });
    setEditId(promo._id);
    setFormError('');
    setModal('edit');
  };

  const closeModal = () => {
    setModal(null);
    setFormError('');
    setSaving(false);
  };

  const field = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleFilterSubmit = (event) => {
    event.preventDefault();
    fetchPromotions();
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError('');

    try {
      const payload = {
        ...form,
        discountValue: Number(form.discountValue),
        maxDiscountValue: form.maxDiscountValue !== '' ? Number(form.maxDiscountValue) : null,
        minOrderValue: Number(form.minOrderValue || 0),
        usageLimitTotal: form.usageLimitTotal !== '' ? Number(form.usageLimitTotal) : null,
        usageLimitPerUser: Number(form.usageLimitPerUser || 1),
        routeId: form.applyScope === 'SINGLE_ROUTE' ? form.routeId : null,
      };

      const res = editId
        ? await api.put(`/api/admin/promotions/${editId}`, payload)
        : await api.post('/api/admin/promotions', payload);

      if (res.data.ok) {
        closeModal();
        fetchPromotions();
      } else {
        setFormError(res.data.message || 'Lỗi không xác định');
      }
    } catch (error) {
      setFormError(error.response?.data?.message || 'Lỗi hệ thống');
    } finally {
      setSaving(false);
    }
  };

  const handleEndEarly = async (promo) => {
    if (!window.confirm(`Kết thúc sớm chương trình "${promo.name}"?`)) return;

    try {
      await api.post(`/api/admin/promotions/${promo._id}/end-early`);
      fetchPromotions();
    } catch (error) {
      alert(error.response?.data?.message || 'Lỗi');
    }
  };

  const totalPages = Math.max(1, Math.ceil(promotions.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visiblePromotions = promotions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="admin-page-head">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Quản lý khuyến mãi</h1>
          <p className="mt-1 text-sm text-gray-500">Tạo và quản lý mã giảm giá vé tháng.</p>
        </div>

        <div className="flex flex-wrap gap-3 md:flex-nowrap">
          <Link
            to="/admin/promotions/history"
            className="inline-flex min-w-[220px] items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 font-semibold text-[#23a983] transition hover:bg-[#f3fffa]"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
          >
            <FaHistory />
            Lịch sử mã giảm giá
          </Link>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex min-w-[220px] items-center justify-center gap-2 rounded-xl bg-[#23a983] px-4 py-2.5 font-semibold text-white transition hover:bg-[#1bbd8f]"
          >
            <FaPlus />
            Tạo chương trình
          </button>
        </div>
      </div>

      <div className="admin-toolbar text-black">
        <form onSubmit={handleFilterSubmit} className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_180px]">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Tìm kiếm</label>
            <input
              type="text"
              value={filterQ}
              onChange={(e) => setFilterQ(e.target.value)}
              placeholder="Tìm mã hoặc tên..."
              className="w-full rounded-xl border border-gray-200 bg-[#f8fafc] px-4 py-2.5 outline-none transition focus:border-[#23a983] focus:bg-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Trạng thái</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-[#f8fafc] px-4 py-2.5 outline-none transition focus:border-[#23a983] focus:bg-white"
            >
              <option value="">Tất cả trạng thái</option>
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 font-semibold text-white transition hover:bg-gray-800"
            >
              <FaSearch />
              Lọc
            </button>
          </div>
        </form>
      </div>

      <div className="admin-surface overflow-hidden text-black">
        <div className="flex items-center justify-between px-6 pt-6">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Danh sách khuyến mãi</h2>
            <p className="mt-1 text-sm text-gray-500">Thông tin chương trình và trạng thái hoạt động.</p>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            </div>
          ) : promotions.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">Chưa có chương trình khuyến mãi nào.</div>
          ) : (
            <table className="w-full table-fixed text-left text-sm">
              <colgroup>
                <col className="w-[11%]" />
                <col className="w-[24%]" />
                <col className="w-[15%]" />
                <col className="w-[14%]" />
                <col className="w-[13%]" />
                <col className="w-[13%]" />
                <col className="w-[10%]" />
                <col className="w-[10%]" />
              </colgroup>
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-gray-400">
                <tr>
                  <th className="px-6 py-3 font-semibold">Mã</th>
                  <th className="px-6 py-3 font-semibold">Tên</th>
                  <th className="px-6 py-3 font-semibold">Giảm</th>
                  <th className="px-6 py-3 font-semibold">Phạm vi</th>
                  <th className="px-6 py-3 font-semibold">Lượt dùng</th>
                  <th className="px-6 py-3 font-semibold">Thời gian</th>
                  <th className="px-6 py-3 font-semibold">Trạng thái</th>
                  <th className="px-6 py-3 text-center font-semibold">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visiblePromotions.map((promo) => (
                  <tr key={promo._id} className="transition-colors hover:bg-[#fbfcfd]">
                    <td className="px-6 py-5 align-top font-mono font-bold text-gray-800 whitespace-nowrap">
                      {promo.code}
                    </td>
                    <td className="px-6 py-5 align-top font-semibold leading-6 text-gray-700 whitespace-normal break-words">
                      {promo.name}
                    </td>
                    <td className="px-6 py-5 align-top font-bold leading-6 whitespace-normal break-words text-emerald-700">
                      {promo.discountType === 'PERCENT'
                        ? `${promo.discountValue}%${promo.maxDiscountValue ? ` (tối đa ${fmt(promo.maxDiscountValue)}đ)` : ''}`
                        : `${fmt(promo.discountValue)}đ`}
                    </td>
                    <td className="px-6 py-5 align-top text-gray-600">
                      {SCOPE_LABELS[promo.applyScope] || promo.applyScope}
                    </td>
                    <td className="px-6 py-5 align-top">
                      <span className="font-bold text-gray-800">{promo.usageCount || 0}</span>
                      <span className="text-gray-400">
                        {promo.usageLimitTotal ? `/${promo.usageLimitTotal}` : ''} tổng
                      </span>
                      <br />
                      <span className="text-xs text-gray-400">
                        Mỗi người: {promo.usageLimitPerUser || 1} lượt
                      </span>
                    </td>
                    <td className="px-6 py-5 align-top text-xs leading-5 text-gray-500">
                      <div>{fmtDate(promo.startAt)}</div>
                      <div className="text-gray-400">→ {fmtDate(promo.endAt)}</div>
                    </td>
                    <td className="px-6 py-5 align-top">
                      <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${STATUS_COLORS[promo.status] || 'bg-gray-100 text-gray-500'}`}>
                        {STATUS_LABELS[promo.status] || promo.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 align-top">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => openEdit(promo)}
                          title="Chỉnh sửa"
                          aria-label="Chỉnh sửa"
                          className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-transparent text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
                        >
                          <FaEdit />
                        </button>
                        {promo.status !== 'ENDED' && promo.status !== 'CANCELLED' ? (
                          <button
                            type="button"
                            onClick={() => handleEndEarly(promo)}
                            title="Kết thúc sớm"
                            aria-label="Kết thúc sớm"
                            className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-transparent text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
                          >
                            <FaStopCircle />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 ? (
          <div className="flex justify-center gap-2 px-6 pb-6 pt-5">
            {Array.from({ length: totalPages }).map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setPage(index + 1)}
                className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold transition ${
                  currentPage === index + 1
                    ? 'bg-[#23a983] text-white'
                    : 'bg-[#f3f5f8] text-gray-700 hover:bg-gray-200'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {(modal === 'create' || modal === 'edit') ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-black text-slate-900">
                {modal === 'create' ? 'Tạo chương trình khuyến mãi' : 'Chỉnh sửa khuyến mãi'}
              </h2>
              <button type="button" onClick={closeModal} className="rounded-lg p-1 hover:bg-slate-100">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 p-6">
              <FormField label="Mã *" required>
                <input
                  value={form.code}
                  onChange={(event) => field('code', event.target.value.toUpperCase())}
                  className={inputCls}
                  placeholder="VD: SUMMER20"
                  disabled={modal === 'edit'}
                />
              </FormField>

              <FormField label="Tên chương trình *">
                <input
                  value={form.name}
                  onChange={(event) => field('name', event.target.value)}
                  className={inputCls}
                />
              </FormField>

              <FormField label="Mô tả" className="col-span-2">
                <textarea
                  value={form.description}
                  onChange={(event) => field('description', event.target.value)}
                  rows={2}
                  className={`${inputCls} resize-none`}
                />
              </FormField>

              <FormField label="Loại giảm *">
                <select
                  value={form.discountType}
                  onChange={(event) => field('discountType', event.target.value)}
                  className={inputCls}
                >
                  <option value="PERCENT">Phần trăm (%)</option>
                  <option value="FIXED">Số tiền cố định (đ)</option>
                </select>
              </FormField>

              <FormField label="Giá trị giảm *">
                <input
                  type="number"
                  min="0"
                  value={form.discountValue}
                  onChange={(event) => field('discountValue', event.target.value)}
                  className={inputCls}
                />
              </FormField>

              <FormField label="Trần giảm tối đa">
                <input
                  type="number"
                  min="0"
                  value={form.maxDiscountValue}
                  onChange={(event) => field('maxDiscountValue', event.target.value)}
                  className={inputCls}
                  placeholder="Để trống = không giới hạn"
                />
              </FormField>

              <FormField label="Đơn tối thiểu">
                <input
                  type="number"
                  min="0"
                  value={form.minOrderValue}
                  onChange={(event) => field('minOrderValue', event.target.value)}
                  className={inputCls}
                />
              </FormField>

              <FormField label="Giới hạn tổng lượt">
                <input
                  type="number"
                  min="1"
                  value={form.usageLimitTotal}
                  onChange={(event) => field('usageLimitTotal', event.target.value)}
                  className={inputCls}
                  placeholder="Để trống = không giới hạn"
                />
              </FormField>

              <FormField label="Giới hạn mỗi người *">
                <input
                  type="number"
                  min="1"
                  value={form.usageLimitPerUser}
                  onChange={(event) => field('usageLimitPerUser', event.target.value)}
                  className={inputCls}
                />
              </FormField>

              <FormField label="Phạm vi áp dụng *">
                <select
                  value={form.applyScope}
                  onChange={(event) => field('applyScope', event.target.value)}
                  className={inputCls}
                >
                  {Object.entries(SCOPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </FormField>

              {form.applyScope === 'SINGLE_ROUTE' ? (
                <FormField label="Tuyến xe">
                  <select
                    value={form.routeId}
                    onChange={(event) => field('routeId', event.target.value)}
                    className={inputCls}
                  >
                    <option value="">-- Chọn tuyến --</option>
                    {routes.map((route) => (
                      <option key={route._id} value={route._id}>
                        {route.routeNumber ? `Tuyến ${route.routeNumber}: ` : ''}{route.name}
                      </option>
                    ))}
                  </select>
                </FormField>
              ) : null}

              <FormField label="Bắt đầu *">
                <input
                  type="datetime-local"
                  value={form.startAt}
                  onChange={(event) => field('startAt', event.target.value)}
                  className={inputCls}
                />
              </FormField>

              <FormField label="Kết thúc *">
                <input
                  type="datetime-local"
                  value={form.endAt}
                  onChange={(event) => field('endAt', event.target.value)}
                  className={inputCls}
                />
              </FormField>

              <FormField label="Trạng thái *">
                <select
                  value={form.status}
                  onChange={(event) => field('status', event.target.value)}
                  className={inputCls}
                >
                  <option value="DRAFT">Bản nháp</option>
                  <option value="SCHEDULED">Sắp diễn ra</option>
                  <option value="ACTIVE">Đang hoạt động</option>
                </select>
              </FormField>
            </div>

            {formError ? (
              <div className="mx-6 mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {formError}
              </div>
            ) : null}

            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-slate-200 px-5 py-2.5 font-semibold text-slate-600 transition-all hover:bg-slate-50"
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl bg-[#23a983] px-6 py-2.5 font-bold text-white transition-all hover:bg-[#1bbd8f] active:scale-95 disabled:opacity-50"
              >
                {saving ? 'Đang lưu...' : (modal === 'create' ? 'Tạo chương trình' : 'Lưu thay đổi')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const inputCls = 'w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-emerald-400';

function FormField({ label, children, className = '', required = false }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-xs font-bold uppercase tracking-wide text-slate-600">
        {label}
        {required ? ' ' : ''}
      </label>
      {children}
    </div>
  );
}
