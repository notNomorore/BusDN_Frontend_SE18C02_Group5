import React from 'react'
import { FaRoute, FaBus, FaExclamationTriangle, FaMoneyBillWave, FaMapMarkerAlt, FaMap } from 'react-icons/fa'

const statCards = [
  {
    title: 'Tong tuyen',
    value: '12',
    icon: <FaRoute className="text-5xl opacity-30" />,
    classes: 'from-blue-500 to-blue-700 text-white',
  },
  {
    title: 'Xe dang chay',
    value: '45/50',
    icon: <FaBus className="text-5xl opacity-30" />,
    classes: 'from-green-500 to-[#23a983] text-white',
  },
  {
    title: 'Canh bao',
    value: '2',
    icon: <FaExclamationTriangle className="text-5xl opacity-20" />,
    classes: 'from-yellow-400 to-yellow-500 text-yellow-900',
  },
  {
    title: 'Doanh thu hom nay',
    value: '12.5 tr',
    icon: <FaMoneyBillWave className="text-5xl opacity-30" />,
    classes: 'from-purple-500 to-purple-700 text-white',
  },
]

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <div className="admin-page-head">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Dashboard Tong Quan</h1>
          <p className="mt-1 text-sm text-gray-500">Theo doi nhanh hoat dong van hanh trong ngay.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.title}
            className={`rounded-2xl bg-gradient-to-br p-5 shadow-[0_2px_8px_rgba(0,0,0,0.05)] ${card.classes}`}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.18em] opacity-80">{card.title}</p>
                <h2 className="mt-2 text-3xl font-bold">{card.value}</h2>
              </div>
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="admin-surface xl:col-span-2">
          <div className="px-6 pt-6">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
              <FaMapMarkerAlt className="text-red-500" />
              Giam sat doi xe
            </h2>
            <p className="mt-1 text-sm text-gray-500">Ban do theo doi fleet theo thoi gian thuc.</p>
          </div>
          <div className="mt-5 flex min-h-[420px] items-center justify-center rounded-b-2xl bg-[#f4f6f8] text-gray-400">
            <div className="px-6 text-center">
              <FaMap className="mx-auto mb-4 text-6xl opacity-50" />
              <p className="font-medium">Khu vuc hien thi ban do so va vi tri xe theo thoi gian thuc</p>
              <p className="mt-2 text-sm opacity-75">Tich hop tu React Leaflet</p>
            </div>
          </div>
        </section>

        <section className="admin-surface overflow-hidden">
          <div className="px-6 pt-6">
            <h2 className="text-lg font-bold text-gray-800">Trang thai chuyen gan nhat</h2>
            <p className="mt-1 text-sm text-gray-500">Cap nhat nhanh tinh trang xe va su co.</p>
          </div>
          <ul className="mt-5 divide-y divide-gray-100 text-sm">
            <li className="px-6 py-4 transition-colors hover:bg-gray-50">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold text-gray-800">
                  <span className="mr-2 rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">R16</span>
                  43B-123.45
                </div>
                <span className="font-medium text-green-600">Dang chay (40km/h)</span>
              </div>
            </li>
            <li className="px-6 py-4 transition-colors hover:bg-gray-50">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold text-gray-800">
                  <span className="mr-2 rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">R05</span>
                  43B-999.88
                </div>
                <span className="font-medium text-yellow-600">Sap ve ben</span>
              </div>
            </li>
            <li className="px-6 py-4 transition-colors hover:bg-gray-50">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold text-gray-800">
                  <span className="mr-2 rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-700">R11</span>
                  43B-567.99
                </div>
                <span className="font-bold text-red-600">Mat tin hieu GPS</span>
              </div>
            </li>
            <li className="px-6 py-4 transition-colors hover:bg-gray-50">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold text-gray-800">
                  <span className="mr-2 rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">R16</span>
                  43B-111.22
                </div>
                <span className="font-medium text-green-600">Dang chay (35km/h)</span>
              </div>
            </li>
            <li className="px-6 py-4 transition-colors hover:bg-gray-50">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold text-gray-800">
                  <span className="mr-2 rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">R12</span>
                  43B-444.22
                </div>
                <span className="font-medium text-yellow-600">Dang chuan bi</span>
              </div>
            </li>
            <li className="px-6 py-4 transition-colors hover:bg-gray-50">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold text-gray-800">
                  <span className="mr-2 rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">R02</span>
                  43B-666.22
                </div>
                <span className="font-medium text-green-600">Dang chay (30km/h)</span>
              </div>
            </li>
          </ul>
        </section>
      </div>
    </div>
  )
}

export default Dashboard
