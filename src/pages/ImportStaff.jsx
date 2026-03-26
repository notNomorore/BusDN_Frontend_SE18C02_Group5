import React, { useState } from 'react'
import { FaDownload, FaFileImport, FaUpload, FaCheckCircle, FaTimesCircle, FaPhone, FaKey } from 'react-icons/fa'
import { importStaff } from '../services/staffService'

const downloadTemplate = () => {
  const csvContent = 'fullName,email,phone,role\nNguyen Van A,driver1@example.com,0901234567,DRIVER\nTran Thi B,conductor1@example.com,0907654321,CONDUCTOR\n'
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', 'staff-import-template.csv')
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const ImportStaff = () => {
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null
    if (!file) { setSelectedFile(null); return }
    if (!/\.(xlsx|csv)$/i.test(file.name)) {
      setSelectedFile(null)
      setError('Vui lòng chọn file .xlsx hoặc .csv hợp lệ.')
      return
    }
    setSelectedFile(file)
    setError('')
    setResult(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedFile) { setError('Vui lòng chọn file trước khi import.'); return }
    setUploading(true)
    setError('')
    setResult(null)
    try {
      const data = await importStaff(selectedFile)
      setResult(data)
      setSelectedFile(null)
      e.target.reset()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Import thất bại.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-gray-200 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Import nhân viên hàng loạt</h1>
          <p className="mt-1 text-sm text-gray-500">Tải lên file Excel hoặc CSV để tạo nhiều tài khoản cùng lúc. Hệ thống sẽ tự gửi email thông tin đăng nhập.</p>
        </div>
        <button
          onClick={downloadTemplate}
          className="inline-flex items-center gap-2 rounded-xl border border-[#23a983] px-4 py-2.5 font-semibold text-[#23a983] transition hover:bg-[#f3fffa]"
        >
          <FaDownload /> Tải template mẫu
        </button>
      </div>

      {/* Upload card */}
      <div className="rounded-2xl border-0 bg-white p-6 shadow-sm lg:p-8">
        {error ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            <FaTimesCircle /> {error}
          </div>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Info */}
          <div className="flex flex-col justify-center rounded-2xl border-2 border-dashed border-[#cdeedd] bg-[#f8fffb] p-6">
            <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#23a983] text-white">
              <FaFileImport size={20} />
            </div>
            <h2 className="mb-2 text-lg font-bold text-gray-800">Định dạng file</h2>
            <p className="mb-3 text-sm text-gray-500">Chấp nhận <strong>.xlsx</strong> và <strong>.csv</strong>. File cần có các cột:</p>
            <div className="space-y-1 text-sm">
              {[
                ['fullName', 'Họ tên nhân viên (bắt buộc)'],
                ['email', 'Email (tùy chọn, dùng để gửi thông tin đăng nhập)'],
                ['phone', 'Số điện thoại (tùy chọn)'],
                ['role', 'DRIVER hoặc CONDUCTOR (bắt buộc)'],
              ].map(([col, desc]) => (
                <div key={col} className="flex items-start gap-2">
                  <code className="rounded bg-[#e8f5f0] px-1.5 py-0.5 text-xs text-[#23a983]">{col}</code>
                  <span className="text-gray-500">{desc}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-amber-600">Cần ít nhất email hoặc SĐT cho mỗi dòng.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col justify-center space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Chọn file</label>
              <input
                type="file"
                accept=".xlsx,.csv"
                onChange={handleFileChange}
                disabled={uploading}
                className="w-full rounded-xl border border-gray-200 bg-[#f8fafc] px-4 py-2.5 text-sm outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-[#23a983] file:px-3 file:py-1 file:text-sm file:font-semibold file:text-white"
              />
            </div>

            {selectedFile ? (
              <div className="rounded-xl border bg-gray-50 px-4 py-3">
                <p className="font-semibold text-gray-800 text-sm">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">{Math.ceil(selectedFile.size / 1024)} KB</p>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#23a983] py-3 font-semibold text-white transition hover:bg-[#1bbd8f] disabled:opacity-50"
            >
              {uploading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Đang import...
                </span>
              ) : (
                <><FaUpload /> Import</>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Result */}
      {result ? (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-4 rounded-2xl bg-green-50 px-5 py-4">
              <FaCheckCircle className="text-green-500" size={28} />
              <div>
                <p className="text-2xl font-bold text-green-700">{result.imported ?? 0}</p>
                <p className="text-sm text-green-600">Tài khoản đã tạo thành công</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-2xl bg-red-50 px-5 py-4">
              <FaTimesCircle className="text-red-400" size={28} />
              <div>
                <p className="text-2xl font-bold text-red-600">{result.failed ?? 0}</p>
                <p className="text-sm text-red-500">Dòng thất bại</p>
              </div>
            </div>
          </div>

          {/* Failures */}
          {result.failures?.length > 0 ? (
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h3 className="mb-3 font-bold text-gray-800">Chi tiết lỗi</h3>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {result.failures.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                    <FaTimesCircle className="mt-0.5 flex-shrink-0" />
                    <span><strong>Dòng {f.row}:</strong> {f.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Phone-only accounts */}
          {result.phoneOnlyAccounts?.length > 0 ? (
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h3 className="mb-1 font-bold text-gray-800">Tài khoản chỉ có SĐT</h3>
              <p className="mb-3 text-sm text-gray-500">Các tài khoản này không có email. Lưu lại thông tin để gửi thủ công qua Zalo/SMS.</p>
              <div className="space-y-2">
                {result.phoneOnlyAccounts.map((acc, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-3 rounded-xl border bg-amber-50 px-4 py-3 text-sm">
                    <span className="font-semibold text-gray-800">{acc.fullName}</span>
                    <span className="flex items-center gap-1 text-gray-500"><FaPhone size={11} /> {acc.phone}</span>
                    <span className="flex items-center gap-1 text-amber-700"><FaKey size={11} /> <span className="font-mono">{acc.password}</span></span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{acc.role}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default ImportStaff
