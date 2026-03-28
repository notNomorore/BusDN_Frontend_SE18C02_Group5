import React, { useContext, useEffect, useRef } from 'react'
import './App.css'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
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
import MonthlyPassDetails from './pages/MonthlyPassDetails'
import MonthlyPassResult from './pages/MonthlyPassResult'
import BuyTripTicket from './pages/BuyTripTicket'
import CreatePassword from './pages/CreatePassword'
import LoginPage from './pages/LoginPage'
import FirstLoginProfile from './pages/FirstLoginProfile'
import ActivateAccount from './pages/ActivateAccount'
import ImportStaff from './pages/ImportStaff'
import AdminLayout from './pages/admin/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminPriorityProfiles from './pages/admin/AdminPriorityProfiles'
import AdminRoutes from './pages/admin/AdminRoutes'
import RouteForm from './pages/admin/RouteForm'
import AdminStops from './pages/admin/AdminStops'
import AdminSchedules from './pages/admin/AdminSchedules'
import FleetStatus from './pages/admin/FleetStatus'
import AddVehicle from './pages/admin/AddVehicle'
import UpdateVehicle from './pages/admin/UpdateVehicle'
import TripLogs from './pages/admin/TripLogs'
import LostAndFound from './pages/admin/LostAndFound'
import BroadcastNotification from './pages/admin/BroadcastNotification'
import FareMatrix from './pages/admin/FareMatrix'
import RevenueReports from './pages/admin/RevenueReports'
import AdminFeedback from './pages/admin/AdminFeedback'
import AdminPromotions from './pages/admin/AdminPromotions'
import AdminPromotionHistory from './pages/admin/AdminPromotionHistory'
import DriverLayout from './pages/driver/DriverLayout'
import ViewSchedule from './pages/driver/ViewSchedule'
import TripControl from './pages/driver/TripControl'
import ReportIncident from './pages/driver/ReportIncident'
import ConfirmHandover from './pages/driver/ConfirmHandover'
import ValidateQR from './pages/driver/ValidateQR'
import ReportFullLoad from './pages/driver/ReportFullLoad'
import RateTripPage from './pages/RateTripPage'
import BusProvider from './context/BusProvider'
import ChatBot from './components/ChatBot'
import { DialogProvider, useDialog } from './context/DialogContext'
import AuthContext from './context/AuthContext'
import { io } from 'socket.io-client'
import RegisterStep1 from './pages/register/RegisterStep1'
import RegisterStep2 from './pages/register/RegisterStep2'
import RegisterVerifyOtp from './pages/register/RegisterVerifyOtp'
import RegisterCreatePassword from './pages/register/RegisterCreatePassword'
import { Socket_URL } from './utils/constant'

const NotificationRealtime = () => {
  const { token, userRole } = useContext(AuthContext)
  const { showAlert } = useDialog()
  const socketRef = useRef(null)

  useEffect(() => {
    if (!token || !userRole) return undefined

    const socket = io(Socket_URL, {
      path: '/socket.io',
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
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<Navigate to="/register/step-1" replace />} />
          <Route path="/register/step-1" element={<RegisterStep1 />} />
          <Route path="/register/step-2" element={<RegisterStep2 />} />
          <Route path="/register/verify-otp" element={<RegisterVerifyOtp />} />
          <Route path="/register/create-password" element={<RegisterCreatePassword />} />
          <Route path="/create-password" element={<CreatePassword />} />
          <Route path="/first-login/profile" element={<FirstLoginProfile />} />
          <Route path="/activate-account" element={<ActivateAccount />} />
          <Route path="/staff/import" element={<Navigate to="/admin/staff/import" replace />} />

          <Route path="/admin" element={<AdminLayout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="staff" element={<AdminUsers />} />
            <Route path="staff/create" element={<AdminUsers />} />
            <Route path="staff/import" element={<ImportStaff />} />
            <Route path="priority-profiles" element={<AdminPriorityProfiles />} />
            <Route path="routes" element={<AdminRoutes />} />
            <Route path="routes/create" element={<RouteForm />} />
            <Route path="routes/:id/edit" element={<RouteForm />} />
            <Route path="stops" element={<AdminStops />} />
            <Route path="schedules" element={<AdminSchedules />} />
            <Route path="fleet-status" element={<FleetStatus />} />
            <Route path="vehicles/new" element={<AddVehicle />} />
            <Route path="vehicles/:id/edit" element={<UpdateVehicle />} />
            <Route path="trip-logs" element={<TripLogs />} />
            <Route path="lost-and-found" element={<LostAndFound />} />
            <Route path="broadcast" element={<BroadcastNotification />} />
            <Route path="fare-matrix" element={<FareMatrix />} />
            <Route path="reports" element={<RevenueReports />} />
            <Route path="feedback" element={<AdminFeedback />} />
            <Route path="promotions" element={<AdminPromotions />} />
            <Route path="promotions/history" element={<AdminPromotionHistory />} />
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

          <Route path="/*" element={<PublicShell />} />
        </Routes>
        <ChatBotPortal />
      </Router>
    </BusProvider>
  )
}

function ChatBotPortal() {
  const location = useLocation()

  if (location.pathname === '/monthly-pass/result') {
    return null
  }

  return <ChatBot />
}

function PublicShell() {
  const location = useLocation()
  const isProfileScreen = location.pathname === '/profile'
  const isMonthlyPassResultScreen = location.pathname === '/monthly-pass/result'
  const isTrackBusScreen = location.pathname === '/track-bus'

  return (
    <div className={`flex ${isTrackBusScreen ? 'h-screen overflow-hidden' : 'min-h-screen'} flex-col ${isMonthlyPassResultScreen ? 'bg-[#f2fcf8]' : 'bg-[#f5fefa]'}`}>
      {!isMonthlyPassResultScreen ? <Header /> : null}
      <main className={`flex-1 min-h-0 ${(isProfileScreen || isTrackBusScreen) ? 'overflow-hidden' : ''}`}>
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
          <Route path='/monthly-pass/:passId' element={<MonthlyPassDetails />} />
          <Route path='/monthly-pass/result' element={<MonthlyPassResult />} />
          <Route path='/trip-ticket' element={<BuyTripTicket />} />
          <Route path='/rate-trip/:tripId' element={<RateTripPage />} />
        </Routes>
      </main>
      {(!isProfileScreen && !isMonthlyPassResultScreen && !isTrackBusScreen) ? <Footer /> : null}
    </div>
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
