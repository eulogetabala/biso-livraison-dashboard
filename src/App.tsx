import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import OrdersPage from './pages/OrdersPage';
import RevenuePage from './pages/RevenuePage';
import DriversPage from './pages/DriversPage';
import UsersPage from './pages/UsersPage';
import TrackingPage from './pages/TrackingPage';
import DashboardLayout from './pages/DashboardLayout';
import LoginPage from './pages/LoginPage';
import RestaurantsPage from './pages/RestaurantsPage';
import MenusPage from './pages/MenusPage';
import SimpleProductsPage from './pages/SimpleProductsPage';
import CategoriesPage from './pages/CategoriesPage';
import BannersPage from './pages/BannersPage';
import ParcelsPage from './pages/ParcelsPage';
import CuisinesPage from './pages/CuisinesPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<DashboardLayout />}>
          <Route index element={<HomePage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="parcels" element={<ParcelsPage />} />
          <Route path="revenue" element={<RevenuePage />} />
          <Route path="drivers" element={<DriversPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="tracking" element={<TrackingPage />} />
          <Route path="restaurants" element={<RestaurantsPage />} />
          <Route path="menus" element={<MenusPage />} />
          <Route path="simple-products" element={<SimpleProductsPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="banners" element={<BannersPage />} />
          <Route path="cuisines" element={<CuisinesPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
