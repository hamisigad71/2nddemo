import React, { useState, useEffect, useRef } from 'react';
import CreatorLayout from '../../components/CreatorLayout';
import { 
  Search, 
  Send, 
  MoreHorizontal, 
  ArrowLeft, 
  Lock, 
  Plus, 
  X, 
  ShieldAlert, 
  CheckCircle2, 
  Sparkles,
  AlertCircle 
} from 'lucide-react';
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

const Messages = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ChatParticipant[]>([]);
  const [selectedFan, setSelectedFan] = useState<ChatParticipant | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Message input state
  const [inputText, setInputText] = useState('');
  const [filterWarning, setFilterWarning] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // PPV Creation Modal state
  const [isPpvModalOpen, setIsPpvModalOpen] = useState(false);
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

  const filteredConversations = conversations.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <CreatorLayout>
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1 tracking-tight">Messages</h1>
          <p className="text-muted-foreground text-xs md:text-sm">
            Engage with your verified subscribers directly. Setup custom PPV drops.
          </p>
        </div>
        <button
          onClick={() => setIsPpvModalOpen(true)}
          className="bg-primary text-primary-foreground px-4 md:px-5 py-2.5 font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-200 text-xs md:text-sm flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>New PPV Drop</span>
        </button>
      </div>

      <div className="bg-background border border-border rounded-3xl overflow-hidden shadow-sm flex h-[75svh] md:h-[650px] relative">
        {/* Chat List Sidebar */}
        <div
          className={`w-full md:w-[320px] lg:w-[350px] border-r border-border flex-col bg-background/50 backdrop-blur-md z-10 ${
            selectedFan !== null ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="p-4 border-b border-border/50">
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search subscribers..."
                className="w-full pl-10 pr-4 py-2.5 bg-foreground/5 border-transparent outline-none rounded-xl text-xs md:text-sm focus:ring-2 focus:ring-primary/20 focus:bg-background transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-sleek py-2">
            {loadingChats ? (
              <div className="p-6 text-center text-muted-foreground text-xs">Loading subscribers...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs">
                No subscriber conversations found.
              </div>
            ) : (
              filteredConversations.map((fan) => {
                const isActive = selectedFan?.id === fan.id;
                return (
                  <div
                    key={fan.id}
                    onClick={() => setSelectedFan(fan)}
                    className={`mx-2 my-1 px-3 py-3 rounded-2xl flex gap-3 cursor-pointer transition-all duration-200 group ${
                      isActive ? 'bg-primary/10' : 'hover:bg-foreground/5'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={resolveUserAvatar(fan.avatar, fan.name)}
                        alt={fan.name}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = getDefaultAvatar(fan.name);
                        }}
                        className="w-12 h-12 rounded-full object-cover shadow-sm ring-1 ring-border"
                      />
                      {fan.isOnline && (
                        <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-[2.5px] border-background animate-pulse" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex justify-between items-center mb-0.5">
                        <span
                          className={`font-bold text-[14px] truncate ${
                            isActive ? 'text-primary' : 'text-foreground'
                          }`}
                        >
                          {fan.name}
                        </span>
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold uppercase">
                          VIP
                        </span>
                      </div>
                      <p
                        className={`text-[12px] truncate ${
                          isActive ? 'text-primary/80 font-medium' : 'text-muted-foreground'
                        }`}
                      >
                        {fan.lastMessage || 'Subscriber joined!'}
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
          className={`flex-1 flex flex-col bg-background/30 relative ${
            selectedFan === null ? 'hidden md:flex' : 'flex'
          }`}
        >
          {selectedFan === null ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3 text-primary">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-base text-foreground mb-1">Fan Inbox</h3>
              <p className="text-xs max-w-xs">
                Select a fan conversation to chat, answer questions, or drop locked PPV media.
              </p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-4 py-3 border-b border-border/50 flex justify-between items-center bg-background/80 backdrop-blur-md z-20">
                <div className="flex items-center gap-3">
                  <button
                    className="md:hidden p-2 -ml-2 text-muted-foreground hover:bg-muted/50 rounded-full transition-colors"
                    onClick={() => setSelectedFan(null)}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="relative">
                    <img
                      src={resolveUserAvatar(selectedFan.avatar, selectedFan.name)}
                      alt={selectedFan.name}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = getDefaultAvatar(selectedFan.name);
                      }}
                      className="w-10 h-10 rounded-full object-cover shadow-sm ring-2 ring-primary/20"
                    />
                    {selectedFan.isOnline && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-background" />
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-sm tracking-tight text-foreground flex items-center gap-1.5">
                      <span>{selectedFan.name}</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="text-[11px] flex items-center gap-2">
                      {(() => {
                        const presence = formatLastSeenStatus((selectedFan as any).last_seen);
                        return (
                          <span className="flex items-center gap-1">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                presence.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-500'
                              }`}
                            />
                            <span className={presence.isOnline ? 'text-emerald-400 font-semibold' : 'text-zinc-400'}>
                              {presence.label}
                            </span>
                          </span>
                        );
                      })()}
                      <span className="text-zinc-600">•</span>
                      <span className="font-semibold text-emerald-500 tracking-wide uppercase">
                        {selectedFan.subscriptionTier || 'Active Subscriber'}
                      </span>
                    </div>
                  </div>
                </div>
                <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-full transition-colors">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>

              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4 z-10 scrollbar-sleek">
                {loadingMessages ? (
                  <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                    <p className="text-xs">No messages yet with {selectedFan.name}.</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">
                      Say hello or send an exclusive PPV video to welcome them!
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isCreator = msg.sender_role === 'creator' || msg.sender_id === user?.id;

                    if (msg.is_ppv) {
                      return (
                        <div
                          key={msg.id}
                          className={`max-w-[85%] sm:max-w-[300px] ${
                            isCreator ? 'self-end' : 'self-start'
                          }`}
                        >
                          <div className="bg-background border-2 border-primary/20 hover:border-primary/50 rounded-2xl overflow-hidden shadow-lg shadow-primary/10 relative group">
                            <div className="relative h-48 w-full overflow-hidden bg-muted">
                              <img
                                src={msg.media_url}
                                alt="locked content"
                                className={`w-full h-full object-cover transition-all ${
                                  msg.ppv_unlocked ? '' : 'blur-[8px] scale-105 opacity-70'
                                }`}
                              />
                              {!msg.ppv_unlocked && (
                                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex flex-col items-center justify-center text-foreground z-10">
                                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                                    <Lock className="w-5 h-5 text-primary" />
                                  </div>
                                  <span className="text-lg font-black tracking-tight text-foreground">
                                    KES {(msg.ppv_price || 1000).toLocaleString()}
                                  </span>
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
                                    Locked PPV
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="p-2.5 bg-background border-t border-border flex items-center justify-between text-xs">
                              <span className="truncate font-medium">{msg.content}</span>
                              <span
                                className={`text-[10px] font-bold uppercase ${
                                  msg.ppv_unlocked ? 'text-emerald-500' : 'text-amber-500'
                                }`}
                              >
                                {msg.ppv_unlocked ? '✓ Unlocked' : 'Pending Unlock'}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] text-muted-foreground block mt-1 text-right">
                            {new Date(msg.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
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
                              ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-[4px] shadow-md shadow-primary/20'
                              : 'bg-foreground/5 border border-border/40 text-foreground rounded-2xl rounded-tl-[4px]'
                          }`}
                        >
                          {msg.content}
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1 px-1">
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

              {/* Warning Banner */}
              {filterWarning && (
                <div className="px-4 py-2 bg-amber-500/15 border-t border-amber-500/30 text-amber-500 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span className="font-medium">{filterWarning}</span>
                </div>
              )}

              {/* Bottom Input Section */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 md:p-4 bg-background/80 backdrop-blur-md border-t border-border/50 flex flex-col gap-2 z-20"
              >
                <div className="flex gap-2 sm:gap-3 items-center">
                  <button
                    type="button"
                    onClick={() => setIsPpvModalOpen(true)}
                    className="h-10 px-3 shrink-0 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-bold hover:bg-primary hover:text-primary-foreground transition-all flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>PPV Drop</span>
                  </button>

                  <div className="flex-1 bg-foreground/5 border border-border/50 focus-within:border-primary/50 focus-within:bg-background rounded-full min-h-[44px] flex items-center transition-all px-4">
                    <input
                      type="text"
                      value={inputText}
                      onChange={handleInputChange}
                      onPaste={handlePaste}
                      placeholder={`Reply to ${selectedFan.name} (letters only, numbers disabled)...`}
                      className="flex-1 min-w-0 bg-transparent border-none text-xs md:text-sm focus:outline-none placeholder:text-muted-foreground"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!inputText.trim() || sending}
                    className="w-11 h-11 shrink-0 bg-primary disabled:opacity-40 text-primary-foreground rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all flex items-center justify-center group"
                  >
                    <Send className="w-4 h-4 -ml-0.5 mt-0.5 group-hover:scale-110 transition-transform" />
                  </button>
                </div>
                <div className="flex items-center justify-between px-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-muted-foreground" />
                    Digits and personal contacts are disabled for creator safety.
                  </span>
                  <span>{inputText.length} chars</span>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

      {/* PPV Creator Drop Modal */}
      {isPpvModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsPpvModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-foreground/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-primary/10 rounded-xl text-primary">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">Send Exclusive PPV Drop</h3>
                <p className="text-xs text-muted-foreground">
                  Fan pays via M-Pesa to unlock and view this media
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Media Caption / Title
                </label>
                <input
                  type="text"
                  value={ppvTitle}
                  onChange={(e) => setPpvTitle(stripDigits(e.target.value))}
                  placeholder="e.g. VIP Photoset (letters only)..."
                  className="w-full bg-foreground/5 border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Unlock Price (KES)
                </label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {['500', '1000', '1500', '2500'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPpvPrice(p)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        ppvPrice === p
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-foreground/5 border-border hover:bg-foreground/10 text-foreground'
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
                  className="w-full bg-foreground/5 border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Media Image URL
                </label>
                <input
                  type="text"
                  value={ppvImageUrl}
                  onChange={(e) => setPpvImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-foreground/5 border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <div className="mt-2 h-24 rounded-xl overflow-hidden border border-border relative bg-muted">
                  <img
                    src={ppvImageUrl}
                    alt="preview"
                    className="w-full h-full object-cover blur-sm opacity-80"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white font-bold text-xs gap-1">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Locked Preview for Fan</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsPpvModalOpen(false)}
                  className="flex-1 py-3 text-xs font-bold text-muted-foreground hover:bg-foreground/5 rounded-xl transition-colors border border-border"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendPPV}
                  disabled={!ppvImageUrl || sending}
                  className="flex-1 py-3 text-xs font-bold bg-primary text-primary-foreground rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all disabled:opacity-50"
                >
                  Drop PPV to Fan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </CreatorLayout>
  );
};

export default Messages;
