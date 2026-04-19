import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { supabase, isSupabaseReady } from '../../lib/supabase';
import { getPhoneImage } from '../../utils/phoneImage';

function toSlug(model) {
  return (model || '').toLowerCase().replace(/\s+/g, '-');
}

function PhoneCard({ phone }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(`/modele/${toSlug(phone.model)}`)}
      className="bg-white rounded-2xl p-4 border border-gray-100 hover:shadow-md cursor-pointer transition-all"
    >
      <div className="aspect-square bg-[#f8f8f8] rounded-xl mb-3 flex items-center justify-center">
        <img
          src={getPhoneImage(phone.model, phone.color)}
          alt={phone.model}
          className="w-full h-full object-contain p-2"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://placehold.co/200x200/f5f5f5/999?text=iPhone';
          }}
        />
      </div>
      <p className="font-semibold text-[#1B2A4A] text-sm mb-1">{phone.model}</p>
      <p className="text-xs text-gray-400 mb-1">{phone.storage} · {phone.color}</p>
      <p className="font-bold text-[#1B2A4A] text-lg mt-2">{phone.price}€</p>
    </div>
  );
}

function PhoneCardNeuf({ phone }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(`/modele/${toSlug(phone.model)}`)}
      className="bg-white rounded-2xl p-4 border border-gray-100 hover:shadow-md cursor-pointer transition-all"
    >
      <div className="aspect-square bg-[#f8f8f8] rounded-xl mb-3 flex items-center justify-center">
        <img
          src={getPhoneImage(phone.model, phone.color)}
          alt={phone.model}
          className="w-full h-full object-contain p-2"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://placehold.co/200x200/f5f5f5/999?text=iPhone';
          }}
        />
      </div>
      <p className="font-semibold text-[#1B2A4A] text-sm mb-1">{phone.model}</p>
      <p className="text-xs text-gray-400 mb-1">{phone.storage} · {phone.color}</p>
      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">Neuf sous scellé</span>
      <p className="font-bold text-[#1B2A4A] text-lg mt-2">{phone.price}€</p>
      <p className="text-xs text-gray-400">Garantie 1 an Apple · 2 ans SebPhone</p>
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-56 bg-gray-100 rounded-2xl animate-pulse" />
      ))}
    </div>
  );
}

export default function FeaturedPhones() {
  const navigate = useNavigate();
  const [neufs, setNeufs]               = useState([]);
  const [reconditiones, setReconditiones] = useState([]);
  const [occasions, setOccasions]       = useState([]);
  const [loading, setLoading]           = useState(true);

  async function fetchAll() {
    if (!isSupabaseReady) { setLoading(false); return; }

    const [r1, r2, r3] = await Promise.all([
      supabase.from('phones').select('*').eq('status', 'disponible').eq('condition', 'neuf').order('price', { ascending: false }),
      supabase.from('phones').select('*').eq('status', 'disponible').eq('condition', 'reconditionne').order('price', { ascending: false }),
      supabase.from('phones').select('*').eq('status', 'disponible').eq('condition', 'occasion').order('price', { ascending: false }),
    ]);

    setNeufs(r1.data || []);
    setReconditiones(r2.data || []);
    setOccasions(r3.data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchAll();

    if (!isSupabaseReady) return;

    const channel = supabase
      .channel('phones_featured')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'phones' }, () => {
        fetchAll();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const hasAny = neufs.length > 0 || reconditiones.length > 0 || occasions.length > 0;

  if (!loading && !hasAny) return null;

  return (
    <section className="py-16 md:py-20 bg-[#F5F5F5]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-10">
          <h2 className="font-poppins font-bold text-3xl md:text-4xl text-[#00B4CC] mb-3">
            NOTRE SÉLECTION ACTUELLE
          </h2>
          <p className="text-[#555555] text-base">Découvrez nos téléphones disponibles dès maintenant</p>
        </div>

        {loading ? (
          <SectionSkeleton />
        ) : (
          <div className="flex flex-col gap-10">

            {/* NEUFS */}
            {neufs.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">
                    ✦ Neuf sous scellé
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {neufs.map((phone) => (
                    <PhoneCardNeuf key={phone.id} phone={phone} />
                  ))}
                </div>
              </div>
            )}

            {/* RECONDITIONNÉS */}
            {reconditiones.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">
                    ✦ Reconditionné certifié
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {reconditiones.map((phone) => (
                    <PhoneCard key={phone.id} phone={phone} />
                  ))}
                </div>
              </div>
            )}

            {/* OCCASIONS */}
            {occasions.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1 rounded-full">
                    ✦ Occasion contrôlée
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {occasions.map((phone) => (
                    <PhoneCard key={phone.id} phone={phone} />
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* CTA */}
        {!loading && (
          <div className="flex justify-center mt-10">
            <button
              onClick={() => navigate('/boutique')}
              className="flex items-center gap-2 bg-[#1B2A4A] hover:bg-[#243660] text-white font-bold px-8 py-4 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
            >
              Voir tout le catalogue
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
