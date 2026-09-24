import CreatorLayout from '../components/CreatorLayout';
import { Save, Shield, Image as ImageIcon, CreditCard } from 'lucide-react';

const CreatorSettings = () => {
  return (
    <CreatorLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">Settings</h1>
          <p className="text-muted-foreground">Manage your subscription tiers and profile preferences.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 font-bold rounded-lg shadow-lg hover:-translate-y-1 transition-transform">
          <Save className="w-5 h-5" /> Save Changes
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        
        {/* Navigation / Sections sidebar on Desktop (internal for settings) */}
        <div className="hidden md:flex flex-col gap-2">
           <button className="text-left px-4 py-3 rounded-xl font-bold bg-primary/10 text-primary">Subscription & Tiers</button>
           <button className="text-left px-4 py-3 rounded-xl font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">Profile Options</button>
           <button className="text-left px-4 py-3 rounded-xl font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">Privacy & Safety</button>
           <button className="text-left px-4 py-3 rounded-xl font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">Watermarks</button>
        </div>

        {/* Settings Form Content */}
        <div className="md:col-span-2 space-y-8">
           
           {/* Section 1 */}
           <div className="bg-background border border-border rounded-2xl p-6 shadow-sm">
             <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
                <CreditCard className="w-6 h-6 text-primary" />
                <h2 className="text-xl font-bold">Subscription Pricing</h2>
             </div>
             
             <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold mb-2">Monthly Subscription Price</label>
                  <p className="text-xs text-muted-foreground mb-3">Set how much fans pay per month to access your exclusive feed.</p>
                  <div className="flex items-center">
                    <span className="bg-muted border border-border border-r-0 px-4 py-3 rounded-l-xl font-bold text-muted-foreground">KES</span>
                    <input type="number" defaultValue={500} className="w-full max-w-[200px] border border-border bg-background px-4 py-3 rounded-r-xl font-bold focus:outline-none focus:border-primary" />
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                   <div className="flex items-center justify-between font-bold mb-2">
                     <span>Subscription Bundles</span>
                     <button className="text-xs text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20">Add Bundle</button>
                   </div>
                   <p className="text-xs text-muted-foreground mb-4">Offer discounts to fans who subscribe for multiple months at once.</p>
                   
                   <div className="flex items-center justify-between border border-border rounded-xl p-4 bg-muted/20">
                     <div className="flex items-center gap-4">
                       <div className="font-bold">3 Months</div>
                       <div className="text-sm px-2 py-1 bg-secondary/10 text-secondary border border-secondary/20 rounded-md">10% OFF</div>
                     </div>
                     <div className="font-bold text-primary">KES 1,350</div>
                   </div>
                </div>
             </div>
           </div>

           {/* Section 2 */}
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
