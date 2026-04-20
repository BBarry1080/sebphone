import { useState, useMemo } from 'react'
import { useGroupedInventory } from './useGroupedInventory'

export function useGroupedPhones(initialCondition = null, initialBrand = null) {
  const [search, setSearch]               = useState('')
  const [filterCondition, setFilterCondition] = useState(initialCondition)
  const [filterBrand, setFilterBrand]     = useState(initialBrand)
  const [filterStatus, setFilterStatus]   = useState(null)
  const [filterMagasin, setFilterMagasin] = useState(null)
  const [filterGrade, setFilterGrade]     = useState(null)
  const [sortBy, setSortBy]               = useState('alpha_asc')

  const { groupedModels, phones, loading, error } = useGroupedInventory({
    condition: filterCondition,
    brand:     filterBrand,
    status:    filterStatus,
  })

  const groups = useMemo(() => {
    let result = [...groupedModels]

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (g) => g.model.toLowerCase().includes(q) || g.brand?.toLowerCase().includes(q)
      )
    }

    if (filterMagasin) {
      result = result.filter((g) =>
        g.phones.some(
          (p) => Array.isArray(p.magasins) && p.magasins.includes(filterMagasin)
        )
      )
    }

    if (filterGrade) {
      result = result.filter((g) =>
        g.phones.some((p) => p.grade === filterGrade)
      )
    }

    switch (sortBy) {
      case 'price_asc':  result.sort((a, b) => a.basePrice - b.basePrice); break
      case 'price_desc': result.sort((a, b) => b.basePrice - a.basePrice); break
      case 'alpha_desc': result.sort((a, b) => b.model.localeCompare(a.model)); break
      case 'alpha_asc':
      default:           result.sort((a, b) => a.model.localeCompare(b.model)); break
    }

    return result
  }, [groupedModels, search, sortBy, filterMagasin, filterGrade])

  const totalPhones = useMemo(
    () => groups.reduce((sum, g) => sum + g.totalStock, 0),
    [groups]
  )

  return {
    groups,
    phones,
    totalPhones,
    loading,
    error,
    search,          setSearch,
    filterCondition, setFilterCondition,
    filterBrand,     setFilterBrand,
    filterStatus,    setFilterStatus,
    filterMagasin,   setFilterMagasin,
    filterGrade,     setFilterGrade,
    sortBy,          setSortBy,
  }
}
