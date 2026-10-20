import { useState, useEffect } from 'react';
import { Save, Settings, DollarSign, CreditCard, Megaphone, CheckCircle } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { getPlatformSettings, savePlatformSettings, logAdminAction } from '../../lib/db';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../context/ToastContext';

const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
  <button
    onClick={() => onChange(!value)}
    className={`relative w-12 h-6 rounded-full transition-colors duration-300 border ${value ? 'bg-red-600 border-red-500' : 'bg-zinc-800 border-zinc-700'}`}
  >
    <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${value ? 'translate-x-6' : 'translate-x-0'}`} />
  </button>
);

const AdminSettings = () => {
  const { user } = useAuth();
  const [platformFee, setPlatformFee] = useState('15');
  const [minPayout, setMinPayout] = useState('1000');
  const [announcement, setAnnouncement] = useState('');
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [newCreators, setNewCreators] = useState(true);
  const [autoApprove, setAutoApprove] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      const s = await getPlatformSettings();
      setPlatformFee(s.platformFee);
      setMinPayout(s.minPayout);
      setAnnouncement(s.announcement);
      setEmailAlerts(s.emailAlerts);
      setMaintenanceMode(s.maintenanceMode);
      setNewCreators(s.newCreators);
      setAutoApprove(s.autoApprove);
    };
    load();
  }, []);

  const handleSave = async () => {
    const newSettings = {
      platformFee,
      minPayout,
      announcement,
      emailAlerts,
      maintenanceMode,
      newCreators,
      autoApprove,
    };
    await savePlatformSettings(newSettings);
    
    // Log to audit log
    await logAdminAction({
      admin: user?.email || 'Admin',
      action: 'Updated Settings',
      target: 'Platform Settings',
      details: `Commission set to ${platformFee}%, Min payout KES ${minPayout}, Maintenance mode: ${maintenanceMode ? 'ON' : 'OFF'}`,
      type: 'settings',
      ip: '197.156.XX.XX'
    });

    setSaved(true);
    toast.success('Platform settings saved successfully');
    setTimeout(() => setSaved(false), 2000);
  };

  const Section = ({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
    <div className="bg-[#0d0e12] border border-zinc-800 rounded-3xl p-6 space-y-5 hover:border-zinc-700 transition-colors">
      <div className="flex items-center gap-3 pb-3 border-b border-zinc-800">
        <div className="w-8 h-8 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500">
          <Icon className="w-4 h-4" />
        </div>
        <h3 className="font-black text-white text-base">{title}</h3>
      </div>
      {children}
    </div>
  );

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-3xl mx-auto custom-scrollbar overflow-y-auto">

        {/* Header */}
        <div className="bg-gradient-to-r from-[#0d0e12] to-[#0d0e12] p-6 lg:p-8 rounded-3xl border border-zinc-800/80 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500">
                <Settings className="w-5 h-5" />
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Platform Settings</h1>
            </div>
            <p className="text-zinc-400 text-sm font-medium">Configure global platform behaviour, revenue rates, and security settings.</p>
          </div>
        </div>

        {/* Revenue & Fees */}
        <Section icon={DollarSign} title="Revenue & Fees">
          <div className="space-y-4">
            <div>
              <label className="text-[11px] uppercase tracking-widest font-black text-zinc-500 mb-2 block">Platform Commission (%)</label>
              <div className="flex items-center gap-4">
                <input
                  type="number" min="1" max="50" value={platformFee}
                  onChange={e => setPlatformFee(e.target.value)}
                  className="w-28 px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-2xl text-white text-sm font-black focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/30 transition-all"
                />
                <span className="text-sm text-zinc-400">% cut per transaction</span>
              </div>
              <p className="text-xs text-zinc-600 mt-2">Creators currently keep <strong className="text-white">{100 - parseInt(platformFee || '0')}%</strong> of their earnings.</p>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-widest font-black text-zinc-500 mb-2 block">Minimum Payout Threshold (KES)</label>
              <input
                type="number" value={minPayout}
                onChange={e => setMinPayout(e.target.value)}
                className="w-40 px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-2xl text-white text-sm font-black focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/30 transition-all"
              />
              <p className="text-xs text-zinc-600 mt-2">Creators must earn at least KES {parseInt(minPayout || '0').toLocaleString()} before requesting a withdrawal.</p>
            </div>
          </div>
        </Section>

        {/* Feature Flags */}
        <Section icon={Settings} title="Feature Flags">
          {[
            { label: 'Allow New Creator Signups', desc: 'Enable or disable new creator registrations platform-wide.', value: newCreators, onChange: setNewCreators },
            { label: 'Auto-Approve Low-Risk Creators', desc: 'Automatically approve creators with verified ID and no prior flags.', value: autoApprove, onChange: setAutoApprove },
            { label: 'Admin Email Alerts', desc: 'Receive email notifications for flagged content and failed payouts.', value: emailAlerts, onChange: setEmailAlerts },
            { label: 'Maintenance Mode', desc: 'Puts the platform in read-only mode. No new transactions or signups.', value: maintenanceMode, onChange: setMaintenanceMode },
          ].map(({ label, desc, value, onChange }, i) => (
            <div key={i} className="flex items-center justify-between gap-4 py-3 border-b border-zinc-900 last:border-0">
              <div>
                <div className="text-sm font-bold text-white">{label}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{desc}</div>
              </div>
              <Toggle value={value} onChange={onChange} />
            </div>
          ))}
        </Section>

        {/* Announcement */}
        <Section icon={Megaphone} title="Platform Announcement Banner">
          <div>
            <label className="text-[11px] uppercase tracking-widest font-black text-zinc-500 mb-2 block">Banner Message</label>
            <textarea
              value={announcement}
              onChange={e => setAnnouncement(e.target.value)}
              placeholder="e.g. Welcome to The Gents Dollhouse official launch..."
              rows={3}
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-2xl text-white text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/30 placeholder:text-zinc-600 resize-none transition-all"
            />
            <p className="text-xs text-zinc-600 mt-1">Leave empty to hide the banner. Visible to all platform users.</p>
          </div>
        </Section>

        {/* Payment Gateway Status */}
        <Section icon={CreditCard} title="Active Payment Gateways">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl">
              <div>
                <div className="text-sm font-bold text-white">M-Pesa Express (STK Push)</div>
                <div className="text-xs text-zinc-500 mt-0.5">Safaricom Daraja API Production Gateway</div>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">Active</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl">
              <div>
                <div className="text-sm font-bold text-white">Card Payments (Visa / Mastercard)</div>
                <div className="text-xs text-zinc-500 mt-0.5">Paystack Secure Checkout Gateway</div>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">Active</span>
            </div>
          </div>
        </Section>

        {/* Save */}
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-2xl ${saved ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-red-600 text-white hover:bg-red-500 shadow-red-600/20'}`}
        >
          {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Changes Saved!' : 'Save All Changes'}
        </button>

      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
