import React, { useState, useEffect, useRef } from 'react';
import CreatorLayout from '../../components/CreatorLayout';
import { 
  Search, 
  Send, 
  ArrowLeft, 
  Lock, 
  Plus, 
  X, 
  ShieldAlert, 
  CheckCircle2, 
  MessageSquare,
  Megaphone,
  AlertCircle,
  ShieldCheck,
  CheckCheck,
  Info,
  Zap,
  Heart,
  MessageCircle
} from 'lucide-react';
import MassPPVModal from '../../components/MassPPVModal';
import { useAuth } from '../../context/AuthContext';
import { 
  getCreatorChatConversations, 
  getChatMessages, 
  sendChatMessage 
} from '../../lib/db';
import type { ChatParticipant, ChatMessage } from '../../lib/db';
import { validateChatMessage, stripDigits } from '../../lib/chatFilter';
import { supabase } from '../../lib/supabase';
import { resolveUserAvatar, getDefaultAvatar } from '../../lib/avatar';
import { formatLastSeenStatus } from '../../lib/dateUtils';

type FanFilterTab = 'all' | 'vip' | 'online';

const Messages = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ChatParticipant[]>([]);
  const [selectedFan, setSelectedFan] = useState<ChatParticipant | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Filter tabs for sidebar
  const [filterTab, setFilterTab] = useState<FanFilterTab>('all');
  const [showFanInfo, setShowFanInfo] = useState(false);

  // Message input state
  const [inputText, setInputText] = useState('');
  const [filterWarning, setFilterWarning] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // PPV Creation Modal state
  const [isPpvModalOpen, setIsPpvModalOpen] = useState(false);
  const [isMassPpvOpen, setIsMassPpvOpen] = useState(false);
  const [ppvPrice, setPpvPrice] = useState('1000');
  const [ppvTitle, setPpvTitle] = useState('Exclusive VIP Photo Set');
  const [ppvImageUrl, setPpvImageUrl] = useState('https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const warningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. Load Fans / Subscribers
  useEffect(() => {
    let isMounted = true;

    async function loadFans() {
      if (!user) {
        setLoadingChats(false);
        return;
      }
      try {
        setLoadingChats(true);
        const list = await getCreatorChatConversations(user.id);
        if (isMounted) {
          setConversations(list);
          if (list.length > 0 && !selectedFan) {
            setSelectedFan(list[0]);
          }
        }
      } catch (err) {
        console.error('Error loading creator fans:', err);
      } finally {
        if (isMounted) setLoadingChats(false);
      }
    }

    loadFans();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // 2. Load Messages Thread for Selected Fan
  useEffect(() => {
    if (!selectedFan || !user) return;
    let isMounted = true;

    async function loadThread() {
      if (!selectedFan || !user) return;
      setLoadingMessages(true);
      try {
        const msgs = await getChatMessages(user.id, selectedFan.id);
        if (isMounted) {
          setMessages(msgs);
        }
      } catch (err) {
        console.error('Error loading messages thread:', err);
      } finally {
        if (isMounted) {
          setLoadingMessages(false);
          setTimeout(scrollToBottom, 100);
        }
      }
    }

    loadThread();

    // Listen to local custom event
    const handleNewMessage = (e: any) => {
      const msg: ChatMessage = e.detail;
      if (
        msg.creator_id === user.id &&
        (msg.sender_id === selectedFan.id || msg.receiver_id === selectedFan.id)
      ) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        setTimeout(scrollToBottom, 100);
      }
    };

    const handleUnlockEvent = (e: any) => {
      const { messageId } = e.detail;
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, ppv_unlocked: true } : m))
      );
    };

    window.addEventListener('tgd_new_message', handleNewMessage);
    window.addEventListener('tgd_message_unlocked', handleUnlockEvent);

    // Supabase Realtime channel
    const channel = supabase
      .channel(`creator_chat_${user.id}_${selectedFan.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `creator_id=eq.${user.id}`,
        },
        (payload) => {
          const newRow = payload.new as any;
          if (newRow && (newRow.sender_id === selectedFan.id || newRow.receiver_id === selectedFan.id)) {
            const formatted: ChatMessage = {
              id: newRow.id,
              sender_id: newRow.sender_id,
              receiver_id: newRow.receiver_id,
              creator_id: newRow.creator_id,
              sender_role: newRow.sender_role,
              content: newRow.content,
              media_url: newRow.media_url,
              is_ppv: newRow.is_ppv,
              ppv_price: newRow.ppv_price,
              ppv_unlocked: newRow.ppv_unlocked,
              read: newRow.read,
              created_at: newRow.created_at,
            };
            setMessages((prev) => {
              if (prev.some((m) => m.id === formatted.id)) return prev;
              return [...prev, formatted];
            });
            setTimeout(scrollToBottom, 100);
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      window.removeEventListener('tgd_new_message', handleNewMessage);
      window.removeEventListener('tgd_message_unlocked', handleUnlockEvent);
      supabase.removeChannel(channel);
    };
  }, [selectedFan?.id, user?.id]);

  // 3. Number Filtering & Anti-Circumvention
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const validation = validateChatMessage(raw);

    if (validation.hadDigits || !validation.isValid) {
      setFilterWarning(validation.reason || 'Numbers and contact details are disabled.');
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = setTimeout(() => {
        setFilterWarning(null);
      }, 3500);
    }

    setInputText(validation.sanitized);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasteData = e.clipboardData.getData('text');
    if (/[0-9]/.test(pasteData)) {
      e.preventDefault();
      const sanitized = stripDigits(pasteData);
      document.execCommand('insertText', false, sanitized);
      setFilterWarning('Numbers were automatically removed from pasted text.');
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = setTimeout(() => setFilterWarning(null), 3500);
    }
  };

  // 4. Send Message Handler
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user || !selectedFan || !inputText.trim() || sending) return;

    const validation = validateChatMessage(inputText);
    if (!validation.isValid) {
      setFilterWarning(validation.reason || 'Message contains restricted content.');
      return;
    }

    const textToSend = validation.sanitized.trim();
    if (!textToSend) return;

    setSending(true);
    try {
      const newMsg = await sendChatMessage({
        sender_id: user.id,
        receiver_id: selectedFan.id,
        creator_id: user.id,
        sender_role: 'creator',
        content: textToSend,
      });

      setMessages((prev) => [...prev, newMsg]);
      setInputText('');
      setFilterWarning(null);
      setTimeout(scrollToBottom, 100);

      // Update sidebar preview
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedFan.id
            ? { ...c, lastMessage: textToSend, lastMessageTime: new Date().toISOString() }
            : c
        )
      );
    } catch (err) {
      console.error('Failed to send creator reply:', err);
    } finally {
      setSending(false);
    }
  };

  // 5. Send PPV Message Handler
  const handleSendPPV = async () => {
    if (!user || !selectedFan || !ppvImageUrl || sending) return;
    const numericPrice = Number(ppvPrice) || 1000;

    setSending(true);
    try {
      const cleanTitle = (ppvTitle || 'Exclusive PPV Media').replace(/[0-9]/g, '');
      const newMsg = await sendChatMessage({
        sender_id: user.id,
        receiver_id: selectedFan.id,
        creator_id: user.id,
        sender_role: 'creator',
        content: cleanTitle,
        media_url: ppvImageUrl,
        is_ppv: true,
        ppv_price: numericPrice,
        ppv_unlocked: false,
      });

      setMessages((prev) => [...prev, newMsg]);
      setIsPpvModalOpen(false);
      setTimeout(scrollToBottom, 100);

      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedFan.id
            ? { ...c, lastMessage: `Sent locked PPV (KES ${numericPrice})`, lastMessageTime: new Date().toISOString() }
            : c
        )
      );
    } catch (err) {
      console.error('Failed to send PPV message:', err);
    } finally {
      setSending(false);
    }
  };

  // Quick Starter Action Handler
  const handleQuickPrompt = (promptText: string) => {
    setInputText(promptText);
  };

  const filteredConversations = conversations.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (filterTab === 'vip') return c.subscriptionTier?.toLowerCase().includes('vip') || true;
    if (filterTab === 'online') return Boolean(c.isOnline);
    return true;
  });

  return (
    <CreatorLayout>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 md:mb-8 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold tracking-wide uppercase mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Subscriber Direct Messages & PPV
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white">
            Messages
          </h1>
          <p className="text-zinc-400 font-normal text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            Engage with your verified subscribers directly. Send personalized notes, answer fan questions, and broadcast high-converting PPV drops.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={() => setIsMassPpvOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-red-600 hover:bg-red-700 border border-red-500 shadow-md transition-all active:scale-[0.98] cursor-pointer"
          >
            <Megaphone className="w-4 h-4 text-white" />
            <span>Mass PPV Blast</span>
            {conversations.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-black/30 border border-white/20 text-white text-[10px] font-black tracking-wider">
                {conversations.length} Fans
              </span>
            )}
          </button>

          <button
            onClick={() => setIsPpvModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-zinc-300 hover:text-white bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4 text-zinc-400" />
            <span>Single PPV</span>
          </button>
        </div>
      </div>

      {/* Main Messaging Container */}
      <div className="bg-[#0d0e12] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[calc(100dvh-230px)] min-h-[580px] max-h-[780px] relative">
        {/* Chat List Sidebar */}
        <div
          className={`w-full md:w-[320px] lg:w-[360px] border-r border-zinc-800/80 flex flex-col bg-[#0a0b0e] z-10 shrink-0 ${
            selectedFan !== null ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Search Box */}
          <div className="p-3.5 border-b border-zinc-800/80 space-y-3">
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-red-400 transition-colors" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search subscribers..."
                className="w-full pl-10 pr-8 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-xs text-zinc-200 placeholder:text-zinc-500 outline-none focus:border-red-500/40 focus:bg-white/[0.06] transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Filter Pills */}
            <div className="flex items-center gap-1.5">
              {[
                { id: 'all', label: `All (${conversations.length})` },
                { id: 'vip', label: 'VIPs' },
                { id: 'online', label: 'Online' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterTab(tab.id as FanFilterTab)}
                  className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold transition-all cursor-pointer text-center ${
                    filterTab === tab.id
                      ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                      : 'bg-white/[0.03] text-zinc-400 hover:text-zinc-200 border border-white/[0.05]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Subscribers Scroll List */}
          <div className="flex-1 overflow-y-auto scrollbar-sleek p-2 space-y-1">
            {loadingChats ? (
              <div className="p-8 text-center text-zinc-500 text-xs">
                Loading subscribers...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs flex flex-col items-center gap-2">
                <MessageSquare className="w-8 h-8 text-zinc-600" />
                <span>No subscribers found matching filter.</span>
              </div>
            ) : (
              filteredConversations.map((fan) => {
                const isActive = selectedFan?.id === fan.id;
                return (
                  <div
                    key={fan.id}
                    onClick={() => {
                      setSelectedFan(fan);
                      setShowFanInfo(false);
                    }}
                    className={`px-3 py-2.5 rounded-2xl flex items-center gap-3 cursor-pointer transition-all duration-200 group relative ${
                      isActive
                        ? 'bg-zinc-800/80 border-l-2 border-red-500 text-white shadow-sm'
                        : 'hover:bg-white/[0.04] text-zinc-300'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={resolveUserAvatar(fan.avatar, fan.name)}
                        alt={fan.name}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = getDefaultAvatar(fan.name);
                        }}
                        className="w-11 h-11 rounded-full object-cover shadow-sm ring-1 ring-white/10"
                      />
                      {fan.isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0a0b0e] animate-pulse" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-center justify-between mb-0.5">
                        <span
                          className={`font-bold text-xs truncate ${
                            isActive ? 'text-white' : 'text-zinc-200 group-hover:text-white'
                          }`}
                        >
                          {fan.name}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                          {fan.subscriptionTier || 'VIP'}
                        </span>
                      </div>
                      <p
                        className={`text-[11px] truncate ${
                          isActive ? 'text-zinc-300' : 'text-zinc-400'
                        }`}
                      >
                        {fan.lastMessage || 'Active subscriber'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Canvas Area */}
        <div
          className={`flex-1 flex flex-col bg-[#0d0e12] relative overflow-hidden ${
            selectedFan === null ? 'hidden md:flex' : 'flex'
          }`}
        >
          {selectedFan === null ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-400">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center mb-4 text-zinc-400">
                <MessageSquare className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="font-extrabold text-lg text-white mb-1.5">Direct Fan Messages</h3>
              <p className="text-xs text-zinc-400 max-w-sm mb-6 leading-relaxed">
                Select a subscriber from the list to answer questions, build connection, or drop exclusive pay-per-view photos and videos.
              </p>
              <button
                onClick={() => setIsMassPpvOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer active:scale-95"
              >
                <Megaphone className="w-4 h-4" />
                <span>Launch Mass PPV Blast</span>
              </button>
            </div>
          ) : (
            <>
              {/* Chat Canvas Header */}
              <div className="px-4 py-3 border-b border-zinc-800/80 flex items-center justify-between bg-[#0a0b0e]/95 backdrop-blur-md z-20">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    className="md:hidden p-2 -ml-1 text-zinc-400 hover:text-white rounded-xl hover:bg-white/[0.05] transition-colors"
                    onClick={() => setSelectedFan(null)}
                    title="Back to subscribers"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="relative shrink-0">
                    <img
                      src={resolveUserAvatar(selectedFan.avatar, selectedFan.name)}
                      alt={selectedFan.name}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = getDefaultAvatar(selectedFan.name);
                      }}
                      className="w-10 h-10 rounded-full object-cover shadow-sm ring-1 ring-white/10"
                    />
                    {selectedFan.isOnline && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#0a0b0e]" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="font-bold text-sm text-white flex items-center gap-1.5 truncate">
                      <span>{selectedFan.name}</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    </div>
                    <div className="text-[11px] flex items-center gap-2 text-zinc-400 truncate">
                      {(() => {
                        const presence = formatLastSeenStatus((selectedFan as any).last_seen);
                        return (
                          <span className="flex items-center gap-1 shrink-0">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                presence.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
                              }`}
                            />
                            <span className={presence.isOnline ? 'text-emerald-400 font-semibold' : 'text-zinc-400'}>
                              {presence.label}
                            </span>
                          </span>
                        );
                      })()}
                      <span className="text-zinc-600">•</span>
                      <span className="font-semibold text-emerald-400 tracking-wide uppercase text-[10px]">
                        {selectedFan.subscriptionTier || 'VIP Active'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsPpvModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600/15 hover:bg-red-600/25 border border-red-500/30 text-red-400 text-xs font-bold transition-all cursor-pointer active:scale-95"
                    title="Send locked PPV to this fan"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Drop PPV</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowFanInfo(!showFanInfo)}
                    className={`p-2 rounded-xl transition-colors cursor-pointer ${
                      showFanInfo
                        ? 'bg-white/10 text-white'
                        : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
                    }`}
                    title="Subscriber details"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Fan Info Slide Drawer */}
              {showFanInfo && (
                <div className="bg-[#0f1015] border-b border-zinc-800 p-4 animate-in slide-in-from-top-2 duration-150 z-20">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Subscriber Relationship
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowFanInfo(false)}
                      className="p-1 text-zinc-500 hover:text-zinc-300"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-white/[0.03] p-2.5 rounded-xl border border-white/[0.05]">
                      <div className="text-[10px] text-zinc-500 uppercase font-semibold">Tier</div>
                      <div className="text-xs font-bold text-white mt-0.5">VIP Subscriber</div>
                    </div>
                    <div className="bg-white/[0.03] p-2.5 rounded-xl border border-white/[0.05]">
                      <div className="text-[10px] text-zinc-500 uppercase font-semibold">Platform Share</div>
                      <div className="text-xs font-bold text-emerald-400 mt-0.5">70% Net to You</div>
                    </div>
                    <div className="bg-white/[0.03] p-2.5 rounded-xl border border-white/[0.05]">
                      <div className="text-[10px] text-zinc-500 uppercase font-semibold">Settlement</div>
                      <div className="text-xs font-bold text-zinc-300 mt-0.5">Safaricom M-Pesa</div>
                    </div>
                    <div className="bg-white/[0.03] p-2.5 rounded-xl border border-white/[0.05]">
                      <div className="text-[10px] text-zinc-500 uppercase font-semibold">Privacy</div>
                      <div className="text-xs font-bold text-emerald-400 mt-0.5 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Protected</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Message Feed Canvas */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4 z-10 scrollbar-sleek">
                {loadingMessages ? (
                  <div className="flex-1 flex items-center justify-center text-xs text-zinc-500">
                    Loading conversation...
                  </div>
                ) : messages.length === 0 ? (
                  /* Redesigned Rich Empty State */
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto">
                    {/* Interconnected Avatars */}
                    <div className="flex items-center justify-center -space-x-3 mb-4">
                      <div className="relative z-10 w-16 h-16 rounded-full ring-4 ring-[#0d0e12] overflow-hidden bg-zinc-800 shadow-xl">
                        <img
                          src={resolveUserAvatar(user?.user_metadata?.avatar_url || user?.user_metadata?.picture, user?.user_metadata?.name || 'Creator')}
                          alt="Creator"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="w-8 h-8 rounded-full bg-red-600 border-2 border-[#0d0e12] flex items-center justify-center z-20 shadow-md">
                        <Heart className="w-4 h-4 text-white fill-white" />
                      </div>
                      <div className="relative z-10 w-16 h-16 rounded-full ring-4 ring-[#0d0e12] overflow-hidden bg-zinc-800 shadow-xl">
                        <img
                          src={resolveUserAvatar(selectedFan.avatar, selectedFan.name)}
                          alt={selectedFan.name}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = getDefaultAvatar(selectedFan.name);
                          }}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold uppercase tracking-wider mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Active VIP Subscriber</span>
                    </div>

                    <h3 className="font-extrabold text-lg text-white mb-1">
                      Direct Channel with {selectedFan.name}
                    </h3>
                    <p className="text-xs text-zinc-400 max-w-md leading-relaxed mb-6">
                      Welcome {selectedFan.name} to your private community. Send a warm greeting or drop an exclusive locked preview to begin monetizing immediately.
                    </p>

                    {/* Quick Conversation Starter Cards */}
                    <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-left mb-6">
                      {/* Starter 1: Welcome PPV */}
                      <button
                        type="button"
                        onClick={() => setIsPpvModalOpen(true)}
                        className="bg-white/[0.03] hover:bg-white/[0.06] border border-red-500/20 hover:border-red-500/40 p-3 rounded-2xl transition-all cursor-pointer group flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400">
                            <Lock className="w-4 h-4" />
                          </div>
                          <span className="text-[10px] font-bold text-red-400 uppercase">Drop</span>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white group-hover:text-red-300">
                            Send Welcome PPV
                          </div>
                          <div className="text-[10px] text-zinc-400 mt-0.5">
                            KES 1,000 locked photo set
                          </div>
                        </div>
                      </button>

                      {/* Starter 2: Say Hello */}
                      <button
                        type="button"
                        onClick={() => handleQuickPrompt(`Hey ${selectedFan.name}! Thanks for subscribing to my VIP feed ❤️ Let me know what you love seeing most.`)}
                        className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/20 p-3 rounded-2xl transition-all cursor-pointer group flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="p-1.5 rounded-lg bg-white/[0.05] text-zinc-300">
                            <MessageCircle className="w-4 h-4" />
                          </div>
                          <span className="text-[10px] font-bold text-zinc-400 uppercase">Intro</span>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white group-hover:text-zinc-200">
                            Say Hello
                          </div>
                          <div className="text-[10px] text-zinc-400 mt-0.5">
                            Pre-fill warm welcome note
                          </div>
                        </div>
                      </button>

                      {/* Starter 3: Private Custom Inquiry */}
                      <button
                        type="button"
                        onClick={() => handleQuickPrompt(`Hey ${selectedFan.name}, if you ever want custom private photo or video drops, feel free to ask anytime here!`)}
                        className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/20 p-3 rounded-2xl transition-all cursor-pointer group flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                            <Zap className="w-4 h-4" />
                          </div>
                          <span className="text-[10px] font-bold text-emerald-400 uppercase">Custom</span>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white group-hover:text-emerald-300">
                            Offer Custom Drops
                          </div>
                          <div className="text-[10px] text-zinc-400 mt-0.5">
                            Invite private requests
                          </div>
                        </div>
                      </button>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Encrypted · Direct M-Pesa Payouts · 70% Creator Revenue Share</span>
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isCreator = msg.sender_role === 'creator' || msg.sender_id === user?.id;

                    if (msg.is_ppv) {
                      return (
                        <div
                          key={msg.id}
                          className={`max-w-[85%] sm:max-w-[320px] ${
                            isCreator ? 'self-end' : 'self-start'
                          }`}
                        >
                          <div className="bg-[#12131a] border border-zinc-800 hover:border-zinc-700 rounded-3xl overflow-hidden shadow-xl relative group transition-all">
                            <div className="relative h-52 w-full overflow-hidden bg-zinc-950">
                              <img
                                src={msg.media_url}
                                alt="locked content"
                                className={`w-full h-full object-cover transition-all ${
                                  msg.ppv_unlocked ? '' : 'blur-md scale-105 opacity-60'
                                }`}
                              />
                              {!msg.ppv_unlocked && (
                                <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex flex-col items-center justify-center text-white z-10 p-4 text-center">
                                  <div className="w-12 h-12 bg-red-600/20 border border-red-500/30 rounded-2xl flex items-center justify-center mb-2 shadow-lg">
                                    <Lock className="w-6 h-6 text-red-400" />
                                  </div>
                                  <span className="text-2xl font-extrabold tracking-tight text-white tabular-nums">
                                    KES {(msg.ppv_price || 1000).toLocaleString()}
                                  </span>
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mt-1">
                                    Locked PPV Media
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="p-3 bg-[#0a0b0e] border-t border-zinc-800 flex items-center justify-between text-xs">
                              <span className="truncate font-semibold text-zinc-200">{msg.content}</span>
                              <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                  msg.ppv_unlocked
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                }`}
                              >
                                {msg.ppv_unlocked ? '✓ Unlocked' : 'Pending Unlock'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-1.5 mt-1.5 px-1 text-[10px] text-zinc-500">
                            <span>
                              {new Date(msg.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {isCreator && <CheckCheck className="w-3.5 h-3.5 text-zinc-500" />}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isCreator ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[85%] md:max-w-[70%] px-4 py-3 text-xs md:text-sm leading-relaxed shadow-sm ${
                            isCreator
                              ? 'bg-[#1e1b24] text-white border border-red-500/30 rounded-2xl rounded-tr-xs shadow-md'
                              : 'bg-zinc-900 text-zinc-100 border border-zinc-800 rounded-2xl rounded-tl-xs'
                          }`}
                        >
                          {msg.content}
                        </div>
                        <div className="flex items-center gap-1 mt-1 px-1 text-[10px] text-zinc-500">
                          <span>
                            {new Date(msg.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {isCreator && <CheckCheck className="w-3.5 h-3.5 text-zinc-500" />}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Warning Banner for safety restrictions */}
              {filterWarning && (
                <div className="px-4 py-2.5 bg-amber-500/10 border-t border-amber-500/25 text-amber-400 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span className="font-medium">{filterWarning}</span>
                </div>
              )}

              {/* Bottom Input Section */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 md:p-4 bg-[#0a0b0e]/95 backdrop-blur-md border-t border-zinc-800/80 flex flex-col gap-2 z-20"
              >
                <div className="flex gap-2 sm:gap-3 items-center">
                  <button
                    type="button"
                    onClick={() => setIsPpvModalOpen(true)}
                    className="h-11 px-3.5 shrink-0 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    title="Send locked PPV drop"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">PPV Drop</span>
                  </button>

                  <div className="flex-1 bg-white/[0.04] border border-white/10 focus-within:border-red-500/50 focus-within:bg-white/[0.06] rounded-2xl min-h-[46px] flex items-center transition-all px-4">
                    <input
                      type="text"
                      value={inputText}
                      onChange={handleInputChange}
                      onPaste={handlePaste}
                      placeholder={`Message ${selectedFan.name}...`}
                      className="flex-1 min-w-0 bg-transparent border-none text-xs md:text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!inputText.trim() || sending}
                    className="w-11 h-11 shrink-0 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:hover:bg-red-600 text-white rounded-2xl shadow-md transition-all flex items-center justify-center cursor-pointer active:scale-95"
                    title="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between px-2 text-[10px] text-zinc-500">
                  <span className="flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-zinc-500" />
                    Off-platform phone numbers & contacts are disabled for creator protection.
                  </span>
                  <span>{inputText.length} chars · 70% Creator Share</span>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Single PPV Creator Drop Modal */}
      {isPpvModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e0f15] border border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsPpvModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/[0.05] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-white">Send Exclusive PPV Drop</h3>
                <p className="text-xs text-zinc-400">
                  {selectedFan ? `Fan pays to unlock in chat with ${selectedFan.name}` : 'Fan pays to unlock via M-Pesa'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 mb-1.5 block">
                  Media Caption / Title
                </label>
                <input
                  type="text"
                  value={ppvTitle}
                  onChange={(e) => setPpvTitle(stripDigits(e.target.value))}
                  placeholder="e.g. VIP Photoset (letters only)..."
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-red-500/40"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 mb-1.5 block">
                  Unlock Price (KES)
                </label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {['500', '1000', '1500', '2500'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPpvPrice(p)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        ppvPrice === p
                          ? 'bg-red-600 text-white border-red-500 shadow-sm'
                          : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06] text-zinc-300'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={ppvPrice}
                  onChange={(e) => setPpvPrice(e.target.value)}
                  placeholder="Custom price in KES"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-red-500/40"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 mb-1.5 block">
                  Media Photo / Video URL
                </label>
                <input
                  type="text"
                  value={ppvImageUrl}
                  onChange={(e) => setPpvImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-red-500/40"
                />
                <div className="mt-2.5 h-28 rounded-2xl overflow-hidden border border-zinc-800 relative bg-zinc-950">
                  <img
                    src={ppvImageUrl}
                    alt="preview"
                    className="w-full h-full object-cover blur-sm opacity-70"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white font-bold text-xs gap-1.5">
                    <Lock className="w-4 h-4 text-red-400" />
                    <span>Locked Preview for Fan</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsPpvModalOpen(false)}
                  className="flex-1 py-3 text-xs font-bold text-zinc-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] rounded-xl transition-colors border border-white/10 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendPPV}
                  disabled={!ppvImageUrl || sending}
                  className="flex-1 py-3 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer active:scale-95"
                >
                  Drop PPV to Fan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OnlyFans-Style Mass PPV Modal */}
      <MassPPVModal
        isOpen={isMassPpvOpen}
        onClose={() => setIsMassPpvOpen(false)}
        creatorId={user?.id || ''}
        creatorName={user?.user_metadata?.name || 'Creator'}
        onSuccess={async () => {
          if (user?.id) {
            const list = await getCreatorChatConversations(user.id);
            setConversations(list);
            if (selectedFan) {
              const msgs = await getChatMessages(user.id, selectedFan.id);
              setMessages(msgs);
            }
          }
        }}
      />
    </CreatorLayout>
  );
};

export default Messages;
