import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import UserLayout from '../../components/UserLayout';
import { 
  Search, 
  Send, 
  ArrowLeft, 
  Lock, 
  MessageCircle, 
  MoreVertical, 
  ShieldAlert, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import TipModal from '../../components/TipModal';
import SubscribeModal from '../../components/SubscribeModal';
import PPVUnlockModal from '../../components/PPVUnlockModal';
import type { PPVMediaItem } from '../../components/PPVUnlockModal';
import { useAuth } from '../../context/AuthContext';
import { 
  getUserChatConversations, 
  getChatMessages, 
  sendChatMessage, 
  checkUserSubscription, 
  getCreatorProfile,
  unlockChatMessagePPV 
} from '../../lib/db';
import type { ChatParticipant, ChatMessage } from '../../lib/db';
import { validateChatMessage, stripDigits } from '../../lib/chatFilter';
import { supabase } from '../../lib/supabase';
import { resolveUserAvatar } from '../../lib/avatar';

const UserMessages = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const queryCreatorId = searchParams.get('creator');

  const [conversations, setConversations] = useState<ChatParticipant[]>([]);
  const [selectedCreator, setSelectedCreator] = useState<ChatParticipant | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Subscription state for selected creator
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState('VIP Tier');

  // Input & validation
  const [inputText, setInputText] = useState('');
  const [filterWarning, setFilterWarning] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isTipOpen, setIsTipOpen] = useState(false);
  const [isSubscribeOpen, setIsSubscribeOpen] = useState(false);
  const [unlockMediaItem, setUnlockMediaItem] = useState<{ item: PPVMediaItem; messageId: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const warningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. Load User Conversations
  useEffect(() => {
    let isMounted = true;

    async function loadConversations() {
      if (!user) {
        setLoadingChats(false);
        return;
      }

      try {
        setLoadingChats(true);
        const list = await getUserChatConversations(user.id);
        
        // If a creator was passed in URL (e.g. ?creator=123), ensure they are in the list
        if (queryCreatorId) {
          const exists = list.find((c) => c.id === queryCreatorId);
          if (!exists) {
            const profile = await getCreatorProfile(queryCreatorId);
            const pAny = profile as any;
            const sub = await checkUserSubscription(user.id, queryCreatorId);
            const newEntry: ChatParticipant = {
              id: queryCreatorId,
              name: profile?.name || 'Creator',
              avatar: resolveUserAvatar(profile?.avatar, profile?.name),
              handle: pAny?.handle || `@${(profile?.name || 'creator').toLowerCase().replace(/\s+/g, '')}`,
              role: 'creator',
              isOnline: true,
              isSubscribed: !!sub,
              subscriptionTier: sub?.tier_name,
              monthly_price: pAny?.monthly_price || 1000,
              lastMessage: sub ? 'Start your conversation' : 'Subscribe to start chatting',
            };
            list.unshift(newEntry);
          }
        }

        if (isMounted) {
          setConversations(list);
          if (queryCreatorId) {
            const target = list.find((c) => c.id === queryCreatorId) || list[0] || null;
            setSelectedCreator(target);
          } else if (list.length > 0 && !selectedCreator) {
            setSelectedCreator(list[0]);
          }
        }
      } catch (err) {
        console.error('Error loading conversations:', err);
      } finally {
        if (isMounted) setLoadingChats(false);
      }
    }

    loadConversations();

    return () => {
      isMounted = false;
    };
  }, [user?.id, queryCreatorId]);

  // 2. Load Messages & Subscription Status for Selected Creator
  useEffect(() => {
    if (!selectedCreator || !user) return;
    let isMounted = true;

    async function loadThread() {
      if (!selectedCreator || !user) return;
      setLoadingMessages(true);

      try {
        // Check active subscription
        const sub = await checkUserSubscription(user.id, selectedCreator.id);
        if (isMounted) {
          const active = !!sub;
          setIsSubscribed(active);
          if (sub?.tier_name) setSubscriptionTier(sub.tier_name);
        }

        // Fetch thread messages
        const msgs = await getChatMessages(selectedCreator.id, user.id);
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
        msg.creator_id === selectedCreator.id &&
        (msg.sender_id === user.id || msg.receiver_id === user.id)
      ) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        setTimeout(scrollToBottom, 100);
      }
    };

    // Listen to PPV unlock event
    const handleUnlockEvent = (e: any) => {
      const { messageId } = e.detail;
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, ppv_unlocked: true } : m))
      );
    };

    window.addEventListener('tgd_new_message', handleNewMessage);
    window.addEventListener('tgd_message_unlocked', handleUnlockEvent);

    // Listen to Supabase Realtime channel
    const channel = supabase
      .channel(`chat_${selectedCreator.id}_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `creator_id=eq.${selectedCreator.id}`,
        },
        (payload) => {
          const newRow = payload.new as any;
          if (newRow && (newRow.sender_id === user.id || newRow.receiver_id === user.id)) {
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
  }, [selectedCreator?.id, user?.id]);

  // 3. Number-Stripping & Contact Anti-Circumvention Filter
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

    // Always keep strictly sanitized text without digits
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
    if (!user || !selectedCreator || !inputText.trim() || sending) return;

    if (!isSubscribed) {
      setIsSubscribeOpen(true);
      return;
    }

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
        receiver_id: selectedCreator.id,
        creator_id: selectedCreator.id,
        sender_role: 'subscriber',
        content: textToSend,
      });

      setMessages((prev) => [...prev, newMsg]);
      setInputText('');
      setFilterWarning(null);
      setTimeout(scrollToBottom, 100);

      // Update sidebar preview
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedCreator.id
            ? { ...c, lastMessage: textToSend, lastMessageTime: new Date().toISOString() }
            : c
        )
      );
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  // 5. Subscription Success Callback
  const handleSubscriptionSuccess = () => {
    setIsSubscribed(true);
    setIsSubscribeOpen(false);

    // Update conversation state
    setConversations((prev) =>
      prev.map((c) => (c.id === selectedCreator?.id ? { ...c, isSubscribed: true } : c))
    );

    // Reload messages to show the automated welcome greeting
    if (selectedCreator && user) {
      getChatMessages(selectedCreator.id, user.id).then((msgs) => {
        setMessages(msgs);
        setTimeout(scrollToBottom, 150);
      });
    }
  };

  // 6. PPV Unlock Handlers
  const handleOpenUnlockModal = (msg: ChatMessage) => {
    if (!selectedCreator) return;
    setUnlockMediaItem({
      messageId: msg.id,
      item: {
        id: msg.id,
        type: 'image',
        url: msg.media_url || 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800',
        title: msg.content || 'Exclusive Chat PPV',
        price: msg.ppv_price || 1000,
        isLocked: true,
      },
    });
  };

  const handleMediaUnlocked = async (mediaId: string) => {
    if (!selectedCreator || !user) return;
    await unlockChatMessagePPV(mediaId, selectedCreator.id, user.id);
    setMessages((prev) =>
      prev.map((m) => (m.id === mediaId ? { ...m, ppv_unlocked: true } : m))
    );
    setUnlockMediaItem(null);
  };

  // Filtered creator list for search
  const filteredConversations = conversations.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.handle && c.handle.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <UserLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white mb-1">
            Messages
          </h1>
          <p className="text-zinc-400 text-sm">
            Exclusive 1-on-1 subscriber chat &amp; direct creator communications
          </p>
        </div>
      </div>

      <div className="bg-black border border-white/10 rounded-[28px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex h-[78svh] md:h-[680px]">
        {/* Chat List Sidebar */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-white/10 flex-col bg-zinc-950/80 ${
            selectedCreator !== null ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="p-4 border-b border-white/10">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search creators..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-black border border-white/10 rounded-xl text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-red-500/60 focus:ring-1 focus:ring-red-500/60 transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-white/5 scrollbar-sleek">
            {loadingChats ? (
              <div className="p-6 text-center text-zinc-500 text-xs">Loading conversations...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">
                <p className="text-xs">No active chats found.</p>
                <p className="text-[11px] text-zinc-600 mt-1">
                  Subscribe to creators on the Discover page to start chatting!
                </p>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isCurrent = selectedCreator?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCreator(c)}
                    className={`p-4 flex gap-3.5 cursor-pointer transition-all ${
                      isCurrent
                        ? 'bg-zinc-900/90 border-l-4 border-l-red-600'
                        : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={c.avatar}
                        alt={c.name}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-red-500/30 ring-offset-2 ring-offset-black"
                      />
                      {c.isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-black" />
                      )}
                    </div>
                    <div className="flex-1 overflow-hidden min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-sm text-white truncate">{c.name}</span>
                        {c.isSubscribed ? (
                          <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            Subscribed
                          </span>
                        ) : (
                          <span className="text-[9px] bg-zinc-800 text-zinc-400 border border-zinc-700 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> Locked
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 truncate flex items-center gap-1.5 font-medium">
                        {!c.isSubscribed ? (
                          <>
                            <Lock className="w-3 h-3 text-red-500 shrink-0" />
                            <span>Subscribe to chat</span>
                          </>
                        ) : (
                          <span>{c.lastMessage || 'Connected! Say hello'}</span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Canvas */}
        <div
          className={`flex-1 flex-col bg-zinc-950/40 relative ${
            selectedCreator === null ? 'hidden md:flex' : 'flex'
          }`}
        >
          {selectedCreator === null ? (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                <MessageCircle className="w-8 h-8 text-zinc-600" />
              </div>
              <h3 className="text-white font-bold text-base mb-1">Your Inbox</h3>
              <p className="text-sm text-zinc-400 max-w-xs">
                Select a creator conversation to start 1-on-1 private messaging.
              </p>
            </div>
          ) : (
            <>
              {/* Canvas Header */}
              <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-black/80 backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                  <button
                    className="md:hidden p-2 -ml-2 mr-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    onClick={() => setSelectedCreator(null)}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <img
                    src={selectedCreator.avatar}
                    alt={selectedCreator.name}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-red-500/40 ring-offset-2 ring-offset-black"
                  />
                  <div>
                    <div className="font-bold text-sm text-white flex items-center gap-1.5">
                      <span>{selectedCreator.name}</span>
                      <CheckCircle2 className="w-4 h-4 text-white fill-blue-500" />
                    </div>
                    <div className="text-xs text-zinc-400 flex items-center gap-1">
                      {isSubscribed ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {subscriptionTier} Member
                        </span>
                      ) : (
                        <span className="text-red-400 font-medium flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Subscription Required
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsTipOpen(true)}
                    className="text-xs font-bold text-white bg-red-600 hover:bg-red-500 px-4 py-2 rounded-full transition-all shadow-[0_2px_10px_rgba(220,38,38,0.3)] active:scale-95 flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Tip Creator 💸</span>
                  </button>
                  <button className="p-2 text-zinc-500 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Messages Feed */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4 bg-gradient-to-b from-black/60 to-zinc-950/90 scrollbar-sleek">
                {loadingMessages ? (
                  <div className="flex-1 flex items-center justify-center text-zinc-500 text-xs">
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-zinc-500">
                    <div className="w-12 h-12 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center mb-3 text-red-500">
                      <MessageCircle className="w-6 h-6" />
                    </div>
                    <h4 className="text-white font-bold text-sm mb-1">No messages yet</h4>
                    <p className="text-xs text-zinc-400 max-w-xs">
                      {isSubscribed
                        ? `Send a message to start chatting directly with ${selectedCreator.name}!`
                        : `Subscribe to ${selectedCreator.name} to unlock 1-on-1 private messaging.`}
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender_id === user?.id;

                    // PPV Message Card
                    if (msg.is_ppv) {
                      return (
                        <div
                          key={msg.id}
                          className={`max-w-[88%] sm:max-w-[340px] w-full ${
                            isMe ? 'self-end' : 'self-start'
                          }`}
                        >
                          <div className="bg-black border border-white/10 rounded-2xl overflow-hidden shadow-xl relative group">
                            <div className="relative h-60 w-full overflow-hidden bg-zinc-950">
                              <img
                                src={
                                  msg.media_url ||
                                  'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=500'
                                }
                                alt="locked content"
                                className={`w-full h-full object-cover transition-all duration-300 ${
                                  msg.ppv_unlocked ? '' : 'blur-lg opacity-60 scale-105'
                                }`}
                              />
                              {!msg.ppv_unlocked && (
                                <div className="absolute inset-0 bg-black/50 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
                                  <div className="w-12 h-12 rounded-xl bg-black/70 border border-red-500/40 flex items-center justify-center mb-3">
                                    <Lock className="w-5 h-5 text-red-500" />
                                  </div>
                                  <p className="text-white font-bold text-sm tracking-tight mb-1">
                                    {msg.content || 'Exclusive PPV Media'}
                                  </p>
                                  <span className="text-red-400 font-extrabold text-lg mb-4 tracking-wider">
                                    KES {(msg.ppv_price || 1000).toLocaleString()}
                                  </span>
                                  <button
                                    onClick={() => handleOpenUnlockModal(msg)}
                                    className="w-full bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider py-3 px-6 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-red-600/30"
                                  >
                                    Pay &amp; Unlock
                                  </button>
                                </div>
                              )}
                            </div>
                            {msg.ppv_unlocked && (
                              <div className="p-3 bg-zinc-900/90 border-t border-white/10 flex items-center justify-between text-xs text-zinc-300">
                                <span>{msg.content || 'Unlocked Exclusive Media'}</span>
                                <span className="text-emerald-400 font-bold text-[10px] uppercase">
                                  ✓ Unlocked
                                </span>
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-zinc-500 block mt-1 px-1 text-right">
                            {new Date(msg.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      );
                    }

                    // Standard Text Message
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[85%] md:max-w-[70%] px-4 py-3 text-xs md:text-sm leading-relaxed shadow-sm ${
                            isMe
                              ? 'bg-red-600 text-white rounded-2xl rounded-tr-sm shadow-md shadow-red-600/20'
                              : 'bg-zinc-900 border border-white/10 text-zinc-200 rounded-2xl rounded-tl-sm'
                          }`}
                        >
                          {msg.content}
                        </div>
                        <span className="text-[10px] text-zinc-500 mt-1 px-1">
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Anti-Circumvention Warning Banner */}
              {filterWarning && (
                <div className="px-4 py-2 bg-amber-500/15 border-t border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
                  <span className="font-medium">{filterWarning}</span>
                </div>
              )}

              {/* Bottom Input Section / Gated Subscription Box */}
              {!isSubscribed ? (
                <div className="p-5 border-t border-white/10 bg-zinc-950/90 flex flex-col items-center justify-center text-center">
                  <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-2.5 text-red-500">
                    <Lock className="w-5 h-5" />
                  </div>
                  <h4 className="text-white font-bold text-sm tracking-tight mb-1">
                    Subscriber-Only Direct Chat
                  </h4>
                  <p className="text-xs text-zinc-400 max-w-sm mb-4 leading-relaxed">
                    Direct messaging is reserved for active subscribers of{' '}
                    <span className="text-white font-semibold">{selectedCreator.name}</span>.
                    Subscribe to send unlimited text messages and unlock private 1-on-1 chat!
                  </p>
                  <button
                    onClick={() => setIsSubscribeOpen(true)}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider py-3 px-8 rounded-xl transition-all shadow-[0_4px_16px_rgba(220,38,38,0.4)] active:scale-95 hover:scale-[1.02]"
                  >
                    Subscribe to Chat (KES{' '}
                    {(Math.max(500, selectedCreator.monthly_price || 500)).toLocaleString()}/mo)
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handleSendMessage}
                  className="p-4 border-t border-white/10 bg-black/90 flex flex-col gap-2"
                >
                  <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={inputText}
                        onChange={handleInputChange}
                        onPaste={handlePaste}
                        placeholder={`Message ${selectedCreator.name} (letters only, numbers disabled)...`}
                        className="w-full bg-zinc-950 border border-white/10 px-4 py-2.5 rounded-full text-xs md:text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-red-500/60 focus:ring-1 focus:ring-red-500/60 transition-all pr-10"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider text-zinc-600 select-none">
                        Text Only
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={!inputText.trim() || sending}
                      className="p-3 shrink-0 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:hover:bg-red-600 text-white rounded-full transition-all hover:scale-105 active:scale-95 shadow-[0_2px_10px_rgba(220,38,38,0.3)]"
                    >
                      <Send className="w-4 h-4 -ml-0.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between px-2 text-[10px] text-zinc-500">
                    <span className="flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-zinc-500" />
                      Digits &amp; phone contacts are disabled for creator safety.
                    </span>
                    <span className="text-zinc-500">{inputText.length} chars</span>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tip Modal */}
      {selectedCreator && (
        <TipModal
          isOpen={isTipOpen}
          onClose={() => setIsTipOpen(false)}
          creatorName={selectedCreator.name}
          creatorId={selectedCreator.id}
        />
      )}

      {/* Subscribe Modal */}
      {selectedCreator && (
        <SubscribeModal
          isOpen={isSubscribeOpen}
          onClose={() => setIsSubscribeOpen(false)}
          creatorName={selectedCreator.name}
          creatorId={selectedCreator.id}
          price={Math.max(500, selectedCreator.monthly_price || 500)}
          onSuccess={handleSubscriptionSuccess}
        />
      )}

      {/* PPV Unlock Modal */}
      {unlockMediaItem && selectedCreator && (
        <PPVUnlockModal
          isOpen={true}
          onClose={() => setUnlockMediaItem(null)}
          mediaItem={unlockMediaItem.item}
          creatorName={selectedCreator.name}
          creatorId={selectedCreator.id}
          monthlyPrice={selectedCreator.monthly_price || 1000}
          onUnlocked={() => handleMediaUnlocked(unlockMediaItem.messageId)}
          onSubscribeClick={() => {
            setUnlockMediaItem(null);
            setIsSubscribeOpen(true);
          }}
        />
      )}
    </UserLayout>
  );
};

export default UserMessages;
