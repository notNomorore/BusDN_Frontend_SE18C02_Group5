import React, { useEffect, useState, useContext } from 'react';
import api from '../utils/api';
import AuthContext from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import CircularProgress from '@mui/material/CircularProgress';
import { motion } from "framer-motion";
import { FaWallet, FaTicketAlt, FaInfoCircle } from "react-icons/fa";
import { QRCodeSVG } from 'qrcode.react';

const MonthlyPass = () => {
    const { token, user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState(false);
    const [data, setData] = useState({
        walletBalance: 0,
        isPriorityGroup: false,
        routes: [],
        myPasses: []
    });
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [lastPurchasedPass, setLastPurchasedPass] = useState(null);

    // Form State
    const [selectedRouteId, setSelectedRouteId] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    useEffect(() => {
        if (!token) {
            navigate('/');
            return;
        }

        const fetchData = async () => {
            try {
                const res = await api.get('/api/user/passes/monthly');
                if (res.data.ok) {
                    setData({
                        walletBalance: res.data.walletBalance,
                        isPriorityGroup: res.data.isPriorityGroup,
                        routes: res.data.routes || [],
                        myPasses: res.data.myPasses || []
                    });
                }
            } catch (err) {
                console.error("Error fetching monthly passes:", err);
                setError("Lỗi tải thông tin vé tháng.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [token, navigate]);

    const handlePurchase = async (e) => {
        e.preventDefault();
        if (!selectedRouteId) {
            setError("Vui lòng chọn tuyến xe.");
            return;
        }

        setError(null);
        setSuccess(null);
        setLastPurchasedPass(null);
        setPurchasing(true);

        try {
            const res = await api.post('/api/user/passes/monthly/purchase', {
                routeId: selectedRouteId,
                month: selectedMonth,
                year: selectedYear
            });

            if (res.data.ok) {
                setSuccess(res.data.message);
                setLastPurchasedPass(res.data.pass || null);
                // Refresh data
                const p = res.data.pass;
                const enriched = p
                    ? {
                          ...p,
                          displayRouteNumber: p.routeSnapshot?.routeNumber || '',
                          displayRouteName: p.routeSnapshot?.name || 'Tuyến'
                      }
                    : null;
                setData(prev => ({
                    ...prev,
                    walletBalance: res.data.newBalance,
                    myPasses: enriched ? [enriched, ...prev.myPasses].slice(0, 20) : prev.myPasses
                }));
            } else {
                setError(res.data.message || "Mua vé tháng thất bại.");
            }
        } catch (err) {
            console.error("Error purchasing pass:", err);
            setError(err.response?.data?.message || "Lỗi hệ thống khi mua vé tháng.");
        } finally {
            setPurchasing(false);
        }
    };

    const getSelectedRouteInfo = () => {
        if (!selectedRouteId) return null;
        return data.routes.find(r => r._id === selectedRouteId);
    };

    const selectedRoute = getSelectedRouteInfo();
    const originalPrice = selectedRoute ? (selectedRoute.monthlyPassPrice || 0) : 0;
    const discountRate = data.isPriorityGroup ? 0.2 : 0;
    const discountAmount = Math.round(originalPrice * discountRate);
    const finalPrice = Math.max(0, originalPrice - discountAmount);
    const remainBalance = data.walletBalance - finalPrice;

    const currentYear = new Date().getFullYear();
    const years = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];
    const months = Array.from({ length: 12 }, (_, i) => i + 1);

    if (loading) {
        return (
            <>
                <Header />
                <div className="flex justify-center items-center min-h-[70vh] bg-[#f5fefa]">
                    <CircularProgress style={{ color: '#23a983' }} />
                </div>
                <Footer />
            </>
        );
    }

    return (
        <>
            <Header />
            <div className="bg-[#f5fefa] min-h-screen py-8">
                <div className="container mx-auto px-4 max-w-6xl">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-800">Mua vé tháng</h2>
                            <p className="text-gray-500 mt-1">Chọn tuyến, trừ tiền ví, cấp thẻ tháng tự động</p>
                        </div>
                        <button
                            onClick={() => navigate('/profile')}
                            className="px-4 py-2 border border-[#23a983] text-[#23a983] rounded-lg hover:bg-green-50 transition-colors font-semibold"
                        >
                            Quay lại ví
                        </button>
                    </div>

                    {error && (
                        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 text-red-700 rounded shadow-sm">
                            <p>{error}</p>
                        </div>
                    )}

                    {success && (
                        <div className="mb-6 bg-green-50 border-l-4 border-[#23a983] p-4 text-green-700 rounded shadow-sm">
                            <p>{success}</p>
                            {lastPurchasedPass?._id && (
                                <div className="mt-4 flex flex-col sm:flex-row items-center gap-4 pt-4 border-t border-green-200/80">
                                    <QRCodeSVG
                                        value={String(lastPurchasedPass._id)}
                                        size={168}
                                        level="M"
                                        includeMargin
                                        className="rounded-xl border-2 border-white shadow bg-white p-2"
                                    />
                                    <div className="text-sm text-gray-700 text-center sm:text-left">
                                        <p className="font-semibold text-gray-800">QR vé tháng</p>
                                        <p className="mt-1">Đưa mã này cho phụ xe quét khi lên xe — chỉ còn hạn mới quét hợp lệ.</p>
                                        <p className="font-mono text-xs mt-2 text-gray-600">Mã thẻ: {lastPurchasedPass.passCode}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column - Wallet Info */}
                        <div className="lg:col-span-1">
                            <div className="bg-gradient-to-br from-[#1b8c6c] to-[#23a983] text-white rounded-2xl p-6 shadow-lg mb-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-green-100 font-medium text-sm uppercase tracking-wider">Số dư ví hiện tại</h3>
                                        <p className="text-3xl font-bold mt-2">{data.walletBalance.toLocaleString("vi-VN")} đ</p>
                                        <p className="mt-4 text-green-50">{user?.fullName || "Hành khách"}</p>
                                    </div>
                                    <FaWallet className="text-4xl text-green-100 opacity-80" />
                                </div>
                            </div>

                            {data.isPriorityGroup && (
                                <div className="bg-green-100 text-green-800 p-4 rounded-xl mb-6 shadow-sm border border-green-200">
                                    <strong className="block mb-1">🎁 Ưu tiên đang hoạt động</strong>
                                    <span className="text-sm">Bạn được giảm cố định <strong>20%</strong> khi mua vé.</span>
                                </div>
                            )}

                            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                                <h5 className="font-bold text-gray-800 mb-4 flex items-center">
                                    <FaInfoCircle className="text-[#23a983] mr-2" /> Hướng dẫn mua vé tháng
                                </h5>
                                <ul className="text-sm text-gray-600 space-y-2 list-disc pl-4 marker:text-[#23a983]">
                                    <li>Chọn tuyến xe đang hoạt động</li>
                                    <li>Chọn tháng / năm cần mua</li>
                                    <li>Hệ thống sẽ trừ tiền trực tiếp từ ví BusDN</li>
                                    <li>Không thể mua lại cùng tuyến nếu đã đăng ký trước đó</li>
                                    <li>Sau khi mua, dùng <strong>mã QR vé tháng</strong> — phụ xe quét để kiểm tra còn trong thời hạn</li>
                                </ul>
                            </div>
                        </div>

                        {/* Right Column - Purchase Form & History */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* Purchase Form */}
                            <div className="bg-white rounded-xl shadow-md p-6 md:p-8 border border-gray-100">
                                <h5 className="text-xl font-bold text-gray-800 mb-6 border-b pb-4">Đăng ký mua vé tháng</h5>

                                {data.routes.length === 0 ? (
                                    <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg">
                                        Hiện chưa có tuyến nào đang hoạt động để mua vé tháng.
                                    </div>
                                ) : (
                                    <form onSubmit={handlePurchase}>
                                        {/* Route Selection */}
                                        <div className="mb-5">
                                            <label className="block text-gray-700 font-semibold mb-2">1. Chọn tuyến xe</label>
                                            <select
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-[#23a983] focus:ring-1 focus:ring-[#23a983] bg-white text-gray-800"
                                                value={selectedRouteId}
                                                onChange={(e) => setSelectedRouteId(e.target.value)}
                                                required
                                            >
                                                <option value="">-- Vui lòng chọn tuyến xe --</option>
                                                {data.routes.map(r => (
                                                    <option key={r._id} value={r._id}>
                                                        {r.routeNumber} - {r.name} · {(r.monthlyPassPrice || 0).toLocaleString("vi-VN")} đ
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {selectedRoute && (
                                            <div className="bg-[#f5fefa] border border-[#23a983] rounded-lg p-4 mb-5 shadow-inner">
                                                <div className="font-bold text-[#1b8c6c] text-lg">{selectedRoute.routeNumber} - {selectedRoute.name}</div>
                                                <div className="text-sm text-gray-600 mt-1">{selectedRoute.description || 'Tuyến xe BusDN'}</div>
                                                <div className="text-sm font-medium text-gray-700 mt-2">
                                                    Giờ hoạt động: {selectedRoute.operationTime?.start || '--'} - {selectedRoute.operationTime?.end || '--'}
                                                </div>
                                            </div>
                                        )}

                                        {/* Month/Year Selection */}
                                        <div className="grid grid-cols-2 gap-4 mb-6">
                                            <div>
                                                <label className="block text-gray-700 font-semibold mb-2">2. Tháng</label>
                                                <select
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-[#23a983] bg-white"
                                                    value={selectedMonth}
                                                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                                    required
                                                >
                                                    {months.map(m => (
                                                        <option key={m} value={m}>Tháng {String(m).padStart(2, '0')}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-gray-700 font-semibold mb-2">3. Năm</label>
                                                <select
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-[#23a983] bg-white"
                                                    value={selectedYear}
                                                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                                                    required
                                                >
                                                    {years.map(y => (
                                                        <option key={y} value={y}>{y}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Summary Box */}
                                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 mb-6">
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="text-gray-600">Tuyển đã chọn:</span>
                                                <span className="font-semibold text-gray-800 text-right">{selectedRoute ? `${selectedRoute.routeNumber} - ${selectedRoute.name}` : 'Chưa chọn'}</span>
                                            </div>
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="text-gray-600">Kỳ vé tháng:</span>
                                                <span className="font-semibold text-gray-800">{String(selectedMonth).padStart(2, '0')}/{selectedYear}</span>
                                            </div>

                                            <div className="border-t border-gray-200 my-3 pt-3"></div>

                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-gray-600">Giá gốc:</span>
                                                <span className="font-semibold text-gray-800">{originalPrice.toLocaleString("vi-VN")} đ</span>
                                            </div>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-gray-600">Mức giảm ưu tiên:</span>
                                                <span className="font-semibold text-green-600">- {discountAmount.toLocaleString("vi-VN")} đ</span>
                                            </div>
                                            <div className="flex justify-between items-center mb-4">
                                                <span className="font-bold text-gray-800 text-lg">Thanh toán:</span>
                                                <span className="font-bold text-[#e11d48] text-xl">{finalPrice.toLocaleString("vi-VN")} đ</span>
                                            </div>

                                            <div className="border-t border-gray-200 my-3 pt-3"></div>

                                            <div className="flex justify-between items-center text-sm mb-1">
                                                <span className="text-gray-500">Số dư hiện tại:</span>
                                                <span className="font-medium text-gray-700">{data.walletBalance.toLocaleString("vi-VN")} đ</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-500">Số dư còn lại (ước tính):</span>
                                                <span className={`font-bold ${remainBalance < 0 ? 'text-red-500' : 'text-[#23a983]'}`}>
                                                    {remainBalance.toLocaleString("vi-VN")} đ
                                                </span>
                                            </div>
                                            {remainBalance < 0 && selectedRoute && (
                                                <p className="text-red-500 text-xs mt-2 text-right">Số dư ví không đủ để thanh toán.</p>
                                            )}
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={purchasing || !selectedRouteId || remainBalance < 0}
                                            className="w-full bg-[#23a983] hover:bg-[#1b8c6c] text-white font-bold py-3.5 px-4 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg shadow-md"
                                        >
                                            {purchasing ? (
                                                <>
                                                    <CircularProgress size={24} style={{ color: 'white' }} className="mr-2" /> Đang xử lý...
                                                </>
                                            ) : (
                                                <>
                                                    <FaTicketAlt className="mr-2" /> Mua vé tháng bằng ví
                                                </>
                                            )}
                                        </button>
                                    </form>
                                )}
                            </div>

                            {/* History Table */}
                            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                                <h5 className="text-lg font-bold text-gray-800 mb-4">Danh sách vé tháng của tôi</h5>

                                {data.myPasses.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                                        <FaTicketAlt className="text-4xl text-gray-300 mx-auto mb-3" />
                                        <p>Bạn chưa có vé tháng nào.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider border-b border-gray-200">
                                                    <th className="p-3 font-semibold rounded-tl-lg">Mã thẻ</th>
                                                    <th className="p-3 font-semibold">Tuyến</th>
                                                    <th className="p-3 font-semibold">Kỳ vé</th>
                                                    <th className="p-3 font-semibold text-right">Giá</th>
                                                    <th className="p-3 font-semibold text-center rounded-tr-lg">Trạng thái</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {data.myPasses.map((pass) => (
                                                    <tr key={pass._id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="p-3 font-mono text-sm text-gray-700">{pass.passCode}</td>
                                                        <td className="p-3 hidden sm:table-cell align-middle">
                                                            {pass.status === 'ACTIVE' && pass._id ? (
                                                                <div className="inline-flex flex-col items-center gap-1">
                                                                    <QRCodeSVG
                                                                        value={String(pass._id)}
                                                                        size={88}
                                                                        level="M"
                                                                        includeMargin
                                                                        className="rounded-lg border border-gray-200 bg-white p-1"
                                                                    />
                                                                    <span className="text-[10px] text-gray-500 max-w-[96px] text-center leading-tight">
                                                                        Phụ xe quét
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-gray-400 text-xs">—</span>
                                                            )}
                                                        </td>
                                                        <td className="p-3">
                                                            <div className="font-semibold text-gray-800">{pass.displayRouteNumber ? `${pass.displayRouteNumber} - ${pass.displayRouteName}` : pass.displayRouteName}</div>
                                                            {pass.status === 'ACTIVE' && pass._id && (
                                                                <div className="sm:hidden mt-3 flex flex-col items-start gap-1">
                                                                    <QRCodeSVG
                                                                        value={String(pass._id)}
                                                                        size={120}
                                                                        level="M"
                                                                        includeMargin
                                                                        className="rounded-lg border border-gray-200 bg-white p-1"
                                                                    />
                                                                    <span className="text-xs text-gray-500">Đưa QR cho phụ xe quét khi lên xe</span>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="p-3">
                                                            <div className="font-semibold text-gray-800">{String(pass.month).padStart(2, '0')}/{pass.year}</div>
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            <span className="font-bold text-[#e11d48]">- {Number(pass.pricePaid || 0).toLocaleString("vi-VN")} đ</span>
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <span className={`inline-block px-2.5 py-1 text-xs font-bold rounded-full ${pass.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : pass.status === 'EXPIRED' ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-800'}`}>
                                                                {pass.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
};

export default MonthlyPass;
