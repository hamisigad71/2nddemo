import { useState, useEffect } from 'react';
import CreatorLayout from '../../components/CreatorLayout';
import { Save, Shield, CreditCard, Smartphone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getUserProfile, updateUserProfile } from '../../lib/db';

const CreatorSettings = () => {
  const { user } = useAuth();
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Load existing phone from DB
  useEffect(() => {
    if (!user?.id) return;
    getUserProfile(user.id).then((profile) => {
      if (profile?.phone) {
        const raw = profile.phone.replace(/^\+254/, '').replace(/^0/, '');
        setPhone(raw);
      }
    });
  }, [user]);

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    setSaveMsg('');
    try {
      const fullPhone = phone
        ? `+254${phone.replace(/\s+/g, '').replace(/^0/, '').replace(/^\+254/, '')}`
        : null;
      await updateUserProfile(user.id, { phone: fullPhone });
      setSaveMsg('Saved successfully!');
    } catch (err: any) {
      setSaveMsg('Failed to save: ' + (err?.message || err));
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(''), 3000);
    }
  };

  return (
    <CreatorLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">Settings</h1>
          <p className="text-muted-foreground">Manage your subscription tiers and profile preferences.</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 font-bold rounded-lg shadow-lg hover:-translate-y-1 transition-transform disabled:opacity-60">
          <Save className="w-5 h-5" /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {saveMsg && (
        <div className={`mb-6 px-4 py-3 rounded-xl text-sm font-bold ${saveMsg.startsWith('Failed') ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-600'}`}>
          {saveMsg}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-8">
        
        {/* Navigation sidebar */}
        <div className="hidden md:flex flex-col gap-2">
           <button className="text-left px-4 py-3 rounded-xl font-bold bg-primary/10 text-primary">Subscription & Tiers</button>
           <button className="text-left px-4 py-3 rounded-xl font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">Profile Options</button>
           <button className="text-left px-4 py-3 rounded-xl font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">Privacy & Safety</button>
           <button className="text-left px-4 py-3 rounded-xl font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">Watermarks</button>
        </div>

        {/* Settings Content */}
        <div className="md:col-span-2 space-y-8">
           
           {/* M-Pesa Phone — REAL, saved to DB */}
           <div className="bg-background border border-border rounded-2xl p-6 shadow-sm">
             <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
                <Smartphone className="w-6 h-6 text-primary" />
                <h2 className="text-xl font-bold">M-Pesa Payout Number</h2>
             </div>
             <div className="max-w-sm">
               <label className="block text-sm font-bold mb-2">Safaricom Number</label>
               <div className="flex">
                 <span className="bg-muted border border-border border-r-0 px-4 py-3 rounded-l-xl text-muted-foreground font-medium flex items-center text-sm">+254</span>
                 <input
                   type="tel"
                   value={phone}
                   onChange={e => setPhone(e.target.value)}
                   placeholder="7XX XXX XXX"
                   className="w-full bg-muted/30 border border-border px-4 py-3 rounded-r-xl focus:outline-none focus:border-primary text-sm"
                 />
               </div>
               <p className="text-xs text-muted-foreground mt-2">This is where your earnings will be sent via M-Pesa B2C.</p>
             </div>
           </div>

           {/* Subscription Pricing */}
           <div className="bg-background border border-border rounded-2xl p-6 shadow-sm">
             <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
                <CreditCard className="w-6 h-6 text-primary" />
                <h2 className="text-xl font-bold">Subscription Pricing</h2>
             </div>
             
             <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold mb-4">Subscription Tiers</h3>
                  <p className="text-xs text-muted-foreground mb-4">Create multiple access levels for your fans. Higher tiers should offer more value.</p>
                  
                  <div className="space-y-4">
                     {/* Tier 1 */}
                     <div className="border border-border rounded-xl p-4 bg-muted/10 relative overflow-hidden group">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
                        <div className="flex items-center justify-between mb-3">
                           <input type="text" defaultValue="Fan" className="font-bold text-base bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-primary rounded px-1" />
                           <div className="flex items-center">
                              <span className="text-muted-foreground text-sm font-bold mr-2">KES</span>
                              <input type="number" defaultValue={500} className="w-20 bg-background border border-border px-2 py-1 rounded-lg font-bold focus:outline-none focus:border-primary text-right" />
                           </div>
                        </div>
                        <textarea className="w-full text-xs text-muted-foreground bg-transparent border-none focus:outline-none resize-none h-12" defaultValue="Access to my exclusive daily posts, voting on next week's content, and an ad-free experience." />
                     </div>
                     
                     {/* Tier 2 */}
                     <div className="border border-border rounded-xl p-4 bg-primary/5 relative overflow-hidden group">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-emerald-500"></div>
                        <div className="flex items-center justify-between mb-3">
                           <input type="text" defaultValue="Superfan" className="font-bold text-base text-primary bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-primary rounded px-1" />
                           <div className="flex items-center">
                              <span className="text-muted-foreground text-sm font-bold mr-2">KES</span>
                              <input type="number" defaultValue={1500} className="w-20 bg-background border border-border px-2 py-1 rounded-lg font-bold focus:outline-none focus:border-primary text-right" />
                           </div>
                        </div>
                        <textarea className="w-full text-xs text-muted-foreground bg-transparent border-none focus:outline-none resize-none h-12" defaultValue="Everything in Fan tier + monthly live streams, direct messaging access, and behind-the-scenes vlogs." />
                     </div>

                     {/* Tier 3 */}
                     <div className="border border-border rounded-xl p-4 bg-gradient-to-br from-amber-500/5 to-orange-500/5 relative overflow-hidden group">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-500 to-orange-500"></div>
                        <div className="flex items-center justify-between mb-3">
                           <input type="text" defaultValue="VIP Inner Circle" className="font-black text-base text-amber-600 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-amber-500 rounded px-1" />
                           <div className="flex items-center">
                              <span className="text-muted-foreground text-sm font-bold mr-2">KES</span>
                              <input type="number" defaultValue={5000} className="w-20 bg-background border border-border px-2 py-1 rounded-lg font-bold focus:outline-none focus:border-primary text-right" />
                           </div>
                        </div>
                        <textarea className="w-full text-xs text-muted-foreground bg-transparent border-none focus:outline-none resize-none h-12" defaultValue="Everything in Superfan + 1-on-1 monthly video calls, priority responses, and exclusive physical merch each year." />
                     </div>
                  </div>
                  <button className="mt-4 w-full py-3 border-2 border-dashed border-border text-muted-foreground font-bold rounded-xl hover:border-primary hover:text-primary transition-colors text-sm">
                     + Add New Tier
                  </button>
                </div>
             </div>
           </div>

           {/* Privacy & Watermarks */}
           <div className="bg-background border border-border rounded-2xl p-6 shadow-sm">
             <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
                <Shield className="w-6 h-6 text-primary" />
                <h2 className="text-xl font-bold">Privacy & Watermarks</h2>
             </div>
             
             <div className="space-y-6">
                <div className="flex items-center justify-between">
                   <div>
                     <div className="font-bold text-sm mb-1">Apply Watermark to Media</div>
                     <div className="text-xs text-muted-foreground">Automatically place your username on uploaded photos and videos.</div>
                   </div>
                   <div className="w-12 h-6 bg-primary rounded-full relative cursor-pointer shadow-inner">
                      <div className="absolute right-1 top-1 bg-white w-4 h-4 rounded-full shadow"></div>
                   </div>
                </div>
                
                <div className="flex items-center justify-between">
                   <div>
                     <div className="font-bold text-sm mb-1">Block Screenshots (App Only)</div>
                     <div className="text-xs text-muted-foreground">Prevents iOS and Android users from taking screenshots of your content.</div>
                   </div>
                   <div className="w-12 h-6 bg-primary rounded-full relative cursor-pointer shadow-inner">
                      <div className="absolute right-1 top-1 bg-white w-4 h-4 rounded-full shadow"></div>
                   </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <label className="block text-sm font-bold mb-2">Geoblocking</label>
                  <p className="text-xs text-muted-foreground mb-3">Hide your profile from specific countries or regions.</p>
                  <button className="border border-border text-foreground px-4 py-2 text-sm font-bold rounded-lg hover:bg-muted transition-colors">
                     Manage Blocked Regions
                  </button>
                </div>
             </div>
           </div>

        </div>
      </div>
    </CreatorLayout>
  );
};
export default CreatorSettings;
