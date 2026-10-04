import { useState } from 'react';
import { Flag, Eye, Check, X, ShieldAlert } from 'lucide-react';
import AdminLayout from './AdminLayout';

const flaggedContent = [
  { id: 1, creator: 'ODC Music', type: 'Video', title: 'Behind the Scenes - Studio Session', reports: 4, reason: 'Inappropriate content', status: 'pending', img: 'https://i.pinimg.com/736x/3d/8e/1e/3d8e1ed6cd529d4119275ff9f7428390.jpg', time: '2h ago' },
  { id: 2, creator: 'Grace Fashion', type: 'Photo', title: 'Summer Collection Drop', reports: 2, reason: 'Misleading information', status: 'reviewing', img: 'https://i.pravatar.cc/150?img=47', time: '5h ago' },
  { id: 3, creator: 'Baraka Fitness', type: 'Post', title: 'Workout Challenge Part 3', reports: 1, reason: 'Spam', status: 'pending', img: 'https://i.pravatar.cc/150?img=12', time: '1d ago' },
];

const statusStyles: Record<string, string> = {
  pending: 'text-yellow-400 bg-yellow-400/10',
  reviewing: 'text-blue-400 bg-blue-400/10',
  cleared: 'text-emerald-400 bg-emerald-400/10',
  removed: 'text-red-400 bg-red-400/10',
};

const AdminContent = () => {
  const [items, setItems] = useState(flaggedContent);

  const updateStatus = (id: number, status: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, status } : item));
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-400/10 flex items-center justify-center shrink-0 mt-1">
            <ShieldAlert className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">Content Moderation</h1>
            <p className="text-muted-foreground text-sm mt-1">Review flagged content and user reports.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Flagged Today', value: '3', color: 'text-red-400' },
            { label: 'Under Review', value: '1', color: 'text-blue-400' },
            { label: 'Cleared', value: '28', color: 'text-emerald-400' },
            { label: 'Removed', value: '5', color: 'text-muted-foreground' },
          ].map(({ label, value, color }, i) => (
            <div key={i} className="bg-muted/30 border border-border rounded-2xl p-4">
              <div className="text-xs text-muted-foreground mb-1">{label}</div>
              <div className={`text-2xl font-black ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Flagged Items */}
        <div className="space-y-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Flag className="w-4 h-4 text-red-400" /> Flagged Content
          </h3>
          {items.map(item => (
            <div key={item.id} className="bg-muted/30 border border-border rounded-2xl p-5 hover:border-primary/20 transition-colors">
              <div className="flex items-start gap-4">
                <img src={item.img} className="w-12 h-12 rounded-xl object-cover border border-border shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <div className="font-bold text-sm">{item.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{item.creator} · {item.type} · {item.time}</div>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${statusStyles[item.status]}`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1.5 text-xs text-red-400 font-semibold bg-red-400/10 px-2.5 py-1 rounded-full">
                      <Flag className="w-3 h-3" /> {item.reports} reports
                    </span>
                    <span className="text-xs text-muted-foreground">Reason: <span className="text-foreground font-medium">{item.reason}</span></span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => updateStatus(item.id, 'reviewing')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-muted text-muted-foreground text-xs font-bold rounded-lg hover:bg-muted/80 transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" /> Review
                    </button>
                    <button
                      onClick={() => updateStatus(item.id, 'cleared')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-400/10 text-emerald-400 text-xs font-bold rounded-lg hover:bg-emerald-400 hover:text-black transition-all"
                    >
                      <Check className="w-3.5 h-3.5" /> Clear
                    </button>
                    <button
                      onClick={() => updateStatus(item.id, 'removed')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-400/10 text-red-400 text-xs font-bold rounded-lg hover:bg-red-400 hover:text-white transition-all"
                    >
                      <X className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Reports Feed */}
        <div className="bg-muted/30 border border-border rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border font-bold">User Reports Feed</div>
          <div className="divide-y divide-border">
            {[
              { from: 'Kevin Otieno', about: 'ODC Music', reason: 'Inappropriate thumbnail', time: '1h ago' },
              { from: 'Aisha Salim', about: 'Grace Fashion', reason: 'False advertising', time: '3h ago' },
              { from: 'Brian Kipkoech', about: 'Baraka Fitness', reason: 'Spam messages', time: '6h ago' },
            ].map((r, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/20 transition-colors">
                <img src={`https://i.pravatar.cc/150?img=${i+10}`} className="w-8 h-8 rounded-full shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{r.from}</span> reported <span className="font-semibold text-foreground">{r.about}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Reason: {r.reason} · {r.time}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button className="p-1.5 rounded-lg bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400 hover:text-black transition-all"><Check className="w-3.5 h-3.5" /></button>
                  <button className="p-1.5 rounded-lg bg-red-400/10 text-red-400 hover:bg-red-400 hover:text-white transition-all"><X className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </AdminLayout>
  );
};

export default AdminContent;
