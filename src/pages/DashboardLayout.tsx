import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  Bike,
  ClipboardList,
  Globe,
  Image,
  LayoutDashboard,
  MapPin,
  Package,
  ShoppingBag,
  ShoppingCart,
  Tags,
  Users,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../auth';
import { EPICERIE_LABELS } from '../lib/constants';
import logo from '../../assets/logo.png';

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

type NavGroup = {
  section: string;
  items: NavItem[];
};

const NAV: NavGroup[] = [
  {
    section: 'Général',
    items: [{ to: '/', label: 'Tableau de bord', icon: LayoutDashboard }],
  },
  {
    section: 'Opérations',
    items: [
      { to: '/orders', label: 'Commandes', icon: ShoppingBag },
      { to: '/parcels', label: 'Colis', icon: Package },
      { to: '/tracking', label: 'Suivi livraisons', icon: MapPin },
      { to: '/revenue', label: 'Revenus', icon: Wallet },
      { to: '/drivers', label: 'Livreurs', icon: Bike },
      { to: '/users', label: 'Utilisateurs', icon: Users },
    ],
  },
  {
    section: 'Catalogue',
    items: [
      { to: '/restaurants', label: 'Restaurants', icon: UtensilsCrossed },
      { to: '/menus', label: 'Menus restaurant', icon: ClipboardList },
      { to: '/simple-products', label: 'Produits simples', icon: ShoppingCart },
      { to: '/categories', label: EPICERIE_LABELS.navCategories, icon: Tags },
    ],
  },
  {
    section: 'Accueil app',
    items: [
      { to: '/banners', label: 'Bannières slider', icon: Image },
      { to: '/cuisines', label: 'Types de cuisine', icon: Globe },
    ],
  },
];

const PAGE_TITLES: Record<string, string> = {
  '/': 'Tableau de bord',
  '/orders': 'Commandes',
  '/parcels': 'Colis',
  '/tracking': 'Suivi livraisons',
  '/revenue': 'Revenus',
  '/drivers': 'Livreurs',
  '/users': 'Utilisateurs',
  '/restaurants': 'Restaurants',
  '/menus': 'Menus',
  '/simple-products': 'Produits',
  '/categories': 'Catégories',
  '/banners': 'Bannières',
  '/cuisines': 'Cuisines',
};

export default function DashboardLayout() {
  const { token, user, logout } = useAuth();
  const location = useLocation();

  if (!token) return <Navigate to="/login" replace />;

  const pageTitle = location.pathname === '/' ? '' : (PAGE_TITLES[location.pathname] ?? 'Manager');

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src={logo} alt="Biso Express" className="sidebar-logo" />
          <div>
            <p className="sidebar-brand-label">Biso Manager</p>
            <p className="sidebar-user">{user?.firstName} {user?.lastName}</p>
          </div>
        </div>

        <nav>
          {NAV.map((group) => (
            <div key={group.section} className="nav-group">
              <p className="nav-section">{group.section}</p>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink key={item.to} to={item.to} end={item.to === '/'}>
                    <span className="nav-icon" aria-hidden>
                      <Icon size={18} strokeWidth={2} />
                    </span>
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <button type="button" className="btn secondary sidebar-logout" onClick={logout}>
          Déconnexion
        </button>
      </aside>

      <div className="main-wrap">
        <div className="main-topbar">
          {pageTitle ? <span className="main-topbar-label">{pageTitle}</span> : null}
        </div>
        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
