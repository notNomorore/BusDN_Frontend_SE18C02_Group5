import React, { useState } from 'react';
import { IoLocationOutline } from "react-icons/io5";
import { CiSearch } from "react-icons/ci";
import CircularProgress from '@mui/material/CircularProgress';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bus_API } from '../utils/constant';
import useBus from '../hook/useBus';
import api from '../utils/api';
import { useDialog } from '../context/DialogContext';

const SearchBar = () => {
  const { showAlert } = useDialog();
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setBuses, setRouteDetails } = useBus();
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setRouteDetails({ origin, destination });

    try {
      // POST to backend API to search routes
      const response = await api.post(Bus_API, { origin, destination });
      const res = response;

      if (res.data.success && res.data.routes && res.data.routes.length > 0) {
        navigate('/available-seat', { state: { routes: res.data.routes } });
      } else {
        showAlert("No route found for the given stops.", "Tuyến xe không tồn tại");
      }
    } catch (err) {
      console.error(err);
      showAlert("Failed to fetch routes. Ensure backend is running.", "Lỗi");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full px-4 ">
      <div className="bg-white md:shadow-2xl rounded-xl p-4 px-6  max-w-6xl mx-auto -mt-40 z-10 relative">
        <form
          onSubmit={handleSearch}
          className="flex flex-col md:flex-row md:items-end gap-4 md:gap-6"
        >
          <div className="flex-1">
            <label className="block mb-1 font-semibold text-gray-700 flex items-center">
              <IoLocationOutline className="mr-1 text-green-600" />
              From Stop
            </label>
            <input
              type="text"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="E.g., Bến Xe Trung Tâm"
              className="w-full px-4 py-2.5 border rounded-md bg-green-50 focus:outline-[#23a983]"
              required
            />
          </div>

          <div className="flex-1">
            <label className="block mb-1 font-semibold text-gray-700 flex items-center">
              <IoLocationOutline className="mr-4 text-cyan-600" />
              To Stop
            </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="E.g., Ngũ Hành Sơn"
              className="w-full px-4 py-2.5 border rounded-md bg-gray-50 focus:outline-[#23a983]"
              required
            />
          </div>

          <div>
            <button
              type="submit"
              className="bg-[#23a983] hover:bg-[#1db179] transition-all text-white w-full py-3 px-6 rounded-md flex justify-center items-center font-semibold shadow-md cursor-pointer"
            >
              {isLoading ? (
                <CircularProgress size={20} style={{ color: 'white' }} />
              ) : (
                <>
                  <CiSearch className="mr-2 text-lg" />
                  Search Routes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SearchBar;
