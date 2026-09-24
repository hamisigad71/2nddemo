import { useState } from 'react';
import UserLayout from '../../components/UserLayout';
import { Search, Image as ImageIcon, Send, ArrowLeft, Lock, MessageCircle } from 'lucide-react';

const UserMessages = () => {
  const [selectedChat, setSelectedChat] = useState<number | null>(null);

  return (
    <UserLayout>
       <div className="mb-6">
           <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
       </div>

       <div className="bg-background border border-border rounded-2xl overflow-hidden shadow-sm flex h-[75svh] md:h-[650px]">
          {/* Chat List */}
          <div className={`w-full md:w-1/3 border-r border-border flex-col bg-muted/10 ${selectedChat !== null ? 'hidden md:flex' : 'flex'}`}>
             <div className="p-4 border-b border-border">
                <div className="relative">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                   <input type="text" placeholder="Search creators..." className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-secondary" />
                </div>
             </div>
             <div className="flex-1 overflow-y-auto">
                {[1, 2, 3].map((i) => (
                   <div 
                     key={i} 
                     onClick={() => setSelectedChat(i)}
                     className={`p-4 flex gap-3 cursor-pointer border-b border-border/50 hover:bg-background ${selectedChat === i ? 'bg-background border-l-4 border-l-secondary' : ''}`}
                   >
                     <img src={`https://i.pravatar.cc/150?img=${i+10}`} alt="creator" className="w-12 h-12 rounded-full object-cover" />
                     <div className="flex-1 overflow-hidden">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-sm truncate">Creator {i}</span>
                          <span className="text-xs text-primary font-bold">Unread</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                           <Lock className="w-3 h-3 text-secondary" /> Locked Message
                        </p>
                     </div>
                   </div>
                ))}
             </div>
          </div>

          {/* Chat Canvas */}
          <div className={`flex-1 flex-col bg-muted/5 ${selectedChat === null ? 'hidden md:flex' : 'flex'}`}>
             {selectedChat === null ? (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
                   <MessageCircle className="w-12 h-12 mb-4 opacity-20" />
                   <p>Select a creator to start messaging</p>
                </div>
             ) : (
                <>
                   {/* Header */}
                   <div className="p-4 border-b border-border flex justify-between items-center bg-background shadow-sm z-10">
                      <div className="flex items-center gap-3">
                        <button 
                          className="md:hidden p-2 -ml-2 mr-1 text-muted-foreground hover:bg-muted rounded-full transition-colors"
                          onClick={() => setSelectedChat(null)}
                        >
                          <ArrowLeft className="w-5 h-5" />
                        </button>
                        <img src="https://i.pravatar.cc/150?img=11" alt="creator" className="w-10 h-10 rounded-full" />
                        <div>
                          <div className="font-bold text-sm">Creator {selectedChat}</div>
                          <div className="text-xs text-muted-foreground">Active now</div>
                        </div>
                      </div>
                      <button className="text-sm font-bold text-secondary bg-secondary/10 px-4 py-1.5 rounded-full hover:bg-secondary/20 transition-colors">
                         Tip Creator
                      </button>
                   </div>

                   {/* Messages list */}
                   <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                      
                      <div className="self-start max-w-[75%] bg-background shadow-sm border border-border rounded-2xl rounded-tl-none p-4 text-sm">
                         Thanks for subscribing! 🥰 Let me know if you want any custom videos!
                      </div>

                      {/* Locked PPV */}
                      <div className="self-start max-w-[85%] sm:max-w-[320px] w-full">
                         <div className="bg-background border-2 border-secondary/20 hover:border-secondary transition-colors rounded-xl overflow-hidden shadow-sm relative group cursor-pointer">
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center text-white z-10 p-4 text-center">
                               <Lock className="w-8 h-8 text-secondary mb-2" />
                               <span className="text-secondary font-black tracking-widest text-lg">KES 1,500</span>
                               <span className="text-xs font-medium opacity-90 mt-2">Unlock Exclusive 5-Minute Video</span>
                               <button className="mt-4 bg-secondary text-secondary-foreground font-bold px-6 py-2 rounded-full w-full hover:scale-105 transition-transform">
                                  Pay & Unlock
                               </button>
                            </div>
                            <img src="https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=500" alt="locked content" className="w-full h-56 object-cover blur-sm" />
                         </div>
                      </div>

                   </div>

                   {/* Input Area */}
                   <div className="p-2 sm:p-4 border-t border-border bg-background flex gap-2 items-center">
                      <button className="p-2 sm:p-2.5 shrink-0 text-muted-foreground hover:bg-secondary/10 hover:text-secondary rounded-full transition-colors">
                        <ImageIcon className="w-5 h-5" />
                      </button>
                      <input type="text" placeholder="Message Creator..." className="flex-1 min-w-0 bg-muted/20 border border-border px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-sm focus:outline-none focus:border-secondary" />
                      <button className="p-2 sm:p-2.5 shrink-0 bg-secondary text-secondary-foreground rounded-full shadow-lg hover:scale-105 transition-transform">
                        <Send className="w-4 h-4 sm:w-5 sm:h-5 -ml-0.5 mt-0.5" />
                      </button>
                   </div>
                </>
             )}
          </div>
       </div>

    </UserLayout>
  );
};
export default UserMessages;
