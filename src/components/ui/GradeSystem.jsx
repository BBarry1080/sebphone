import { Smartphone, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { grades } from '../../data/grades';

function FeatureIcon({ type, icon }) {
  const iconMap = {
    screen: Smartphone,
    alert: AlertTriangle,
    check: CheckCircle,
    time: Clock,
  };
  const Icon = iconMap[icon] || CheckCircle;
  const colorMap = {
    good: 'text-[#166534]',
    warning: 'text-amber-500',
    info: 'text-[#555555]',
    alt: 'text-[#166534]',
  };
  return <Icon size={14} className={colorMap[type] || 'text-[#555555]'} />;
}

function GradeCard({ grade }) {
  const hasSeparator = grade.features.some((f) => f.separator);

  const renderFeature = (f, i) => {
    if (f.separator) {
      return (
        <div key={i} className="flex items-center gap-2 my-1">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-xs text-gray-400 italic">— ou —</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>
      );
    }
    return (
      <div key={i} className="flex items-start gap-2">
        <FeatureIcon type={f.type} icon={f.icon} />
        <p className="text-xs text-[#555555] leading-relaxed">{f.text}</p>
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-3 hover:border-[#00B4CC]/40 hover:shadow-sm transition-all duration-200">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <span className="w-6 h-6 rounded-full bg-[#1B2A4A] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
            {grade.number}
          </span>
          <h3 className="font-poppins font-bold text-[#1B2A4A] text-xl">
            GRADE {grade.number} : {grade.name}
          </h3>
        </div>
        <p className="font-bold text-sm text-[#1B2A4A] ml-8">Garantie {grade.warranty}.</p>
      </div>

      {/* Features */}
      <div className="flex flex-col gap-2">
        {grade.features.map((f, i) => renderFeature(f, i))}
      </div>

      {/* Badge */}
      {grade.badge && (
        <div className="inline-flex items-center gap-1.5 self-start px-3 py-1.5 bg-[#DCFCE7] text-[#166534] rounded-full text-xs font-medium">
          <span>{grade.badge.emoji}</span>
          <span>{grade.badge.text}</span>
        </div>
      )}

      {/* Conclusion */}
      <p className="text-xs text-[#888888] italic mt-auto pt-2 border-t border-gray-50">
        {grade.conclusion}
      </p>
    </div>
  );
}

export default function GradeSystem() {
  return (
    <section className="py-14 md:py-20 bg-[#F5F5F5]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-10">
          <h2 className="font-poppins font-bold text-2xl md:text-3xl text-[#1B2A4A]">
            Nos grades expliqués.
            <span className="text-[#888888] font-normal"> Trouvez celui qui vous correspond.</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {grades.map((g) => (
            <GradeCard key={g.id} grade={g} />
          ))}
        </div>
      </div>
    </section>
  );
}
