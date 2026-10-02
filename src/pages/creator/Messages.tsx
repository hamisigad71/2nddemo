import { useState } from 'react';
import CreatorLayout from '../../components/CreatorLayout';
import { Search, Image as ImageIcon, Send, MoreHorizontal, ArrowLeft } from 'lucide-react';

const Messages = () => {
  const [selectedChat, setSelectedChat] = useState<number | null>(null);

  return (
    <CreatorLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1 tracking-tight">Messages</h1>
          <p className="text-muted-foreground text-sm">Engage with your fans directly. Setup PPVs here.</p>
        </div>
        <button className="bg-primary text-primary-foreground px-5 py-2.5 font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-200">
          New Mass Message
        </button>
      </div>

      <div className="bg-background border border-border rounded-3xl overflow-hidden shadow-sm flex h-[75svh] md:h-[650px] relative">
        
        {/* Chat List */}
        <div className={`w-full md:w-[320px] lg:w-[350px] border-r border-border flex-col bg-background/50 backdrop-blur-md z-10 ${selectedChat !== null ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-border/50">
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input type="text" placeholder="Search chats..." className="w-full pl-10 pr-4 py-2.5 bg-foreground/5 border-transparent outline-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:bg-background transition-all" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-sleek py-2">
             {[1, 2, 3, 4, 5, 6].map((i) => {
               const isActive = selectedChat === i || (selectedChat === null && i === 1);
               return (
                 <div 
                   key={i} 
                   onClick={() => setSelectedChat(i)}
                   className={`mx-2 my-1 px-3 py-3 rounded-2xl flex gap-3 cursor-pointer transition-all duration-200 group ${isActive ? 'bg-primary/10' : 'hover:bg-foreground/5'}`}
                 >
                   <div className="relative shrink-0">
                     <img src={`https://i.pravatar.cc/150?img=${i+40}`} alt="user" className="w-12 h-12 rounded-full object-cover shadow-sm" />
                     {i <= 2 && <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-[2.5px] border-background animate-pulse"></span>}
                   </div>
                   <div className="flex-1 min-w-0 flex flex-col justify-center">
                     <div className="flex justify-between items-center mb-0.5">
                       <span className={`font-bold text-[14px] truncate ${isActive ? 'text-primary' : 'text-foreground'}`}>Fan {i}</span>
                       <span className="text-[11px] text-muted-foreground font-medium">2m</span>
                     </div>
                     <p className={`text-[13px] truncate ${isActive ? 'text-primary/80 font-medium' : 'text-muted-foreground'}`}>Can't wait for the next drop!</p>
                   </div>
                 </div>
               );
             })}
          </div>
        </div>

        {/* Chat Canvas */}
        <div className={`flex-1 flex flex-col bg-background/30 relative ${selectedChat === null ? 'hidden md:flex' : 'flex'}`}>
          {/* subtle pattern bg */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, var(--foreground) 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
          
          <div className="px-4 py-3 border-b border-border/50 flex justify-between items-center bg-background/80 backdrop-blur-md z-20">
            <div className="flex items-center gap-3">
              <button 
                className="md:hidden p-2 -ml-2 text-muted-foreground hover:bg-muted/50 rounded-full transition-colors"
                onClick={() => setSelectedChat(null)}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="relative">
                <img src="https://i.pravatar.cc/150?img=41" alt="user" className="w-10 h-10 rounded-full object-cover shadow-sm ring-2 ring-primary/20" />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-background"></span>
              </div>
              <div>
                <div className="font-bold text-sm tracking-tight text-foreground">Fan {selectedChat || 1}</div>
                <div className="text-[11px] font-semibold text-emerald-500 mt-0.5 tracking-wide uppercase">Active Subscriber</div>
              </div>
            </div>
            <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-full transition-colors">
               <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5 z-10 scrollbar-sleek">
             <div className="self-start max-w-[85%] md:max-w-[70%] bg-foreground/5 border border-border/40 text-foreground rounded-2xl rounded-tl-[4px] px-4 py-3 text-[14px] leading-relaxed shadow-sm">
                Hey, loved the new video! Do you take custom requests?
             </div>
             
             <div className="self-end max-w-[85%] md:max-w-[70%] bg-primary text-primary-foreground rounded-2xl rounded-tr-[4px] px-4 py-3 text-[14px] leading-relaxed shadow-md shadow-primary/20">
                Absolutely! Let me know what you have in mind. Here's my tip menu in the meantime. 
             </div>
             
             {/* Locked PPV Example */}
             <div className="self-end max-w-[85%] sm:max-w-[300px]">
               <div className="bg-background border-2 border-primary/20 hover:border-primary/50 rounded-2xl overflow-hidden shadow-lg shadow-primary/10 relative group cursor-pointer transition-all duration-300 transform hover:-translate-y-1 block">
                  <div className="absolute inset-0 bg-background/40 backdrop-blur-md flex flex-col items-center justify-center text-foreground z-10 transition-colors group-hover:bg-background/20">
                     <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                       <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                     </div>
                     <span className="text-xl font-black tracking-tight text-foreground">KES 1,000</span>
                     <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1.5">Unlock Content</span>
                  </div>
                  <img src="https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=500" alt="locked content" className="w-full h-48 object-cover blur-[10px] scale-110 opacity-70" />
               </div>
               <div className="text-right text-[10px] text-muted-foreground mt-1 mr-1">Delivered</div>
             </div>
          </div>

          <div className="p-3 md:p-4 bg-background/80 backdrop-blur-md border-t border-border/50 flex gap-2 sm:gap-3 items-end z-20">
             <button className="p-2.5 sm:p-3 shrink-0 text-muted-foreground hover:bg-foreground/5 hover:text-foreground rounded-full transition-colors self-center">
               <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6" />
             </button>
             <div className="flex-1 bg-foreground/5 border border-transparent focus-within:border-primary/30 focus-within:bg-background rounded-3xl min-h-[44px] sm:min-h-[50px] flex items-center transition-all p-1">
               <button className="h-8 sm:h-10 px-3 sm:px-4 shrink-0 bg-primary/10 text-primary border border-primary/20 rounded-full text-[11px] sm:text-xs font-bold hover:bg-primary hover:text-primary-foreground transition-all flex items-center justify-center">
                 + PPV
               </button>
               <input type="text" placeholder="Type a message..." className="flex-1 min-w-0 bg-transparent border-none px-3 py-2 text-sm focus:outline-none focus:ring-0 placeholder:text-muted-foreground" />
             </div>
             <button className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 bg-primary text-primary-foreground rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all flex items-center justify-center self-center group">
               <Send className="w-4 h-4 sm:w-5 sm:h-5 -ml-0.5 mt-0.5 group-hover:scale-110 transition-transform" />
             </button>
          </div>
        </div>
      </div>
    </CreatorLayout>
  );
};
export default Messages;
