import React, { useState } from 'react';
import { FaQrcode, FaCamera, FaTimes } from 'react-icons/fa';
import api from '../../utils/api';
import { useDialog } from '../../context/DialogContext';

// Bus Assistant: Validate Passenger QR
// Uses jsQR or a manual input as a fallback since camera scanning requires a library

const ValidateQR = () => {
    const { showAlert } = useDialog();
    const [qrInput, setQrInput] = useState('');
    const [result, setResult] = useState(null); // { ok, message, passengerName, routeNumber }
    const [loading, setLoading] = useState(false);

    const validate = async (code) => {
        if (!code.trim()) { showAlert('Vui lòng nhập mã QR', 'Thiếu dữ liệu'); return; }
        setLoading(true);
        try {
            const res = await api.post('/api/conductor/validate-qr', { code: code.trim() });
            setResult(res.data);
        } catch (err) {
            setResult({
                ok: false,
                message: err.response?.data?.message || 'Mã vé không hợp lệ hoặc đã hết hạn'
            });
        } finally { setLoading(false); }
    };

    const handleSubmit = (e) => { e.preventDefault(); validate(qrInput); };

    return (
        <div className="max-w-md mx-auto space-y-6">
            <div className="pb-4 border-b border-gray-200">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FaQrcode className="text-[#23a983]" /> Quét vé hành khách
                </h1>
                <p className="text-gray-500 text-sm mt-1">Kiểm tra vé QR / thẻ tháng của khách</p>
            </div>

            {/* QR scanner placeholder */}
            <div className="bg-gray-900 rounded-2xl p-8 text-center space-y-3">
                <FaCamera className="text-white/30 text-5xl mx-auto" />
                <p className="text-white/50 text-sm">Camera scan sẽ hoạt động khi cài thêm thư viện QR</p>
            </div>

            {/* Manual input */}
            <form onSubmit={handleSubmit} className="space-y-3">
                <label className="block text-sm font-semibold text-gray-700">Hoặc nhập mã QR thủ công</label>
                <div className="flex gap-2 text-black">
                    <input
                        value={qrInput} onChange={e => setQrInput(e.target.value)}
                        placeholder="Dán mã QR vào đây..."
                        className="flex-1 bg-white border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#23a983] outline-none font-mono text-sm"
                    />
                    <button type="submit" disabled={loading}
                        className="bg-[#23a983] text-white px-5 py-3 rounded-xl font-semibold disabled:opacity-50">
                        {loading ? '...' : 'Kiểm tra'}
                    </button>
                </div>
            </form>

            {/* Result */}
            {result && (
                <div className={`rounded-2xl p-5 border-2 ${result.ok ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400'}`}>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-3xl">{result.ok ? '✅' : '❌'}</span>
                        <div>
                            <p className={`font-bold text-lg ${result.ok ? 'text-green-700' : 'text-red-700'}`}>
                                {result.ok ? 'Vé hợp lệ' : 'Vé không hợp lệ'}
                            </p>
                            <p className="text-sm text-gray-600">{result.message}</p>
                        </div>
                    </div>
                    {result.ok && (
                        <div className="bg-white rounded-xl p-3 mt-2 space-y-1 text-sm text-gray-700">
                            {result.passengerName && <p>👤 Hành khách: <strong>{result.passengerName}</strong></p>}
                            {result.routeNumber && <p>🚌 Tuyến: <strong>{result.routeNumber}</strong></p>}
                            {result.validUntil && <p>📅 Hiệu lực đến: <strong>{result.validUntil}</strong></p>}
                        </div>
                    )}
                    <button onClick={() => { setResult(null); setQrInput(''); }}
                        className="mt-3 text-sm text-gray-500 underline flex items-center gap-1">
                        <FaTimes /> Quét lại
                    </button>
                </div>
            )}
        </div>
    );
};

export default ValidateQR;
