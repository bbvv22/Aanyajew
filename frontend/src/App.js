import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import axios from "axios";
import "./App.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import { CartProvider } from "./context/CartContext";
import { WishlistProvider } from "./context/WishlistContext";
import { ToastProvider } from "./context/ToastContext";
import { OwnerProvider, useOwner } from "./context/OwnerContext";

// Pages
import HomePage from "./pages/HomePage";
import ProductsPage from "./pages/ProductsPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CategoryPage from "./pages/CategoryPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import WishlistPage from "./pages/WishlistPage";
import ProfilePage from "./pages/ProfilePage";
import OrderHistoryPage from "./pages/OrderHistoryPage";
import OrderDetailPage from "./pages/OrderDetailPage";
import SearchResultsPage from "./pages/SearchResultsPage";
import FAQPage from "./pages/FAQPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import ShippingPage from "./pages/ShippingPage";
import AppointmentPage from "./pages/AppointmentPage";
import CareersPage from "./pages/CareersPage";
import GuidesPage from "./pages/GuidesPage";
import DiamondGuidePage from "./pages/DiamondGuidePage";
import DiamondShapesPage from "./pages/DiamondShapesPage";
import RingSettingsPage from "./pages/RingSettingsPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

// Admin Pages
import OwnerLoginPage from "./pages/OwnerLoginPage";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOrderDetailPage from "./pages/admin/AdminOrderDetailPage";
import ProductsAdmin from "./pages/admin/ProductsAdmin";
import ProductEditPage from "./pages/admin/ProductEditPage";
import ReviewsAdmin from "./pages/admin/ReviewsAdmin";
import NavigationAdmin from "./pages/admin/NavigationAdmin";

// Owner Portal Pages
import OrdersPage from "./pages/owner/OrdersPage";
import InventoryPage from "./pages/owner/InventoryPage";
import StockAlertsPage from "./pages/owner/StockAlertsPage";
import TransfersPage from "./pages/owner/TransfersPage";
import LedgerPage from "./pages/owner/LedgerPage";
import VendorsPage from "./pages/owner/VendorsPage";
import VendorDetailPage from "./pages/owner/VendorDetailPage";
import PurchaseOrdersPage from "./pages/owner/PurchaseOrdersPage";
import CustomersPage from "./pages/owner/CustomersPage";
import AnalyticsPage from "./pages/owner/AnalyticsPage";
import MarketingPage from "./pages/owner/MarketingPage";
import CouponsPage from "./pages/owner/CouponsPage";
import SettingsPage from "./pages/owner/SettingsPage";

// Helper for device detection
const getDeviceType = () => {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return "tablet";
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return "mobile";
  }
  return "desktop";
};

// Layout wrapper to conditionally show header/footer and track views
function AppLayout({ children }) {
  const location = useLocation();
  const { backendUrl } = useOwner();
  const isAdminRoute = location.pathname.startsWith('/admin') || location.pathname.startsWith('/owner');
  const isAuthRoute = ['/login', '/register', '/forgot-password'].includes(location.pathname) || location.pathname.startsWith('/reset-password');

  useEffect(() => {
    // Track page view
    const trackPageView = async () => {
      // Don't track admin pages for marketing analytics
      if (isAdminRoute) return;

      try {
        await axios.post(`${backendUrl}/api/track`, {
          path: location.pathname,
          referrer: document.referrer,
          device: getDeviceType()
        });
      } catch (error) {
        // Silently fail for analytics
        console.error("Tracking error:", error);
      }
    };

    trackPageView();
  }, [location, backendUrl, isAdminRoute]);

  const hideHeaderFooter = isAdminRoute || isAuthRoute;

  return (
    <div className="App">
      {!hideHeaderFooter && <Header isHome={location.pathname === '/'} />}
      <main>{children}</main>
      {!hideHeaderFooter && <Footer />}
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <CartProvider>
        <WishlistProvider>
          <OwnerProvider>
            <Router>
              <ScrollToTop />
              <AppLayout>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<HomePage />} />
                  <Route path="/products" element={<ProductsPage />} />
                  <Route path="/product/:id" element={<ProductDetailPage />} />
                  <Route path="/category/:category" element={<CategoryPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/wishlist" element={<WishlistPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/orders" element={<OrderHistoryPage />} />
                  <Route path="/orders/:id" element={<OrderDetailPage />} />
                  <Route path="/search" element={<SearchResultsPage />} />
                  <Route path="/faq" element={<FAQPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/privacy" element={<PrivacyPage />} />
                  <Route path="/shipping" element={<ShippingPage />} />


                  <Route path="/book-appointment" element={<AppointmentPage />} />
                  <Route path="/careers" element={<CareersPage />} />
                  <Route path="/guides" element={<GuidesPage />} />
                  <Route path="/guides/diamond-4cs" element={<DiamondGuidePage />} />
                  <Route path="/guides/diamond-shapes" element={<DiamondShapesPage />} />
                  <Route path="/guides/ring-settings" element={<RingSettingsPage />} />

                  {/* Owner Login */}
                  <Route path="/owner/login" element={<OwnerLoginPage />} />

                  {/* Admin/Owner Portal Routes */}
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<AdminDashboard />} />

                    {/* Orders */}
                    <Route path="orders" element={<OrdersPage />} />
                    <Route path="orders/:id" element={<AdminOrderDetailPage />} />

                    {/* Products */}
                    <Route path="products" element={<ProductsAdmin />} />
                    <Route path="products/new" element={<ProductEditPage />} />
                    <Route path="products/:id/edit" element={<ProductEditPage />} />

                    {/* Inventory */}
                    <Route path="inventory" element={<InventoryPage />} />
                    <Route path="inventory/alerts" element={<StockAlertsPage />} />
                    <Route path="inventory/transfers" element={<TransfersPage />} />
                    <Route path="inventory/ledger" element={<LedgerPage />} />

                    {/* Vendors & Purchase Orders */}
                    <Route path="vendors" element={<VendorsPage />} />
                    <Route path="vendors/:id" element={<VendorDetailPage />} />
                    <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
                    <Route path="purchase-orders/:id" element={<PurchaseOrdersPage />} />

                    {/* Customers */}
                    <Route path="customers" element={<CustomersPage />} />
                    <Route path="customers/:id" element={<CustomersPage />} />

                    {/* Marketing */}
                    <Route path="marketing" element={<MarketingPage />} />
                    <Route path="coupons" element={<CouponsPage />} />

                    {/* Analytics */}
                    <Route path="analytics" element={<AnalyticsPage />} />

                    {/* Settings */}
                    <Route path="settings" element={<SettingsPage />} />

                    {/* Legacy routes */}
                    <Route path="reviews" element={<ReviewsAdmin />} />
                    <Route path="navigation" element={<NavigationAdmin />} />
                    <Route path="categories" element={<NavigationAdmin />} />
                  </Route>
                </Routes>
              </AppLayout>
            </Router>
          </OwnerProvider>
        </WishlistProvider>
      </CartProvider>
    </ToastProvider>
  );
}

export default App;
