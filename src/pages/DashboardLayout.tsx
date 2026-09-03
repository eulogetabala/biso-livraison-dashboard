import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  Bike,
  ClipboardList,
  Globe,
  Handshake,
  Image,
  LayoutDashboard,
  MapPin,
  Package,
  ShoppingBag,
  ShoppingCart,
  Star,
  Tags,
  Users,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react';
import ApiTargetBadge from '../components/ApiTargetBadge';
import { useAuth } from '../auth';
import { EPICERIE_LABELS } from '../lib/constants';
import { canAccessPath, filterByRole, isPartner, roleLabel } from '../lib/roles';
import logo from '../../assets/logo.png';

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
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
      { to: '/parcels', label: 'Colis', icon: Package, adminOnly: true },
      { to: '/tracking', label: 'Suivi livraisons', icon: MapPin, adminOnly: true },
      { to: '/revenue', label: 'Revenus', icon: Wallet },
      { to: '/drivers', label: 'Livreurs', icon: Bike, adminOnly: true },
      { to: '/partners', label: 'Partenaires', icon: Handshake, adminOnly: true },
      { to: '/users', label: 'Utilisateurs', icon: Users, adminOnly: true },
      { to: '/reviews', label: 'Avis clients', icon: Star, adminOnly: true },
    ],
  },
  {
    section: 'Catalogue',
    items: [
      { to: '/restaurants', label: 'Restaurants', icon: UtensilsCrossed },
      { to: '/menus', label: 'Menus restaurant', icon: ClipboardList },
      { to: '/simple-products', label: 'Produits simples', icon: ShoppingCart, adminOnly: true },
      { to: '/categories', label: EPICERIE_LABELS.navCategories, icon: Tags, adminOnly: true },
    ],
  },
  {
    section: 'Accueil app',
    items: [
      { to: '/banners', label: 'Bannières slider', icon: Image, adminOnly: true },
      { to: '/cuisines', label: 'Types de cuisine', icon: Globe, adminOnly: true },
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
  '/partners': 'Partenaires',
  '/users': 'Utilisateurs',
  '/reviews': 'Avis clients',
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

  if (user && !canAccessPath(user.role, location.pathname)) {
    return <Navigate to="/" replace />;
  }

  const pageTitle = location.pathname === '/' ? '' : (PAGE_TITLES[location.pathname] ?? 'Manager');
  const navGroups = NAV.map((group) => ({
    ...group,
    items: filterByRole(group.items, user?.role),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src={logo} alt="Biso Express" className="sidebar-logo" />
          <div>
            <p className="sidebar-brand-label">Biso Manager</p>
            <p className="sidebar-user">{user?.firstName} {user?.lastName}</p>
            {user?.role ? (
              <p className="sidebar-role">{roleLabel(user.role)}</p>
            ) : null}
          </div>
        </div>

        <nav>
          {navGroups.map((group) => (
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

        {isPartner(user?.role) ? (
          <p className="sidebar-partner-hint muted">
            Espace limité à votre restaurant.
          </p>
        ) : null}

        <ApiTargetBadge />

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
