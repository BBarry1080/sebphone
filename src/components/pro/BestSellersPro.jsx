import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getPhoneImage } from '../../utils/phoneImage'
import GradeBadge from './GradeBadge'

export default function BestSellersPro() {
  const navigate = useNavigate()
  const [phones, setPhones] = useState([])

  useEffect(() => {
    const fetchPhones = async () => {
      const { data } = await supabase
        .from('phones')
        .select('*')
        .eq('status', 'disponible')
        .not('price_pro', 'is', null)
        .order('price_pro', { ascending: false })
        .limit(8)
      setPhones(data || [])
    }
    fetchPhones()
  }, [])

  if (phones.length === 0) return (
    <p className="text-gray-400 text-sm">
      Aucun produit pro disponible pour le moment.
    </p>
  )

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {phones.map((phone) => (
        <div key={phone.id}
          onClick={() => navigate(`/reservation/${phone.id}`)}
          className="bg-white rounded-2xl border border-gray-100 p-4 cursor-pointer hover:shadow-md hover:border-[#00B4CC] transition-all">
          <img src={getPhoneImage(phone.name, phone.color)}
            alt={phone.name}
            onError={(e) => { e.target.src = '/images/placeholder.png' }}
            className="w-full h-32 object-contain mb-3" />
          <p className="font-bold text-[#1B2A4A] text-sm">{phone.name}</p>
          <p className="text-xs text-gray-400">
            {phone.color} · {phone.storage}
          </p>
          <div className="mt-1">
            <GradeBadge grade={phone.grade} />
          </div>
          <div className="mt-2">
            <p className="text-lg font-black text-[#00B4CC]">
              {phone.price_pro}€
            </p>
            {phone.price && (
              <p className="text-xs text-gray-400 line-through">
                Public : {phone.price}€
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
