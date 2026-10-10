import CreatorLayout from '../../components/CreatorLayout';
import { DollarSign, MessageCircle, Heart, UserPlus, Bell, CheckCheck, Sparkles, Filter, ChevronRight } from 'lucide-react';
import { useState } from 'react';

const Notifications = () => {
  const [activeFilter, setActiveFilter] = useState('All');

  const notifications = [
    { id: 1, type: 'Tips', icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', title: 'New Tip Received!', msg: 'Fan 4 tipped you KES 1,000 on "Summer Shoot" video.', time: '10m ago', unread: true },
    { id: 2, type: 'Subscribers', icon: UserPlus, color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/20', title: 'New Subscriber', msg: 'User 24 just subscribed to your KES 500/mo tier.', time: '1h ago', unread: true },
    { id: 3, type: 'Comments', icon: MessageCircle, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', title: 'PPV Unlocked', msg: 'Fan 1 unlocked your hidden message for KES 1,000.', time: '3h ago', unread: false },
    { id: 4, type: 'Likes', icon: Heart, color: 'text-rose-500', bg: 'bg-rose-500/10 border-rose-500/20', title: 'New Like', msg: 'Fan 14 liked your recent post.', time: '1d ago', unread: false },
    { id: 5, type: 'Tips', icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', title: 'New Tip Received!', msg: 'Fan 1 tipped you KES 500.', time: '1d ago', unread: false },
    { id: 6, type: 'Subscribers', icon: UserPlus, color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/20', title: 'New Subscriber', msg: 'User 8 subscribed to your KES 500/mo tier.', time: '2d ago', unread: false },
  ];

  const filteredNotifications = activeFilter === 'All' 
    ? notifications 
    : notifications.filter(n => n.type === activeFilter);

  return (
    <CreatorLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight text-white">Notifications</h1>
              <span className="bg-red-600/20 text-red-500 text-xs font-black px-2.5 py-1 rounded-full border border-red-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> 2 Unread
              </span>
            </div>
            <p className="text-zinc-400 text-sm font-medium mt-1">Stay up to date with real-time fan interactions, tips, and unlocks.</p>
          </div>
          <button className="self-start sm:self-auto flex items-center gap-2 bg-[#14161d] hover:bg-zinc-800 text-zinc-300 hover:text-white px-4 py-2.5 rounded-xl text-xs font-bold border border-zinc-800 transition-all shadow-sm">
            <CheckCheck className="w-4 h-4 text-red-500" />
            Mark all as read
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {['All', 'Tips', 'Subscribers', 'Comments', 'Likes'].map((tab) => {
            const isActive = activeFilter === tab;
            return (
              <button 
                key={tab} 
                onClick={() => setActiveFilter(tab)}
                className={`px-5 py-2.5 rounded-full text-xs font-black tracking-wider uppercase whitespace-nowrap transition-all duration-200 border ${
                  isActive 
                    ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-600/30' 
                    : 'bg-[#14161d] text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-white'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Notifications List */}
        <div className="bg-[#14161d] border border-zinc-800/80 rounded-3xl overflow-hidden shadow-2xl">
          {filteredNotifications.length === 0 ? (
            <div className="p-12 text-center text-zinc-500">
              <Bell className="w-12 h-12 mx-auto mb-3 text-zinc-700 opacity-50" />
              <p className="font-bold text-sm">No notifications found in this category.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {filteredNotifications.map((item) => (
                <div 
                  key={item.id} 
                  className={`p-5 sm:p-6 flex items-start gap-4 transition-all duration-200 hover:bg-zinc-800/40 cursor-pointer group relative ${
                    item.unread ? 'bg-red-950/10' : ''
                  }`}
                >
                  {/* Unread Accent Pill */}
                  {item.unread && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600"></div>
                  )}

                  {/* Icon */}
                  <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner ${item.bg} ${item.color}`}>
                    <item.icon className="w-6 h-6" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="font-black text-white text-base truncate group-hover:text-red-400 transition-colors">
                        {item.title}
                      </h3>
                      <span className="text-xs font-bold text-zinc-500 whitespace-nowrap bg-[#0d0e12] px-2.5 py-1 rounded-lg border border-zinc-800">
                        {item.time}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-zinc-400 group-hover:text-zinc-300 transition-colors leading-relaxed">
                      {item.msg}
                    </p>
                  </div>

                  {/* Arrow Icon on Hover */}
                  <div className="shrink-0 text-zinc-600 group-hover:text-red-500 transition-colors self-center">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </CreatorLayout>
  );
};

export default Notifications;
