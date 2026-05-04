interface Props {
  label: string
  value: string | number
  sub?: string
  color?: 'accent' | 'success' | 'danger' | 'warn'
}

const colorMap = {
  accent: 'text-accent',
  success: 'text-success',
  danger: 'text-danger',
  warn: 'text-warn',
}

export default function ScoreCard({ label, value, sub, color = 'accent' }: Props) {
  return (
    <div className="card">
      <p className="text-white/50 text-sm font-medium">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${colorMap[color]}`}>{value}</p>
      {sub && <p className="text-white/30 text-xs mt-1">{sub}</p>}
    </div>
  )
}
