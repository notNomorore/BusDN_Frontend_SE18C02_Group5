import React, { useContext, useEffect, useState } from 'react';
import { LuUser, LuWallet, LuShieldCheck, LuLock } from "react-icons/lu";
import { FaTicketAlt } from "react-icons/fa";
import AuthContext from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from "framer-motion";
import api from '../utils/api';
import { useDialog } from '../context/DialogContext';

const Profile = () => {
  const [activeTab, setActiveTab] = useState('settings'); // settings, bookings, priority
  const [data, setData] = useState({});
  const [wallet, setWallet] = useState(0);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editMode, setEditMode] = useState(false);

  // Password change state
  const [showPasswordEdit, setShowPasswordEdit] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Priority Registration state
  const [priorityType, setPriorityType] = useState('Student');
  const [priorityDocUrl, setPriorityDocUrl] = useState('');

  // Wallet Deposit state
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');

  const navigate = useNavigate();
  const { logout, token } = useContext(AuthContext);
  const { showAlert } = useDialog();

  const fadeInUp = {
    hidden: { opacity: 0, y: 60 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
  };

  useEffect(() => {
    if (token) {
      fetchUser();
      fetchWallet();
    } else {
      navigate('/');
    }
  }, [token, navigate]);

  const fetchUser = async () => {
    try {
      const res = await api.get('/api/user/profile');
      const user = res.data.user;
      setData(user);
      setEditName(user.fullName);
      setEditPhone(user.phone);
      setEditMode(false);
    } catch (err) {
      console.error("Error fetching user:", err.message);
      if (err.response?.status === 401) {
        handleLogout();
      }
    }
  }

  const fetchWallet = async () => {
    try {
      const res = await api.get('/api/user/wallet');
      if (res.data.ok) {
        setWallet(res.data.walletBalance);
      }
    } catch (err) {
      console.error("Error fetching wallet:", err.message);
    }
  }

  const updateUser = async () => {
    try {
      const res = await api.post('/api/user/update-profile', {
        fullName: editName,
        phone: editPhone
      });
      if (res.data.ok) {
        setData(res.data.user);
        setEditMode(false);
        showAlert('Profile updated successfully!', 'Thành công');
      }
    } catch (err) {
      console.error("Error updating user:", err.message);
      showAlert('Failed to update profile.', 'Lỗi');
    }
  }

  const updatePassword = async (e) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      showAlert("Please fill in both password fields.", 'Thông báo');
      return;
    }
    try {
      const res = await api.post('/api/user/change-password', {
        oldPassword,
        newPassword
      });
      if (res.data.ok) {
        showAlert(res.data.message || "Password changed successfully!", 'Thành công');
        setShowPasswordEdit(false);
        setOldPassword('');
        setNewPassword('');
      }
    } catch (err) {
      console.error("Error changing password:", err.message);
      showAlert(err.response?.data?.message || "Failed to change password. Please check your old password.", 'Lỗi');
    }
  }

  const submitPriorityRequest = async (e) => {
    e.preventDefault();
    if (!priorityDocUrl) {
      showAlert("Please provide a document URL.", 'Thông báo');
      return;
    }
    try {
      const res = await api.post('/api/user/register-priority', {
        type: priorityType,
        documentUrl: priorityDocUrl
      });
      if (res.data.ok) {
        showAlert(res.data.message || "Priority registration submitted successfully!", 'Thành công');
        fetchUser(); // Refresh user data to get the updated status
      }
    } catch (err) {
      console.error("Error submitting priority:", err.message);
      showAlert(err.response?.data?.message || "Failed to submit priority registration.", 'Lỗi');
    }
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    const amountNum = parseInt(depositAmount, 10);
    if (isNaN(amountNum) || amountNum <= 0) {
      showAlert("Please enter a valid deposit amount.", 'Thông báo');
      return;
    }
    try {
      const res = await api.post('/api/user/wallet/deposit', { amount: amountNum });
      if (res.data.ok) {
        showAlert("Deposit successful!", 'Thành công');
        setWallet(res.data.walletBalance);
        setShowDepositForm(false);
        setDepositAmount('');
      } else {
        showAlert(res.data.message || "Failed to deposit.", 'Lỗi');
      }
    } catch (err) {
      console.error("Error depositing:", err.message);
      showAlert(err.response?.data?.message || "Failed to make a deposit.", 'Lỗi');
    }
  };

  const handleLogout = () => {
    logout();
    localStorage.removeItem('token');
    navigate('/');
  }

  if (!token) return null;

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="min-h-screen bg-[#f5fefa]"
    >
      <div className='py-2 border-b border-b-gray-200 bg-white shadow-sm'>
        <div className='flex items-center justify-center flex-col py-8'>
          <span className='rounded-full p-4 bg-gradient-to-r from-green-500 to-[#23a983] text-white shadow-lg mb-4'>
            <LuUser style={{ fontSize: '40px' }} />
          </span>
          <h1 className='font-bold text-3xl my-2 text-black'>{data.fullName || 'User'}</h1>
          <p className='text-gray-600 font-medium'>{data.email}</p>
          <div className="flex flex-col items-center mt-4">
            <div className="flex items-center gap-2 bg-green-50 text-green-700 px-6 py-2.5 rounded-full font-semibold border border-green-200 shadow-sm">
              <LuWallet className="text-2xl" />
              <span className="text-xl">Wallet Balance: {wallet.toLocaleString()} VND</span>
            </div>
            {!showDepositForm ? (
              <div className="flex gap-6 mt-3">
                <button
                  onClick={() => setShowDepositForm(true)}
                  className="text-[#23a983] font-semibold text-sm hover:underline cursor-pointer"
                >
                  + Add Funds
                </button>
                <button
                  onClick={() => navigate('/monthly-pass')}
                  className="text-[#23a983] font-semibold text-sm hover:underline cursor-pointer flex items-center gap-1.5"
                >
                  <FaTicketAlt /> Buy Monthly Pass
                </button>
              </div>
            ) : (
              <form onSubmit={handleDeposit} className="mt-4 flex gap-2">
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Enter amount (VND)"
                  className="border border-gray-300 rounded-md px-3 py-1.5 focus:outline-[#23a983] focus:border-[#23a983] w-40 text-black"
                />
                <button type="submit" className="bg-[#23a983] text-white px-4 py-1.5 rounded-md font-semibold hover:bg-[#1bbd8f]">Deposit</button>
                <button type="button" onClick={() => setShowDepositForm(false)} className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md font-semibold hover:bg-gray-300">Cancel</button>
              </form>
            )}
          </div>
        </div>
      </div>

      <div className='flex mx-4 my-6 text-gray-700 bg-white shadow-md py-2 px-2 rounded-lg justify-around max-w-3xl md:mx-auto border border-gray-100'>
        <button
          className={`cursor-pointer w-full py-2.5 rounded-md mx-1 font-semibold transition-colors ${activeTab === 'bookings' ? 'bg-[#23a983] text-white shadow' : 'hover:bg-gray-100'}`}
          onClick={() => setActiveTab('bookings')}
        >
          My Tickets
        </button>
        <button
          className={`cursor-pointer w-full py-2.5 rounded-md mx-1 font-semibold transition-colors ${activeTab === 'settings' ? 'bg-[#23a983] text-white shadow' : 'hover:bg-gray-100'}`}
          onClick={() => setActiveTab('settings')}
        >
          Profile Settings
        </button>
        <button
          className={`flex justify-center items-center gap-2 cursor-pointer w-full py-2.5 rounded-md mx-1 font-semibold transition-colors ${activeTab === 'priority' ? 'bg-[#059669] text-white shadow' : 'hover:bg-gray-100'}`}
          onClick={() => setActiveTab('priority')}
        >
          <LuShieldCheck /> Priority
        </button>
      </div>

      <div className='mx-4 my-4 max-w-3xl md:mx-auto pb-12'>
        {activeTab === 'settings' && (
          <div className='text-black bg-white shadow-lg p-6 rounded-xl border border-gray-100'>
            <h2 className='font-bold text-2xl mb-6 text-gray-800 border-b pb-4'>Personal Information</h2>
            <div className='space-y-4'>
              <div>
                <label className='text-gray-500 text-sm font-semibold uppercase tracking-wide block mb-1'>Full Name</label>
                {editMode ? (
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className='border border-gray-300 w-full px-4 py-2 rounded-lg text-black focus:ring-2 focus:ring-[#23a983] focus:border-transparent outline-none transition-all'
                  />
                ) : <p className='text-gray-900 font-semibold text-lg bg-gray-50 px-4 py-2 rounded-lg'>{data?.fullName || '--'}</p>}
              </div>

              <div>
                <label className='text-gray-500 text-sm font-semibold uppercase tracking-wide block mb-1 mt-4'>Email (Unchangeable)</label>
                <p className='text-gray-600 font-medium text-lg bg-gray-100 px-4 py-2 rounded-lg cursor-not-allowed'>{data?.email}</p>
              </div>

              <div>
                <label className='text-gray-500 text-sm font-semibold uppercase tracking-wide block mb-1 mt-4'>Phone Number</label>
                {editMode ? (
                  <input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className='border border-gray-300 w-full px-4 py-2 rounded-lg text-black focus:ring-2 focus:ring-[#23a983] focus:border-transparent outline-none transition-all'
                  />
                ) : <p className='text-gray-900 font-semibold text-lg bg-gray-50 px-4 py-2 rounded-lg'>{data?.phone || '--'}</p>}
              </div>
            </div>

            <div className='mt-8 pt-6 border-t'>
              <h3 className='font-bold text-xl mb-4 text-gray-800 flex items-center gap-2'>
                <LuLock className="text-gray-600" /> Security
              </h3>

              {!showPasswordEdit ? (
                <button
                  onClick={() => setShowPasswordEdit(true)}
                  className='bg-white border-2 border-gray-300 text-gray-700 font-semibold py-2 px-6 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-all text-sm'
                >
                  Change Password
                </button>
              ) : (
                <form onSubmit={updatePassword} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="space-y-3">
                    <div>
                      <label className='text-gray-600 text-sm font-semibold block mb-1'>Old Password</label>
                      <input
                        type="password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className='border border-gray-300 w-full px-4 py-2 rounded-lg text-black focus:ring-2 focus:ring-blue-500 outline-none'
                        placeholder="Enter current password"
                        required
                      />
                    </div>
                    <div>
                      <label className='text-gray-600 text-sm font-semibold block mb-1'>New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className='border border-gray-300 w-full px-4 py-2 rounded-lg text-black focus:ring-2 focus:ring-blue-500 outline-none'
                        placeholder="Enter new password"
                        required
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        type="submit"
                        className='bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors text-sm'
                      >
                        Update Password
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPasswordEdit(false);
                          setOldPassword('');
                          setNewPassword('');
                        }}
                        className='bg-gray-200 text-gray-700 font-semibold py-2 px-6 rounded-lg hover:bg-gray-300 transition-colors text-sm'
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>

            <div className='flex flex-col sm:flex-row justify-between items-center mt-10 gap-4 pt-6 border-t'>
              {editMode ? (
                <div className="flex gap-3 w-full sm:w-auto">
                  <button
                    className='bg-gray-200 text-gray-700 font-semibold py-2.5 px-6 rounded-lg hover:bg-gray-300 transition-colors w-full sm:w-auto'
                    onClick={() => {
                      setEditMode(false);
                      setEditName(data?.fullName);
                      setEditPhone(data?.phone);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className='bg-[#23a983] shadow-md text-white font-semibold py-2.5 px-6 rounded-lg hover:bg-[#1db179] transition-colors w-full sm:w-auto'
                    onClick={updateUser}
                  >
                    Save Changes
                  </button>
                </div>
              ) : (
                <button
                  className='bg-white border-2 border-gray-300 text-gray-700 font-semibold py-2.5 px-6 rounded-lg hover:border-[#23a983] hover:text-[#23a983] transition-all w-full sm:w-auto'
                  onClick={() => setEditMode(true)}
                >
                  Edit Profile
                </button>
              )}

              <button
                className='bg-red-50 text-red-600 font-semibold py-2.5 px-6 rounded-lg hover:bg-red-100 hover:text-red-700 transition-colors w-full sm:w-auto'
                onClick={handleLogout}
              >
                Sign Out
              </button>
            </div>
          </div>
        )}

        {activeTab === 'bookings' && (
          <div className='bg-white text-black p-8 rounded-xl shadow-lg border border-gray-100 text-center'>
            <div className="text-5xl mb-4">🎫</div>
            <h3 className='font-bold text-2xl text-gray-800 mb-2'>No Tickets Found</h3>
            <p className='text-gray-500'>You haven't booked any bus tickets yet.</p>
            <button
              onClick={() => navigate('/')}
              className="mt-6 bg-[#23a983] text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-[#1db179] transition-colors"
            >
              Search Routes
            </button>
          </div>
        )}

        {activeTab === 'priority' && (
          <div className='bg-white text-black p-8 rounded-xl shadow-lg border border-gray-100'>
            <h2 className='font-bold text-2xl mb-4 text-gray-800 flex items-center gap-2'>
              <LuShieldCheck className="text-[#059669]" /> Priority Passenger
            </h2>
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
              <p className="text-yellow-800 font-medium">
                Current Status: <span className="font-bold uppercase">{data?.priorityProfile?.status || 'NONE'}</span>
              </p>
            </div>

            {data?.priorityProfile?.status === 'PENDING' ? (
              <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg text-center">
                <SpinnerIcon className="animate-spin text-blue-500 text-3xl mx-auto mb-2" />
                <h3 className="font-bold text-lg text-blue-800">Application Under Review</h3>
                <p className="text-blue-600 mt-2">Your priority passenger application is currently pending review by an administrator. Please check back later.</p>
              </div>
            ) : data?.priorityProfile?.status === 'APPROVED' ? (
              <div className="bg-green-50 border border-green-200 p-6 rounded-lg text-center">
                <h3 className="font-bold text-lg text-green-800">You are a Priority Passenger</h3>
                <p className="text-green-600 mt-2">You now receive discounts on applicable bus fares as a recorded {data?.priorityProfile?.type} passenger.</p>
              </div>
            ) : (
              <form onSubmit={submitPriorityRequest}>
                <p className='text-gray-600 mb-6 leading-relaxed'>
                  Register as a priority passenger (Student, Elderly, Disabled) to receive discounted fares. You will need to provide a link to your valid identification document.
                </p>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className='font-semibold text-gray-700 block mb-1'>Priority Type</label>
                    <select
                      value={priorityType}
                      onChange={(e) => setPriorityType(e.target.value)}
                      className='w-full px-4 py-2.5 border border-gray-300 focus:border-[#059669] outline-none rounded-lg text-black bg-white'
                    >
                      <option value="Student">Student</option>
                      <option value="Elderly">Elderly</option>
                      <option value="Disabled">Disabled</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className='font-semibold text-gray-700 block mb-1'>Document URL (ID Card / Proof)</label>
                    <input
                      type="url"
                      value={priorityDocUrl}
                      onChange={(e) => setPriorityDocUrl(e.target.value)}
                      placeholder="https://example.com/my-id-card.jpg"
                      required
                      className='w-full px-4 py-2.5 border border-gray-300 focus:border-[#059669] outline-none rounded-lg text-black'
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#059669] text-white font-semibold py-3 rounded-lg shadow-md hover:bg-green-700 transition-colors"
                >
                  Submit Application
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

const SpinnerIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

export default Profile;
