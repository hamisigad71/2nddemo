import CreatorLayout from '../components/CreatorLayout';
import { Bot, Save, Plus, Image as ImageIcon } from 'lucide-react';

const Automations = () => {
  return (
    <CreatorLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">Automations</h1>
          <p className="text-muted-foreground">Setup welcome messages and bots for new subscribers.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 font-bold rounded-lg shadow-lg hover:-translate-y-1 transition-transform">
          <Save className="w-5 h-5" /> Save Automations
        </button>
      </div>

      <div className="bg-background border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-border pb-6 mb-6">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                 <Bot className="w-6 h-6" />
              </div>
              <div>
                 <h2 className="text-lg font-bold">Welcome Message</h2>
                 <p className="text-sm text-muted-foreground">Sent instantly when a user subscribes.</p>
              </div>
           </div>
           <div className="w-12 h-6 bg-primary rounded-full relative cursor-pointer shadow-inner">
              <div className="absolute right-1 top-1 bg-white w-4 h-4 rounded-full shadow"></div>
           </div>
        </div>

        <div className="space-y-6">
           <div>
              <label className="block text-sm font-bold mb-2">Message Text</label>
              <textarea 
                rows={4} 
                defaultValue="Hey babe! Thank you so much for subscribing ❤️ Unlock this welcome video I made just for you!" 
                className="w-full bg-muted/30 border border-border px-4 py-3 rounded-xl focus:outline-none focus:border-primary resize-none" 
              />
           </div>

           <div>
              <label className="block text-sm font-bold mb-3">Attachment (PPV Option)</label>
              <div className="flex flex-col sm:flex-row gap-4">
                 
                 {/* Attached Video Mockup */}
                 <div className="w-48 h-32 bg-muted rounded-xl border border-border overflow-hidden relative cursor-pointer group">
                   <img src="https://images.unsplash.com/photo-1549490349-8643362247b5?w=500" alt="attachment" className="w-full h-full object-cover group-hover:brightness-75 transition-all" />
                   <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white">
                      <span className="text-secondary font-black tracking-widest mt-1">KES 500</span>
                      <span className="text-[10px] uppercase tracking-widest">Locked Message</span>
                   </div>
                 </div>

                 <button className="flex flex-col items-center justify-center w-full sm:w-48 h-32 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:border-primary hover:text-primary transition-colors bg-muted/10">
                    <ImageIcon className="w-6 h-6 mb-2" />
                    <span className="text-sm font-bold">Replace Media</span>
                 </button>
              </div>
           </div>
        </div>
      </div>
    </CreatorLayout>
  );
};
export default Automations;
