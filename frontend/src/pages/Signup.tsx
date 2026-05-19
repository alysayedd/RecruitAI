import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

interface Props {
  onSwitchToLogin: () => void
  onSuccess: () => void
  onOpenPrivacy: () => void
}

export default function Signup({
  onSwitchToLogin,
  onSuccess,
  onOpenPrivacy,
}: Props) {
  const { signup } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] =
    useState('')
  const [password, setPassword] =
    useState('')
  const [role, setRole] =
    useState<'student' | 'hr'>('hr')

  const [error, setError] =
    useState('')
  const [loading, setLoading] =
    useState(false)

  const [showPassword, setShowPassword] =
    useState(false)

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault()

    if (
      !name.trim() ||
      !email.trim() ||
      !password
    )
      return

    setLoading(true)
    setError('')

    try {
      await signup(
        name,
        email,
        password,
        role
      )

      onSuccess()
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          'Signup failed'
      )
    } finally {
      setLoading(false)
    }
  }

  const roleInfo = {
    hr: {
      title: 'Recruiter / HR',
      desc: 'Analyze resumes and build AI-powered candidate shortlists.',
    },

    student: {
      title: 'Candidate',
      desc: 'Match your CV against jobs and improve with AI feedback.',
    },
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-[#121212] font-sans text-white">

      {/* SAME BACKGROUND */}

      {/* NAVBAR */}
      <nav className="flex justify-between items-center w-full px-8 py-6 relative z-10">

        <div>

          <div className="text-2xl font-bold tracking-tighter">
            RecruitAI.
          </div>

          <p className="text-xs text-gray-500 mt-1">
            Intelligent Recruitment Platform
          </p>

        </div>

        <button
          onClick={onSwitchToLogin}
          className="bg-gradient-to-r from-[#ed4690] to-[#f58133] px-6 py-2 rounded-md text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg"
        >
          Sign In
        </button>

      </nav>

      {/* MAIN */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 relative z-10 w-full max-w-5xl mx-auto">

        <div className="text-center mb-10">

          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Create Your RecruitAI Workspace
          </h1>

          <p className="text-gray-400 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
            Start screening candidates intelligently
            or improve your CV using AI-powered analysis.
          </p>

        </div>

        <div className="flex flex-col md:flex-row items-center gap-10 md:gap-14 w-full justify-center">

          {/* FORM */}
          <form
            onSubmit={handleSubmit}
            className="flex flex-col w-full max-w-[340px] space-y-3.5"
          >

            {/* Roles */}
            <div className="grid grid-cols-2 gap-3 mb-1">

              {(
                ['hr', 'student'] as const
              ).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() =>
                    setRole(r)
                  }
                  className={`relative p-3 rounded-md border text-left transition-all duration-200 ${
                    role === r
                      ? 'border-[#ed4690] bg-[#1c1c1e]'
                      : 'border-[#2c2c2e] bg-[#121212]'
                  }`}
                >

                  <p className="text-xs font-semibold text-white">
                    {
                      roleInfo[r]
                        .title
                    }
                  </p>

                  <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                    {
                      roleInfo[r]
                        .desc
                    }
                  </p>

                </button>
              ))}

            </div>

            <input
              type="text"
              className="w-full bg-[#1c1c1e] border border-[#2c2c2e] text-white text-sm rounded-md px-4 py-3.5 focus:outline-none focus:border-[#ed4690] transition-colors"
              placeholder="Full Name"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              required
            />

            <input
              type="email"
              className="w-full bg-[#1c1c1e] border border-[#2c2c2e] text-white text-sm rounded-md px-4 py-3.5 focus:outline-none focus:border-[#ed4690] transition-colors"
              placeholder="Email Address"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
            />

            <div className="relative">

              <input
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                className="w-full bg-[#1c1c1e] border border-[#2c2c2e] text-white text-sm rounded-md px-4 py-3.5 focus:outline-none focus:border-[#ed4690] transition-colors pr-12"
                placeholder="Password"
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                required
                minLength={6}
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    !showPassword
                  )
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                👁
              </button>

            </div>

            {error && (
              <p className="text-red-500 text-xs font-medium">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-[#ed4690] to-[#f58133] text-white py-3.5 rounded-md font-semibold text-sm flex justify-between items-center px-6 hover:opacity-90 transition-opacity"
            >

              <span>
                {loading
                  ? 'Creating...'
                  : 'Create Workspace'}
              </span>

            </button>

          </form>

        </div>

      </main>

      {/* Footer */}
      <footer className="w-full flex justify-between px-8 py-6 text-xs text-gray-500 font-medium relative z-10">

        <button
          onClick={onOpenPrivacy}
          className="hover:text-gray-300 transition-colors"
        >
          Privacy Policy
        </button>

        <p>
          © 2026 RecruitAI. All rights reserved.
        </p>

      </footer>

    </div>
  )
}