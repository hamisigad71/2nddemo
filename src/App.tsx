import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Discover from "./pages/Discover";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import CreatorProfile from "./pages/CreatorProfile";
import Checkout from "./pages/Checkout";
import CreatorDashboard from "./pages/CreatorDashboard";
import CreatePost from "./pages/CreatePost";
import UserDashboard from "./pages/UserDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Messages from "./pages/Messages";
import MediaVault from "./pages/MediaVault";
import EarningsWallet from "./pages/EarningsWallet";
import CreatorSettings from "./pages/CreatorSettings";
import Notifications from "./pages/Notifications";
import EditProfile from "./pages/EditProfile";
import Automations from "./pages/Automations";
import FanManagement from "./pages/FanManagement";
import Promotions from "./pages/Promotions";
import Analytics from "./pages/Analytics";
import Scheduling from "./pages/Scheduling";
import UserMessages from "./pages/UserMessages";
import UserVault from "./pages/UserVault";
import Subscriptions from "./pages/Subscriptions";
import PaymentMethods from "./pages/PaymentMethods";
import UserSettings from "./pages/UserSettings";

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-foreground font-sans">
        <Routes>
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
    </BrowserRouter>
  );
}

export default App;
