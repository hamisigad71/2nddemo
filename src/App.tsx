import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import PageLoader from "./components/PageLoader";
import Landing from "./pages/public/Landing";
import Discover from "./pages/public/Discover";
import Login from "./pages/public/Login";
import Signup from "./pages/public/Signup";
import CreatorProfile from "./pages/public/CreatorProfile";
import Checkout from "./pages/user/Checkout";
import CreatorDashboard from "./pages/creator/CreatorDashboard";
import CreatePost from "./pages/creator/CreatePost";
import UserDashboard from "./pages/user/UserDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Messages from "./pages/creator/Messages";
import MediaVault from "./pages/creator/MediaVault";
import EarningsWallet from "./pages/creator/EarningsWallet";
import CreatorSettings from "./pages/creator/CreatorSettings";
import Notifications from "./pages/creator/Notifications";
import EditProfile from "./pages/creator/EditProfile";
import Automations from "./pages/creator/Automations";
import FanManagement from "./pages/creator/FanManagement";
import Promotions from "./pages/creator/Promotions";
import Analytics from "./pages/creator/Analytics";
import Scheduling from "./pages/creator/Scheduling";
import UserMessages from "./pages/user/UserMessages";
import UserVault from "./pages/user/UserVault";
import Subscriptions from "./pages/user/Subscriptions";
import PaymentMethods from "./pages/user/PaymentMethods";
import UserSettings from "./pages/user/UserSettings";

const AppRoutes = () => {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname || location.search !== displayLocation.search) {
      if (!initialLoad) {
        setIsTransitioning(true);
      }
    }
  }, [location, displayLocation.pathname, displayLocation.search, initialLoad]);

  const handleLoaderReady = () => {
    setDisplayLocation(location);
  };

  const handleLoaderComplete = () => {
    setIsTransitioning(false);
    if (initialLoad) setInitialLoad(false);
  };

  return (
    <>
      {(isTransitioning || initialLoad) && (
        <PageLoader onReady={handleLoaderReady} onComplete={handleLoaderComplete} />
      )}
      <div className="min-h-screen bg-background text-foreground font-sans">
        <Routes location={displayLocation}>
            <Route path="/" element={<Landing />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/creator/:id" element={<CreatorProfile />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/dashboard" element={<CreatorDashboard />} />
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
            <Route path="/scheduling" element={<Scheduling />} />
            <Route path="/user" element={<UserDashboard />} />
            <Route path="/user/messages" element={<UserMessages />} />
            <Route path="/user/vault" element={<UserVault />} />
            <Route path="/user/subscriptions" element={<Subscriptions />} />
            <Route path="/user/payments" element={<PaymentMethods />} />
            <Route path="/user/settings" element={<UserSettings />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </div>
    </>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;

