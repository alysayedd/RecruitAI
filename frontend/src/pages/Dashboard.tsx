import { useEffect, useState } from 'react'
import { getHRStats } from '../api/client'
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, RadialBarChart, RadialBar, LabelList 
} from 'recharts'

interface Props { onNavigate: (page: string, jobId?: string) => void }

interface HRStats {
  total_jobs: number
  jobs_completed: number
  jobs_running: number
  jobs_ready: number
  jobs_error: number
  total_candidates: number
  total_shortlisted: number
  average_bias_score: number
  recent_jobs: { id: string; title: string; status: string }[]
}

const statusStyle: Record<string, string> = {
  complete: 'bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider',
  running: 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider',
  error: 'bg-[#f43f5e]/10 text-[#f43f5e] border border-[#f43f5e]/20 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider',
  ready: 'bg-[#06b6d4]/10 text-[#06b6d4] border border-[#06b6d4]/20 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider',
}

const CHART_COLORS = { complete: '#22c55e', running: '#f59e0b', ready: '#06b6d4', error: '#f43f5e' }

const StatCard = ({ label, value, sub, colorHex }: { label: string; value: number; sub: string; colorHex?: string }) => (
  <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-5 flex flex-col relative overflow-hidden transition-all hover:border-gray-600/50">
    <p className="text-gray-400 text-sm font-medium mb-1">{label}</p>
    <p className="text-3xl font-bold text-white mb-1" style={{ color: colorHex || '#fff' }}>{value}</p>
    <p className="text-xs text-gray-500">{sub}</p>
  </div>
)

