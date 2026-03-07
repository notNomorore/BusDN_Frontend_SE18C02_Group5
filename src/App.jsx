import React from 'react'
import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Home from './pages/Home'
import Footer from './components/Footer'
import AvailableBus from './pages/AvailableBus'
import SeatSelection from './components/SeatSelection'
import PassengerDetails from './pages/PassengerDetails'
import TrackBus from './components/TrackBus'
import Profile from './pages/Profile'
import RouteDetails from './pages/RouteDetails'
import ForgotPassword from './pages/ForgotPassword'
import MonthlyPass from './pages/MonthlyPass'
import AdminLayout from './pages/admin/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminPriorityProfiles from './pages/admin/AdminPriorityProfiles'
import AdminRoutes from './pages/admin/AdminRoutes'
import AdminStops from './pages/admin/AdminStops'
import AdminSchedules from './pages/admin/AdminSchedules'
import FleetStatus from './pages/admin/FleetStatus'
import TripLogs from './pages/admin/TripLogs'
import LostAndFound from './pages/admin/LostAndFound'
import BroadcastNotification from './pages/admin/BroadcastNotification'
import FareMatrix from './pages/admin/FareMatrix'
import BusProvider from './context/BusProvider'
import ChatBot from './components/ChatBot'
import OpenPage from './components/OpenPage'
import { DialogProvider } from './context/DialogContext';

function App() {

  return (
    <DialogProvider>
      <BusProvider>
        <Router>
          <Routes>
            {/* Admin Routes (No default Header/Footer) */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="staff" element={<AdminUsers />} />
              <Route path="staff/create" element={<AdminUsers />} />
              <Route path="priority-profiles" element={<AdminPriorityProfiles />} />
              <Route path="routes" element={<AdminRoutes />} />
              <Route path="stops" element={<AdminStops />} />
              <Route path="schedules" element={<AdminSchedules />} />
              <Route path="fleet-status" element={<FleetStatus />} />
              <Route path="trip-logs" element={<TripLogs />} />
              <Route path="lost-and-found" element={<LostAndFound />} />
              <Route path="broadcast" element={<BroadcastNotification />} />
              <Route path="fare-matrix" element={<FareMatrix />} />
            </Route>

            {/* Regular User Routes */}
            <Route path="/*" element={
              <div className="flex flex-col min-h-screen bg-[#f5fefa]">
                <Header />
                <main className="flex-1 min-h-0">
                  <Routes>
                    <Route path='/' element={<Home />} />
                    <Route path='/available-seat' element={<AvailableBus />} />
                    <Route path='/seat-selection/:id' element={<SeatSelection />} />
                    <Route path='/passenger-details' element={<PassengerDetails />} />
                    <Route path='/track-bus' element={<TrackBus />} />
                    <Route path='/profile' element={<Profile />} />
                    <Route path='/route-details/:id' element={<RouteDetails />} />
                    <Route path='/forgot-password' element={<ForgotPassword />} />
                    <Route path='/monthly-pass' element={<MonthlyPass />} />
                  </Routes>
                </main>
                <Footer />
              </div>
            } />
          </Routes>
        </Router>
        <ChatBot />
      </BusProvider>
    </DialogProvider>
  )
}

export default App
