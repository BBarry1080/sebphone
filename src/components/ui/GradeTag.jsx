export default function GradeTag({ grade }) {
  if (!grade) return null;

  const colors = {
    'A+': 'bg-[#00B4CC] text-white',
    'A':  'bg-[#1B2A4A] text-white',
    'B':  'bg-[#555555] text-white',
    'C':  'bg-gray-400 text-white',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${colors[grade] || 'bg-gray-400 text-white'}`}>
      {grade}
    </span>
  );
}
