import { useState, useEffect } from 'react'

export const useProAccount = () => {
  const [proAccount, setProAccount] = useState(null)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('sebphone_pro')
      if (stored) setProAccount(JSON.parse(stored))
    } catch (e) { /* noop */ }
  }, [])
  return proAccount
}
