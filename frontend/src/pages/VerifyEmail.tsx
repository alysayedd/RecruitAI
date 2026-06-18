import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

interface Props {
  onBackToLogin: () => void
}

export default function VerifyEmail({ onBackToLogin }: Props) {
  const { pendingVerificationEmail, devVerificationCode, verifyEmail, resendCode, clearPendingVerification } = useAuth()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true); setError(''); setInfo('')
    try {
      await verifyEmail(code.trim())
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const resend = async () => {
    setLoading(true); setError(''); setInfo('')
    try {
      await resendCode()
      setInfo('A new code has been generated.')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to resend code')
    } finally {
      setLoading(false)
    }
  }

  const back = () => {
    clearPendingVerification()
    onBackToLogin()
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold mb-2">Verify Your Email</h1>
        <p className="text-gray-400 mb-6">
          We sent a 6-digit code to <span className="text-white">{pendingVerificationEmail}</span>.
        </p>

        {devVerificationCode && (
          <div className="mb-6 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-4">
            <div className="text-yellow-300 text-sm font-semibold mb-1">
              Couldn&apos;t deliver email — use this code instead
            </div>
            <div className="text-gray-300 text-sm mb-2">Your verification code is:</div>
            <div className="text-2xl tracking-widest font-mono text-white bg-black/30 rounded px-3 py-2 select-all">
              {devVerificationCode}
            </div>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="w-full text-center text-2xl tracking-widest font-mono bg-[#1e1e1e] border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-pink-500"
          />

          {error && <div className="text-red-400 text-sm">{error}</div>}
          {info && <div className="text-green-400 text-sm">{info}</div>}

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full bg-gradient-to-r from-pink-500 to-orange-400 text-white font-semibold py-3 rounded-lg disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>

        <div className="mt-6 flex justify-between text-sm">
          <button onClick={resend} disabled={loading} className="text-pink-400 hover:text-pink-300">
            Resend code
          </button>
          <button onClick={back} className="text-gray-400 hover:text-white">
            Back to login
          </button>
        </div>
      </div>
    </div>
  )
}
