import { useState, useMemo } from 'react';
import { useInventory } from './useInventory';

export function usePhones(initialCondition = null) {
  const [search, setSearch] = useState('');
  const [filterCondition, setFilterCondition] = useState(initialCondition);
  const [filterBrand, setFilterBrand] = useState(null);
  const [filterStatus, setFilterStatus] = useState(null);
  const [sortBy, setSortBy] = useState('recent');

  const { phones: rawPhones, loading, error } = useInventory({
    condition: filterCondition,
    brand: filterBrand,
    status: filterStatus,
  });

  const phones = useMemo(() => {
    let result = [...rawPhones];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.brand?.toLowerCase().includes(q) ||
          p.model?.name?.toLowerCase().includes(q)
      );
    }

    switch (sortBy) {
      case 'price_asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'alpha_asc':
        result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'alpha_desc':
        result.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
        break;
      case 'date_asc':
        result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        break;
      case 'date_desc':
      case 'recent':
      default:
        result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
    }

    return result;
  }, [rawPhones, search, sortBy]);

  return {
    phones,
    loading,
    error,
    search,
    setSearch,
    filterCondition,
    setFilterCondition,
    filterBrand,
    setFilterBrand,
    filterStatus,
    setFilterStatus,
    sortBy,
    setSortBy,
  };
}
