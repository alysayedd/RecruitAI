import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import NewJob from './pages/NewJob'
import Candidates from './pages/Candidates'
import Results from './pages/Results'

type Page = 'dashboard' | 'new-job' | 'candidates' | 'results'

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const [activeJobId, setActiveJobId] = useState<string | null>(null)

  const navigate = (p: string, jobId?: string) => {
    setPage(p as Page)
    if (jobId) setActiveJobId(jobId)
  }

  const navItems: { page: Page; label: string; icon: string }[] = [
    { page: 'dashboard', label: 'Dashboard', icon: '⊞' },
    { page: 'new-job', label: 'New Job', icon: '+' },
  ]

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-navy-800 border-r border-white/10 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-sm font-bold">R</div>
            <div>
              <p className="font-bold text-sm leading-tight">RecruitAI</p>
              <p className="text-white/30 text-xs">Bias-Aware Screening</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <button
              key={item.page}
              onClick={() => navigate(item.page)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                page === item.page
                  ? 'bg-accent/20 text-accent'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="w-5 text-center">{item.icon}</span>
              {item.label}
            </button>
          ))}

          {activeJobId && (
            <>
              <div className="pt-3 pb-1">
                <p className="text-xs text-white/20 uppercase tracking-wider px-3">Current Job</p>
              </div>
              <button
                onClick={() => navigate('candidates', activeJobId)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  page === 'candidates' ? 'bg-accent/20 text-accent' : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="w-5 text-center">👥</span>
                Candidates
              </button>
              <button
                onClick={() => navigate('results', activeJobId)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  page === 'results' ? 'bg-accent/20 text-accent' : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="w-5 text-center">📊</span>
                Results
              </button>
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs text-white/30">Ollama running</span>
          </div>
          <p className="text-xs text-white/20 mt-1">llama3.2 · Free model</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-8 py-8">
          {page === 'dashboard' && <Dashboard onNavigate={navigate} />}
          {page === 'new-job' && <NewJob onNavigate={navigate} />}
          {page === 'candidates' && activeJobId && (
            <Candidates jobId={activeJobId} onNavigate={navigate} />
          )}
          {page === 'results' && activeJobId && (
            <Results jobId={activeJobId} />
          )}
          {(page === 'candidates' || page === 'results') && !activeJobId && (
            <div className="text-center py-20">
              <p className="text-white/30 text-lg">No job selected.</p>
              <button onClick={() => navigate('new-job')} className="btn-primary mt-4">Create a Job</button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
