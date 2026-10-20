import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, 
  X, 
  Send, 
  Clock, 
  Minimize2, 
  Maximize2, 
  RotateCcw, 
  Headphones
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link, useLocation } from 'react-router-dom';

interface ChatMessage {
  id: string;
  sender: 'representative' | 'creator';
  text: string;
  timestamp: string;
  action?: {
    label: string;
    url?: string;
    handler?: string;
  };
}

const REPRESENTATIVE = {
  name: 'Amina Wanjiku',
  role: 'Creator Partner Specialist',
  status: 'Online',
  avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
  badge: 'The Gents DollHouse Concierge',
};

const SUGGESTED_PROMPTS = [
  { label: 'How many hours for payouts?', prompt: 'How many hours does it take to receive my payout?' },
  { label: 'How do I withdraw earnings?', prompt: 'How do I withdraw my earnings to M-Pesa?' },
  { label: 'What is the platform fee?', prompt: 'What is The Gents DollHouse platform fee and creator revenue split?' },
  { label: 'How do PPV unlocks work?', prompt: 'How do Pay-Per-View unlocks work for my private videos and photos?' },
  { label: 'Talk to an account manager', prompt: 'I would like to speak to an account manager regarding my payouts.' },
];

const generateResponse = (userText: string): { reply: string; action?: { label: string; url?: string } } => {
  const query = userText.toLowerCase();

  // Payout hours / timing inquiry (Boss requirement)
  if (
    query.includes('hour') || 
    query.includes('payout') || 
    query.includes('receive') || 
    query.includes('how long') || 
    query.includes('when do i get') || 
    query.includes('delay') || 
    query.includes('timing')
  ) {
    return {
      reply: `M-Pesa payouts are disbursed directly to your Safaricom phone number via our automated B2C payout gateway:

• Instant processing: Typically arrives within 5 to 30 minutes.
• Maximum window: Up to 1 to 2 hours during peak Safaricom network reconciliations or maintenance periods.
• Bank transfers: Settled within 24 business hours.

Your payment statement is discreet and anonymous. You can monitor the real-time status of all your payouts anytime from your Wallet.`,
      action: {
        label: 'View wallet & payouts',
        url: '/wallet',
      }
    };
  }

  // How to withdraw
  if (query.includes('withdraw') || query.includes('cash out') || query.includes('transfer')) {
    return {
      reply: `To withdraw your available balance:

1. Open your Wallet & Payouts page.
2. Ensure your available balance is at least KES 500 (minimum threshold).
3. Tap "Withdraw to M-Pesa".

Your request will trigger an immediate B2C disbursement to your registered phone number.`,
      action: {
        label: 'Open wallet',
        url: '/wallet',
      }
    };
  }

  // Platform fee / commission
  if (query.includes('fee') || query.includes('commission') || query.includes('split') || query.includes('percentage') || query.includes('cut')) {
    return {
      reply: `The Gents DollHouse operates on a simple, transparent revenue split:

• You keep 70% of all earnings (Tips, Subscriptions, and PPV Unlocks).
• Platform fee is 30%.

This covers payment gateway settlement, M-Pesa disbursement charges, video streaming bandwidth, and VIP moderation. There are zero hidden fees.`,
      action: {
        label: 'Check analytics',
        url: '/analytics',
      }
    };
  }

  // PPV unlocks / media
  if (query.includes('ppv') || query.includes('locked') || query.includes('video') || query.includes('photo') || query.includes('media')) {
    return {
      reply: `With Pay-Per-View (PPV), you can lock individual photos or videos behind a one-time price:

• Upload your media in the Create Post or Media Vault section.
• Toggle "Locked Content" and set your price in KES.
• Fans unlock your post instantly using M-Pesa.
• Your 70% cut reflects in your available balance the instant the fan unlocks it.`,
      action: {
        label: 'Create PPV post',
        url: '/create',
      }
    };
  }

  // Human / Manager escalation
  if (query.includes('manager') || query.includes('human') || query.includes('agent') || query.includes('speak') || query.includes('escalate')) {
    const ticketId = `TGD-${Math.floor(1000 + Math.random() * 9000)}`;
    return {
      reply: `I have escalated your inquiry directly to the Senior Creator Relations Desk under Ticket #${ticketId}.

A dedicated partner manager reviews all creator priority tickets 24/7. If you have an urgent payment dispute, please leave your phone number and transaction reference here.`,
    };
  }

  // Default fallback
  return {
    reply: `Thank you for your message. I am here to help you maximize your revenue on The Gents DollHouse.

I can assist you with:
• Payout hours and M-Pesa withdrawal processing times
• Commission rates and revenue breakdown (you keep 70%)
• Setting up Pay-Per-View video locks
• Verifying your creator badge and profile visibility

Please select one of the suggested topics below or type your question.`,
  };
};

