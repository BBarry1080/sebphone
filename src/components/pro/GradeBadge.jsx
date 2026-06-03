export default function GradeBadge({ grade }) {
  if (!grade) return null
  const colorMap = {
    'A+': 'bg-green-500',
    'A': 'bg-green-400',
    'B': 'bg-blue-500',
    'C': 'bg-yellow-500',
    'C-BAT': 'bg-orange-400',
    'C-REF': 'bg-orange-600',
    'PIECE': 'bg-purple-500',
    'LCD': 'bg-red-400',
  }
  const bg = colorMap[grade] || 'bg-gray-400'
  return (
    <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-lg text-white ${bg}`}>
      {grade}
    </span>
  )
}
