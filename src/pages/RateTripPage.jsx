import React from 'react'
import { Link, useParams } from 'react-router-dom'
import RateTrip from '../components/RateTrip'

const RateTripPage = () => {
    const { tripId } = useParams()

    return (
        <div className="mx-auto max-w-4xl px-4 py-10">
            <div className="mb-6">
                <Link to="/" className="text-sm font-semibold text-[#23a983] hover:underline">
                    Back to home
                </Link>
            </div>
            <RateTrip tripId={tripId} />
        </div>
    )
}

export default RateTripPage
