import React, { useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';import { FaTicketAlt } from 'react-icons/fa';
import {
  FiAlertCircle,
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiDownload,
  FiEdit2,
  FiFileText,
  FiLogOut,
  FiMail,
  FiEye,
  FiPhone,
  FiRefreshCw,
  FiShield,
  FiUser
} from 'react-icons/fi';
import { LuLock, LuShieldCheck } from 'react-icons/lu';
import AuthContext from '../context/AuthContext';
import api from '../utils/api';
import { useDialog } from '../context/DialogContext';

const TABS = [
  { id: 'settings', label: 'Personal Profile' },
  { id: 'bookings', label: 'My Tickets' },
  { id: 'priority', label: 'Priority Profile' }
];

const PRIORITY_TYPES = ['Student', 'War Veteran', 'Disabled', 'Elderly', 'Other'];
const BENEFITS = [
  'Discounted fares on supported routes',
  'Priority seating access when available',
  'Faster support for account-related issues',
  'Eligibility for selected seasonal promotions'
];

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } }
};

const formatDateLabel = (value) => {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

const normalizePriorityStatus = (status) => {
  const value = String(status || 'NONE').toUpperCase();
  if (['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'].includes(value)) return value;
  return 'NONE';
};

const prioritySplitClass = 'grid gap-5 xl:grid-cols-[30%_minmax(0,1fr)]';
const priorityApprovedGridClass = 'grid items-start gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,9fr)]';
const EMPTY_PRIORITY_FILES = {
  cardImageFront: null,
  cardImageBack: null,
  proofImage: null
};

const extractFileName = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw.split(/[\\/]/).pop() || raw;
};

const getPriorityFileUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/')) return raw;
  if (raw.startsWith('uploads/')) return `/${raw}`;
  if (raw.startsWith('priority/')) return `/uploads/${raw}`;
  return `/uploads/priority/${raw}`;
};

const PRIORITY_DOCUMENTS = [
  { label: 'Mặt trước thẻ', field: 'cardImageFront', icon: FiCreditCard },
  { label: 'Mặt sau thẻ', field: 'cardImageBack', icon: FiCreditCard },
  { label: 'Minh chứng ưu tiên', field: 'proofImage', icon: FiFileText },
];


const getInitials = (name) =>
  String(name || 'User')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U';

