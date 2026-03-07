import React, { useEffect, useState } from 'react';
import { available_gif, Route_API } from '../utils/constant';
import useBus from '../hook/useBus';
import { IoIosArrowRoundForward } from "react-icons/io";
import { useNavigate } from 'react-router-dom';
import { IoLocationOutline } from "react-icons/io5";
import Skeleton from "@mui/material/Skeleton";
import Box from "@mui/material/Box";
import { TbMap2 } from "react-icons/tb";

const AvailableBus = () => {
  const searchData = useBus();
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const handleRouteDetails = (id) => {
    navigate(`/route-details/${id}`);
  };

  useEffect(() => {
    // If buses are already set by SearchBar, we just use them and stop loading.
    if (searchData?.buses && searchData.buses.length > 0) {
      setBuses(searchData.buses);
      setLoading(false);
    } else if (searchData?.routeDetails?.origin && searchData?.routeDetails?.destination) {
      // If we landed here from BusCard's "Book Now", we need to fetch buses for this route
      const fetchRoute = async () => {
        try {
          const res = await fetch(`${Route_API}?search=${searchData.routeDetails.origin}`);
          const json = await res.json();
          if (json.ok && json.routes) {
            // Filter further by destination if needed, or simply set them
            const filtered = json.routes.filter(r =>
              r.name.includes(searchData.routeDetails.origin) &&
              r.name.includes(searchData.routeDetails.destination)
            );
            setBuses(filtered.length > 0 ? filtered : json.routes);
          }
        } catch (err) {
          console.error("Error fetching specific route:", err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchRoute();
    } else {
      // Fallback to fetch all routes if accessed directly without search params
      const fetchAll = async () => {
        try {
          const res = await fetch(Route_API);
          const json = await res.json();
          if (json.ok && json.routes) {
            setBuses(json.routes);
          }
        } catch (err) {
          console.error("Error fetching routes:", err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchAll();
    }
  }, [searchData, navigate]);

  const renderSkeleton = () => (
    <Box className="max-w-5xl mx-auto mb-6 p-4 bg-green-100 rounded-xl border border-transparent">
      <Skeleton variant="text" width={150} height={30} sx={{ bgcolor: 'grey.100' }} />
      <Skeleton variant="text" width={100} height={20} sx={{ bgcolor: 'grey.100', my: 1 }} />
      <Skeleton variant="rectangular" height={40} sx={{ bgcolor: 'grey.100', my: 2 }} />
      <Skeleton variant="text" width={200} height={30} sx={{ bgcolor: 'grey.100', my: 1 }} />
      <Skeleton variant="rectangular" height={40} sx={{ bgcolor: 'grey.100', mt: 2 }} />
    </Box>
  );

  return (
    <div className="bg-[#f5fefa] py-4 px-2 md:px-12 min-h-screen">
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <img
            src={`${available_gif}`}
            alt="Loading..."
            className="h-[50vh] w-[50vw]"
          />
        </div>
      ) : (
        <>
          {searchData?.routeDetails?.origin && (
            <div className='bg-white text-black rounded-lg p-3 flex items-center flex-wrap gap-2 justify-center mb-4 border border-transparent shadow-lg'>
              <IoLocationOutline className='text-xl' />
              <span className='font-semibold text-xl'>{searchData.routeDetails.origin}</span>
              <IoIosArrowRoundForward className="text-2xl" />
              <span className='font-semibold text-xl'>{searchData.routeDetails.destination}</span>
            </div>
          )}

          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <div key={i}>{renderSkeleton()}</div>)
          ) : buses.length === 0 ? (
            <p className="text-center text-gray-800 bg-white shadow-md p-8 rounded-md mt-10">
              No routes available for this search.
            </p>
          ) : (
            buses.map((route, index) => (
              <div
                key={index}
                className="bg-white text-black rounded-xl shadow-md hover:shadow-xl hover:-translate-y-1 duration-300 p-6 mb-6 max-w-5xl mx-auto border border-gray-100"
              >
                <div className="flex justify-between items-center mb-4 flex-wrap">
                  <div className="flex items-center gap-4">
                    <div className="bg-[#23a983] text-white font-bold text-xl px-4 py-2 rounded-lg">
                      {route.routeNumber}
                    </div>
                    <div>
                      <h2 className="font-bold text-xl text-gray-800">{route.name}</h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Active Route
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg text-sm mb-4">
                  <div>
                    <span className="text-gray-500 block">Distance</span>
                    <span className="font-semibold">{route.distance || '--'} km</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Operation Time</span>
                    <span className="font-semibold">{route.operationTime || '--'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Total Stops</span>
                    <span className="font-semibold text-[#059669]">{route.stopsCount || 0} stops</span>
                  </div>
                </div>

                <button
                  onClick={() => handleRouteDetails(route.id)}
                  className="mt-2 w-full flex items-center justify-center gap-2 bg-white border-2 border-[#059468] text-[#059468] hover:bg-green-50 transition-colors py-2.5 rounded-lg font-semibold cursor-pointer"
                >
                  <TbMap2 className="text-xl" />
                  View Route Details
                </button>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
};

export default AvailableBus;