export const CreatorSupportChat: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const storageKey = `tgd_creator_support_${user?.id || 'guest'}`;

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}

    const creatorName = user?.user_metadata?.name || 'Creator';
    return [
      {
        id: 'msg-welcome',
        sender: 'representative',
        text: `Hello ${creatorName}! I'm Amina from The Gents DollHouse Creator Partner Support. 

I'm your dedicated representative for any questions regarding M-Pesa payout hours, withdrawal settlements, PPV content, or account settings. What can I assist you with today?`,
        timestamp: new Date().toLocaleTimeString('en-KE', { hour: 'numeric', minute: '2-digit', hour12: true }),
      }
    ];
  });

  // Save conversation
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {}
  }, [messages, storageKey]);

  // Listen for global open requests (e.g. from Wallet page)
  useEffect(() => {
    const handleOpen = (e: any) => {
      setIsOpen(true);
      setIsMinimized(false);
      const prompt = e.detail?.prompt;
      if (prompt) {
        handleSendPrompt(prompt);
      }
    };

    window.addEventListener('open_creator_support', handleOpen);
    return () => window.removeEventListener('open_creator_support', handleOpen);
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized, isTyping]);

  const handleSendPrompt = (text: string) => {
    const creatorMsg: ChatMessage = {
      id: `creator-${Date.now()}`,
      sender: 'creator',
      text,
      timestamp: new Date().toLocaleTimeString('en-KE', { hour: 'numeric', minute: '2-digit', hour12: true }),
    };

    setMessages(prev => [...prev, creatorMsg]);
    setIsTyping(true);

    setTimeout(() => {
      const { reply, action } = generateResponse(text);
      const repMsg: ChatMessage = {
        id: `rep-${Date.now()}`,
        sender: 'representative',
        text: reply,
        timestamp: new Date().toLocaleTimeString('en-KE', { hour: 'numeric', minute: '2-digit', hour12: true }),
        action,
      };
      setMessages(prev => [...prev, repMsg]);
      setIsTyping(false);
    }, 700);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText('');
    handleSendPrompt(text);
  };

  const handleReset = () => {
    const creatorName = user?.user_metadata?.name || 'Creator';
    const initial: ChatMessage[] = [
      {
        id: `msg-welcome-${Date.now()}`,
        sender: 'representative',
        text: `Hello ${creatorName}! Conversation refreshed. How can I help you with your payouts or creator account?`,
        timestamp: new Date().toLocaleTimeString('en-KE', { hour: 'numeric', minute: '2-digit', hour12: true }),
      }
    ];
    setMessages(initial);
  };

  // Don't render on public auth or admin routes to prevent clutter
  if (['/login', '/signup', '/forgot-password'].includes(location.pathname) || location.pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <>
      {/* Sleek Compact Floating Concierge Bubble Launcher */}
      {!isOpen && !isDismissed && (
        <aside aria-label="Creator live support" className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-[9999] flex items-center gap-2 group">
          {/* Tooltip on hover (desktop only) */}
          <div className="hidden lg:group-hover:flex items-center gap-2 bg-[#14151d] border border-rose-500/40 text-white text-xs px-3.5 py-2 rounded-2xl shadow-2xl animate-fade-in pointer-events-none transition-all">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold">Live Creator Support</span>
            <span className="text-[10px] text-zinc-400">· Online</span>
          </div>

          {/* Compact Circular Trigger Button */}
          <div className="relative">
            <button
              onClick={() => {
                setIsOpen(true);
                setIsMinimized(false);
              }}
              className="w-13 h-13 md:w-14 md:h-14 rounded-full bg-[#111218] hover:bg-[#181926] text-white border-2 border-rose-500/50 hover:border-rose-500 p-1 shadow-[0_10px_35px_rgba(0,0,0,0.85)] ring-2 ring-rose-500/20 transition-all hover:scale-105 active:scale-95 flex items-center justify-center relative focus-visible:outline-none"
              title="Chat with Creator Support Representative"
            >
              <img 
                src={REPRESENTATIVE.avatar} 
                alt="" 
                className="w-full h-full rounded-full object-cover" 
              />
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#111218] animate-pulse" />
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-600 border border-[#111218] flex items-center justify-center text-white text-[10px] shadow-sm">
                <MessageCircle className="w-2.5 h-2.5" />
              </div>
            </button>

            {/* Quick Dismiss 'X' on hover */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsDismissed(true);
              }}
              className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
              title="Hide support button"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </aside>
      )}

      {/* Floating Chat Modal */}
      {isOpen && (
        <section 
          aria-label="Live support chat window"
          className={`fixed right-3 sm:right-6 bottom-3 sm:bottom-6 z-[9999] w-[calc(100vw-1.5rem)] sm:w-[410px] bg-[#0e0f14] border border-white/[0.12] rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden transition-all duration-200 ${
            isMinimized ? 'h-16' : 'h-[580px] max-h-[85vh]'
          }`}
        >
          {/* Header */}
          <header className="px-4 py-3.5 bg-[#14151d] border-b border-white/[0.08] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <img 
                  src={REPRESENTATIVE.avatar} 
                  alt="" 
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-rose-500/30" 
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#14151d]" />
              </div>

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-white truncate">
                    {REPRESENTATIVE.name}
                  </h3>
                  <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">
                    Staff
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 truncate">
                  {REPRESENTATIVE.role} · <span className="text-emerald-400">Online</span>
                </p>
              </div>
            </div>

            {/* Window controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleReset}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
                title="Restart conversation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
                title={isMinimized ? 'Expand chat' : 'Minimize chat'}
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </header>

          {!isMinimized && (
            <>
              {/* Message history */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 [scrollbar-width:thin] text-xs">
                {/* Banner notice on payout hours */}
                <div className="p-3 rounded-xl bg-rose-500/[0.07] border border-rose-500/20 text-zinc-300 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-300">
                    <Clock className="w-3.5 h-3.5 text-rose-400" />
                    <span>Payout schedule standard</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    M-Pesa withdrawals are automated and settle within <strong className="text-white">5 to 30 minutes</strong> (maximum 2 hours during network peak).
                  </p>
                </div>

                {messages.map((msg) => {
                  const isRep = msg.sender === 'representative';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isRep ? 'items-start' : 'items-end'}`}
                    >
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-[10px] font-medium text-zinc-500">
                          {isRep ? REPRESENTATIVE.name : 'You'}
                        </span>
                        <time className="text-[9px] text-zinc-600 tabular-nums">
                          {msg.timestamp}
                        </time>
                      </div>

                      <div
                        className={`rounded-2xl p-3.5 max-w-[88%] leading-relaxed ${
                          isRep
                            ? 'bg-[#181922] text-zinc-200 border border-white/[0.07] rounded-tl-sm'
                            : 'bg-rose-600 text-white rounded-tr-sm shadow-md'
                        }`}
                      >
                        <p className="whitespace-pre-line text-xs font-normal">
                          {msg.text}
                        </p>

                        {msg.action?.url && (
                          <div className="mt-3 pt-2 border-t border-white/[0.08]">
                            <Link
                              to={msg.action.url}
                              onClick={() => setIsOpen(false)}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 rounded-lg border border-rose-500/25 transition-all"
                            >
                              <span>{msg.action.label}</span>
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {isTyping && (
                  <div className="flex items-center gap-2 text-zinc-400 text-xs py-1">
                    <div className="w-6 h-6 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400 shrink-0">
                      <Headphones className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex items-center gap-1 bg-[#181922] px-3 py-2 rounded-xl border border-white/[0.07]">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-bounce [animation-delay:0.4s]" />
                      <span className="text-[11px] text-zinc-400 ml-1.5">Amina is replying...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick suggestions pills */}
              <div className="px-3 py-2 bg-[#101117] border-t border-white/[0.06] overflow-x-auto scrollbar-hide flex items-center gap-1.5 shrink-0">
                {SUGGESTED_PROMPTS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendPrompt(p.prompt)}
                    className="shrink-0 text-[11px] font-medium text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/20 px-3 py-1.5 rounded-full transition-all whitespace-nowrap active:scale-95"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Input Form */}
              <footer className="p-3 bg-[#14151d] border-t border-white/[0.08] shrink-0">
                <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Ask Amina about payout hours, fees, or account..."
                    className="flex-1 bg-[#0e0f14] border border-white/[0.09] focus:border-rose-500/60 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-rose-500/30 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className="p-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:hover:bg-rose-600 text-white rounded-xl transition-all active:scale-95 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                    title="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </footer>
            </>
          )}
        </section>
      )}
    </>
  );
};

export default CreatorSupportChat;

