import { API_ORIGIN, SOCKET_ORIGIN, buildApiUrl } from './runtimeConfig'

export const API_BASE_URL = API_ORIGIN
export const Register_API = buildApiUrl('/api/auth/register')
export const Login_Api = buildApiUrl('/api/auth/login')
export const Profile_API = buildApiUrl('/api/user/profile')
export const Route_API = buildApiUrl('/api/routes')
export const Bus_API = buildApiUrl('/api/routes/search')
export const Seat_API = buildApiUrl('/api/seat') // Might not be needed
export const Socket_URL = SOCKET_ORIGIN
export const Booking_API = buildApiUrl('/api/booking/book') // Might not be needed
export const Razorpay_API = buildApiUrl('/api/payment/create-order') // Might not be needed
export const available_gif = "https://media.tenor.com/LkJeSUFuV7UAAAAi/wheels-on-the-bus.gif"
export const busCard_image = "/assets/bus-image.jpg"
export const Hero_image = "/assets/busHero2.jpg"
