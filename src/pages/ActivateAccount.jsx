import React, { useContext, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Col, Container, Form, Row, Spinner } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import AuthContext from '../context/AuthContext'
import { activateAccount, changePassword } from '../services/authService'

const getRedirectPath = (role) => {
  if (role === 'ADMIN' || role === 'STAFF') return '/admin/dashboard'
  if (role === 'DRIVER') return '/driver/schedule'
  if (role === 'CONDUCTOR') return '/conductor/schedule'
  return '/'
}

const ActivateAccount = () => {
  const navigate = useNavigate()
  const { token, userRole, activationRequired, completeActivation, logout } = useContext(AuthContext)
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const validationError = useMemo(() => {
    if (!form.newPassword) return ''
    if (form.newPassword.length < 6) return 'New password must be at least 6 characters.'
    if (form.confirmPassword && form.newPassword !== form.confirmPassword) {
      return 'Confirm password must match.'
    }
    return ''
  }, [form.confirmPassword, form.newPassword])

  const canSubmit = form.currentPassword && form.newPassword && form.confirmPassword && !validationError

  useEffect(() => {
    if (!token) {
      navigate('/', { replace: true })
    }
  }, [navigate, token])

  if (!token) return null

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!canSubmit) return

    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      await changePassword({
        oldPassword: form.currentPassword,
        newPassword: form.newPassword,
        isFirstLogin: false,
      })
      await activateAccount()
      completeActivation()
      setSuccess('Account activated successfully. Redirecting to dashboard...')
      window.setTimeout(() => {
        navigate(getRedirectPath(userRole), { replace: true })
      }, 1200)
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to activate account. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f2f7ff] via-white to-[#e8fff5] py-5">
      <Container>
        <Row className="justify-content-center">
          <Col lg={6} xl={5}>
            <Card className="border-0 shadow-lg rounded-4 overflow-hidden">
              <Card.Body className="p-4 p-md-5">
                <div className="mb-4">
                  <span className="inline-flex rounded-pill bg-[#ecfdf5] px-3 py-2 text-sm font-semibold text-[#047857]">
                    Staff Activation
                  </span>
                  <h1 className="mt-3 mb-2 text-3xl font-bold text-[#1f2937]">Activate your account</h1>
                  <p className="mb-0 text-gray-500">
                    Your account is not activated. Please change your password to activate.
                  </p>
                </div>

                {activationRequired ? (
                  <Alert variant="warning" className="rounded-3">
                    You must change your temporary password before accessing the system.
                  </Alert>
                ) : null}

                {error ? <Alert variant="danger" className="rounded-3">{error}</Alert> : null}
                {success ? <Alert variant="success" className="rounded-3">{success}</Alert> : null}

                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>Current password</Form.Label>
                    <Form.Control
                      type="password"
                      name="currentPassword"
                      value={form.currentPassword}
                      onChange={handleChange}
                      placeholder="Enter current password"
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>New password</Form.Label>
                    <Form.Control
                      type="password"
                      name="newPassword"
                      value={form.newPassword}
                      onChange={handleChange}
                      placeholder="Enter new password"
                      required
                    />
                    <Form.Text className="text-muted">Minimum 6 characters.</Form.Text>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Confirm password</Form.Label>
                    <Form.Control
                      type="password"
                      name="confirmPassword"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm new password"
                      required
                      isInvalid={!!validationError}
                    />
                    <Form.Control.Feedback type="invalid">
                      {validationError}
                    </Form.Control.Feedback>
                  </Form.Group>

                  <div className="d-grid gap-2">
                    <Button
                      type="submit"
                      variant="success"
                      disabled={!canSubmit || submitting}
                      className="rounded-3 py-3 fw-semibold"
                      style={{ backgroundColor: '#23a983', borderColor: '#23a983' }}
                    >
                      {submitting ? (
                        <span className="d-inline-flex align-items-center gap-2">
                          <Spinner size="sm" animation="border" />
                          Activating...
                        </span>
                      ) : (
                        'Activate Account'
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="outline-secondary"
                      className="rounded-3"
                      onClick={() => {
                        logout()
                        navigate('/', { replace: true })
                      }}
                    >
                      Back to login
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  )
}

export default ActivateAccount
