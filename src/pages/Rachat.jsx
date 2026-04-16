import { useState } from 'react';
import { motion } from 'framer-motion';
import { Smartphone, CheckCircle, Phone } from 'lucide-react';
import Button from '../components/ui/Button';

const brands = ['Apple', 'Samsung', 'Xiaomi', 'Huawei', 'OnePlus', 'Google', 'Autre'];
const states = [
  { value: 'tres_bon', label: 'Très bon état', desc: 'Aucune rayure, écran parfait' },
  { value: 'bon',      label: 'Bon état',       desc: 'Légères micro-rayures invisibles' },
  { value: 'correct',  label: 'Correct',         desc: 'Rayures visibles, fonctionnel' },
];
const storages = ['32Go', '64Go', '128Go', '256Go', '512Go', '1To'];

export default function Rachat() {
  const [form, setForm] = useState({
    brand: '',
    model: '',
    state: '',
    storage: '',
    clientPhone: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <main className="max-w-xl mx-auto px-4 py-16 pb-24 md:pb-16 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center gap-5"
        >
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle size={40} className="text-[#22C55E]" />
          </div>
          <h1 className="font-poppins font-bold text-[#1B2A4A] text-2xl">Demande reçue !</h1>
          <p className="text-[#555555] text-sm max-w-sm">
            Nous vous rappelons sous <strong>24h</strong> au <strong>{form.clientPhone}</strong> pour vous donner une estimation de rachat pour votre{' '}
            <strong>{form.brand} {form.model}</strong>.
          </p>
          <div className="bg-[#F5F5F5] rounded-2xl p-5 w-full text-left">
            <p className="text-sm text-[#555555] flex items-center gap-2">
              <Phone size={14} className="text-[#00B4CC]" />
              Une question ? Appelez-nous : <strong>+32(0)492 / 40.54.57</strong>
            </p>
          </div>
          <Button variant="primary" size="md" onClick={() => setSubmitted(false)}>
            Nouvelle estimation
          </Button>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 md:px-6 py-8 md:py-12 pb-24 md:pb-12">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-cyan-50 text-[#00B4CC] text-xs font-medium px-3 py-1.5 rounded-full mb-3">
          <Smartphone size={12} />
          Estimation gratuite
        </div>
        <h1 className="font-poppins font-bold text-3xl md:text-4xl text-[#1B2A4A] mb-2">
          Racheter mon <span className="text-[#00B4CC]">téléphone</span>
        </h1>
        <p className="text-[#555555]">Remplissez le formulaire — nous vous rappelons sous 24h avec notre offre de rachat.</p>
      </div>

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        onSubmit={handleSubmit}
        className="flex flex-col gap-6 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm"
      >
        {/* Marque */}
        <div>
          <label className="block text-sm font-medium text-[#1B2A4A] mb-1.5">Marque *</label>
          <select
            name="brand"
            value={form.brand}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC] focus:ring-2 focus:ring-cyan-100 bg-white transition-all"
          >
            <option value="">Sélectionner une marque</option>
            {brands.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        {/* Modèle */}
        <div>
          <label className="block text-sm font-medium text-[#1B2A4A] mb-1.5">Modèle *</label>
          <input
            type="text"
            name="model"
            value={form.model}
            onChange={handleChange}
            required
            placeholder="ex: iPhone 13, Galaxy S22..."
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC] focus:ring-2 focus:ring-cyan-100 transition-all"
          />
        </div>

        {/* État */}
        <div>
          <label className="block text-sm font-medium text-[#1B2A4A] mb-3">État du téléphone *</label>
          <div className="flex flex-col gap-2">
            {states.map(({ value, label, desc }) => (
              <button
                key={value}
                type="button"
                onClick={() => setForm((p) => ({ ...p, state: value }))}
                className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200 text-left cursor-pointer
                  ${form.state === value
                    ? 'border-[#00B4CC] bg-cyan-50'
                    : 'border-gray-200 hover:border-[#00B4CC]'}`}
              >
                <div>
                  <p className={`font-semibold text-sm ${form.state === value ? 'text-[#00B4CC]' : 'text-[#1B2A4A]'}`}>{label}</p>
                  <p className="text-xs text-[#555555] mt-0.5">{desc}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                  ${form.state === value ? 'border-[#00B4CC] bg-[#00B4CC]' : 'border-gray-300'}`}>
                  {form.state === value && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Stockage */}
        <div>
          <label className="block text-sm font-medium text-[#1B2A4A] mb-1.5">Capacité de stockage *</label>
          <select
            name="storage"
            value={form.storage}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC] focus:ring-2 focus:ring-cyan-100 bg-white transition-all"
          >
            <option value="">Sélectionner la capacité</option>
            {storages.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Téléphone client */}
        <div>
          <label className="block text-sm font-medium text-[#1B2A4A] mb-1.5">Votre numéro de téléphone *</label>
          <input
            type="tel"
            name="clientPhone"
            value={form.clientPhone}
            onChange={handleChange}
            required
            placeholder="+32 XXX XX XX XX"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#00B4CC] focus:ring-2 focus:ring-cyan-100 transition-all"
          />
          <p className="text-xs text-[#555555] mt-1.5">Nous vous rappelons sous 24h avec notre offre de rachat</p>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="full"
          disabled={loading}
          className="text-base font-bold"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Envoi...
            </span>
          ) : (
            'Obtenir une estimation'
          )}
        </Button>
      </motion.form>
    </main>
  );
}
