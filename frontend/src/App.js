import { useEffect } from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Search from './pages/Search';
import ProductDetail from './pages/ProductDetail';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import Profile from './pages/Profile';
import FindFreelancers from './pages/FindFreelancers';
import PostJob from './pages/PostJob';
import Contact from './pages/Contact';
import Marketplace from './pages/Marketplace';
import MyAccount from './pages/MyAccount';
import BecomeSeller from './pages/BecomeSeller';
import SellerUpload from './pages/SellerUpload';
import AdminPanel from './pages/AdminPanel';
import Messages from './pages/Messages';
import Settings from './pages/Settings';
import NotificationsPage from './pages/NotificationsPage';
import ServicesMarketplace from './pages/ServicesMarketplace';
import ServiceDetails from './pages/ServiceDetails';
import Checkout from './pages/Checkout';
import OrderSuccess from './pages/OrderSuccess';
import BuyerOrders from './pages/BuyerOrders';
import SellerOrders from './pages/SellerOrders';
import AdminOrders from './pages/AdminOrders';
import NotFound from './pages/NotFound';
import { Toaster } from './components/ui/toaster';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationsProvider } from './contexts/NotificationsContext';
import { OrdersProvider } from './contexts/OrdersContext';
import ProtectedRoute from './components/ProtectedRoute';
import AuthAccessWidget from './components/AuthAccessWidget';
import LiveSupportWidget from './components/LiveSupportWidget';

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

function App() {
  return (
    <div className="App min-h-screen bg-[#0a0f1e] text-slate-100">
      <BrowserRouter>
        <AuthProvider>
          <NotificationsProvider>
            <OrdersProvider>
            <ScrollToTop />
            <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/find-freelancers" element={<FindFreelancers />} />
            <Route path="/post-job" element={<PostJob />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/become-seller" element={<BecomeSeller />} />
            <Route
              path="/my-account"
              element={<ProtectedRoute><MyAccount /></ProtectedRoute>}
            />
            <Route
              path="/seller/upload"
              element={<ProtectedRoute><SellerUpload /></ProtectedRoute>}
            />
            <Route
              path="/admin"
              element={<ProtectedRoute><AdminPanel /></ProtectedRoute>}
            />
            <Route
              path="/messages"
              element={<ProtectedRoute><Messages /></ProtectedRoute>}
            />
            <Route
              path="/settings"
              element={<ProtectedRoute><Settings /></ProtectedRoute>}
            />
            <Route
              path="/notifications"
              element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>}
            />
            <Route
              path="/profile"
              element={<ProtectedRoute><Profile /></ProtectedRoute>}
            />
            <Route
              path="/dashboard/:role"
              element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
            />
            <Route
              path="/dashboard"
              element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
            />
            {/* Additive: Buyer Marketplace + Service Ordering System */}
            <Route path="/services" element={<ServicesMarketplace />} />
            <Route path="/services/:id" element={<ServiceDetails />} />
            <Route
              path="/orders/checkout/:id"
              element={<ProtectedRoute><Checkout /></ProtectedRoute>}
            />
            <Route
              path="/orders/success/:id"
              element={<ProtectedRoute><OrderSuccess /></ProtectedRoute>}
            />
            <Route
              path="/dashboard/buyer-orders"
              element={<ProtectedRoute><BuyerOrders /></ProtectedRoute>}
            />
            <Route
              path="/dashboard/seller-orders"
              element={<ProtectedRoute><SellerOrders /></ProtectedRoute>}
            />
            <Route
              path="/admin/orders"
              element={<ProtectedRoute><AdminOrders /></ProtectedRoute>}
            />
            {/* Additive: catch-all 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <AuthAccessWidget />
            <LiveSupportWidget />
            <Toaster />
            </OrdersProvider>
          </NotificationsProvider>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
