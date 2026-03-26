import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';

const SCOPE_LABELS = { ALL: 'Tất cả vé tháng', SINGLE_ROUTE: 'Vé đơn tuyến', INTER_ROUTE: 'Vé liên tuyến' };
const STATUS_LABELS = { DRAFT: 'Bản nháp', SCHEDULED: 'Sắp diễn ra', ACTIVE: 'Đang hoạt động', ENDED: 'Đã kết thúc', CANCELLED: 'Đã huỷ' };
const STATUS_COLORS = {
  DRAFT: 'bg-slate-100 text-slate-600',
  SCHEDULED: 'bg-blue-100 text-blue-700',
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  ENDED: 'bg-gray-100 text-gray-500',
  CANCELLED: 'bg-red-100 text-red-600',
};

const fmt = (n) => Number(n || 0).toLocaleString('vi-VN');
const fmtDate = (d) => d ? new Date(d).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—';

const EMPTY_FORM = {
  code: '', name: '', description: '',
  discountType: 'PERCENT', discountValue: '', maxDiscountValue: '',
  minOrderValue: 0, usageLimitTotal: '', usageLimitPerUser: 1,
  applyScope: 'ALL', routeId: '',
  startAt: '', endAt: '', status: 'DRAFT',
};

export default function AdminPromotions() {
  const [promotions, setPromotions] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterQ, setFilterQ] = useState('');

  // Modal state
  const [modal, setModal] = useState(null); // null | 'create' | 'edit' | 'history'
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Usage history
  const [history, setHistory] = useState([]);
  const [historyPromo, setHistoryPromo] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);

  const fetchPromotions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (filterQ) params.set('q', filterQ);
      const res = await api.get(`/api/admin/promotions?${params}`);
      if (res.data.ok) {
        setPromotions(res.data.promotions || []);
        setRoutes(res.data.routes || []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [filterStatus, filterQ]);

  useEffect(() => { fetchPromotions(); }, [fetchPromotions]);

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
      startAt: promo.startAt ? new Date(promo.startAt).toISOString().slice(0, 16) : '',
      endAt: promo.endAt ? new Date(promo.endAt).toISOString().slice(0, 16) : '',
      status: promo.status || 'DRAFT',
    });
    setEditId(promo._id);
    setFormError('');
    setModal('edit');
  };

  const openHistory = async (promo) => {
    setHistoryPromo(promo);
    setHistoryPage(1);
    setModal('history');
    await loadHistory(promo._id, 1);
  };

  const loadHistory = async (promoId, page) => {
    setHistoryLoading(true);
    try {
      const res = await api.get(`/api/admin/promotions/${promoId}/usage-history?page=${page}&limit=20`);
      if (res.data.ok) {
        setHistory(res.data.history || []);
        setHistoryTotal(res.data.total || 0);
        setHistoryTotalPages(res.data.totalPages || 1);
        setHistoryPage(page);
      }
    } catch { /* ignore */ }
    finally { setHistoryLoading(false); }
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
      let res;
      if (editId) {
        res = await api.put(`/api/admin/promotions/${editId}`, payload);
      } else {
        res = await api.post('/api/admin/promotions', payload);
      }
      if (res.data.ok) {
        setModal(null);
        fetchPromotions();
      } else {
        setFormError(res.data.message || 'Lỗi không xác định');
      }
    } catch (e) {
      setFormError(e.response?.data?.message || 'Lỗi hệ thống');
    } finally {
      setSaving(false);
    }
  };

  const handleEndEarly = async (promo) => {
    if (!window.confirm(`Kết thúc sớm chương trình "${promo.name}"?`)) return;
    try {
      await api.post(`/api/admin/promotions/${promo._id}/end-early`);
      fetchPromotions();
    } catch (e) {
      alert(e.response?.data?.message || 'Lỗi');
    }
  };

  const field = (key, value) => setForm(f => ({ ...f, [key]: value }));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Quản lý khuyến mãi</h1>
          <p className="text-sm text-slate-500 mt-1">Tạo và quản lý mã giảm giá vé tháng</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-base">add</span>
          Tạo chương trình
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <input
          type="text"
          placeholder="Tìm mã hoặc tên..."
          value={filterQ}
          onChange={e => setFilterQ(e.target.value)}
          className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-emerald-400 w-56"
        />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-emerald-400"
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : promotions.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">Chưa có chương trình khuyến mãi nào.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3 font-bold">Mã</th>
                  <th className="px-5 py-3 font-bold">Tên</th>
                  <th className="px-5 py-3 font-bold">Giảm</th>
                  <th className="px-5 py-3 font-bold">Phạm vi</th>
                  <th className="px-5 py-3 font-bold">Lượt dùng</th>
                  <th className="px-5 py-3 font-bold">Thời gian</th>
                  <th className="px-5 py-3 font-bold">Trạng thái</th>
                  <th className="px-5 py-3 font-bold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {promotions.map(p => (
                  <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-slate-800">{p.code}</td>
                    <td className="px-5 py-4 font-semibold text-slate-700 max-w-[180px] truncate">{p.name}</td>
                    <td className="px-5 py-4 text-emerald-700 font-bold">
                      {p.discountType === 'PERCENT'
                        ? `${p.discountValue}%${p.maxDiscountValue ? ` (tối đa ${fmt(p.maxDiscountValue)}đ)` : ''}`
                        : `${fmt(p.discountValue)}đ`}
                    </td>
                    <td className="px-5 py-4 text-slate-600">{SCOPE_LABELS[p.applyScope] || p.applyScope}</td>
                    <td className="px-5 py-4">
                      <span className="font-bold text-slate-800">{p.usageCount || 0}</span>
                      <span className="text-slate-400">
                        {p.usageLimitTotal ? `/${p.usageLimitTotal}` : ''} tổng
                      </span>
                      <br />
                      <span className="text-xs text-slate-400">
                        Mỗi người: {p.usageLimitPerUser || 1} lượt
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      <div>{fmtDate(p.startAt)}</div>
                      <div className="text-slate-400">→ {fmtDate(p.endAt)}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-500'}`}>
                        {STATUS_LABELS[p.status] || p.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openHistory(p)}
                          title="Lịch sử dùng"
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                        >
                          <span className="material-symbols-outlined text-base">history</span>
                        </button>
                        <button
                          onClick={() => openEdit(p)}
                          title="Chỉnh sửa"
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                        >
                          <span className="material-symbols-outlined text-base">edit</span>
                        </button>
                        {p.status !== 'ENDED' && p.status !== 'CANCELLED' && (
                          <button
                            onClick={() => handleEndEarly(p)}
                            title="Kết thúc sớm"
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                          >
                            <span className="material-symbols-outlined text-base">stop_circle</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-black text-slate-900">
                {modal === 'create' ? 'Tạo chương trình khuyến mãi' : 'Chỉnh sửa khuyến mãi'}
              </h2>
              <button onClick={() => setModal(null)} className="p-1 rounded-lg hover:bg-slate-100">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 grid grid-cols-2 gap-4">
              <FormField label="Mã *" required>
                <input value={form.code} onChange={e => field('code', e.target.value.toUpperCase())}
                  className={inputCls} placeholder="VD: SUMMER20" disabled={modal === 'edit'} />
              </FormField>
              <FormField label="Tên chương trình *">
                <input value={form.name} onChange={e => field('name', e.target.value)} className={inputCls} />
              </FormField>

              <FormField label="Mô tả" className="col-span-2">
                <textarea value={form.description} onChange={e => field('description', e.target.value)}
                  rows={2} className={inputCls + ' resize-none'} />
              </FormField>

              <FormField label="Loại giảm *">
                <select value={form.discountType} onChange={e => field('discountType', e.target.value)} className={inputCls}>
                  <option value="PERCENT">Phần trăm (%)</option>
                  <option value="FIXED">Số tiền cố định (đ)</option>
                </select>
              </FormField>
              <FormField label="Giá trị giảm *">
                <input type="number" min="0" value={form.discountValue} onChange={e => field('discountValue', e.target.value)} className={inputCls} />
              </FormField>

              <FormField label="Trần giảm tối đa">
                <input type="number" min="0" value={form.maxDiscountValue} onChange={e => field('maxDiscountValue', e.target.value)}
                  className={inputCls} placeholder="Để trống = không giới hạn" />
              </FormField>
              <FormField label="Đơn tối thiểu">
                <input type="number" min="0" value={form.minOrderValue} onChange={e => field('minOrderValue', e.target.value)} className={inputCls} />
              </FormField>

              <FormField label="Giới hạn tổng lượt">
                <input type="number" min="1" value={form.usageLimitTotal} onChange={e => field('usageLimitTotal', e.target.value)}
                  className={inputCls} placeholder="Để trống = không giới hạn" />
              </FormField>
              <FormField label="Giới hạn mỗi người *">
                <input type="number" min="1" value={form.usageLimitPerUser} onChange={e => field('usageLimitPerUser', e.target.value)} className={inputCls} />
              </FormField>

              <FormField label="Phạm vi áp dụng *">
                <select value={form.applyScope} onChange={e => field('applyScope', e.target.value)} className={inputCls}>
                  {Object.entries(SCOPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </FormField>

              {form.applyScope === 'SINGLE_ROUTE' && (
                <FormField label="Tuyến xe">
                  <select value={form.routeId} onChange={e => field('routeId', e.target.value)} className={inputCls}>
                    <option value="">-- Chọn tuyến --</option>
                    {routes.map(r => (
                      <option key={r._id} value={r._id}>
                        {r.routeNumber ? `Tuyến ${r.routeNumber}: ` : ''}{r.name}
                      </option>
                    ))}
                  </select>
                </FormField>
              )}

              <FormField label="Bắt đầu *">
                <input type="datetime-local" value={form.startAt} onChange={e => field('startAt', e.target.value)} className={inputCls} />
              </FormField>
              <FormField label="Kết thúc *">
                <input type="datetime-local" value={form.endAt} onChange={e => field('endAt', e.target.value)} className={inputCls} />
              </FormField>

              <FormField label="Trạng thái *">
                <select value={form.status} onChange={e => field('status', e.target.value)} className={inputCls}>
                  <option value="DRAFT">Bản nháp</option>
                  <option value="SCHEDULED">Sắp diễn ra</option>
                  <option value="ACTIVE">Đang hoạt động</option>
                </select>
              </FormField>
            </div>

            {formError && (
              <div className="mx-6 mb-4 px-4 py-3 bg-red-50 text-red-600 text-sm rounded-xl">{formError}</div>
            )}

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setModal(null)} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all">
                Huỷ
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50"
              >
                {saving ? 'Đang lưu...' : (modal === 'create' ? 'Tạo chương trình' : 'Lưu thay đổi')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Usage History Modal */}
      {modal === 'history' && historyPromo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-lg font-black text-slate-900">Lịch sử sử dụng</h2>
                <p className="text-sm text-slate-500">
                  Mã <span className="font-mono font-bold text-slate-800">{historyPromo.code}</span>
                  {' · '}Tổng {historyTotal} lượt dùng
                  {historyPromo.usageLimitTotal ? ` / ${historyPromo.usageLimitTotal}` : ''}
                </p>
              </div>
              <button onClick={() => setModal(null)} className="p-1 rounded-lg hover:bg-slate-100">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {historyLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">Chưa có lượt sử dụng nào.</div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider sticky top-0">
                    <tr>
                      <th className="px-5 py-3 font-bold">Người dùng</th>
                      <th className="px-5 py-3 font-bold">Kỳ vé</th>
                      <th className="px-5 py-3 font-bold">Phương thức</th>
                      <th className="px-5 py-3 font-bold text-right">Giảm</th>
                      <th className="px-5 py-3 font-bold text-right">Thanh toán</th>
                      <th className="px-5 py-3 font-bold">Thời gian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {history.map(h => (
                      <tr key={h._id} className="hover:bg-slate-50">
                        <td className="px-5 py-3">
                          <div className="font-semibold text-slate-800">{h.user?.fullName || '—'}</div>
                          <div className="text-xs text-slate-400">{h.user?.email || ''}</div>
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          {h.month && h.year ? `${String(h.month).padStart(2, '0')}/${h.year}` : '—'}
                        </td>
                        <td className="px-5 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">{h.method}</span>
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-emerald-600">-{fmt(h.discountAmount)}đ</td>
                        <td className="px-5 py-3 text-right font-bold text-slate-800">{fmt(h.amount)}đ</td>
                        <td className="px-5 py-3 text-xs text-slate-400">{fmtDate(h.paidAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {historyTotalPages > 1 && (
              <div className="flex items-center justify-center gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
                <button
                  disabled={historyPage <= 1}
                  onClick={() => loadHistory(historyPromo._id, historyPage - 1)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold disabled:opacity-40 hover:bg-slate-50"
                >
                  Trước
                </button>
                <span className="text-sm text-slate-500">{historyPage} / {historyTotalPages}</span>
                <button
                  disabled={historyPage >= historyTotalPages}
                  onClick={() => loadHistory(historyPromo._id, historyPage + 1)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold disabled:opacity-40 hover:bg-slate-50"
                >
                  Sau
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls = 'w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-emerald-400';

function FormField({ label, children, className = '' }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}
