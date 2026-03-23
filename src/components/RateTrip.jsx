import React, { useEffect, useMemo, useState } from 'react'
import { FaRegStar, FaStar, FaBus, FaUserTie } from 'react-icons/fa'
import { createTripRating, getRateableTrip } from '../services/api'

const defaultForm = {
    rating: 0,
    comment: ''
}

const alertStyles = {
    success: 'border-green-200 bg-green-50 text-green-700',
    error: 'border-red-200 bg-red-50 text-red-700',
    info: 'border-blue-200 bg-blue-50 text-blue-700'
}

const RateTrip = ({ tripId, trip: tripProp = null, onRated }) => {
    const [trip, setTrip] = useState(tripProp)
    const [loading, setLoading] = useState(!tripProp && !!tripId)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState(defaultForm)
    const [alert, setAlert] = useState(null)
    const [alreadyRated, setAlreadyRated] = useState(false)
    const [isPassenger, setIsPassenger] = useState(true)

    useEffect(() => {
        if (tripProp) {
            setTrip(tripProp)
        }
    }, [tripProp])

    useEffect(() => {
        if (!tripId || tripProp) return undefined

        let active = true
        const fetchTrip = async () => {
            setLoading(true)
            try {
                const data = await getRateableTrip(tripId)
                if (!active) return
                setTrip(data.trip)
                setAlreadyRated(!!data.alreadyRated)
                setIsPassenger(data.isPassenger !== false)
            } catch (error) {
                if (!active) return
                setAlert({
                    type: 'error',
                    message: error.response?.data?.message || 'Unable to load trip information'
                })
            } finally {
                if (active) setLoading(false)
            }
        }

        fetchTrip()
        return () => {
            active = false
        }
    }, [tripId, tripProp])

    const canShowForm = useMemo(() => {
        return trip?.tripStatus === 'COMPLETED' && !alreadyRated && isPassenger
    }, [trip, alreadyRated, isPassenger])

    const handleSubmit = async (event) => {
        event.preventDefault()

        if (!trip?._id) {
            setAlert({ type: 'error', message: 'Trip information is missing' })
            return
        }

        if (form.rating < 1 || form.rating > 5) {
            setAlert({ type: 'error', message: 'Please select a rating from 1 to 5 stars' })
            return
        }

        setSaving(true)
        setAlert(null)

        try {
            const data = await createTripRating({
                tripId: trip._id,
                rating: form.rating,
                comment: form.comment
            })

            setAlreadyRated(true)
            setAlert({ type: 'success', message: data.message || 'Rating submitted successfully' })
            setForm(defaultForm)

            if (typeof onRated === 'function') {
                onRated(data.rating)
            }
        } catch (error) {
            setAlert({
                type: 'error',
                message: error.response?.data?.message || 'Unable to submit rating'
            })
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-500 shadow-sm">
                Loading trip rating form...
            </div>
        )
    }

    if (!trip) {
        return (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
                Trip not found.
            </div>
        )
    }

    if (trip.tripStatus !== 'COMPLETED') {
        return (
            <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 text-yellow-800 shadow-sm">
                Rating is available only after the trip is completed.
            </div>
        )
    }

    if (!isPassenger) {
        return (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
                You can rate only trips that you joined as a passenger.
            </div>
        )
    }

    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm text-black">
            <div className="mb-5 border-b border-gray-100 pb-4">
                <h2 className="text-xl font-bold text-gray-800">Rate Trip & Driver</h2>
                <div className="mt-3 grid gap-3 text-sm text-gray-600 md:grid-cols-2">
                    <div className="flex items-center gap-2">
                        <FaBus className="text-[#23a983]" />
                        <span>
                            {trip.routeId?.routeNumber ? `${trip.routeId.routeNumber} - ` : ''}
                            {trip.routeId?.name || 'BusDN trip'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <FaUserTie className="text-[#23a983]" />
                        <span>{trip.driverId?.fullName || 'Assigned driver'}</span>
                    </div>
                </div>
            </div>

            {alert && (
                <div className={`mb-4 rounded-xl border px-4 py-3 text-sm font-medium ${alertStyles[alert.type] || alertStyles.info}`}>
                    {alert.message}
                </div>
            )}

            {alreadyRated ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
                    You have already rated this trip.
                </div>
            ) : canShowForm ? (
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-700">Your rating</label>
                        <div className="flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map((value) => {
                                const filled = value <= form.rating
                                const Icon = filled ? FaStar : FaRegStar

                                return (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setForm((prev) => ({ ...prev, rating: value }))}
                                        className="text-3xl text-amber-400 transition-transform hover:scale-110"
                                        aria-label={`Rate ${value} star${value > 1 ? 's' : ''}`}
                                    >
                                        <Icon />
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-700">Comment</label>
                        <textarea
                            value={form.comment}
                            onChange={(event) => setForm((prev) => ({ ...prev, comment: event.target.value }))}
                            rows="4"
                            maxLength="500"
                            placeholder="Share feedback about the trip or driver"
                            className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-[#23a983] focus:ring-2 focus:ring-[#23a983]/20"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center rounded-xl bg-[#23a983] px-5 py-3 font-semibold text-white transition hover:bg-[#1b8c6c] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {saving ? 'Submitting...' : 'Submit Rating'}
                    </button>
                </form>
            ) : null}
        </div>
    )
}

export default RateTrip
