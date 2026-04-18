import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase, isSupabaseReady } from '../lib/supabase';
import { phonesMock } from '../data/phonesMock';
import Spinner from '../components/ui/Spinner';
import ReservationForm from '../components/reservation/ReservationForm';
import Button from '../components/ui/Button';

export default function Reservation() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [phone, setPhone]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  console.log('ID reçu dans Reservation:', id);

  useEffect(() => {
    if (!id) {
      console.error('Pas d\'ID dans l\'URL');
      setError('Téléphone introuvable');
      setLoading(false);
      return;
    }

    async function fetchPhone() {
      setLoading(true);

      if (!isSupabaseReady) {
        const mock = phonesMock.find((p) => String(p.id) === String(id));
        console.log('Mode hors ligne — mock trouvé:', mock);
        if (mock) setPhone(mock);
        else setError('Téléphone introuvable (mode hors ligne) — ID: ' + id);
        setLoading(false);
        return;
      }

      const { data, error: sbError } = await supabase
        .from('phones')
        .select('*')
        .eq('id', id)
        .single();

      console.log('Résultat Supabase:', data, sbError);

      if (sbError || !data) {
        setError('Téléphone introuvable — ID: ' + id);
        setLoading(false);
        return;
      }

      setPhone(data);
      setLoading(false);
    }

    fetchPhone();
  }, [id]);

  if (loading) {
    return (
      <main className="max-w-xl mx-auto px-4 py-20">
        <Spinner message="Chargement du téléphone..." />
      </main>
    );
  }

  if (error || !phone) {
    return (
      <main className="max-w-xl mx-auto px-4 py-20 text-center">
        <p className="text-4xl mb-4">📱</p>
        <h1 className="font-poppins font-bold text-[#1B2A4A] text-2xl mb-2">Téléphone introuvable</h1>
        <p className="text-red-500 text-sm mb-1">{error}</p>
        <p className="text-gray-400 text-xs mb-6">ID recherché : {id}</p>
        <div className="flex flex-col gap-3 items-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-[#00B4CC] text-sm cursor-pointer"
          >
            ← Retour
          </button>
          <Button variant="primary" size="md" onClick={() => navigate('/boutique')}>
            Retour à la boutique
          </Button>
        </div>
      </main>
    );
  }

  if (phone.status === 'vendu') {
    return (
      <main className="max-w-xl mx-auto px-4 py-20 text-center">
        <p className="text-4xl mb-4">😔</p>
        <h1 className="font-poppins font-bold text-[#1B2A4A] text-2xl mb-2">Téléphone vendu</h1>
        <p className="text-[#555555] mb-6">Ce téléphone n'est plus disponible à la réservation.</p>
        <Button variant="primary" size="md" onClick={() => navigate('/boutique')}>
          Voir d'autres offres
        </Button>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 md:px-6 py-8 pb-24 md:pb-12">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-[#555555] hover:text-[#00B4CC] text-sm mb-6 transition-colors cursor-pointer"
      >
        <ArrowLeft size={16} />
        Retour
      </button>

      <div className="mb-8">
        <h1 className="font-poppins font-bold text-3xl text-[#1B2A4A] mb-2">
          Réserver ce <span className="text-[#00B4CC]">téléphone</span>
        </h1>
        <p className="text-[#555555] text-sm">
          Remplissez le formulaire pour réserver — acompte de 50€ à la confirmation.
        </p>
      </div>

      <ReservationForm phone={phone} />
    </main>
  );
}
