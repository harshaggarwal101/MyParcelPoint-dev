import React, { Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import AOS from "aos";
import "aos/dist/aos.css";

// Error Boundary & Route Protection
import ErrorBoundary from "./components/ErrorBoundary";
import PublicRoute from "./routes/PublicRoute";
import MerchantRoute from "./routes/MerchantRoute";
import AdminRoute from "./routes/AdminRoute";
import SuperAdminRoute from "./routes/SuperAdminRoute";

// AOSRefresh Component
const AOSRefresh = () => {
  const location = useLocation();
  useEffect(() => {
    AOS.refresh();
  }, [location]);
  return null;
};

// Loading Fallback
const LoadingFallback = () => (
  <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "#f9fafb" }}>
    <div style={{
      width: "56px",
      height: "56px",
      borderRadius: "50%",
      border: "4px solid #2c3e50",
      borderTopColor: "transparent",
      animation: "spin 0.8s linear infinite"
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  </div>
);

// ======================
// PUBLIC PAGES
// ======================
const Home = React.lazy(() => import("./pages/public/Home"));
const NotFound = React.lazy(() => import("./pages/public/NotFound"));
const PublicTracking = React.lazy(() => import("./pages/public/Tracking"));
const About = React.lazy(() => import("./pages/public/About"));
const Services = React.lazy(() => import("./pages/public/Services"));
const Contact = React.lazy(() => import("./pages/public/Contact"));

// ======================
// AUTH PAGES
// ======================
const Login = React.lazy(() => import("./pages/auth/Login"));
const Register = React.lazy(() => import("./pages/auth/Register"));
const VerifyEmail = React.lazy(() => import("./pages/auth/VerifyEmailPage"));

// ======================
// MERCHANT PAGES
// ======================
const Dashboard = React.lazy(() => import("./pages/merchant/Dashboard"));
const Orders = React.lazy(() => import("./pages/merchant/Orders"));
const OrderDetails = React.lazy(() => import("./pages/merchant/OrderDetails"));
const EditOrder = React.lazy(() => import("./pages/merchant/EditOrder"));
const CreateOrder = React.lazy(() => import("./pages/merchant/CreateOrder"));
const CreateShipment = React.lazy(() => import("./pages/merchant/CreateShipment"));
const BulkShipment = React.lazy(() => import("./pages/merchant/BulkShipment"));
const Shipments = React.lazy(() => import("./pages/merchant/Shipments"));
const ShipmentDetails = React.lazy(() => import("./pages/merchant/ShipmentDetails"));
const Tracking = React.lazy(() => import("./pages/merchant/Tracking"));
const Wallet = React.lazy(() => import("./pages/merchant/Wallet"));
const Invoices = React.lazy(() => import("./pages/merchant/Invoices"));
const Billing = React.lazy(() => import("./pages/merchant/Billing"));
const MerchantReports = React.lazy(() => import("./pages/merchant/Reports"));
const Profile = React.lazy(() => import("./pages/merchant/Profile"));
const Settings = React.lazy(() => import("./pages/merchant/Settings"));
const Serviceability = React.lazy(() => import("./pages/merchant/Serviceability"));
const RateCalculator = React.lazy(() => import("./pages/merchant/RateCalculator"));
const MyRateCard = React.lazy(() => import("./pages/merchant/MyRateCard"));
const Tickets = React.lazy(() => import("./pages/merchant/Tickets"));
const MerchantNDR = React.lazy(() => import("./pages/merchant/MerchantNDR"));
const MerchantRTO = React.lazy(() => import("./pages/merchant/MerchantRTO"));
const Warehouse = React.lazy(() => import("./pages/merchant/Warehouse")); 
const ChannelIntegrations = React.lazy(() => import("./pages/merchant/ChannelIntegrations"));

// ======================
// ADMIN PAGES
// ======================
const AdminDashboard = React.lazy(() => import("./pages/admin/Dashboard"));
const Users = React.lazy(() => import("./pages/admin/Users"));
const Merchants = React.lazy(() => import("./pages/admin/Merchants"));
const Pricing = React.lazy(() => import("./pages/admin/Pricing"));
const AdminRevenue = React.lazy(() => import("./pages/admin/Revenue"));
const AdminReports = React.lazy(() => import("./pages/admin/Reports"));
const AdminSettings = React.lazy(() => import("./pages/admin/Settings"));
const AdminOrders = React.lazy(() => import("./pages/admin/Orders"));
const AdminOrderDetails = React.lazy(() => import("./pages/admin/OrderDetails"));
const AdminEditOrder = React.lazy(() => import("./pages/admin/EditOrder"));
const AdminShipmentDetails = React.lazy(() => import("./pages/admin/ShipmentDetails"));
const AdminShipments = React.lazy(() => import("./pages/admin/Shipments"));
const AdminNDR = React.lazy(() => import("./pages/admin/NDR"));
const AdminRTO = React.lazy(() => import("./pages/admin/RTO"));
const COD = React.lazy(() => import("./pages/admin/COD"));
const AdminTickets = React.lazy(() => import("./pages/admin/AdminTickets"));
const AdminRateCardManagement = React.lazy(() => import("./pages/admin/RateCardManagement"));

// ======================
// SUPER ADMIN PAGES
// ======================
const SuperAdminDashboard = React.lazy(() => import("./pages/superadmin/Dashboard"));
const AdminManagement = React.lazy(() => import("./pages/superadmin/AdminManagement"));
const UserManagement = React.lazy(() => import("./pages/superadmin/UserManagement"));
const OrderManagement = React.lazy(() => import("./pages/superadmin/OrderManagement"));
const MerchantManagement = React.lazy(() => import("./pages/superadmin/MerchantManagement"));
const Commission = React.lazy(() => import("./pages/superadmin/Commission"));
const ApiMonitoring = React.lazy(() => import("./pages/superadmin/ApiMonitoring"));
const Revenue = React.lazy(() => import("./pages/superadmin/Revenue"));
const AuditLogs = React.lazy(() => import("./pages/superadmin/AuditLogs"));
const SuperAdminSettings = React.lazy(() => import("./pages/superadmin/Settings"));
const SuperAdminRateCardManagement = React.lazy(() => import("./pages/superadmin/RateCardManagement"));
const Couriers = React.lazy(() => import("./pages/superadmin/Couriers"));


function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AOSRefresh />
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* ================= PUBLIC ================= */}
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/services" element={<Services />} />
            <Route path="/tracking" element={<PublicTracking />} />
            <Route path="/contact" element={<Contact />} />

            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              }
            />
            
            <Route path="/verify-email" element={<VerifyEmail />} />

            {/* ================= MERCHANT ================= */}
            <Route
              path="/merchant/dashboard"
              element={
                <MerchantRoute>
                  <Dashboard />
                </MerchantRoute>
              }
            />
            <Route
              path="/merchant/orders"
              element={
                <MerchantRoute>
                  <Orders />
                </MerchantRoute>
              }
            />
            <Route
              path="/merchant/orders/:id"
              element={
                <MerchantRoute>
                  <OrderDetails />
                </MerchantRoute>
              }
            />
            <Route
              path="/merchant/orders/edit/:id"
              element={
                <MerchantRoute>
                  <EditOrder />
                </MerchantRoute>
              }
            />
            <Route
              path="/merchant/create-order"
              element={
                <MerchantRoute>
                  <CreateOrder />
                </MerchantRoute>
              }
            />
            <Route
              path="/merchant/create-shipment"
              element={
                <MerchantRoute>
                  <CreateShipment />
                </MerchantRoute>
              }
            />
            <Route
              path="/merchant/bulk-shipment"
              element={
                <MerchantRoute>
                  <BulkShipment />
                </MerchantRoute>
              }
            />
            <Route
              path="/merchant/shipments"
              element={
                <MerchantRoute>
                  <Shipments />
                </MerchantRoute>
              }
            />
            <Route
              path="/merchant/shipments/:id"
              element={
                <MerchantRoute>
                  <ShipmentDetails />
                </MerchantRoute>
              }
            />
            <Route
              path="/merchant/tracking"
              element={
                <MerchantRoute>
                  <Tracking />
                </MerchantRoute>
              }
            />
            <Route
              path="/merchant/tracking/:awb"
              element={
                <MerchantRoute>
                  <Tracking />
                </MerchantRoute>
              }
            />
            <Route
              path="/merchant/ndr"
              element={
                <MerchantRoute>
                  <MerchantNDR />
                </MerchantRoute>
              }
            />
            <Route
              path="/merchant/rto"
              element={
                <MerchantRoute>
                  <MerchantRTO />
                </MerchantRoute>
              }
            />
            <Route
              path="/merchant/wallet"
              element={
                <MerchantRoute>
                  <Wallet />
                </MerchantRoute>
              }
            />
            <Route
              path="/merchant/invoices"
              element={
                <MerchantRoute>
                  <Invoices />
                </MerchantRoute>
              }
            />
            <Route
              path="/merchant/billing"
              element={
                <MerchantRoute>
                  <Billing />
                </MerchantRoute>
              }
            />
            <Route
              path="/merchant/reports"
              element={
                <MerchantRoute>
                  <MerchantReports />
                </MerchantRoute>
              }
            />
            <Route
              path="/merchant/profile"
              element={
                <MerchantRoute>
                  <Profile />
                </MerchantRoute>
              }
            />
            <Route
              path="/merchant/settings"
              element={
                <MerchantRoute>
                  <Settings />
                </MerchantRoute>
              }
            />
            <Route
              path="/merchant/serviceability"
              element={
                <MerchantRoute>
                  <Serviceability />
                </MerchantRoute>
              }
            />
            <Route
              path="/merchant/rate-calculator"
              element={
                <MerchantRoute>
                  <RateCalculator />
                </MerchantRoute>
              }
            />
            <Route
              path="/merchant/rate-card"
              element={
                <MerchantRoute>
                  <MyRateCard />
                </MerchantRoute>
              }
            />
            <Route
              path="/merchant/tickets"
              element={
                <MerchantRoute>
                  <Tickets />
                </MerchantRoute>
              }
            />
            <Route
              path="/merchant/warehouses"
              element={
                <MerchantRoute>
                  <Warehouse />
                </MerchantRoute>
              }
            />
            <Route
              path="/merchant/integrations"
              element={
                <MerchantRoute>
                  <ChannelIntegrations />
                </MerchantRoute>
              }
            />

            {/* ================= ADMIN ================= */}
            <Route
              path="/admin/dashboard"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <AdminRoute>
                  <Users />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/merchants"
              element={
                <AdminRoute>
                  <Merchants />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/orders"
              element={
                <AdminRoute>
                  <AdminOrders />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/orders/:id"
              element={
                <AdminRoute>
                  <AdminOrderDetails />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/orders/edit/:id"
              element={
                <AdminRoute>
                  <AdminEditOrder />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/shipments"
              element={
                <AdminRoute>
                  <AdminShipments />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/shipments/:id"
              element={
                <AdminRoute>
                  <AdminShipmentDetails />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/pricing"
              element={
                <AdminRoute>
                  <Pricing />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/revenue"
              element={
                <AdminRoute>
                  <AdminRevenue />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <AdminRoute>
                  <AdminReports />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <AdminRoute>
                  <AdminSettings />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/ndr"
              element={
                <AdminRoute>
                  <AdminNDR />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/rto"
              element={
                <AdminRoute>
                  <AdminRTO />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/cod"
              element={
                <AdminRoute>
                  <COD />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/tickets"
              element={
                <AdminRoute>
                  <AdminTickets />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/ratecard/:merchantId"
              element={
                <AdminRoute>
                  <AdminRateCardManagement />
                </AdminRoute>
              }
            />

            {/* ================= SUPER ADMIN ================= */}
            <Route
              path="/superadmin/dashboard"
              element={
                <SuperAdminRoute>
                  <SuperAdminDashboard />
                </SuperAdminRoute>
              }
            />
            <Route
              path="/superadmin/admins"
              element={
                <SuperAdminRoute>
                  <AdminManagement />
                </SuperAdminRoute>
              }
            />
            <Route
              path="/superadmin/users"
              element={
                <SuperAdminRoute>
                  <UserManagement />
                </SuperAdminRoute>
              }
            />
            <Route
              path="/superadmin/orders"
              element={
                <SuperAdminRoute>
                  <OrderManagement />
                </SuperAdminRoute>
              }
            />
            <Route
              path="/superadmin/merchants"
              element={
                <SuperAdminRoute>
                  <MerchantManagement />
                </SuperAdminRoute>
              }
            />
            <Route
              path="/superadmin/couriers"
              element={
                <SuperAdminRoute>
                  <Couriers />
                </SuperAdminRoute>
              }
            />
            <Route
              path="/superadmin/ratecard/:merchantId"
              element={
                <SuperAdminRoute>
                  <SuperAdminRateCardManagement />
                </SuperAdminRoute>
              }
            />
            <Route
              path="/superadmin/commission"
              element={
                <SuperAdminRoute>
                  <Commission />
                </SuperAdminRoute>
              }
            />
            <Route
              path="/superadmin/revenue"
              element={
                <SuperAdminRoute>
                  <Revenue />
                </SuperAdminRoute>
              }
            />
            <Route
              path="/superadmin/api-monitoring"
              element={
                <SuperAdminRoute>
                  <ApiMonitoring />
                </SuperAdminRoute>
              }
            />
            <Route
              path="/superadmin/audit-logs"
              element={
                <SuperAdminRoute>
                  <AuditLogs />
                </SuperAdminRoute>
              }
            />
            <Route
              path="/superadmin/settings"
              element={
                <SuperAdminRoute>
                  <SuperAdminSettings />
                </SuperAdminRoute>
              }
            />

            {/* ================= 404 ================= */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;