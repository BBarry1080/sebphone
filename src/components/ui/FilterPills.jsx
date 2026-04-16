export default function FilterPills({ filters, active, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {filters.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value === active ? null : f.value)}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border cursor-pointer
            ${active === f.value
              ? 'bg-[#00B4CC] text-white border-[#00B4CC] scale-105'
              : 'bg-white text-[#555555] border-gray-200 hover:border-[#00B4CC] hover:text-[#00B4CC]'
            }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
