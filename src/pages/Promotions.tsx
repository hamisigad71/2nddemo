import CreatorLayout from '../components/CreatorLayout';
import { Tag, Copy, Plus, Activity } from 'lucide-react';

const Promotions = () => {
  return (
    <CreatorLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">Promotions & Campaigns</h1>
          <p className="text-muted-foreground">Create tracking links and discount campaigns to acquire fans.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 font-bold rounded-lg shadow-lg hover:-translate-y-1 transition-transform">
          <Plus className="w-5 h-5" /> New Campaign
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
         <div className="bg-background border border-border rounded-2xl p-6 shadow-sm col-span-2">
            <h2 className="text-xl font-bold mb-6">Active Campaigns</h2>
            <div className="space-y-4">
               {[
                 { name: "Twitter Flash Sale 50%", clicks: 450, subs: 23, limit: "23/50 uses" },
                 { name: "TikTok Bio Link", clicks: 1205, subs: 112, limit: "No limit" }
               ].map((camp, i) => (
                 <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-border rounded-xl bg-muted/10 hover:border-primary/50 transition-colors">
                    <div className="mb-4 sm:mb-0">
                       <div className="font-bold flex items-center gap-2 text-lg">
                         <Tag className="w-4 h-4 text-primary" /> {camp.name}
                       </div>
                       <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                          <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> {camp.clicks} Clicks</span>
                          <span>{camp.subs} Conversions</span>
                          <span className="px-2 py-0.5 bg-secondary/10 text-secondary rounded-full">{camp.limit}</span>
                       </div>
                    </div>
                    <div className="flex gap-2">
                       <button className="flex items-center gap-1 px-3 py-1.5 bg-muted border border-border rounded-lg text-sm font-bold hover:bg-input">
                         <Copy className="w-4 h-4" /> Copy Link
                       </button>
                    </div>
                 </div>
               ))}
            </div>
         </div>

         <div className="bg-background border border-border rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-4">Quick Form: Free Trial Link</h2>
            <p className="text-xs text-muted-foreground mb-4">Generate a link that grants new fans 3 days of free access before charging.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1">Max Uses</label>
                <input type="number" defaultValue={10} className="w-full bg-muted/30 border border-border px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Expiration</label>
                <input type="date" className="w-full bg-muted/30 border border-border px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-primary" />
              </div>
              <button className="w-full py-2 bg-secondary text-secondary-foreground font-bold rounded-lg shadow mt-2">
                Generate Link
              </button>
            </div>
         </div>
      </div>
    </CreatorLayout>
  );
};
export default Promotions;