const Profile = () => {
  const [activeTab, setActiveTab] = useState('settings');
  const [data, setData] = useState({});
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [showPasswordEdit, setShowPasswordEdit] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [priorityForm, setPriorityForm] = useState({
    type: 'Student',
    cardNumber: '',
    expiryDate: '',
    cardImageFront: '',
    cardImageBack: '',
    proofImage: ''
  });
  const [priorityFiles, setPriorityFiles] = useState({ ...EMPTY_PRIORITY_FILES });

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { logout, token } = useContext(AuthContext);
  const { showAlert } = useDialog();
  const priorityStatus = normalizePriorityStatus(data?.priorityProfile?.status);
  const getPriorityUploadName = (field) => priorityFiles[field]?.name || extractFileName(priorityForm[field]) || 'Chon anh tai len';
  const hasPriorityUpload = (field) => Boolean(priorityFiles[field] || priorityForm[field]);
  const handlePriorityFileChange = (field, file) => {
    setPriorityFiles((current) => ({ ...current, [field]: file || null }));
  };

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['settings', 'bookings', 'priority'].includes(tab)) setActiveTab(tab);
  }, [searchParams]);

  const hydratePriorityForm = useCallback((user) => {
    const profile = user?.priorityProfile || {};
    setPriorityForm({
      type: profile.type || 'Student',
      cardNumber: profile.cardNumber || '',
      expiryDate: profile.expiryDate ? new Date(profile.expiryDate).toISOString().split('T')[0] : '',
      cardImageFront: profile.cardImageFront || '',
      cardImageBack: profile.cardImageBack || '',
      proofImage: profile.proofImage || ''
    });
    setPriorityFiles({ ...EMPTY_PRIORITY_FILES });
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    localStorage.removeItem('token');
    navigate('/');
  }, [logout, navigate]);

  const fetchUser = useCallback(async () => {
    try {
      const res = await api.get('/api/user/profile');
      const user = res.data.user || {};
      setData(user);
      setEditName(user.fullName || '');
      setEditPhone(user.phone || '');
      setEditMode(false);
      hydratePriorityForm(user);
    } catch (err) {
      console.error('Error fetching user:', err.message);
      if (err.response?.status === 401) handleLogout();
    }
  }, [handleLogout, hydratePriorityForm]);

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }
    fetchUser();
  }, [fetchUser, navigate, token]);

  const updateUser = async () => {
    try {
      const res = await api.post('/api/user/update-profile', { fullName: editName, phone: editPhone });
      if (res.data.ok) {
        setData(res.data.user || {});
        setEditMode(false);
        showAlert('Profile updated successfully.', 'Success');
      }
    } catch (err) {
      console.error('Error updating user:', err.message);
      showAlert('Failed to update profile.', 'Error');
    }
  };

  const updatePassword = async (event) => {
    event.preventDefault();
    if (!oldPassword || !newPassword) {
      showAlert('Please fill in both password fields.', 'Notice');
      return;
    }
    try {
      const res = await api.post('/api/user/change-password', { oldPassword, newPassword });
      if (res.data.ok) {
        showAlert(res.data.message || 'Password changed successfully.', 'Success');
        setShowPasswordEdit(false);
        setOldPassword('');
        setNewPassword('');
      }
    } catch (err) {
      console.error('Error changing password:', err.message);
      showAlert(err.response?.data?.message || 'Failed to change password.', 'Error');
    }
  };

  const submitPriorityRequest = async (event) => {
    event.preventDefault();
    const { type, cardNumber, expiryDate, cardImageFront, cardImageBack, proofImage } = priorityForm;
    const frontUpload = priorityFiles.cardImageFront;
    const backUpload = priorityFiles.cardImageBack;
    const proofUpload = priorityFiles.proofImage;

      if (!cardNumber || !(frontUpload || cardImageFront) || !(backUpload || cardImageBack) || !(proofUpload || proofImage)) {
      showAlert('Vui lòng hoàn thành đầy đủ thông tin hồ sơ ưu tiên.', 'Thông báo');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('type', type);
      formData.append('cardNumber', cardNumber);
      if (expiryDate) formData.append('expiryDate', expiryDate);
      if (frontUpload) formData.append('cardImageFront', frontUpload);
      else if (cardImageFront) formData.append('cardImageFront', cardImageFront);
      if (backUpload) formData.append('cardImageBack', backUpload);
      else if (cardImageBack) formData.append('cardImageBack', cardImageBack);
      if (proofUpload) formData.append('proofImage', proofUpload);
      else if (proofImage) formData.append('proofImage', proofImage);

      const res = await api.post('/api/user/register-priority', formData);
      if (res.data.ok) {
        showAlert('Hồ sơ ưu tiên đã được gửi. Quản trị viên sẽ xem xét trước khi kích hoạt ưu đãi.', 'Thành công');
        setPriorityFiles({ ...EMPTY_PRIORITY_FILES });
        fetchUser();
        setActiveTab('priority');
      }
    } catch (err) {
      console.error('Error submitting priority:', err.message);
      showAlert(err.response?.data?.message || 'Không thể gửi hồ sơ ưu tiên.', 'Lỗi');
    }
  };

  const cardClass = 'profile-card rounded-[1.75rem] border border-emerald-100 bg-white p-5 shadow-[0_20px_50px_rgba(15,118,110,0.08)]';

  const renderField = (label, icon, value, onChange, editable = false, type = 'text') => (
    <label className="space-y-1">
      <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</span>
      <div className={`flex min-w-0 items-center gap-2 rounded-2xl border px-3 py-2 ${editable ? 'border-emerald-200 bg-emerald-50/70' : 'border-slate-200 bg-slate-50/80'}`}>
        <span className="flex-shrink-0 text-slate-400">{icon}</span>
        {editable ? (
          <input value={value} onChange={onChange} type={type} className="min-w-0 w-full bg-transparent text-sm font-medium text-slate-900 outline-none" />
        ) : (
          <span className="min-w-0 truncate text-sm font-medium text-slate-700">{value || 'Not available'}</span>
        )}
      </div>
    </label>
  );

  const renderPriorityUploadField = (label, field, Icon) => {
    const hasUpload = hasPriorityUpload(field);

    return (
      <div key={field} className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label} *</p>
        <label
          className={`flex min-h-[152px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-4 py-5 text-center transition ${
            hasUpload
              ? 'border-emerald-300 bg-emerald-50/70'
              : 'border-slate-200 bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50/30'
          }`}
        >
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            className="hidden"
            onChange={(e) => handlePriorityFileChange(field, e.target.files?.[0] || null)}
          />
          <span className={`flex h-12 w-12 items-center justify-center rounded-full ${hasUpload ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-slate-400 shadow-sm'}`}>
            <Icon className="text-xl" />
          </span>
          <span className="text-sm font-bold text-slate-700">{hasUpload ? 'Da chon tep' : 'Chon anh tai len'}</span>
          <span className="w-full break-all text-xs leading-5 text-slate-500">{getPriorityUploadName(field)}</span>
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">JPG, PNG, toi da 10MB</span>
        </label>
      </div>
      );
  };

  const openPriorityFile = (value) => {
    const url = getPriorityFileUrl(value);
    if (!url) {
      showAlert('File chưa được tải lên.', 'Notice');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const downloadPriorityFile = (value, fallbackName = '') => {
    const url = getPriorityFileUrl(value);
    if (!url) {
      showAlert('File chưa được tải lên.', 'Notice');
      return;
    }

    const link = document.createElement('a');
    link.href = url;
    link.download = fallbackName || extractFileName(value) || 'priority-file';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const settingsTab = (
    <div className="grid gap-2 xl:grid-cols-[240px_minmax(0,1fr)]">
      {/* Left sidebar */}
      <div className="space-y-3">
        {/* Account Identity */}
        <div className="rounded-[1.5rem] bg-[#072f28] p-3 text-white shadow-[0_20px_40px_rgba(7,47,40,0.22)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-300">Account Identity</p>
          <div className="mt-2 flex items-center gap-2.5">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-white/20 text-sm font-black text-white">{getInitials(data?.fullName)}</div>
            <h1 className="text-base font-black leading-tight text-white">{data?.fullName || 'BusDN Rider'}</h1>
          </div>
          <div className="mt-2.5 space-y-1 text-xs text-emerald-100">
            <div className="flex items-center gap-2"><FiMail className="flex-shrink-0 text-emerald-300" /><span className="truncate">{data?.email || 'No email yet'}</span></div>
            <div className="flex items-center gap-2"><FiPhone className="flex-shrink-0 text-emerald-300" /><span>{data?.phone || 'No phone number'}</span></div>
          </div>
        </div>
      </div>

      {/* Right content */}
      <div className="space-y-2">
        <section className={`${cardClass} p-3`}>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-700">Personal Profile</p>
              <h2 className="mt-1.5 text-lg font-black tracking-tight text-slate-900">Personal Information</h2>
              <p className="mt-1 max-w-2xl text-[11px] leading-4 text-slate-500">Keep your contact details accurate for ticket updates and account notices.</p>
            </div>
            <button onClick={() => setEditMode((value) => !value)} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-700"><FiEdit2 /> {editMode ? 'Stop Editing' : 'Edit'}</button>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {renderField('Full Name', <FiUser />, editMode ? editName : data?.fullName, (event) => setEditName(event.target.value), editMode)}
            {renderField('Phone Number', <FiPhone />, editMode ? editPhone : data?.phone, (event) => setEditPhone(event.target.value), editMode)}
            {renderField('Email', <FiMail />, data?.email, undefined, false, 'email')}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">Priority Status</p>
              <div className="mt-2 flex items-center gap-2">
                <FiShield className="text-emerald-600" />
                <span className="text-sm font-semibold text-slate-700">{priorityStatus}</span>
              </div>
            </div>
          </div>
        </section>
        <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_200px]">
          <section className={`${cardClass} bg-gradient-to-br from-white via-slate-50 to-emerald-50 p-3`}>
            <div className="flex items-center gap-3">
              <LuLock className="text-lg text-emerald-700" />
              <h3 className="text-base font-black text-slate-900">Security</h3>
            </div>
            <p className="mt-1 text-[11px] leading-4 text-slate-500">Update your password regularly to protect ride history and profile details.</p>
            {!showPasswordEdit ? (
              <button onClick={() => setShowPasswordEdit(true)} className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-emerald-700">Change password <FiArrowRight /></button>
            ) : (
              <form onSubmit={updatePassword} className="mt-2 space-y-2">
                <input value={oldPassword} onChange={(event) => setOldPassword(event.target.value)} type="password" placeholder="Current password" className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none" />
                <input value={newPassword} onChange={(event) => setNewPassword(event.target.value)} type="password" placeholder="New password" className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none" />
                <div className="flex gap-3">
                  <button type="submit" className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-bold text-white">Update</button>
                  <button type="button" onClick={() => { setShowPasswordEdit(false); setOldPassword(''); setNewPassword(''); }} className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">Cancel</button>
                </div>
              </form>
            )}
          </section>
          <section className="rounded-[1.5rem] border border-slate-700 bg-slate-900 p-3">
            <div className="flex items-center gap-3">
              <LuShieldCheck className="text-lg text-emerald-400" />
              <h3 className="text-sm font-black text-white">Actions</h3>
            </div>
            <div className="mt-2 space-y-2">
              <button onClick={updateUser} disabled={!editMode} className={`w-full rounded-2xl px-4 py-2.5 text-xs font-bold transition ${editMode ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400' : 'cursor-not-allowed bg-slate-700 text-slate-400'}`}>Save Changes</button>
              <button onClick={handleLogout} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-900/40 px-4 py-2.5 text-xs font-bold text-red-300 hover:bg-red-900/60"><FiLogOut /> Sign Out</button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );

  const bookingsTab = (() => {
    const [passes, setPasses] = React.useState(null)
    const [loadingPasses, setLoadingPasses] = React.useState(true)

    React.useEffect(() => {
      api.get('/api/user/passes/monthly')
        .then(res => setPasses(res.data.myPasses || []))
        .catch(() => setPasses([]))
        .finally(() => setLoadingPasses(false))
    }, [])

    const statusColor = (s) => ({
      ACTIVE: 'bg-emerald-50 text-emerald-700',
      EXPIRED: 'bg-gray-100 text-gray-500',
      CANCELLED: 'bg-red-50 text-red-600',
    }[s] || 'bg-gray-100 text-gray-500')

    const statusLabel = (s) => ({ ACTIVE: 'Sẵn sàng', EXPIRED: 'Hết hạn', CANCELLED: 'Đã hủy' }[s] || s)

    if (loadingPasses) return (
      <div className="flex h-40 items-center justify-center text-sm text-slate-400">Đang tải vé...</div>
    )

    if (!passes || passes.length === 0) return (
      <section className={`${cardClass} text-center`}>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-emerald-100 text-2xl text-emerald-700"><FaTicketAlt /></div>
        <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900">Chưa có vé nào</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">Sau khi mua vé tháng, danh sách vé của bạn sẽ hiển thị tại đây.</p>
        <button
          onClick={() => navigate('/monthly-pass')}
          className="mt-6 inline-flex items-center justify-center rounded-2xl bg-[#003120] px-6 py-3 text-sm font-black text-white shadow-lg shadow-[#003120]/20 transition hover:bg-[#005234]"
        >
          Mua vé tháng
        </button>
      </section>
    )

    return (
      <div className="space-y-3">
        <div className="sticky top-14 z-20 flex items-center justify-between gap-3 rounded-[1.5rem] border border-slate-200/70 bg-white/95 px-4 py-3 shadow-[0_16px_30px_rgba(15,23,42,0.08)] backdrop-blur md:top-16">
          <h2 className="text-lg font-black text-slate-900">Vé tháng của tôi</h2>
          <button
            onClick={() => navigate('/monthly-pass')}
            className="inline-flex items-center justify-center rounded-2xl bg-[#003120] px-5 py-3 text-sm font-black text-white shadow-lg shadow-[#003120]/20 transition hover:bg-[#005234]"
          >
            + Mua thêm vé
          </button>
        </div>
        {passes.map(pass => (
          <div key={pass._id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-black text-slate-900">
                    {pass.displayRouteNumber ? `${pass.displayRouteNumber} – ${pass.displayRouteName}` : (pass.passType === 'INTER_ROUTE' ? 'Vé liên tuyến toàn mạng' : pass.displayRouteName || 'Tuyến xe')}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${statusColor(pass.status)}`}>{statusLabel(pass.status)}</span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Kỳ {String(pass.month).padStart(2,'0')}/{pass.year} &nbsp;·&nbsp; Mã: <span className="font-mono font-semibold text-slate-700">{pass.passCode}</span>
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Hiệu lực: {pass.validFrom ? new Date(pass.validFrom).toLocaleDateString('vi-VN') : '--'} – {pass.validTo ? new Date(pass.validTo).toLocaleDateString('vi-VN') : '--'}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-base font-black text-emerald-700">{Number(pass.pricePaid||0).toLocaleString('vi-VN')}đ</p>
                <p className="mt-0.5 text-xs text-slate-400">{pass.passType === 'INTER_ROUTE' ? 'Liên tuyến' : 'Đơn tuyến'}</p>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => navigate(`/monthly-pass/${pass._id}`)}
                className="rounded-xl border border-emerald-200 px-4 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50"
              >
                Xem chi tiet ve
              </button>
            </div>
          </div>
        ))}
      </div>
    )
  })()

  const priorityTab = (() => {
    // APPROVED
    if (priorityStatus === 'APPROVED') return (
      <div className="space-y-5">
        <div className="rounded-2xl bg-[#072f28] p-6 text-white shadow-[0_20px_40px_rgba(7,47,40,0.2)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="inline-flex rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-300">Đã duyệt</span>
              <h2 className="mt-3 text-2xl font-black text-white">Hồ sơ ưu tiên đã xác minh</h2>
              <p className="mt-1 text-sm text-emerald-100/70">Ưu đãi giảm giá vé của bạn đang hoạt động và sẵn sàng cho các chuyến đi.</p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3">
              <FiCheckCircle className="text-2xl text-emerald-400" />
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">Trạng thái</p>
                <p className="text-base font-black text-white">APPROVED &amp; ACTIVE</p>
              </div>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ['Đối tượng', data?.priorityProfile?.type || 'Ưu tiên'],
              ['Số thẻ', data?.priorityProfile?.cardNumber || 'Chưa có'],
              ['Trạng thái', 'Hoạt động'],
              ['Ngày hết hạn', formatDateLabel(data?.priorityProfile?.expiryDate)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-white/[0.08] p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">{label}</p>
                <p className="mt-2 text-base font-black text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className={priorityApprovedGridClass}>
          <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <h3 className="text-base font-black text-slate-900">Quyền lợi của bạn</h3>
            <div className="mt-3 space-y-2">
              {['Giảm giá vé trên các tuyến hỗ trợ', 'Ưu tiên chỗ ngồi khi có sẵn', 'Hỗ trợ tài khoản nhanh hơn', 'Đủ điều kiện cho các khuyến mãi theo mùa'].map((b) => (
                <div key={b} className="flex items-center gap-3 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-slate-700">
                  <FiCheckCircle className="flex-shrink-0 text-emerald-600" />{b}
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Giấy tờ đã nộp</h3>
                <p className="mt-1 text-sm text-slate-500">Mở từng tài liệu để xem lại hoặc tải xuống bản gốc từ hệ thống.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                3 tài liệu
              </span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {PRIORITY_DOCUMENTS.map(({ label, field, icon: Icon }) => {
                const fileValue = data?.priorityProfile?.[field];
                const fileName = extractFileName(fileValue);
                const fileUrl = getPriorityFileUrl(fileValue);
                const hasFile = Boolean(fileUrl);

                return (
                  <div key={field} className="flex h-full flex-col rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                        <Icon className="text-lg" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">{label}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openPriorityFile(fileValue)}
                        disabled={!hasFile}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold transition ${
                          hasFile
                            ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                            : 'cursor-not-allowed bg-slate-200 text-slate-400'
                        }`}
                      >
                        <FiEye />
                        Xem
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadPriorityFile(fileValue, fileName)}
                        disabled={!hasFile}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-bold transition ${
                          hasFile
                            ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                            : 'cursor-not-allowed border-slate-200 bg-white text-slate-300'
                        }`}
                      >
                        <FiDownload />
                        Tải xuống
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    );

    // PENDING
    if (priorityStatus === 'PENDING') return (
      <div className="space-y-5">
        <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-100">
              <FiClock className="text-xl text-amber-600" />
            </div>
            <div>
              <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-700">Đang chờ duyệt</span>
              <h2 className="mt-2 text-xl font-black text-slate-900">Hồ sơ đang được xem xét</h2>
              <p className="mt-1 text-sm text-slate-600">Tài liệu của bạn đã được gửi. Quản trị viên sẽ xem xét trước khi kích hoạt ưu đãi.</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white border border-amber-100 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Đối tượng</p>
              <p className="mt-1 text-base font-black text-slate-900">{data?.priorityProfile?.type || 'Chưa có'}</p>
            </div>
            <div className="rounded-xl bg-white border border-amber-100 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Số thẻ</p>
              <p className="mt-1 text-base font-black text-slate-900">{data?.priorityProfile?.cardNumber || 'Chưa có'}</p>
            </div>
          </div>
        </div>
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="text-base font-black text-slate-900">Các bước tiếp theo</h3>
          <div className="mt-3 space-y-2">
            {[
              [FiClock, 'Xem xét thủ công', 'Đội ngũ quản trị kiểm tra thông tin và tài liệu của bạn.'],
              [FiCheckCircle, 'Cập nhật trạng thái', 'Sau khi duyệt, hồ sơ sẽ hiển thị huy hiệu ưu tiên và ngày hết hạn.'],
              [FiAlertCircle, 'Cần thay đổi?', 'Nếu bị từ chối, bạn có thể gửi lại hồ sơ mới tại đây.'],
            ].map(([Icon, title, desc]) => (
              <div key={title} className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
                <Icon className="mt-0.5 flex-shrink-0 text-emerald-600" />
                <div><p className="text-sm font-bold text-slate-900">{title}</p><p className="text-xs leading-5 text-slate-500">{desc}</p></div>
              </div>
            ))}
          </div>
          <button onClick={fetchUser} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-emerald-700">
            <FiRefreshCw size={13} /> Làm mới trạng thái
          </button>
        </section>
      </div>
    );

    // REJECTED — show rejection reason + re-apply form
    if (priorityStatus === 'REJECTED') return (
      <div className={prioritySplitClass}>
        <div className="space-y-4">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-start gap-3">
              <FiAlertCircle className="mt-0.5 flex-shrink-0 text-lg text-red-500" />
              <div>
                <p className="text-sm font-bold text-red-700">Hồ sơ bị từ chối</p>
                <p className="mt-1 text-xs text-red-600">{data?.priorityProfile?.rejectionReason || 'Hồ sơ/Giấy tờ không hợp lệ'}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Yêu cầu hồ sơ</p>
            <ul className="mt-3 space-y-1.5 text-xs text-slate-600">
              <li className="flex items-start gap-2"><FiCheckCircle className="mt-0.5 flex-shrink-0 text-emerald-500" />Ảnh chụp CCCD mặt trước và mặt sau</li>
              <li className="flex items-start gap-2"><FiCheckCircle className="mt-0.5 flex-shrink-0 text-emerald-500" />Giấy tờ minh chứng đối tượng ưu tiên</li>
              <li className="flex items-start gap-2"><FiCheckCircle className="mt-0.5 flex-shrink-0 text-emerald-500" />Định dạng JPG, PNG, dưới 10MB</li>
            </ul>
          </div>
        </div>
        <form onSubmit={submitPriorityRequest} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="text-base font-black text-slate-900">Gửi lại hồ sơ</h3>
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Đối tượng *</label>
                <select value={priorityForm.type} onChange={(e) => setPriorityForm((c) => ({ ...c, type: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400">
                  {[['Student','Học sinh, Sinh viên'],['Elderly','Người cao tuổi (60+)'],['Disabled','Người khuyết tật'],['War Veteran','Thương binh']].map(([v,l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Số thẻ *</label>
                <input value={priorityForm.cardNumber} onChange={(e) => setPriorityForm((c) => ({ ...c, cardNumber: e.target.value }))}
                  placeholder="Nhập số thẻ" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400" />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {[
                ['Mặt trước thẻ', 'cardImageFront', FiCreditCard],
                ['Mặt sau thẻ', 'cardImageBack', FiCreditCard],
                ['Minh chứng ưu tiên', 'proofImage', FiFileText],
              ].map(([label, field, Icon]) => renderPriorityUploadField(label, field, Icon))}
            </div>
          </div>
          <button type="submit" className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-sm font-bold text-white hover:bg-emerald-500">
            Gửi lại hồ sơ <FiArrowRight />
          </button>
        </form>
      </div>
    );

    // NONE — fresh apply
    return (
      <div className={prioritySplitClass}>
        <div className="space-y-4">
          <div className="rounded-2xl bg-[#072f28] p-6 text-white shadow-[0_20px_40px_rgba(7,47,40,0.2)]">
            <span className="inline-flex rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-300">Đăng ký ngay</span>
            <h2 className="mt-3 text-xl font-black text-white">Hồ sơ ưu tiên</h2>
            <p className="mt-2 text-sm leading-6 text-emerald-100/80">Đăng ký một lần để nhận ưu đãi giảm giá vé dài hạn cho học sinh, người cao tuổi, người khuyết tật và các đối tượng hợp lệ khác.</p>
            <div className="mt-4 space-y-2">
              {['Giảm giá vé trên các tuyến hỗ trợ', 'Ưu tiên chỗ ngồi khi có sẵn', 'Hỗ trợ tài khoản nhanh hơn'].map((b) => (
                <div key={b} className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs text-emerald-100">
                  <FiCheckCircle className="flex-shrink-0 text-emerald-400" />{b}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Yêu cầu hồ sơ</p>
            <ul className="mt-3 space-y-1.5 text-xs text-slate-600">
              <li className="flex items-start gap-2"><FiCheckCircle className="mt-0.5 flex-shrink-0 text-emerald-500" />Ảnh chụp CCCD mặt trước và mặt sau</li>
              <li className="flex items-start gap-2"><FiCheckCircle className="mt-0.5 flex-shrink-0 text-emerald-500" />Giấy tờ minh chứng đối tượng ưu tiên</li>
              <li className="flex items-start gap-2"><FiCheckCircle className="mt-0.5 flex-shrink-0 text-emerald-500" />Định dạng JPG, PNG, dưới 10MB</li>
            </ul>
          </div>
        </div>
        <form onSubmit={submitPriorityRequest} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="text-base font-black text-slate-900">Chi tiết đăng ký</h3>
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Đối tượng *</label>
                <select value={priorityForm.type} onChange={(e) => setPriorityForm((c) => ({ ...c, type: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400">
                  <option value="">-- Chọn đối tượng --</option>
                  {[['Student','Học sinh, Sinh viên'],['Elderly','Người cao tuổi (60+)'],['Disabled','Người khuyết tật'],['War Veteran','Thương binh']].map(([v,l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Số thẻ *</label>
                <input value={priorityForm.cardNumber} onChange={(e) => setPriorityForm((c) => ({ ...c, cardNumber: e.target.value }))}
                  placeholder="Nhập số thẻ của bạn" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400" />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {[
                ['Mặt trước thẻ', 'cardImageFront', FiCreditCard],
                ['Mặt sau thẻ', 'cardImageBack', FiCreditCard],
                ['Minh chứng ưu tiên', 'proofImage', FiFileText],
              ].map(([label, field, Icon]) => renderPriorityUploadField(label, field, Icon))}
            </div>
          </div>
          <button type="submit" className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-sm font-bold text-white hover:bg-emerald-500">
            Gửi hồ sơ đăng ký <FiArrowRight />
          </button>
        </form>
      </div>
    );
  })();

  if (!token) return null;

  return (
    <Motion.div variants={fadeInUp} initial="hidden" animate="visible" className="profile-shell min-h-full bg-[linear-gradient(180deg,#f4faf7_0%,#eef5f3_48%,#f7faf9_100%)] px-[2.5%] py-2">
      <div className="flex h-full w-full flex-col">
        <section className="profile-surface flex min-h-[calc(100vh-128px)] flex-1 flex-col rounded-[2rem] border border-white/70 bg-white/85 px-4 pb-4 pt-[5px] shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur md:px-5 md:pb-5 md:pt-[5px]">
          <div className="profile-content-scroll mt-1 min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="border-b border-slate-200 pb-3 pt-[5px]">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-700">Account Center</p>
                  <h1 className="mt-1.5 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">Profile and Priority Access</h1>
                  <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">Manage personal details, password security, and your priority fare profile from one place.</p>
                </div>
              </div>
            </div>
            <div className="sticky top-0 z-30 flex flex-nowrap justify-end gap-3 bg-white/90 pb-2 pt-2 backdrop-blur">
              {TABS.map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition ${activeTab === tab.id ? 'bg-slate-950 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="mt-2">
              {activeTab === 'settings' && settingsTab}
              {activeTab === 'bookings' && bookingsTab}
              {activeTab === 'priority' && priorityTab}
            </div>
          </div>
        </section>
      </div>
    </Motion.div>
  );
};

export default Profile;
