import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Landing from "./pages/public/Landing";
import Discover from "./pages/public/Discover";
import Login from "./pages/public/Login";
import ForgotPassword from "./pages/public/ForgotPassword";
import Signup from "./pages/public/Signup";
import CreatorProfile from "./pages/public/CreatorProfile";
import Checkout from "./pages/user/Checkout";
import CreatorDashboard from "./pages/creator/CreatorDashboard";
import CreatePost from "./pages/creator/CreatePost";
import UserDashboard from "./pages/user/UserDashboard";
import Messages from "./pages/creator/Messages";
import MediaVault from "./pages/creator/MediaVault";
import EarningsWallet from "./pages/creator/EarningsWallet";
import CreatorSettings from "./pages/creator/CreatorSettings";
import Notifications from "./pages/creator/Notifications";
import EditProfile from "./pages/creator/EditProfile";
import CreatorFeed from "./pages/creator/CreatorFeed";
import UserMessages from "./pages/user/UserMessages";
import UserVault from "./pages/user/UserVault";
import Subscriptions from "./pages/user/Subscriptions";
import UserNotifications from "./pages/user/UserNotifications";
import PaymentMethods from "./pages/user/PaymentMethods";
import UserSettings from "./pages/user/UserSettings";
import UserWallet from "./pages/user/UserWallet";
import InstallAppPrompt from "./components/InstallAppPrompt";
import CreatorSupportChat from "./components/CreatorSupportChat";

// Lazy-loaded Admin Pages
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const AdminCreators = lazy(() => import("./pages/admin/AdminCreators"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminTransactions = lazy(() => import("./pages/admin/AdminTransactions"));
const AdminContent = lazy(() => import("./pages/admin/AdminContent"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminPayouts = lazy(() => import("./pages/admin/AdminPayouts"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminAuditLog = lazy(() => import("./pages/admin/AdminAuditLog"));
const AdminEscorts = lazy(() => import("./pages/admin/AdminEscorts"));
const AdminHardcodedEscorts = lazy(() => import("./pages/admin/AdminHardcodedEscorts"));
const AdminAds = lazy(() => import("./pages/admin/AdminAds"));

// Lazy-loaded Secondary Pages
const Automations = lazy(() => import("./pages/creator/Automations"));
const FanManagement = lazy(() => import("./pages/creator/FanManagement"));
const Promotions = lazy(() => import("./pages/creator/Promotions"));
const Analytics = lazy(() => import("./pages/creator/Analytics"));
const Scheduling = lazy(() => import("./pages/creator/Scheduling"));
const CreatorGuide = lazy(() => import("./pages/creator/CreatorGuide"));
const EscortRegistration = lazy(() => import("./pages/creator/EscortRegistration"));
const ApplyMembership = lazy(() => import("./pages/user/ApplyMembership"));
const EscortsPage = lazy(() => import("./pages/user/EscortsPage"));
const LiveStudio = lazy(() => import("./pages/creator/LiveStudio"));
const LiveRoom = lazy(() => import("./pages/user/LiveRoom"));
const UserAds = lazy(() => import("./pages/user/UserAds"));
const CreatorAds = lazy(() => import("./pages/creator/CreatorAds"));

const RouteLoading = () => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

const AppRoutes = () => {
  /* LOADER TEMPORARILY DISABLED - UNCOMMENT TO RESTORE
  const location = useLocation();
  const { user } = useAuth();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    // If logging out or navigating to login, instantly sync location and bypass transition loader
    if (!user || location.pathname === '/login') {
      setDisplayLocation(location);
      setIsTransitioning(false);
      setInitialLoad(false);
      return;
    }

    if (location.pathname !== displayLocation.pathname || location.search !== displayLocation.search) {
      if (!initialLoad) {
        setIsTransitioning(true);
      }
    }
  }, [location, displayLocation.pathname, displayLocation.search, initialLoad, user]);

  const handleLoaderReady = useCallback(() => {
    setDisplayLocation(location);
  }, [location]);

  const handleLoaderComplete = useCallback(() => {
    setIsTransitioning(false);
    if (initialLoad) setInitialLoad(false);
  }, [initialLoad]);
  */

  return (
    <>
      {/* LOADER TEMPORARILY DISABLED - UNCOMMENT TO RESTORE
      {(isTransitioning || initialLoad) && (
        <PageLoader onReady={handleLoaderReady} onComplete={handleLoaderComplete} />
      )}
      */}
      <div className="min-h-screen bg-background text-foreground font-sans">
        <InstallAppPrompt />
        <CreatorSupportChat />
        <ErrorBoundary>
          <Suspense fallback={<RouteLoading />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/discover" element={<Discover />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/creator/:id" element={<CreatorProfile />} />
              <Route path="/live/:id" element={<LiveRoom />} />
              
              {/* Protected Routes */ }
              <Route element={<ProtectedRoute />}>
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/dashboard" element={<CreatorDashboard />} />
                <Route path="/creator/live" element={<LiveStudio />} />
                <Route path="/live-studio" element={<LiveStudio />} />
                <Route path="/create-post" element={<CreatePost />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/vault" element={<MediaVault />} />
                <Route path="/wallet" element={<EarningsWallet />} />
                <Route path="/settings" element={<CreatorSettings />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/edit-profile" element={<EditProfile />} />
                <Route path="/automations" element={<Automations />} />
                <Route path="/fans" element={<FanManagement />} />
                <Route path="/promotions" element={<Promotions />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/feed" element={<CreatorFeed />} />
                <Route path="/scheduling" element={<Scheduling />} />
                <Route path="/guide" element={<CreatorGuide />} />
                <Route path="/escort-application" element={<EscortRegistration />} />
                <Route path="/user" element={<UserDashboard />} />
                <Route path="/user/messages" element={<UserMessages />} />
                <Route path="/user/vault" element={<UserVault />} />
                <Route path="/user/subscriptions" element={<Subscriptions />} />
                <Route path="/user/membership" element={<ApplyMembership />} />
                <Route path="/user/notifications" element={<UserNotifications />} />
                <Route path="/user/escorts" element={<EscortsPage />} />
                <Route path="/user/wallet" element={<UserWallet />} />
                <Route path="/user/payments" element={<PaymentMethods />} />
                <Route path="/user/settings" element={<UserSettings />} />
                <Route path="/creator/ads" element={<CreatorAds />} />
                <Route path="/ads" element={<CreatorAds />} />
                <Route path="/user/ads" element={<UserAds />} />
                
                {/* Authenticated & Passcode Protected Admin Portal */}
                <Route element={<AdminRoute />}>
                  <Route path="/admin" element={<AdminOverview />} />
                  <Route path="/admin/ads" element={<AdminAds />} />
                  <Route path="/admin/creators" element={<AdminCreators />} />
                  <Route path="/admin/users" element={<AdminUsers />} />
                  <Route path="/admin/transactions" element={<AdminTransactions />} />
                  <Route path="/admin/content" element={<AdminContent />} />
                  <Route path="/admin/analytics" element={<AdminAnalytics />} />
                  <Route path="/admin/settings" element={<AdminSettings />} />
                  <Route path="/admin/payouts" element={<AdminPayouts />} />
                  <Route path="/admin/reports" element={<AdminReports />} />
                  <Route path="/admin/audit-log" element={<AdminAuditLog />} />
                  <Route path="/admin/escorts" element={<AdminEscorts />} />
                  <Route path="/admin/escorts/hardcoded" element={<AdminHardcodedEscorts />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </div>
    </>
  );
};

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;

