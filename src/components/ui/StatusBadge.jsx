export default function StatusBadge({ status, size = 'md' }) {
  const config = {
    disponible: { label: 'Stock disponible', dot: 'bg-[#22C55E]', text: 'text-[#22C55E]', bg: 'bg-green-50 border border-green-200' },
    reserve:    { label: 'Réservé',          dot: 'bg-[#F97316]', text: 'text-[#F97316]', bg: 'bg-orange-50 border border-orange-200' },
    vendu:      { label: 'Vendu',            dot: 'bg-[#EF4444]', text: 'text-[#EF4444]', bg: 'bg-red-50 border border-red-200' },
  };

  const c = config[status] || config.disponible;

  const sizeClass = size === 'sm'
    ? 'text-xs px-2 py-1'
    : 'text-xs px-3 py-1.5';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${c.bg} ${c.text} ${sizeClass}`}>
      <span className={`w-2 h-2 rounded-full ${c.dot} flex-shrink-0`} />
      {c.label}
    </span>
  );
}
