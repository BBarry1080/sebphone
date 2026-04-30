import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import ScrollToTop from './components/utils/ScrollToTop';
import Header from './components/layout/Header';
import MobileHeader from './components/layout/MobileHeader';
import BottomNav from './components/layout/BottomNav';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import Boutique from './pages/Boutique';
import Occasions from './pages/Occasions';
import Reconditiones from './pages/Reconditiones';
import Rachat from './pages/Rachat';
import PhoneDetailPage from './pages/PhoneDetailPage'
import ModelDetailPage from './pages/ModelDetailPage';
import Reservation from './pages/Reservation';
import Cart from './pages/Cart';
import ProtectedRoute from './components/admin/ProtectedRoute';
import AdminLayout from './components/admin/AdminLayout';
import AdminLogin from './pages/admin/AdminLogin';
import Dashboard from './pages/admin/Dashboard';
import Stock from './pages/admin/Stock';
import Commandes from './pages/admin/Commandes'
import PromoCodes from './pages/admin/PromoCodes';
import Confirmation from './pages/Confirmation';
import MesReservations from './pages/MesReservations';
import DetailCommande from './pages/DetailCommande';
import CodeVerification from './pages/admin/CodeVerification';

function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <MobileHeader />
      <div className="flex-1">
        {children}
      </div>
      <Footer />
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <CartProvider>
        <Routes>
          {/* ── PUBLIC SITE ── */}
          <Route path="/" element={
            <Layout>
              <Home />
            </Layout>
          } />
          <Route path="/boutique" element={
            <Layout><Boutique key="boutique" /></Layout>
          } />
          <Route path="/iphone" element={
            <Layout><Boutique key="iphone" defaultBrand="Apple" /></Layout>
          } />
          <Route path="/samsung" element={
            <Layout><Boutique key="samsung" defaultBrand="Samsung" /></Layout>
          } />
          <Route path="/occasions" element={
            <Layout><Occasions /></Layout>
          } />
          <Route path="/reconditiones" element={
            <Layout><Reconditiones /></Layout>
          } />
          <Route path="/rachat" element={
            <Layout><Rachat /></Layout>
          } />
          <Route path="/telephone/:id" element={
            <Layout><PhoneDetailPage /></Layout>
          } />
          <Route path="/modele/:modelSlug" element={
            <Layout><ModelDetailPage /></Layout>
          } />
          <Route path="/reservation/:id" element={
            <Layout><Reservation /></Layout>
          } />
          <Route path="/confirmation" element={
            <Layout><Confirmation /></Layout>
          } />
          <Route path="/mes-reservations" element={
            <Layout><MesReservations /></Layout>
          } />
          <Route path="/commande/:code" element={
            <Layout><DetailCommande /></Layout>
          } />
          <Route path="/panier" element={
            <Layout><Cart /></Layout>
          } />
          <Route path="/compte" element={
            <Layout>
              <main className="max-w-xl mx-auto px-4 py-20 text-center">
                <p className="text-4xl mb-4">👤</p>
                <h1 className="font-poppins font-bold text-[#1B2A4A] text-2xl mb-2">Espace compte</h1>
                <p className="text-[#555555]">Fonctionnalité à venir — connexion &amp; historique de commandes.</p>
              </main>
            </Layout>
          } />

          {/* ── ADMIN ── */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="stock" element={<Stock />} />
            <Route path="commandes" element={<Commandes />} />
            <Route path="promoCodes" element={<PromoCodes />} />
            <Route path="verifier-code" element={<CodeVerification />} />
            <Route path="clients" element={
              <div className="text-center py-20 text-[#888]">Page Clients — à venir</div>
            } />
            <Route path="parametres" element={
              <div className="text-center py-20 text-[#888]">Page Paramètres — à venir</div>
            } />
          </Route>
        </Routes>
      </CartProvider>
    </BrowserRouter>
  );
}
