import { useState } from 'react';
import { Save, Settings, DollarSign, Shield, CreditCard, Megaphone, Bell, CheckCircle, Users } from 'lucide-react';
import AdminLayout from './AdminLayout';

const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
  <button
    onClick={() => onChange(!value)}
    className={`relative w-12 h-6 rounded-full transition-colors duration-300 border ${value ? 'bg-red-600 border-red-500' : 'bg-zinc-800 border-zinc-700'}`}
  >
    <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${value ? 'translate-x-6' : 'translate-x-0'}`} />
  </button>
);

const AdminSettings = () => {
  const [platformFee, setPlatformFee] = useState('15');
  const [minPayout, setMinPayout] = useState('1000');
  const [announcement, setAnnouncement] = useState('');
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [newCreators, setNewCreators] = useState(true);
  const [autoApprove, setAutoApprove] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
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
      <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-3xl mx-auto">

        {/* Header */}
        <div className="bg-gradient-to-r from-[#0d0e12] to-[#14161d] p-6 lg:p-8 rounded-3xl border border-zinc-800/80 shadow-2xl relative overflow-hidden">
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
              placeholder="e.g. We are performing scheduled maintenance on Oct 15..."
              rows={3}
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-2xl text-white text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/30 placeholder:text-zinc-600 resize-none transition-all"
            />
            <p className="text-xs text-zinc-600 mt-1">Leave empty to hide the banner. Visible to all platform users.</p>
          </div>
        </Section>

        {/* Payment Gateway */}
        <Section icon={CreditCard} title="Payment Gateway Keys">
          {[
            { label: 'M-Pesa Consumer Key', placeholder: 'sk_mpesa_xxxxxxxxxxxxx' },
            { label: 'M-Pesa Consumer Secret', placeholder: 'cs_mpesa_xxxxxxxxxxxxx' },
            { label: 'Stripe API Key (Optional)', placeholder: 'sk_live_xxxxxxxxxxxxx' },
          ].map(({ label, placeholder }, i) => (
            <div key={i}>
              <label className="text-[11px] uppercase tracking-widest font-black text-zinc-500 mb-2 block">{label}</label>
              <input
                type="password" placeholder={placeholder}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-2xl text-white text-sm font-mono focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/30 placeholder:text-zinc-600 transition-all"
              />
            </div>
          ))}
        </Section>

        {/* Security */}
        <Section icon={Shield} title="Admin Security">
          <div className="space-y-3">
            {[
              { label: 'Change Admin Password', desc: 'Update your super admin credentials' },
              { label: 'Two-Factor Authentication', desc: 'Enable 2FA for login security' },
              { label: 'Session Management', desc: 'View and revoke active admin sessions' },
            ].map(({ label, desc }, i) => (
              <button key={i} className="w-full text-left px-5 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-red-500/30 hover:bg-zinc-900/80 transition-all group">
                <div className="font-bold text-white text-sm group-hover:text-red-400 transition-colors">{label}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{desc}</div>
              </button>
            ))}
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
