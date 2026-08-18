import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseReady } from '../lib/supabase'
import { dateBelge, msJusquaMinuitBelge, purgeSessionLocale } from '../utils/session'

const MS_AVERTISSEMENT = 5 * 60 * 1000 // bandeau 5 min avant minuit

const lireUser = () => {
  try { return JSON.parse(localStorage.getItem('sebphone_user') || '{}') } catch { return {} }
}

// Déconnecte le compte à minuit (heure belge) pour que la personne du lendemain
// soit obligée d'ouvrir sa propre session au lieu de reprendre celle de la
// veille. Sans exception : admins et responsables sont déconnectés comme les
// autres.
//
// Deux mécanismes complémentaires : un minuteur pour le poste resté allumé, et
// une comparaison de dates au montage pour le poste éteint ou mis en veille —
// la veille gèle les setTimeout, un minuteur seul ne suffirait pas.
export function useAutoLogoutMinuit() {
  const navigate = useNavigate()
  const [avertissement, setAvertissement] = useState(false)

  useEffect(() => {
    const user = lireUser()
    if (!user || Object.keys(user).length === 0) return

    const deconnecter = async () => {
      if (isSupabaseReady) await supabase.auth.signOut()
      purgeSessionLocale()
      navigate('/admin/login', { replace: true })
    }

    const aujourdhui = dateBelge()

    // Session ouverte avant le déploiement : pas de loginDate. On la renseigne
    // au vol plutôt que d'éjecter tout le monde à la mise en production.
    if (!user.loginDate) {
      localStorage.setItem('sebphone_user',
        JSON.stringify({ ...user, loginDate: aujourdhui }))
    } else if (user.loginDate !== aujourdhui) {
      deconnecter()
      return
    }

    let timerMinuit = null
    let timerAvert = null

    const armer = () => {
      const ms = msJusquaMinuitBelge()

      timerMinuit = setTimeout(() => {
        // Le changement d'heure fait des journées de 23h ou 25h : si la date
        // belge n'a pas encore tourné, on ré-arme au lieu de déconnecter tôt.
        if (dateBelge() !== lireUser().loginDate) deconnecter()
        else armer()
      }, ms)

      if (ms > MS_AVERTISSEMENT) {
        timerAvert = setTimeout(() => setAvertissement(true), ms - MS_AVERTISSEMENT)
      } else {
        setAvertissement(true)
      }
    }
    armer()

    // Propagation multi-onglets : `storage` ne se déclenche que dans les AUTRES
    // onglets, donc celui qui déconnecte n'a pas à se notifier lui-même.
    const onStorage = (e) => {
      if (e.key === 'sebphone_user' && !e.newValue) {
        navigate('/admin/login', { replace: true })
      }
    }
    window.addEventListener('storage', onStorage)

    return () => {
      if (timerMinuit) clearTimeout(timerMinuit)
      if (timerAvert) clearTimeout(timerAvert)
      window.removeEventListener('storage', onStorage)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return avertissement
}
