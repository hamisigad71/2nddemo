import { useState } from 'react';
import { Save, Settings, DollarSign, Shield, CreditCard, Megaphone } from 'lucide-react';
import AdminLayout from './AdminLayout';

const AdminSettings = () => {
  const [platformFee, setPlatformFee] = useState('10');
  const [announcement, setAnnouncement] = useState('');
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [newCreators, setNewCreators] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${value ? 'bg-primary' : 'bg-muted'}`}
    >
      <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${value ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-3xl mx-auto">

        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Platform Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure global platform behaviour and settings.</p>
        </div>

        {/* Platform Fee */}
        <div className="bg-muted/30 border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-primary" />
            <h3 className="font-bold">Revenue & Fees</h3>
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2 block">Platform Commission (%)</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="50"
                value={platformFee}
                onChange={e => setPlatformFee(e.target.value)}
                className="w-28 px-4 py-2.5 bg-background border border-border rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <span className="text-sm text-muted-foreground">% deducted from each transaction</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Current: creators keep <strong className="text-foreground">{100 - parseInt(platformFee || '0')}%</strong> of their earnings.</p>
          </div>
        </div>

        {/* Feature Flags */}
        <div className="bg-muted/30 border border-border rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="w-4 h-4 text-primary" />
            <h3 className="font-bold">Feature Flags</h3>
          </div>
          {[
            { label: 'Allow New Creator Signups', desc: 'Enable or disable new creator registrations platform-wide.', value: newCreators, onChange: setNewCreators },
            { label: 'Email Alerts for Admins', desc: 'Receive email notifications for flagged content and failed payouts.', value: emailAlerts, onChange: setEmailAlerts },
            { label: 'Maintenance Mode', desc: 'Puts the platform in read-only mode. No new transactions.', value: maintenanceMode, onChange: setMaintenanceMode },
          ].map(({ label, desc, value, onChange }, i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold">{label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
              </div>
              <Toggle value={value} onChange={onChange} />
            </div>
          ))}
        </div>

        {/* Announcement Banner */}
        <div className="bg-muted/30 border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Megaphone className="w-4 h-4 text-primary" />
            <h3 className="font-bold">Announcement Banner</h3>
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2 block">Banner Message</label>
            <textarea
              value={announcement}
              onChange={e => setAnnouncement(e.target.value)}
              placeholder="e.g. We are performing scheduled maintenance on Oct 5..."
              rows={3}
              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">Leave empty to hide the banner.</p>
          </div>
        </div>

        {/* Payment Gateway */}
        <div className="bg-muted/30 border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-4 h-4 text-primary" />
            <h3 className="font-bold">Payment Gateway Keys</h3>
          </div>
          {[
            { label: 'M-Pesa Consumer Key', placeholder: 'sk_mpesa_xxxxxxxxxxxxx' },
            { label: 'Stripe API Key', placeholder: 'sk_live_xxxxxxxxxxxxx' },
          ].map(({ label, placeholder }, i) => (
            <div key={i}>
              <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2 block">{label}</label>
              <input
                type="password"
                placeholder={placeholder}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground"
              />
            </div>
          ))}
        </div>

        {/* Security */}
        <div className="bg-muted/30 border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-primary" />
            <h3 className="font-bold">Admin Security</h3>
          </div>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 bg-background border border-border rounded-xl text-sm hover:border-primary/30 transition-colors group">
              <div className="font-semibold group-hover:text-primary transition-colors">Change Admin Password</div>
              <div className="text-xs text-muted-foreground mt-0.5">Update your super admin credentials</div>
            </button>
            <button className="w-full text-left px-4 py-3 bg-background border border-border rounded-xl text-sm hover:border-primary/30 transition-colors group">
              <div className="font-semibold group-hover:text-primary transition-colors">Two-Factor Authentication</div>
              <div className="text-xs text-muted-foreground mt-0.5">Enable 2FA for additional security</div>
            </button>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm transition-all ${saved ? 'bg-emerald-400 text-black' : 'bg-primary text-primary-foreground hover:brightness-110'} shadow-lg shadow-primary/20`}
        >
          <Save className="w-4 h-4" />
          {saved ? 'Saved!' : 'Save Changes'}
        </button>

      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
