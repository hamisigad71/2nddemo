import { useState } from 'react';
import CreatorLayout from '../../components/CreatorLayout';
import { Search, Image as ImageIcon, Send, MoreHorizontal, ArrowLeft } from 'lucide-react';

const Messages = () => {
  const [selectedChat, setSelectedChat] = useState<number | null>(null);

  return (
    <CreatorLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1">Messages</h1>
          <p className="text-muted-foreground">Engage with your fans directly. Setup PPVs here.</p>
        </div>
        <button className="bg-primary text-primary-foreground px-4 py-2 font-bold rounded-lg shadow-lg hover:-translate-y-1 transition-transform">
          New Mass Message
        </button>
      </div>

      <div className="bg-background border border-border rounded-2xl overflow-hidden shadow-sm flex h-[75svh] md:h-[600px]">
        {/* Chat List */}
        <div className={`w-full md:w-1/3 border-r border-border flex-col bg-muted/10 ${selectedChat !== null ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" placeholder="Search chats..." className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
             {[1, 2, 3, 4, 5, 6].map((i) => (
               <div 
                 key={i} 
                 onClick={() => setSelectedChat(i)}
                 className={`p-4 flex gap-3 cursor-pointer border-b border-border/50 hover:bg-background ${selectedChat === i || (selectedChat === null && i === 1) ? 'bg-background border-l-4 border-l-primary' : ''}`}
               >
                 <div className="relative">
                   <img src={`https://i.pravatar.cc/150?img=${i+40}`} alt="user" className="w-12 h-12 rounded-full object-cover" />
                   {i <= 2 && <span className="absolute bottom-0 right-0 w-3 h-3 bg-secondary rounded-full border-2 border-background"></span>}
                 </div>
                 <div className="flex-1 overflow-hidden">
                   <div className="flex justify-between items-center mb-1">
                     <span className="font-bold text-sm truncate">Fan {i}</span>
                     <span className="text-xs text-muted-foreground">2m</span>
                   </div>
                   <p className="text-xs text-muted-foreground truncate">Can't wait for the next drop!</p>
                 </div>
               </div>
             ))}
          </div>
        </div>

        {/* Chat Canvas */}
        <div className={`flex-1 flex-col ${selectedChat === null ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-border flex justify-between items-center bg-background">
            <div className="flex items-center gap-3">
              <button 
                className="md:hidden p-2 -ml-2 mr-1 text-muted-foreground hover:bg-muted rounded-full transition-colors"
                onClick={() => setSelectedChat(null)}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <img src="https://i.pravatar.cc/150?img=41" alt="user" className="w-10 h-10 rounded-full" />
              <div>
                <div className="font-bold text-sm">Fan {selectedChat || 1}</div>
                <div className="text-xs flex items-center gap-1 text-primary">Active Subscriber</div>
              </div>
            </div>
            <button className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors">
               <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-muted/5">
             <div className="self-start max-w-[70%] bg-muted/30 border border-border rounded-2xl rounded-tl-none p-3 text-sm">
                Hey, loved the new video! Do you take custom requests?
             </div>
             <div className="self-end max-w-[70%] bg-primary text-primary-foreground rounded-2xl rounded-tr-none p-3 text-sm shadow-md">
                Absolutely! Let me know what you have in mind. Here's my tip menu in the meantime. 
             </div>
             
             {/* Locked PPV Example */}
             <div className="self-end max-w-[70%]">
               <div className="bg-background border border-border rounded-xl overflow-hidden shadow-sm relative group cursor-pointer hover:border-primary/50 transition-colors">
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center text-white z-10 transition-opacity">
                     <span className="text-lg font-black tracking-widest text-secondary mt-1">KES 1,000</span>
                     <span className="text-xs font-medium uppercase tracking-widest opacity-80 mt-1">Locked Message</span>
                  </div>
                  <img src="https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=500" alt="locked content" className="w-full h-40 object-cover blur-sm" />
               </div>
             </div>
          </div>

          <div className="p-2 sm:p-4 border-t border-border bg-background flex gap-2 items-center">
             <button className="p-2 sm:p-2.5 shrink-0 text-muted-foreground hover:bg-primary/10 hover:text-primary rounded-full transition-colors">
               <ImageIcon className="w-5 h-5" />
             </button>
             <button className="py-1.5 px-2 sm:px-3 shrink-0 border border-secondary text-secondary rounded-full text-[10px] sm:text-xs font-bold hover:bg-secondary/10 transition-colors">
               + PPV
             </button>
             <input type="text" placeholder="Type a message..." className="flex-1 min-w-0 bg-muted/20 border border-border px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-sm focus:outline-none focus:border-primary" />
             <button className="p-2 sm:p-2.5 shrink-0 bg-primary text-primary-foreground rounded-full shadow-lg hover:scale-105 transition-transform">
               <Send className="w-4 h-4 sm:w-5 sm:h-5 -ml-0.5 mt-0.5" />
             </button>
          </div>
        </div>
      </div>
    </CreatorLayout>
  );
};
export default Messages;
