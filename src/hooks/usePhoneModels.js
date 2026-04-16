import { useEffect, useState } from 'react'
import { supabase, isSupabaseReady } from '../lib/supabase'

// Modèles mock dérivés de phonesMock pour le fallback
const modelsMock = [
  { id: 1,  name: 'iPhone 16 Pro',    brand: 'Apple',   release_year: 2024, is_active: true, base_price: 530, rating: 4.5, review_count: 5,  colors: [{ name: 'Blanc', hex: '#F5F5F0', image: '' }, { name: 'Noir', hex: '#1C1C1E', image: '' }, { name: 'Titane', hex: '#C4B69A', image: '' }, { name: 'Or désert', hex: '#D4A96A', image: '' }] },
  { id: 2,  name: 'iPhone 16 Pro Max',brand: 'Apple',   release_year: 2024, is_active: true, base_price: 660, rating: 4.5, review_count: 3,  colors: [{ name: 'Titane naturel', hex: '#C4B69A', image: '' }, { name: 'Titane blanc', hex: '#E8E4DC', image: '' }, { name: 'Titane noir', hex: '#2C2C2E', image: '' }] },
  { id: 3,  name: 'iPhone 16',         brand: 'Apple',   release_year: 2024, is_active: true, base_price: 530, rating: 4.0, review_count: 4,  colors: [{ name: 'Noir', hex: '#1C1C1E', image: '' }, { name: 'Rose', hex: '#F7C5BE', image: '' }, { name: 'Blanc', hex: '#F5F5F0', image: '' }] },
  { id: 4,  name: 'iPhone 15 Pro',     brand: 'Apple',   release_year: 2023, is_active: true, base_price: 899, rating: 4.5, review_count: 8,  colors: [{ name: 'Titane', hex: '#C4B69A', image: '' }, { name: 'Noir', hex: '#1C1C1E', image: '' }] },
  { id: 5,  name: 'iPhone 14 Pro',     brand: 'Apple',   release_year: 2022, is_active: true, base_price: 290, rating: 4.5, review_count: 11, colors: [{ name: 'Violet', hex: '#4A3560', image: '' }, { name: 'Argent', hex: '#E8E8E8', image: '' }, { name: 'Noir', hex: '#1C1C1E', image: '' }] },
  { id: 6,  name: 'iPhone 13',         brand: 'Apple',   release_year: 2021, is_active: true, base_price: 210, rating: 4.0, review_count: 26, colors: [{ name: 'Minuit', hex: '#1C1C1E', image: '' }, { name: 'Rose', hex: '#FADADD', image: '' }, { name: 'Bleu', hex: '#2E5CA8', image: '' }] },
  { id: 7,  name: 'Galaxy S23',        brand: 'Samsung', release_year: 2023, is_active: true, base_price: 349, rating: 4.5, review_count: 8,  colors: [{ name: 'Noir', hex: '#1C1C1E', image: '' }, { name: 'Crème', hex: '#F5F0E0', image: '' }, { name: 'Vert', hex: '#2E7D32', image: '' }] },
  { id: 8,  name: 'Galaxy S22',        brand: 'Samsung', release_year: 2022, is_active: true, base_price: 280, rating: 4.0, review_count: 12, colors: [{ name: 'Blanc', hex: '#F5F5F0', image: '' }, { name: 'Noir', hex: '#1C1C1E', image: '' }] },
]

export function usePhoneModels() {
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // ── Mode mock ────────────────────────────────────────────────────
    if (!isSupabaseReady) {
      setModels(modelsMock)
      setLoading(false)
      return
    }

    // ── Mode Supabase ────────────────────────────────────────────────
    async function fetchModels() {
      const { data, error } = await supabase
        .from('phone_models')
        .select('*')
        .eq('is_active', true)
        .order('release_year', { ascending: false })
      if (error) setError(error)
      else setModels(data || [])
      setLoading(false)
    }
    fetchModels()
  }, [])

  return { models, loading, error }
}
