import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'

import Dashboard from './pages/Dashboard'
import NewJob from './pages/NewJob'
import Candidates from './pages/Candidates'
import Results from './pages/Results'
import StudentDashboard from './pages/StudentDashboard'
import Chat from './pages/Chat'
import Login from './pages/Login'
import Signup from './pages/Signup'
import VerifyEmail from './pages/VerifyEmail'
import Settings from './pages/Settings'
import PrivacyPolicy from './pages/PrivacyPolicy'

type Page =
  | 'dashboard'
  | 'new-job'
  | 'candidates'
  | 'results'
  | 'analyze'
  | 'chat'
  | 'settings'

function AppContent() {
  const { user, loading, logout, pendingVerificationEmail } = useAuth()

  const [page, setPage] = useState<Page>('dashboard')
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [authView, setAuthView] = useState<'login' | 'signup'>('login')

  const [isExpanded, setIsExpanded] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)

  const navigate = (p: string, jobId?: string) => {
    setPage(p as Page)

    if (jobId) {
      setActiveJobId(jobId)
    }
  }

  /* LOADING */
  if (loading) {
    return (
      <div className="h-screen bg-[#121212] flex items-center justify-center overflow-hidden">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#ed4690] animate-bounce" />
          <div className="w-2 h-2 rounded-full bg-[#f58133] animate-bounce [animation-delay:0.15s]" />
          <div className="w-2 h-2 rounded-full bg-white animate-bounce [animation-delay:0.3s]" />
        </div>
      </div>
    )
  }

  /* PRIVACY */
  if (showPrivacy) {
    return <PrivacyPolicy onBack={() => setShowPrivacy(false)} />
  }

  /* AUTH */
  if (!user) {
    if (pendingVerificationEmail) {
      return <VerifyEmail onBackToLogin={() => setAuthView('login')} />
    }
    if (authView === 'signup') {
      return (
        <Signup
          onSwitchToLogin={() => setAuthView('login')}
          onSuccess={() => {}}
          onOpenPrivacy={() => setShowPrivacy(true)}
        />
      )
    }

    return (
      <Login
        onSwitchToSignup={() => setAuthView('signup')}
        onSuccess={() => {}}
        onOpenPrivacy={() => setShowPrivacy(true)}
      />
    )
  }

  const isStudent = user.role === 'student'

  return (
    <div className="flex h-screen bg-[#121212] text-white overflow-hidden relative">

      {/* BACKGROUND */}
      <svg
        className="absolute right-0 top-0 h-full w-[45%] pointer-events-none opacity-30"
        viewBox="0 0 600 900"
        fill="none"
      >
        <path
          d="M620 80C360 80 120 240 120 450C120 660 360 820 620 820"
          stroke="url(#gradient1)"
          strokeWidth="1.2"
        />

        <path
          d="M620 220C430 220 250 320 250 450C250 580 430 680 620 680"
          stroke="url(#gradient2)"
          strokeWidth="1"
        />

        <path
          d="M620 340C500 340 390 390 390 450C390 510 500 560 620 560"
          stroke="url(#gradient3)"
          strokeWidth="0.8"
        />

        <defs>
          <linearGradient id="gradient1" x1="120" y1="450" x2="620" y2="450">
            <stop stopColor="#ed4690" stopOpacity="0" />
            <stop offset="1" stopColor="#f58133" stopOpacity="0.7" />
          </linearGradient>

          <linearGradient id="gradient2" x1="250" y1="450" x2="620" y2="450">
            <stop stopColor="#ed4690" stopOpacity="0" />
            <stop offset="1" stopColor="#f58133" stopOpacity="0.4" />
          </linearGradient>

          <linearGradient id="gradient3" x1="390" y1="450" x2="620" y2="450">
            <stop stopColor="#ffffff" stopOpacity="0" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0.12" />
          </linearGradient>
        </defs>
      </svg>

      {/* SIDEBAR */}
      <aside
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        className={`shrink-0 border-r border-[#2c2c2e] bg-[#161616]/80 backdrop-blur-xl flex flex-col relative z-20 transition-all duration-300 ease-in-out ${
          isExpanded ? 'w-64' : 'w-20'
        }`}
      >

        {/* LOGO */}
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="px-5 py-7 border-b border-[#2c2c2e] cursor-pointer flex items-center"
        >
          <div className="flex items-center">

            <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-[#ed4690] to-[#f58133] flex items-center justify-center font-bold text-white shadow-lg mx-auto">
              R
            </div>

            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
                isExpanded
                  ? 'max-w-[150px] opacity-100 ml-3'
                  : 'max-w-0 opacity-0 ml-0'
              }`}
            >
              <h1 className="text-lg font-bold tracking-tight">
                RecruitAI
              </h1>

              <p className="text-[11px] text-gray-500">
                Intelligent Recruitment
              </p>
            </div>

          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 p-4 space-y-2 overflow-hidden">

          <NavBtn
            active={page === 'dashboard'}
            onClick={() => navigate('dashboard')}
            label="Dashboard"
            icon="◉"
            isExpanded={isExpanded}
          />

          <NavBtn
            active={page === 'chat'}
            onClick={() => navigate('chat')}
            label="AI Assistant"
            icon="✦"
            isExpanded={isExpanded}
          />

          {!isStudent && (
            <NavBtn
              active={page === 'new-job'}
              onClick={() => navigate('new-job')}
              label="New Job"
              icon="+"
              isExpanded={isExpanded}
            />
          )}

          {!isStudent && activeJobId && (
            <>
              <div
                className={`transition-all duration-300 ease-in-out ${
                  isExpanded
                    ? 'pt-6 pb-2 px-3 opacity-100 max-h-20'
                    : 'pt-4 pb-0 px-0 opacity-0 max-h-0 overflow-hidden'
                }`}
              >
                <p className="text-[10px] uppercase tracking-[0.3em] text-gray-600 whitespace-nowrap">
                  Current Job
                </p>
              </div>

              <NavBtn
                active={page === 'candidates'}
                onClick={() => navigate('candidates', activeJobId)}
                label="Candidates"
                icon="👥"
                isExpanded={isExpanded}
              />

              <NavBtn
                active={page === 'results'}
                onClick={() => navigate('results', activeJobId)}
                label="Results"
                icon="▣"
                isExpanded={isExpanded}
              />
            </>
          )}
        </nav>

        {/* USER */}
        <div className="p-4 border-t border-[#2c2c2e]">

          <div
            className={`transition-all duration-300 ${
              isExpanded ? 'p-3' : 'p-2'
            }`}
          >

            {/* USER INFO */}
            <div
              className={`flex items-center ${
                isExpanded ? '' : 'justify-center'
              }`}
            >

              {/* AVATAR */}
              <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-[#ed4690]/30 to-[#f58133]/30 border border-[#ed4690]/20 flex items-center justify-center font-semibold">
                {user.name.charAt(0).toUpperCase()}
              </div>

              {/* TEXT */}
              <div
                className={`transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
                  isExpanded
                    ? 'max-w-[150px] opacity-100 ml-3'
                    : 'max-w-0 opacity-0 ml-0'
                }`}
              >
                <p className="text-sm font-medium truncate">
                  {user.name}
                </p>

                <p className="text-xs text-gray-500">
                  {isStudent ? 'Candidate' : 'Recruiter'}
                </p>
              </div>
            </div>

            {/* SIGN OUT */}
            <button
              onClick={logout}
              className={`mt-3 w-full rounded-xl bg-gradient-to-r from-[#ed4690] to-[#f58133] py-2 text-sm font-medium text-white hover:opacity-90 transition-all duration-300 ${
                isExpanded
                  ? 'opacity-100'
                  : 'opacity-0 h-0 overflow-hidden p-0 mt-0'
              }`}
            >
              Sign Out
            </button>

          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 relative z-10 flex flex-col overflow-hidden">

        {/* TOPBAR */}
        <div className="backdrop-blur-xl bg-[#121212]/70 border-b border-[#2c2c2e] shrink-0">
          <div className="px-10 py-5 flex items-center justify-between">

            {/* TITLE */}
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                {page === 'dashboard' && 'Dashboard'}
                {page === 'chat' && 'AI Assistant'}
                {page === 'settings' && 'Settings'}
                {page === 'new-job' && 'Create New Job'}
                {page === 'candidates' && 'Candidates'}
                {page === 'results' && 'Results'}
              </h2>
            </div>

            {/* SETTINGS */}
            <button
              onClick={() => navigate('settings')}
              title="Settings"
              className={`p-2.5 rounded-lg border transition-all ${
                page === 'settings'
                  ? 'bg-[#1c1c1e] border-[#ed4690] text-[#ed4690]'
                  : 'bg-[#1c1c1e] border-[#2c2c2e] text-gray-400 hover:border-gray-500 hover:text-white'
              }`}
            >
              ⚙
            </button>

          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto px-6 py-6 scroll-smooth">

          <div className="w-full min-h-full">

            {page === 'chat' && <Chat />}

            {page === 'settings' && <Settings />}

            {isStudent && page === 'dashboard' && (
              <StudentDashboard />
            )}

            {!isStudent && page === 'dashboard' && (
              <Dashboard onNavigate={navigate} />
            )}

            {!isStudent && page === 'new-job' && (
              <NewJob onNavigate={navigate} />
            )}

            {!isStudent && page === 'candidates' && activeJobId && (
              <Candidates
                jobId={activeJobId}
                onNavigate={navigate}
              />
            )}

            {!isStudent && page === 'results' && activeJobId && (
              <Results jobId={activeJobId} />
            )}

            {!isStudent &&
              (page === 'candidates' || page === 'results') &&
              !activeJobId && (
                <div className="text-center">
                  <p className="text-gray-500 mb-6">
                    No job selected
                  </p>

                  <button
                    onClick={() => navigate('new-job')}
                    className="bg-gradient-to-r from-[#ed4690] to-[#f58133] px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity"
                  >
                    Create a Job
                  </button>
                </div>
              )}

          </div>
        </div>
      </main>
    </div>
  )
}

function NavBtn({
  active,
  onClick,
  label,
  icon,
  isExpanded
}: {
  active: boolean
  onClick: () => void
  label: string
  icon: React.ReactNode
  isExpanded: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center rounded-xl text-sm font-medium transition-all duration-300 ${
        active
          ? 'bg-gradient-to-r from-[#ed4690]/20 to-[#f58133]/10 border border-[#ed4690]/20 text-white'
          : 'text-gray-400 hover:text-white hover:bg-[#1c1c1e] border border-transparent'
      } ${
        isExpanded
          ? 'px-4 py-3 justify-start'
          : 'px-0 py-3 justify-center'
      }`}
      title={!isExpanded ? label : undefined}
    >
      <span className="text-lg flex items-center justify-center shrink-0 w-6">
        {icon}
      </span>

      <span
        className={`transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap ${
          isExpanded
            ? 'max-w-[150px] opacity-100 ml-3'
            : 'max-w-0 opacity-0 ml-0'
        }`}
      >
        {label}
      </span>
    </button>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}