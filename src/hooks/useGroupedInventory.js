import { useMemo } from 'react'
import { useInventory } from './useInventory'

function gradeScore(grade) {
  return { 'A+': 4, 'A': 3, 'B': 2, 'C': 1 }[grade] || 0
}

export function useGroupedInventory(filters = {}) {
  const { phones, loading, error } = useInventory(filters)

  const groupedModels = useMemo(() => {
    const groups = {}

    phones.forEach((phone) => {
      // Handles both string model (new) and object model (mock/legacy join)
      const key = (typeof phone.model === 'string' ? phone.model : phone.model?.name) || phone.name
      if (!key) return

      if (!groups[key]) {
        groups[key] = {
          model: key,
          brand: phone.brand,
          basePrice: phone.price,
          phones: [],
          totalStock: 0,
          storages: new Set(),
          colors: new Set(),
          bestPhone: null,
        }
      }

      const g = groups[key]
      g.phones.push(phone)
      g.totalStock++
      if (phone.storage) g.storages.add(phone.storage)
      if (phone.color)   g.colors.add(phone.color)
      if (phone.price < g.basePrice) g.basePrice = phone.price
      if (!g.bestPhone || gradeScore(phone.grade) > gradeScore(g.bestPhone.grade)) {
        g.bestPhone = phone
      }
    })

    return Object.values(groups).map((g) => ({
      ...g,
      storages: Array.from(g.storages),
      colors:   Array.from(g.colors),
    }))
  }, [phones])

  return { groupedModels, loading, error }
}
