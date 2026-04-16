import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import PhoneCard from '../ui/PhoneCard';
import PhoneListCard from './PhoneListCard';
import PhoneDetail from './PhoneDetail';

const PAGE_SIZE = 24;

export default function PhoneGrid({ phones, view = 'grid' }) {
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(phones.length / PAGE_SIZE));
  const paged = phones.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const goPage = (p) => {
    if (p >= 1 && p <= totalPages) {
      setPage(p);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (phones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-4xl mb-4">📱</p>
        <p className="text-[#1B2A4A] font-semibold text-lg">Aucun téléphone trouvé</p>
        <p className="text-[#555555] text-sm mt-1">Essayez de modifier vos filtres</p>
      </div>
    );
  }

  return (
    <>
      {/* Grid or list */}
      {view === 'list' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {paged.map((phone) => (
            <PhoneListCard key={phone.id} phone={phone} onClick={setSelected} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 w-full">
          {paged.map((phone, i) => (
            <PhoneCard key={phone.id} phone={phone} index={i} onClick={setSelected} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 mt-10">
          <button
            onClick={() => goPage(page - 1)}
            disabled={page === 1}
            className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:border-[#00B4CC] hover:text-[#00B4CC] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <ChevronLeft size={16} />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => goPage(p)}
              className={`w-9 h-9 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
                p === page
                  ? 'bg-[#1B2A4A] text-white border-[#1B2A4A]'
                  : 'border-gray-200 text-[#555555] hover:border-[#00B4CC] hover:text-[#00B4CC]'
              }`}
            >
              {p}
            </button>
          ))}

          <button
            onClick={() => goPage(page + 1)}
            disabled={page === totalPages}
            className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:border-[#00B4CC] hover:text-[#00B4CC] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <PhoneDetail phone={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
