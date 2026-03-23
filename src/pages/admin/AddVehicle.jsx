import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaArrowLeft, FaBus } from 'react-icons/fa'
import { createVehicle } from '../../services/api'

const initialForm = {
    licensePlate: '',
    seatCapacity: 40,
    standingCapacity: 0,
    status: 'INACTIVE'
}

const AddVehicle = () => {
    const navigate = useNavigate()
    const [form, setForm] = useState(initialForm)
    const [saving, setSaving] = useState(false)
    const [errors, setErrors] = useState([])
    const [successMessage, setSuccessMessage] = useState('')

    const handleChange = (event) => {
        const { name, value } = event.target
        setForm((prev) => ({
            ...prev,
            [name]: name === 'licensePlate' ? value : Number(value)
        }))
    }

    const handleStatusChange = (event) => {
        setForm((prev) => ({ ...prev, status: event.target.value }))
    }

    const handleSubmit = async (event) => {
        event.preventDefault()
        setSaving(true)
        setErrors([])
        setSuccessMessage('')

        try {
            const data = await createVehicle(form)
            setSuccessMessage(data.message || 'Vehicle created successfully')
            setTimeout(() => {
                navigate('/admin/fleet-status')
            }, 800)
        } catch (error) {
            const responseErrors = error.response?.data?.errors
            setErrors(responseErrors?.length ? responseErrors : [error.response?.data?.message || 'Unable to create vehicle'])
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="mx-auto max-w-3xl space-y-6 text-black">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                <div>
                    <p className="text-sm font-semibold text-[#23a983]">Vehicle Management</p>
                    <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-gray-800">
                        <FaBus className="text-[#23a983]" /> Add New Vehicle
                    </h1>
                </div>
                <Link to="/admin/fleet-status" className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50">
                    <FaArrowLeft /> Back
                </Link>
            </div>

            {successMessage && (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                    {successMessage}
                </div>
            )}

            {errors.length > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {errors.map((error) => (
                        <div key={error}>{error}</div>
                    ))}
                </div>
            )}

            <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="grid gap-5 md:grid-cols-2">
                    <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-semibold text-gray-700">License plate</label>
                        <input
                            type="text"
                            name="licensePlate"
                            value={form.licensePlate}
                            onChange={handleChange}
                            placeholder="43B-123.45"
                            className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-[#23a983] focus:ring-2 focus:ring-[#23a983]/20"
                            required
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-700">Seat capacity</label>
                        <input
                            type="number"
                            min="1"
                            name="seatCapacity"
                            value={form.seatCapacity}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-[#23a983] focus:ring-2 focus:ring-[#23a983]/20"
                            required
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-gray-700">Standing capacity</label>
                        <input
                            type="number"
                            min="0"
                            name="standingCapacity"
                            value={form.standingCapacity}
                            onChange={handleChange}
                            className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-[#23a983] focus:ring-2 focus:ring-[#23a983]/20"
                            required
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-semibold text-gray-700">Status</label>
                        <select
                            name="status"
                            value={form.status}
                            onChange={handleStatusChange}
                            className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-[#23a983] focus:ring-2 focus:ring-[#23a983]/20"
                        >
                            <option value="INACTIVE">Inactive</option>
                            <option value="ACTIVE">Active</option>
                            <option value="MAINTENANCE">Maintenance</option>
                        </select>
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-5">
                    <Link to="/admin/fleet-status" className="rounded-xl bg-gray-100 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-200">
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={saving}
                        className="rounded-xl bg-[#23a983] px-5 py-3 font-semibold text-white transition hover:bg-[#1b8c6c] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {saving ? 'Saving...' : 'Create Vehicle'}
                    </button>
                </div>
            </form>
        </div>
    )
}

export default AddVehicle
