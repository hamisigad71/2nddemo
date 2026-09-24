import CreatorLayout from '../../components/CreatorLayout';
import { DollarSign, MessageCircle, Heart, UserPlus } from 'lucide-react';

const Notifications = () => {
  return (
    <CreatorLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">Notifications</h1>
        <p className="text-muted-foreground">Stay up to date with your fans' interactions.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-4 mb-2 scrollbar-hide">
        {['All', 'Tips', 'Subscribers', 'Comments', 'Likes'].map((tab, i) => (
          <button key={tab} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap ${i === 0 ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-input hover:text-foreground transition-colors'}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-background border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="divide-y divide-border">
           {[
             { type: 'tip', icon: DollarSign, color: 'text-primary', bg: 'bg-primary/10', title: 'New Tip Received!', msg: 'Fan 4 tipped you KES 1,000 on "Summer Shoot" video.', time: '10m ago' },
             { type: 'sub', icon: UserPlus, color: 'text-secondary', bg: 'bg-secondary/10', title: 'New Subscriber', msg: 'User 24 just subscribed to your KES 500/mo tier.', time: '1h ago' },
             { type: 'msg', icon: MessageCircle, color: 'text-blue-500', bg: 'bg-blue-500/10', title: 'PPV Unlocked', msg: 'Fan 1 unlocked your hidden message for KES 1,000.', time: '3h ago' },
             { type: 'like', icon: Heart, color: 'text-red-500', bg: 'bg-red-500/10', title: 'New Like', msg: 'Fan 14 liked your recent post.', time: '1d ago' },
             { type: 'tip', icon: DollarSign, color: 'text-primary', bg: 'bg-primary/10', title: 'New Tip Received!', msg: 'Fan 1 tipped you KES 500.', time: '1d ago' },
             { type: 'sub', icon: UserPlus, color: 'text-secondary', bg: 'bg-secondary/10', title: 'New Subscriber', msg: 'User 8 subscribed to your KES 500/mo tier.', time: '2d ago' },
           ].map((item, i) => (
             <div key={i} className="p-5 flex gap-4 hover:bg-muted/10 transition-colors cursor-pointer">
                <div className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${item.bg} ${item.color}`}>
                   <item.icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                   <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-sm">{item.title}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{item.time}</span>
                   </div>
                   <p className="text-sm text-muted-foreground">{item.msg}</p>
                </div>
             </div>
           ))}
        </div>
      </div>
    </CreatorLayout>
  );
};
export default Notifications;
