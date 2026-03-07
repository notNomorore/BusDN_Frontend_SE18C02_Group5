import React, { useState } from 'react';
import { FaBullhorn, FaPaperPlane, FaUsers, FaBus } from 'react-icons/fa';
import api from '../../utils/api';
import { useDialog } from '../../context/DialogContext';

const BroadcastNotification = () => {
    const { showAlert, showConfirm } = useDialog();
    const [form, setForm] = useState({ audience: 'ALL', title: '', message: '' });
    const [sending, setSending] = useState(false);

    const audienceOptions = [
        { value: 'ALL', label: 'Tất cả người dùng', icon: <FaUsers className="text-[#23a983]" /> },
        { value: 'DRIVERS', label: 'Tài xế & Phụ xe', icon: <FaBus className="text-blue-500" /> },
    ];

    const handleSend = async (e) => {
        e.preventDefault();
        if (!form.title.trim() || !form.message.trim()) {
            showAlert('Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo.', 'Thông báo');
            return;
        }
        showConfirm(
            `Gửi thông báo "${form.title}" đến "${audienceOptions.find(a => a.value === form.audience)?.label}"?`,
            async () => {
                setSending(true);
                try {
                    // POST to the notifications broadcast endpoint
                    const res = await api.post('/api/admin/notifications/broadcast', form);
                    if (res.data.ok) {
                        showAlert('Đã gửi thông báo thành công!', 'Thành công');
                        setForm({ audience: 'ALL', title: '', message: '' });
                    } else {
                        showAlert(res.data.message || 'Không thể gửi thông báo.', 'Lỗi');
                    }
                } catch (err) {
                    // Graceful fallback – API may not exist yet
                    showAlert('Chức năng gửi thông báo chưa được kích hoạt ở backend. Sẽ cập nhật sau.', 'Thông báo');
                } finally {
                    setSending(false);
                }
            }
        );
    };

    return (
        <div className="space-y-6">
            <div className="pb-4 border-b border-gray-200">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FaBullhorn className="text-[#23a983]" /> Gửi thông báo hàng loạt
                </h1>
                <p className="text-gray-500 text-sm mt-1">Soạn và gửi thông báo đến khách hàng hoặc tài xế</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {/* Form */}
                <div className="md:col-span-2">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-black">
                        <form onSubmit={handleSend} className="space-y-5">
                            {/* Audience selector */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Đối tượng nhận *</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {audienceOptions.map(o => (
                                        <button key={o.value} type="button"
                                            onClick={() => setForm({ ...form, audience: o.value })}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${form.audience === o.value ? 'border-[#23a983] bg-[#f0fdf9]' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                                            <span className="text-xl">{o.icon}</span>
                                            <span className={`font-semibold text-sm ${form.audience === o.value ? 'text-[#23a983]' : 'text-gray-600'}`}>{o.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Tiêu đề thông báo *</label>
                                <input
                                    required value={form.title}
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                    maxLength={100}
                                    placeholder="VD: Lịch nghỉ lễ 30/4 – 1/5"
                                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#23a983] outline-none"
                                />
                                <p className="text-xs text-gray-400 mt-1 text-right">{form.title.length}/100</p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Nội dung *</label>
                                <textarea
                                    required value={form.message}
                                    onChange={e => setForm({ ...form, message: e.target.value })}
                                    rows={6}
                                    maxLength={500}
                                    placeholder="Nhập nội dung thông báo chi tiết..."
                                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#23a983] outline-none resize-none"
                                />
                                <p className="text-xs text-gray-400 mt-1 text-right">{form.message.length}/500</p>
                            </div>

                            <div className="pt-2">
                                <button type="submit" disabled={sending}
                                    className="w-full bg-[#23a983] hover:bg-[#1bbd8f] text-white px-6 py-3 rounded-xl font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-50 transition-all">
                                    <FaPaperPlane /> {sending ? 'Đang gửi...' : 'Gửi thông báo ngay'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Preview */}
                <div className="md:col-span-1">
                    <div className="bg-gray-900 rounded-2xl p-5 text-white h-full min-h-[300px]">
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-4 font-semibold">Xem trước thông báo</p>
                        <div className="bg-white rounded-xl p-4 text-black shadow-md">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 rounded-full bg-[#23a983] flex items-center justify-center text-white text-sm font-bold">TP</div>
                                <div>
                                    <p className="text-xs font-bold text-gray-800">TripTix</p>
                                    <p className="text-xs text-gray-400">Vừa xong</p>
                                </div>
                            </div>
                            <p className="font-semibold text-gray-900 text-sm mb-1">{form.title || 'Tiêu đề thông báo'}</p>
                            <p className="text-xs text-gray-500 leading-relaxed">{form.message || 'Nội dung thông báo sẽ hiển thị ở đây...'}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-4 text-center">Gửi đến: <span className="text-white font-semibold">{audienceOptions.find(a => a.value === form.audience)?.label}</span></p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BroadcastNotification;
