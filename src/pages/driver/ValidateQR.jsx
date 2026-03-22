import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FaQrcode, FaCamera, FaTimes, FaStop } from 'react-icons/fa';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../../utils/api';
import { useDialog } from '../../context/DialogContext';

const READER_ID = 'conductor-qr-reader';

const ValidateQR = () => {
    const { showAlert } = useDialog();
    const [qrInput, setQrInput] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [scanning, setScanning] = useState(false);
    const scannerRef = useRef(null);

    const validate = useCallback(async (code) => {
        const trimmed = String(code || '').trim();
        if (!trimmed) {
            showAlert('Vui lòng nhập hoặc quét mã QR', 'Thiếu dữ liệu');
            return;
        }
        setLoading(true);
        try {
            const res = await api.post('/api/conductor/validate-qr', { code: trimmed });
            setResult(res.data);
        } catch (err) {
            setResult({
                ok: false,
                message: err.response?.data?.message || 'Mã vé không hợp lệ hoặc đã hết hạn'
            });
        } finally {
            setLoading(false);
        }
    }, [showAlert]);

    useEffect(() => {
        if (!scanning) return undefined;

        let cancelled = false;

        const run = async () => {
            await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
            if (cancelled) return;
            try {
                const html5 = new Html5Qrcode(READER_ID, { verbose: false });
                scannerRef.current = html5;
                await html5.start(
                    { facingMode: 'environment' },
                    { fps: 10, qrbox: { width: 260, height: 260 } },
                    (decodedText) => {
                        setScanning(false);
                        validate(decodedText);
                    },
                    () => {}
                );
            } catch (err) {
                console.error(err);
                if (!cancelled) {
                    setScanning(false);
                    scannerRef.current = null;
                    showAlert(
                        'Không mở được camera. Kiểm tra quyền truy cập, dùng HTTPS, hoặc nhập mã thủ công.',
                        'Camera'
                    );
                }
            }
        };
        void run();

        return () => {
            cancelled = true;
            const s = scannerRef.current;
            scannerRef.current = null;
            if (s) {
                s.stop()
                    .then(() => s.clear())
                    .catch(() => {});
            }
        };
    }, [scanning, validate, showAlert]);

    const handleSubmit = (e) => {
        e.preventDefault();
        validate(qrInput);
    };

    return (
        <div className="max-w-lg mx-auto space-y-6">
            <div className="pb-4 border-b border-gray-200">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FaQrcode className="text-[#23a983]" /> Quét vé hành khách
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                    Vé tháng (QR từ app khách) hoặc vé lẻ — trên điện thoại bật camera quét trực tiếp
                </p>
            </div>

            <div className="rounded-2xl overflow-hidden bg-black min-h-[220px] relative">
                <div id={READER_ID} className={`w-full min-h-[220px] ${!scanning ? 'hidden' : ''}`} />
                {!scanning && (
                    <div className="bg-gray-900 p-8 text-center space-y-4 min-h-[220px] flex flex-col items-center justify-center">
                        <FaCamera className="text-white/40 text-5xl" />
                        <p className="text-white/70 text-sm px-4">
                            Bấm &quot;Bật camera quét QR&quot; để dùng camera sau trên điện thoại (cần cho phép quyền)
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                setResult(null);
                                setScanning(true);
                            }}
                            disabled={loading}
                            className="inline-flex items-center gap-2 bg-[#23a983] text-white px-5 py-3 rounded-xl font-semibold disabled:opacity-50"
                        >
                            <FaCamera /> Bật camera quét QR
                        </button>
                    </div>
                )}
                {scanning && (
                    <button
                        type="button"
                        onClick={() => setScanning(false)}
                        className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg"
                    >
                        <FaStop /> Tắt camera
                    </button>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
                <label className="block text-sm font-semibold text-gray-700">
                    Hoặc nhập / dán mã (vé tháng: mã thẻ MP-… hoặc nội dung QR)
                </label>
                <div className="flex gap-2 text-black">
                    <input
                        value={qrInput}
                        onChange={(e) => setQrInput(e.target.value)}
                        placeholder="Dán nội dung quét được..."
                        className="flex-1 bg-white border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#23a983] outline-none font-mono text-sm"
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-[#23a983] text-white px-5 py-3 rounded-xl font-semibold disabled:opacity-50 shrink-0"
                    >
                        {loading ? '...' : 'Kiểm tra'}
                    </button>
                </div>
            </form>

            {result && (
                <div
                    className={`rounded-2xl p-5 border-2 ${
                        result.ok ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400'
                    }`}
                >
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
                            {result.ticketType && (
                                <p>
                                    Loại:{' '}
                                    <strong>
                                        {result.ticketType === 'MONTHLY_PASS'
                                            ? 'Vé tháng'
                                            : result.ticketType === 'TRIP_TICKET'
                                              ? 'Vé lẻ theo chuyến'
                                              : result.ticketType}
                                    </strong>
                                </p>
                            )}
                            {result.passengerName && (
                                <p>
                                    👤 Hành khách: <strong>{result.passengerName}</strong>
                                </p>
                            )}
                            {result.routeNumber && (
                                <p>
                                    🚌 Tuyến: <strong>{result.routeNumber}</strong>
                                </p>
                            )}
                            {result.passCode && (
                                <p className="font-mono text-xs">
                                    Mã thẻ: <strong>{result.passCode}</strong>
                                </p>
                            )}
                            {result.validUntil && (
                                <p>
                                    📅 Hiệu lực đến: <strong>{result.validUntil}</strong>
                                </p>
                            )}
                            {result.seatLabel && (
                                <p>
                                    💺 Ghế: <strong>{result.seatLabel}</strong>
                                </p>
                            )}
                            {result.tripTime && (
                                <p>
                                    🕐 Chuyến: <strong>{result.tripTime}</strong>
                                </p>
                            )}
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={() => {
                            setResult(null);
                            setQrInput('');
                        }}
                        className="mt-3 text-sm text-gray-500 underline flex items-center gap-1"
                    >
                        <FaTimes /> Kiểm tra vé khác
                    </button>
                </div>
            )}
        </div>
    );
};

export default ValidateQR;
