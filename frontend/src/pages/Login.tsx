import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

interface Props {
  onSwitchToSignup: () => void
  onSuccess: () => void
  onOpenPrivacy: () => void
}

export default function Login({
  onSwitchToSignup,
  onSuccess,
  onOpenPrivacy,
}: Props) {
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim() || !password) return

    setLoading(true)
    setError('')

    try {
      await login(email, password)
      onSuccess()
    } catch (err: any) {
      setError(
        err?.response?.data?.detail || 'Invalid email or password'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-[#121212] font-sans text-white">


      {/* NAVBAR */}
      <nav className="flex justify-between items-center w-full px-8 py-6 relative z-10">
        {/* Logo */}
        <div>
          <div className="text-2xl font-bold tracking-tighter">
            RecruitAI.
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Intelligent Recruitment Platform
          </p>
        </div>
        {/* Right */}
        <button
          onClick={onSwitchToSignup}
          className="bg-gradient-to-r from-[#ed4690] to-[#f58133] px-6 py-2 rounded-md text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg"
        >
          Create Account
        </button>
      </nav>

      {/* MAIN */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 relative z-10 w-full max-w-5xl mx-auto -mt-10">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Welcome Back to RecruitAI
          </h1>
          <p className="text-gray-400 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
            Manage candidates, analyze resumes with AI, and streamline your hiring workflow.
          </p>
        </div>

        {/* Content Container - Changed to a single centered column */}
        <div className="flex flex-col items-center w-full max-w-[340px]">
          {/* LOGIN FORM */}
          <form onSubmit={handleSubmit} className="flex flex-col w-full space-y-4">
            {/* Email */}
            <input
              type="email"
              className="w-full bg-[#1c1c1e] border border-[#2c2c2e] text-white text-sm rounded-md px-4 py-4 focus:outline-none focus:border-[#ed4690] transition-colors"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {/* Password */}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full bg-[#1c1c1e] border border-[#2c2c2e] text-white text-sm rounded-md px-4 py-4 focus:outline-none focus:border-[#ed4690] transition-colors pr-12"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                )}
              </button>
            </div>

            {/* Error */}
            {error && (
              <p className="text-red-500 text-xs font-medium">{error}</p>
            )}

            {/* Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#ed4690] to-[#f58133] text-white py-4 rounded-md font-semibold text-sm flex justify-between items-center px-6 hover:opacity-90 transition-opacity"
            >
              <span>{loading ? 'Logging in...' : 'Access Dashboard'}</span>
              {!loading && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center w-full my-6">
            <div className="flex-1 border-t border-[#2c2c2e]"></div>
            <span className="px-3 text-xs text-gray-500 font-medium tracking-wide">OR CONTINUE WITH</span>
            <div className="flex-1 border-t border-[#2c2c2e]"></div>
          </div>

          {/* Socials - Stacked under inputs */}
          <div className="flex flex-col w-full space-y-3.5">
            <button className="w-full flex items-center justify-center bg-[#121212] border border-[#2c2c2e] rounded-md py-3.5 px-6 text-sm font-medium hover:bg-[#1c1c1e] transition-colors group">
              <svg className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </button>

            <button className="w-full flex items-center justify-center bg-[#121212] border border-[#2c2c2e] rounded-md py-3.5 px-6 text-sm font-medium hover:bg-[#1c1c1e] transition-colors group">
              <svg className="w-5 h-5 mr-3 text-[#0a66c2] group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              LinkedIn
            </button>

            <button className="w-full flex items-center justify-center bg-[#121212] border border-[#2c2c2e] rounded-md py-3.5 px-6 text-sm font-medium hover:bg-[#1c1c1e] transition-colors group">
              <svg className="w-5 h-5 mr-3 text-white group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub
            </button>
          </div>
        </div>

        {/* Footer Link */}
        <div className="mt-10 text-center w-full z-10">
          <button className="text-gray-400 hover:text-white text-sm font-medium transition-colors underline-offset-4 hover:underline">
            Forgot Password?
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full flex justify-between px-8 py-6 text-xs text-gray-500 font-medium relative z-10">
        <button onClick={onOpenPrivacy} className="hover:text-gray-300 transition-colors">
          Privacy Policy
        </button>
        <p>© 2026 RecruitAI. All rights reserved.</p>
      </footer>
    </div>
  )
}