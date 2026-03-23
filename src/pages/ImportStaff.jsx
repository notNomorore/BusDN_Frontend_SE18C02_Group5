import React, { useState } from 'react'
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap'
import { FaDownload, FaFileImport, FaUpload } from 'react-icons/fa'
import { importStaff } from '../services/staffService'

const acceptedTypes = '.xlsx,.csv'

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

const extractImportMessage = (data) => {
  if (data?.message) return data.message
  if (typeof data === 'string') return data
  if (typeof data?.success === 'string') return data.success
  return 'Import completed successfully.'
}

const extractAddedCount = (data) => {
  const text = JSON.stringify(data || {})
  const match = text.match(/import(?:ed)?\s+(\d+)/i) || text.match(/(\d+)\s+records?\s+added/i)
  return match ? Number(match[1]) : null
}

const ImportStaff = () => {
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null
    if (!file) {
      setSelectedFile(null)
      return
    }

    const isValidType = /\.(xlsx|csv)$/i.test(file.name)
    if (!isValidType) {
      setSelectedFile(null)
      setError('Please select a valid .xlsx or .csv file.')
      setSuccess('')
      return
    }

    setSelectedFile(file)
    setError('')
    setSuccess('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!selectedFile) {
      setError('Please choose a file before importing.')
      setSuccess('')
      return
    }

    setUploading(true)
    setError('')
    setSuccess('')

    try {
      const data = await importStaff(selectedFile)
      const addedCount = extractAddedCount(data)
      const baseMessage = addedCount !== null
        ? `Import successful: ${addedCount} records added`
        : extractImportMessage(data)

      setSuccess(baseMessage)
      setSelectedFile(null)
      event.target.reset()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Import failed.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-gray-200 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Import Staff</h1>
          <p className="mt-1 text-sm text-gray-500">Upload an Excel or CSV file to create staff accounts in bulk.</p>
        </div>
        <Button
          variant="outline-success"
          className="rounded-3 fw-semibold"
          style={{ borderColor: '#23a983', color: '#23a983' }}
          onClick={downloadTemplate}
        >
          <FaDownload className="me-2" />
          Download Template
        </Button>
      </div>

      <Card className="border-0 shadow-sm rounded-4">
        <Card.Body className="p-4 p-lg-5">
          {error ? <Alert variant="danger" className="rounded-3">{error}</Alert> : null}
          {success ? <Alert variant="success" className="rounded-3">{success}</Alert> : null}

          <Row className="g-4 align-items-center">
            <Col lg={7}>
              <div className="rounded-4 border border-dashed border-2 border-[#cdeedd] bg-[#f8fffb] p-4 p-lg-5">
                <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-circle bg-[#23a983] text-white">
                  <FaFileImport size={20} />
                </div>
                <h2 className="mb-2 text-xl font-bold text-gray-800">Bulk import staff accounts</h2>
                <p className="mb-0 text-sm text-gray-500">
                  Accepted formats: <strong>.xlsx</strong> and <strong>.csv</strong>. The file should contain
                  <code className="ms-1">fullName</code>, <code className="ms-1">email</code>, <code className="ms-1">phone</code>,
                  and <code className="ms-1">role</code>.
                </p>
              </div>
            </Col>

            <Col lg={5}>
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold">Staff file</Form.Label>
                  <Form.Control
                    type="file"
                    accept={acceptedTypes}
                    onChange={handleFileChange}
                    disabled={uploading}
                  />
                  <Form.Text className="text-muted">
                    Upload one spreadsheet at a time.
                  </Form.Text>
                </Form.Group>

                {selectedFile ? (
                  <Alert variant="light" className="rounded-3 border">
                    <div className="fw-semibold text-dark">{selectedFile.name}</div>
                    <div className="small text-muted">{Math.ceil(selectedFile.size / 1024)} KB</div>
                  </Alert>
                ) : null}

                <div className="d-grid">
                  <Button
                    type="submit"
                    variant="success"
                    disabled={uploading || !selectedFile}
                    className="rounded-3 py-3 fw-semibold"
                    style={{ backgroundColor: '#23a983', borderColor: '#23a983' }}
                  >
                    {uploading ? (
                      <span className="d-inline-flex align-items-center gap-2">
                        <Spinner size="sm" animation="border" />
                        Importing...
                      </span>
                    ) : (
                      <>
                        <FaUpload className="me-2" />
                        Import
                      </>
                    )}
                  </Button>
                </div>
              </Form>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </div>
  )
}

export default ImportStaff
