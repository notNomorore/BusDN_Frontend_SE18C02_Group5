import React, { useState, useEffect, useContext } from 'react';
import { FaSearch, FaUserPlus, FaLock, FaLockOpen, FaPhone, FaUpload } from 'react-icons/fa';
import api from '../../utils/api';
import AuthContext from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';

const AdminUsers = () => {
    const { showAlert, showConfirm } = useDialog();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const { token } = useContext(AuthContext);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newStaff, setNewStaff] = useState({ fullName: '', email: '', phone: '', role: 'DRIVER' });
    const [creating, setCreating] = useState(false);
    const [createdAccount, setCreatedAccount] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, [page, roleFilter]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/api/admin/users?page=${page}&limit=10&role=${roleFilter}&search=${search}`);
            if (res.data.ok) {
                setUsers(res.data.users);
                setTotalPages(res.data.totalPages);
            }
        } catch (err) {
            console.error('Error fetching users:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        fetchUsers();
    };

    const toggleLock = async (userId, currentStatus) => {
        showConfirm(`Bạn có chắc muốn ${currentStatus === 'LOCKED' ? 'mở khóa' : 'khóa'} tài khoản này?`, async () => {
            try {
                const res = await api.post(`/api/admin/users/${userId}/toggle-lock`);
                if (res.data.ok) {
                    setUsers(users.map(u => u._id === userId ? { ...u, status: res.data.user.status, isLocked: res.data.user.isLocked } : u));
                }
            } catch (err) {
                showAlert(err.response?.data?.message || 'Lỗi khi thay đổi trạng thái', 'Lỗi');
            }
        });
    };

    const handleCreateStaff = async (e) => {
        e.preventDefault();
        setCreating(true);
        try {
            const res = await api.post('/api/admin/users/create', newStaff);
            if (res.data.ok) {
                setCreatedAccount(res.data.account);
                fetchUsers();
                setNewStaff({ fullName: '', email: '', phone: '', role: 'DRIVER' });
            }
        } catch (err) {
            showAlert(err.response?.data?.message || 'Lỗi khi tạo tài khoản', 'Lỗi');
        } finally {
            setCreating(false);
        }
    };

    const closeCreateModal = () => {
        setShowCreateModal(false);
        setCreatedAccount(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b border-gray-200">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        Quản lý Nhân sự
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Tìm kiếm, lọc và quản lý tài khoản lái xe, phụ xe</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-4 md:mt-0 bg-[#23a983] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#1bbd8f] flex items-center gap-2"
                >
                    <FaUserPlus /> Tạo tài khoản
                </button>
            </div>

            <div className="bg-white p-5 rounded-xl text-black shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
                <form onSubmit={handleSearch} className="flex-1 flex gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Tìm kiếm</label>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Tên, email hoặc SĐT..."
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 bg-white focus:ring-[#23a983] outline-none"
                        />
                    </div>
                    <div className="w-1/3">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Vai trò</label>
                        <select
                            value={roleFilter}
                            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 bg-white focus:ring-[#23a983] outline-none"
                        >
                            <option value="ALL">Tất cả</option>
                            <option value="DRIVER">Lái xe</option>
                            <option value="CONDUCTOR">Phụ xe</option>
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button type="submit" className="bg-gray-800 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-700 flex items-center gap-2">
                            <FaSearch /> Lọc
                        </button>
                    </div>
                </form>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 font-bold text-gray-700 bg-gray-50 flex justify-between items-center">
                    <span>Danh sách nhân viên</span>
                    {loading && <span className="text-sm font-normal text-gray-500">Đang tải...</span>}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-sm uppercase tracking-wider">
                                <th className="px-6 py-3 font-semibold">Nhân viên</th>
                                <th className="px-6 py-3 font-semibold">Đăng nhập</th>
                                <th className="px-6 py-3 font-semibold">Vai trò</th>
                                <th className="px-6 py-3 font-semibold">Trạng thái</th>
                                <th className="px-6 py-3 font-semibold text-center">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {users.length === 0 && !loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-10 text-center text-gray-500">Không tìm thấy dữ liệu.</td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 flex-shrink-0 bg-gray-200 rounded-full overflow-hidden border border-gray-300">
                                                    <img src={user.avatar || 'https://via.placeholder.com/150'} alt="Avatar" className="h-full w-full object-cover" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-800">{user.fullName}</p>
                                                    <p className="text-xs text-gray-500 flex items-center gap-1"><FaPhone className="text-gray-400" /> {user.phone || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-gray-600">{user.email || user.phone}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${user.role === 'DRIVER' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${user.status === 'LOCKED' || user.isLocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                {user.status === 'LOCKED' || user.isLocked ? 'ĐÃ KHÓA' : 'HOẠT ĐỘNG'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => toggleLock(user._id, user.status)}
                                                className={`text-sm px-3 py-1.5 rounded-md font-semibold flex items-center justify-center gap-1.5 mx-auto transition-colors ${user.status === 'LOCKED' || user.isLocked ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                                            >
                                                {user.status === 'LOCKED' || user.isLocked ? <><FaLockOpen /> Mở khóa</> : <><FaLock /> Khóa</>}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-center gap-2">
                        {Array.from({ length: totalPages }).map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setPage(idx + 1)}
                                className={`w-8 h-8 rounded-md flex items-center justify-center font-semibold text-sm ${page === idx + 1 ? 'bg-[#23a983] text-white' : 'bg-white border text-black border-gray-300 hover:bg-gray-100'}`}
                            >
                                {idx + 1}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal Create Staff */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 text-black">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-800">Tạo tài khoản nhân viên</h3>
                            <button onClick={closeCreateModal} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
                        </div>
                        <div className="p-6">
                            {createdAccount ? (
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
                                    <h4 className="text-lg font-bold text-gray-800 mb-2">Tạo thành công!</h4>
                                    <p className="text-gray-600 text-sm mb-4">Vui lòng lưu lại thông tin đăng nhập dưới đây để gửi cho nhân viên.</p>
                                    <div className="bg-gray-100 p-4 rounded-lg text-left text-sm font-mono space-y-2 border border-gray-200">
                                        <p><strong>Họ tên:</strong> {createdAccount.fullName}</p>
                                        <p><strong>Tài khoản:</strong> {createdAccount.username}</p>
                                        <p><strong>Mật khẩu:</strong> <span className="bg-yellow-200 px-1">{createdAccount.password}</span></p>
                                    </div>
                                    <button onClick={closeCreateModal} className="mt-6 bg-[#23a983] text-white px-6 py-2 rounded-lg font-semibold w-full">Đóng</button>
                                </div>
                            ) : (
                                <form onSubmit={handleCreateStaff} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Họ tên *</label>
                                        <input type="text" required value={newStaff.fullName} onChange={e => setNewStaff({ ...newStaff, fullName: e.target.value })} className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#23a983] outline-none" placeholder="Nhập họ và tên" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                                            <input type="email" value={newStaff.email} onChange={e => setNewStaff({ ...newStaff, email: e.target.value })} className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#23a983] outline-none" placeholder="Tùy chọn" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">SĐT</label>
                                            <input type="text" value={newStaff.phone} onChange={e => setNewStaff({ ...newStaff, phone: e.target.value })} className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#23a983] outline-none" placeholder="Tùy chọn" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-red-500 italic">* Cần nhập ít nhất Email hoặc SĐT để làm tài khoản đăng nhập.</p>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Vai trò *</label>
                                        <select value={newStaff.role} onChange={e => setNewStaff({ ...newStaff, role: e.target.value })} className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#23a983] outline-none">
                                            <option value="DRIVER">Lái xe (Driver)</option>
                                            <option value="CONDUCTOR">Phụ xe (Conductor)</option>
                                            <option value="ADMIN">Quản trị (Admin)</option>
                                        </select>
                                    </div>
                                    <div className="pt-4 flex justify-end gap-3 mt-6 border-t border-gray-100">
                                        <button type="button" onClick={closeCreateModal} className="px-5 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold">Hủy</button>
                                        <button type="submit" disabled={creating} className="px-5 py-2 bg-[#23a983] hover:bg-[#1bbd8f] text-white rounded-lg font-semibold disabled:opacity-50">
                                            {creating ? 'Đang tạo...' : 'Tạo tài khoản'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default AdminUsers;
