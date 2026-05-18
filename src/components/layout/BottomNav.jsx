import { NavLink } from 'react-router-dom';
import { Home, ShoppingBag, ClipboardList, User } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const tabs = [
  { to: '/',         labelKey: 'bottomnav_home',    Icon: Home,          end: true },
  { to: '/boutique', labelKey: 'bottomnav_shop',    Icon: ShoppingBag,   end: false },
  { to: '/rachat',   labelKey: 'bottomnav_sell',    Icon: ClipboardList, end: false },
  { to: '/mes-reservations', labelKey: 'bottomnav_account', Icon: User, end: false },
];

export default function BottomNav() {
  const { t } = useLanguage();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 safe-area-inset-bottom">
      <div className="grid grid-cols-4 h-16">
        {tabs.map(({ to, labelKey, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 transition-colors ${
                isActive ? 'text-[#00B4CC]' : 'text-[#555555]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>
                  {t(labelKey)}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
