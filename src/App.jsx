import React, { useContext, useEffect, useRef } from 'react'
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
import BuyTripTicket from './pages/BuyTripTicket'
import CreatePassword from './pages/CreatePassword'
import FirstLoginProfile from './pages/FirstLoginProfile'
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
import RevenueReports from './pages/admin/RevenueReports'
import AdminFeedback from './pages/admin/AdminFeedback'
import DriverLayout from './pages/driver/DriverLayout'
import ViewSchedule from './pages/driver/ViewSchedule'
import TripControl from './pages/driver/TripControl'
import ReportIncident from './pages/driver/ReportIncident'
import ConfirmHandover from './pages/driver/ConfirmHandover'
import ValidateQR from './pages/driver/ValidateQR'
import ReportFullLoad from './pages/driver/ReportFullLoad'
import BusProvider from './context/BusProvider'
import ChatBot from './components/ChatBot'
import { DialogProvider, useDialog } from './context/DialogContext'
import AuthContext from './context/AuthContext'
import { io } from 'socket.io-client'

const NotificationRealtime = () => {
  const { token, userRole } = useContext(AuthContext)
  const { showAlert } = useDialog()
  const socketRef = useRef(null)

  useEffect(() => {
    if (!token || !userRole) return undefined

    const socket = io('/', {
      transports: ['websocket'],
      withCredentials: true,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('auth:join', { token })
    })

    socket.on('notification:new', (payload) => {
      if (!payload) return
      showAlert(payload.message || 'Bạn có thông báo mới', payload.title || 'Thông báo mới')
    })

    return () => {
      socket.off('notification:new')
      socket.disconnect()
      socketRef.current = null
    }
  }, [token, userRole, showAlert])

  return null
}

function AppContent() {
  return (
    <BusProvider>
      <Router>
        <NotificationRealtime />

        <Routes>
          <Route path="/create-password" element={<CreatePassword />} />
          <Route path="/first-login/profile" element={<FirstLoginProfile />} />

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
            <Route path="reports" element={<RevenueReports />} />
            <Route path="feedback" element={<AdminFeedback />} />
          </Route>

          <Route path="/driver" element={<DriverLayout />}>
            <Route path="schedule" element={<ViewSchedule />} />
            <Route path="handover" element={<ConfirmHandover />} />
            <Route path="start-trip" element={<TripControl />} />
            <Route path="incident" element={<ReportIncident />} />
          </Route>

          <Route path="/conductor" element={<DriverLayout />}>
            <Route path="schedule" element={<ViewSchedule />} />
            <Route path="validate-qr" element={<ValidateQR />} />
            <Route path="full-load" element={<ReportFullLoad />} />
          </Route>

          <Route
            path="/*"
            element={
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
                    <Route path='/trip-ticket' element={<BuyTripTicket />} />
                  </Routes>
                </main>
                <Footer />
              </div>
            }
          />
        </Routes>
      </Router>
      <ChatBot />
    </BusProvider>
  )
}

function App() {
  return (
    <DialogProvider>
      <AppContent />
    </DialogProvider>
  )
}

export default App
