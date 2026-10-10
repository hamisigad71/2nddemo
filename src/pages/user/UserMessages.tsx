import { useState } from 'react';
import UserLayout from '../../components/UserLayout';
import { Search, Image as ImageIcon, Send, ArrowLeft, Lock, MessageCircle, MoreVertical } from 'lucide-react';
import TipModal from '../../components/TipModal';

const UserMessages = () => {
  const [selectedChat, setSelectedChat] = useState<number | null>(1);
  const [isTipOpen, setIsTipOpen] = useState(false);

  return (
    <UserLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white mb-1">
            Messages
          </h1>
          <p className="text-zinc-400 text-sm">
            Direct & exclusive creator communications
          </p>
        </div>
      </div>

      <div className="bg-black border border-white/10 rounded-[28px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex h-[78svh] md:h-[680px]">
        {/* Chat List Sidebar */}
        <div className={`w-full md:w-80 lg:w-96 border-r border-white/10 flex-col bg-zinc-950/80 ${selectedChat !== null ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-white/10">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search creators..."
                className="w-full pl-10 pr-4 py-2.5 bg-black border border-white/10 rounded-xl text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-red-500/60 focus:ring-1 focus:ring-red-500/60 transition-all"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                onClick={() => setSelectedChat(i)}
                className={`p-4 flex gap-3.5 cursor-pointer transition-all ${
                  selectedChat === i
                    ? 'bg-zinc-900/90 border-l-4 border-l-red-600'
                    : 'hover:bg-white/[0.03]'
                }`}
              >
                <div className="relative">
                  <img
                    src={`https://i.pravatar.cc/150?img=${i + 10}`}
                    alt="creator"
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-red-500/30 ring-offset-2 ring-offset-black"
                  />
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-black" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-sm text-white truncate">Creator {i}</span>
                    <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Unread</span>
                  </div>
                  <p className="text-xs text-zinc-400 truncate flex items-center gap-1.5 font-medium">
                    <Lock className="w-3.5 h-3.5 text-red-500 shrink-0" /> Locked Message
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Canvas */}
        <div className={`flex-1 flex-col bg-zinc-950/40 ${selectedChat === null ? 'hidden md:flex' : 'flex'}`}>
          {selectedChat === null ? (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                <MessageCircle className="w-8 h-8 text-zinc-600" />
              </div>
              <h3 className="text-white font-bold text-base mb-1">Your Inbox</h3>
              <p className="text-sm text-zinc-400 max-w-xs">Select a creator conversation to view exclusive media and messages.</p>
            </div>
          ) : (
            <>
              {/* Canvas Header */}
              <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-black/80 backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                  <button
                    className="md:hidden p-2 -ml-2 mr-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    onClick={() => setSelectedChat(null)}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <img
                    src={`https://i.pravatar.cc/150?img=${selectedChat + 10}`}
                    alt="creator"
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-red-500/40 ring-offset-2 ring-offset-black"
                  />
                  <div>
                    <div className="font-bold text-sm text-white">Creator {selectedChat}</div>
                    <div className="text-xs text-zinc-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Active now
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setIsTipOpen(true)}
                    className="text-xs font-bold text-white bg-red-600 hover:bg-red-500 px-4 py-2 rounded-full transition-all shadow-[0_2px_10px_rgba(220,38,38,0.3)] active:scale-95"
                  >
                    Tip Creator 💸
                  </button>
                  <button className="p-2 text-zinc-500 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Messages Feed */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 bg-gradient-to-b from-black/60 to-zinc-950/90">
                {/* Standard Message */}
                <div className="self-start max-w-[80%] md:max-w-[70%] bg-zinc-900 border border-white/10 rounded-2xl rounded-tl-sm p-4 text-xs md:text-sm text-zinc-200 leading-relaxed shadow-sm">
                  Thanks for subscribing! 🥰 Let me know if you want any custom videos!
                </div>

                {/* Locked Media Card */}
                <div className="self-start max-w-[88%] sm:max-w-[340px] w-full">
                  <div className="bg-black border border-white/10 rounded-2xl overflow-hidden shadow-xl relative group">
                    <div className="relative h-60 w-full overflow-hidden bg-zinc-950">
                      <img
                        src="https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=500"
                        alt="locked content"
                        className="w-full h-full object-cover blur-lg opacity-60 scale-105"
                      />
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
                        {/* Lock Icon */}
                        <div className="w-12 h-12 rounded-xl bg-black/70 border border-red-500/40 flex items-center justify-center mb-3">
                          <Lock className="w-5 h-5 text-red-500" />
                        </div>
                        
                        <p className="text-white font-bold text-sm tracking-tight mb-1">
                          Unlock Exclusive 5-Minute Video
                        </p>
                        <span className="text-red-400 font-extrabold text-lg mb-4 tracking-wider">
                          KES 1,500
                        </span>
                        
                        <button className="w-full bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider py-3 px-6 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]">
                          Pay & Unlock
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Input Control */}
              <div className="p-4 border-t border-white/10 bg-black/90 flex gap-3 items-center">
                <button className="p-2.5 shrink-0 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                  <ImageIcon className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  placeholder="Message Creator..."
                  className="flex-1 min-w-0 bg-zinc-950 border border-white/10 px-4 py-2.5 rounded-full text-xs md:text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-red-500/60 focus:ring-1 focus:ring-red-500/60 transition-all"
                />
                <button className="p-2.5 shrink-0 bg-red-600 hover:bg-red-500 text-white rounded-full transition-all hover:scale-105 active:scale-95 shadow-[0_2px_10px_rgba(220,38,38,0.3)]">
                  <Send className="w-4 h-4 -ml-0.5" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <TipModal
        isOpen={isTipOpen}
        onClose={() => setIsTipOpen(false)}
        creatorName={`Creator ${selectedChat || 1}`}
      />
    </UserLayout>
  );
};

export default UserMessages;