export default function Dashboard({ onNavigate }: Props) {
  const [stats, setStats] = useState<HRStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getHRStats().then(setStats).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-[#ed4690] rounded-full animate-bounce" />
        <div className="w-2 h-2 bg-[#f58133] rounded-full animate-bounce [animation-delay:0.15s]" />
        <div className="w-2 h-2 bg-[#ed4690] rounded-full animate-bounce [animation-delay:0.3s]" />
      </div>
    </div>
  )

  const jobsByStatus = [
    { name: 'Completed', value: stats?.jobs_completed ?? 0, fill: CHART_COLORS.complete },
    { name: 'Running', value: stats?.jobs_running ?? 0, fill: CHART_COLORS.running },
    { name: 'Ready', value: stats?.jobs_ready ?? 0, fill: CHART_COLORS.ready },
    { name: 'Error', value: stats?.jobs_error ?? 0, fill: CHART_COLORS.error },
  ].filter(d => d.value > 0)

  const candidateData = [
    { name: 'Candidates', value: stats?.total_candidates ?? 0, fill: '#ed4690' },
    { name: 'Shortlisted', value: stats?.total_shortlisted ?? 0, fill: '#f58133' },
  ]

  const biasData = [{
    name: 'Bias',
    value: stats?.average_bias_score ?? 0,
    fill: (stats?.average_bias_score ?? 0) < 20 ? '#22c55e' : (stats?.average_bias_score ?? 0) < 50 ? '#f59e0b' : '#f43f5e',
  }]

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-[#121212] border border-[#2c2c2e] rounded-lg px-3 py-2 shadow-xl">
          {payload[0].payload.name && <p className="text-xs text-gray-400 mb-0.5">{payload[0].payload.name}</p>}
          <p className="text-sm font-medium text-white">{payload[0].value}</p>
        </div>
      )
    }
    return null
  }

  // Custom label renderer for the Pie chart to match colors and keep it clean
  const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value, index }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 15;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill={candidateData[index].fill} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12} fontWeight="bold">
        {value}
      </text>
    );
  };

  return (
    <div className="w-full space-y-8 animate-fade-in text-white">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Your recruitment overview</p>
        </div>
        <button 
          onClick={() => onNavigate('new-job')} 
          className="bg-gradient-to-r from-[#ed4690] to-[#f58133] text-white px-6 py-2.5 rounded-md font-semibold text-sm flex items-center gap-2 hover:opacity-90 transition-opacity shadow-lg w-fit"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
          New Job
        </button>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Jobs" value={stats?.total_jobs ?? 0} sub="all time" />
        <StatCard label="Completed" value={stats?.jobs_completed ?? 0} colorHex="#22c55e" sub="screened" />
        <StatCard label="Running" value={stats?.jobs_running ?? 0} colorHex="#f59e0b" sub="in progress" />
        <StatCard label="Ready" value={stats?.jobs_ready ?? 0} colorHex="#06b6d4" sub="awaiting" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Jobs by Status Chart */}
        <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Jobs by Status</h3>
          {stats && (stats.jobs_completed + stats.jobs_running + stats.jobs_ready + stats.jobs_error) > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={jobsByStatus} margin={{ top: 15, right: 0, bottom: 0, left: -15 }}>
                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#2c2c2e' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={36}>
                  {jobsByStatus.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  {/* Default visible values above bars */}
                  <LabelList dataKey="value" position="top" fill="#d1d5db" fontSize={11} fontWeight="bold" offset={8} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[180px] text-gray-600 text-sm">No data</div>
          )}
        </div>

        {/* Candidates Chart */}
        <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Candidates Overview</h3>
          {stats && (stats.total_candidates + stats.total_shortlisted) > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie 
                  data={candidateData} 
                  cx="50%" cy="50%" 
                  innerRadius={50} outerRadius={72} 
                  paddingAngle={4} dataKey="value" stroke="none"
                  labelLine={false}
                  label={renderPieLabel} // Default visible values around the pie
                >
                  {candidateData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[180px] text-gray-600 text-sm">No data</div>
          )}
        </div>

        {/* Bias Score Chart */}
        <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-5 relative">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Avg Bias Score</h3>
          {stats ? (
            <div className="relative h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" barSize={16} data={biasData} startAngle={180} endAngle={0}>
                  <RadialBar dataKey="value" cornerRadius={8} />
                  <Tooltip content={<CustomTooltip />} />
                </RadialBarChart>
              </ResponsiveContainer>
              {/* Default visible value perfectly centered in the radial chart */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none mt-2">
                <span className="text-2xl font-bold text-white">{stats.average_bias_score}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[180px] text-gray-600 text-sm">No data</div>
          )}
          <p className="text-center text-xs text-gray-500 absolute bottom-4 left-0 w-full">Lower is better</p>
        </div>
      </div>

      {/* Mid Stat Cards */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Total Candidates" value={stats?.total_candidates ?? 0} sub="across all jobs" />
        <StatCard label="Total Shortlisted" value={stats?.total_shortlisted ?? 0} colorHex="#f58133" sub="by AI ranking" />
      </div>

      {/* Recent Jobs List */}
      <div className="bg-[#1c1c1e] border border-[#2c2c2e] rounded-xl p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-lg text-white">Recent Jobs</h2>
        </div>

        {(!stats?.recent_jobs || stats.recent_jobs.length === 0) ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-[#121212] border border-[#2c2c2e] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
            </div>
            <p className="text-gray-400 text-sm mb-4">You haven't created any jobs yet</p>
            <button 
              onClick={() => onNavigate('new-job')} 
              className="bg-[#2c2c2e] hover:bg-[#3a3a3c] text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Create your first job
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {stats.recent_jobs.map((job, i) => (
              <div key={job.id}
                onClick={() => onNavigate('candidates', job.id)}
                className="flex items-center justify-between p-4 rounded-lg bg-[#121212] border border-[#2c2c2e] hover:border-gray-600/60 cursor-pointer transition-all duration-200 group animate-slide-up"
                style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-200 group-hover:text-white transition-colors truncate">{job.title}</p>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">ID: {job.id.slice(0, 8)}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={statusStyle[job.status.toLowerCase()] || 'bg-gray-500/10 text-gray-400 border border-gray-500/20 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider'}>
                    {job.status}
                  </span>
                  <svg className="w-5 h-5 text-gray-600 group-hover:text-[#ed4690] transition-colors" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}