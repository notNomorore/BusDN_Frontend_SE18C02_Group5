export const PASS_TYPE_LABELS = {
  SINGLE_ROUTE: 'Vé tháng đơn tuyến',
  INTER_ROUTE: 'Vé tháng liên tuyến',
};

export const PAYMENT_METHOD_LABELS = {
  VNPAY: 'VNPAY',
  MOMO: 'MoMo',
  WALLET: 'Ví BusDN',
};

export const STATUS_LABELS = {
  ACTIVE: 'Sẵn sàng',
  EXPIRED: 'Hết hạn',
  CANCELLED: 'Đã hủy',
};

export function toPositiveInt(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

export function formatMonthlyPassMoney(value) {
  return `${Number(value || 0).toLocaleString('vi-VN')}đ`;
}

export function formatMonthlyPassDate(value) {
  if (!value) return '--';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '--' : date.toLocaleDateString('vi-VN');
}

export function formatMonthlyPassDateTime(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatMonthlyPassPeriod(month, year) {
  return month && year ? `${String(month).padStart(2, '0')}/${year}` : '--';
}

export function getMonthlyPassRouteId(pass) {
  if (!pass?.routeId) return '';
  return typeof pass.routeId === 'object' ? String(pass.routeId._id || '') : String(pass.routeId);
}

export function getMonthlyPassRouteLabel(pass, fallbackPassType = '') {
  const type = pass?.passType || fallbackPassType;
  const interRouteFallback = 'Vé liên tuyến toàn mạng lưới';

  if (!pass) {
    return type === 'INTER_ROUTE' ? interRouteFallback : 'Đang cập nhật tuyến xe';
  }

  if (pass.displayRouteNumber) {
    return `${pass.displayRouteNumber} - ${pass.displayRouteName || 'Tuyến xe'}`;
  }

  if (pass.displayRouteName) {
    return pass.displayRouteName;
  }

  return type === 'INTER_ROUTE' ? interRouteFallback : 'Đang cập nhật tuyến xe';
}

export function getMonthlyPassTypeLabel(pass, fallbackPassType = '') {
  return PASS_TYPE_LABELS[pass?.passType || fallbackPassType] || 'Vé tháng';
}

export function getMonthlyPassPaymentMethodLabel(pass, fallbackMethod = '') {
  const method = pass?.paidBy || fallbackMethod;
  return PAYMENT_METHOD_LABELS[method] || (method || 'Đang cập nhật');
}

export function getMonthlyPassScopeLabel(pass, fallbackPassType = '') {
  const type = pass?.passType || fallbackPassType;
  return type === 'INTER_ROUTE'
    ? 'Sử dụng trên toàn bộ mạng lưới BusDN'
    : getMonthlyPassRouteLabel(pass, fallbackPassType);
}

export function getMonthlyPassStatusStyles(status) {
  const normalized = String(status || '').toUpperCase();

  if (normalized === 'ACTIVE') {
    return {
      badge: 'bg-[#b5efd1] text-[#001a0f]',
      surface: 'bg-emerald-50 text-emerald-700',
      text: 'text-[#2ba471]',
      dot: 'bg-[#2ba471]',
    };
  }

  if (normalized === 'CANCELLED') {
    return {
      badge: 'bg-[#ffdad6] text-[#93000a]',
      surface: 'bg-red-50 text-red-600',
      text: 'text-[#ba1a1a]',
      dot: 'bg-[#ba1a1a]',
    };
  }

  return {
    badge: 'bg-[#dbe5e1] text-[#414844]',
    surface: 'bg-slate-100 text-slate-600',
    text: 'text-slate-500',
    dot: 'bg-slate-400',
  };
}

export function buildMonthlyPassDetailsPath(passId) {
  return passId ? `/monthly-pass/${passId}` : '/monthly-pass';
}

export function findMatchingMonthlyPass(passes, criteria = {}) {
  if (!Array.isArray(passes) || !passes.length) return null;

  if (criteria.passId) {
    const matchedById = passes.find((pass) => String(pass._id) === String(criteria.passId));
    if (matchedById) return matchedById;
  }

  const filtered = passes.filter((pass) => {
    if (criteria.month && Number(pass.month) !== Number(criteria.month)) return false;
    if (criteria.year && Number(pass.year) !== Number(criteria.year)) return false;
    if (criteria.passType && String(pass.passType || '') !== String(criteria.passType)) return false;
    if (criteria.routeId && getMonthlyPassRouteId(pass) !== String(criteria.routeId)) return false;
    return true;
  });

  return filtered[0] || passes.find((pass) => pass.status === 'ACTIVE') || passes[0] || null;
}
