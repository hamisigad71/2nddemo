import { useState } from 'react';
import { Flag, Search, CheckCircle, XCircle, Eye, AlertTriangle, ShieldAlert, Trash2 } from 'lucide-react';
import AdminLayout from './AdminLayout';

const mockReports = [
  { id: 'RPT001', reporter: 'Kevin Otieno', reporterEmail: 'kevin@email.com', target: 'ODC Music', targetType: 'Creator', reason: 'Inappropriate Content', details: 'Profile contains content that violates community guidelines.', status: 'open', date: 'Oct 9, 2026', reporterImg: 'https://i.pravatar.cc/150?img=11', targetImg: 'https://i.pinimg.com/736x/3d/8e/1e/3d8e1ed6cd529d4119275ff9f7428390.jpg' },
  { id: 'RPT002', reporter: 'Mercy Wanjiru', reporterEmail: 'mercy@email.com', target: 'Post #A1242', targetType: 'Post', reason: 'Spam / Misleading', details: 'Creator is posting duplicate paid content disguised as exclusive.', status: 'open', date: 'Oct 8, 2026', reporterImg: 'https://i.pravatar.cc/150?img=5', targetImg: 'https://i.pravatar.cc/150?img=21' },
  { id: 'RPT003', reporter: 'John Mwangi', reporterEmail: 'john@email.com', target: 'Amina K.', targetType: 'Creator', reason: 'Harassment', details: 'Creator sent threatening DMs after subscription cancellation.', status: 'resolved', date: 'Oct 7, 2026', reporterImg: 'https://i.pravatar.cc/150?img=14', targetImg: 'https://i.pinimg.com/736x/46/a5/70/46a57001c54ff217af4d11d485d4959a.jpg' },
  { id: 'RPT004', reporter: 'Aisha Salim', reporterEmail: 'aisha@email.com', target: 'Chef Kamau', targetType: 'Creator', reason: 'Fraud / Scam', details: 'Creator promised exclusive recipes but never delivered paid content.', status: 'open', date: 'Oct 6, 2026', reporterImg: 'https://i.pravatar.cc/150?img=25', targetImg: 'https://i.pinimg.com/736x/76/34/d5/7634d55a25c897bd325bf125ebf824da.jpg' },
  { id: 'RPT005', reporter: 'Brian Kipkoech', reporterEmail: 'brian@email.com', target: 'Post #B3391', targetType: 'Post', reason: 'Underage Content', details: 'Post appears to feature minors in inappropriate context.', status: 'escalated', date: 'Oct 5, 2026', reporterImg: 'https://i.pravatar.cc/150?img=17', targetImg: 'https://i.pravatar.cc/150?img=22' },
];

const statusStyles: Record<string, string> = {
  open: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  resolved: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  escalated: 'text-red-400 bg-red-500/10 border-red-500/20',
  dismissed: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
};

const reasonColors: Record<string, string> = {
  'Inappropriate Content': 'text-orange-400 bg-orange-500/10',
  'Spam / Misleading': 'text-blue-400 bg-blue-500/10',
  'Harassment': 'text-red-400 bg-red-500/10',
  'Fraud / Scam': 'text-pink-400 bg-pink-500/10',
  'Underage Content': 'text-red-600 bg-red-600/10 font-black',
};

const AdminReports = () => {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [reports, setReports] = useState(mockReports);

  const handleAction = (id: string, action: 'resolved' | 'dismissed' | 'escalated') => {
    setReports(prev => prev.map(r => r.id === id ? { ...r, status: action } : r));
  };

  const filtered = reports.filter(r => {
    const matchFilter = filter === 'all' || r.status === filter;
    const matchSearch = r.target.toLowerCase().includes(search.toLowerCase()) || r.reason.toLowerCase().includes(search.toLowerCase()) || r.reporter.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 bg-gradient-to-r from-[#0d0e12] to-[#14161d] p-6 lg:p-8 rounded-3xl border border-zinc-800/80 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500">
                <Flag className="w-5 h-5" />
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Reports & Flags</h1>
            </div>
            <p className="text-zinc-400 text-sm font-medium leading-relaxed">Investigate user-submitted reports against creators or content. Take action to keep the platform safe.</p>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[
            { label: 'Open Reports', value: reports.filter(r => r.status === 'open').length, color: 'text-yellow-400' },
            { label: 'Escalated', value: reports.filter(r => r.status === 'escalated').length, color: 'text-red-500' },
            { label: 'Resolved', value: reports.filter(r => r.status === 'resolved').length, color: 'text-emerald-400' },
            { label: 'Dismissed', value: reports.filter(r => r.status === 'dismissed').length, color: 'text-zinc-400' },
          ].map(({ label, value, color }, i) => (
            <div key={i} className="bg-[#0d0e12] border border-zinc-800 rounded-3xl p-6">
              <div className="text-[11px] uppercase tracking-widest font-black text-zinc-500 mb-2">{label}</div>
              <div className={`text-3xl font-black ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96 group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-zinc-500 group-focus-within:text-red-500 transition-colors" />
            </div>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search reports..."
              className="w-full bg-[#0d0e12] border border-zinc-800 pl-11 pr-4 py-3.5 rounded-2xl text-white text-sm font-medium focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all placeholder:text-zinc-600"
            />
          </div>
          <div className="flex bg-[#0d0e12] border border-zinc-800 p-1.5 rounded-2xl">
            {['all', 'open', 'escalated', 'resolved', 'dismissed'].map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
                  filter === s ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Report Cards */}
        <div className="space-y-4">
          {filtered.length === 0 ? (
            <div className="py-20 text-center text-zinc-500 font-medium bg-[#0d0e12] border border-zinc-800 rounded-3xl">No reports match your criteria.</div>
          ) : filtered.map(r => (
            <div key={r.id} className="bg-[#0d0e12] border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-colors group">
              <div className="flex flex-col lg:flex-row gap-6">
                
                {/* Left: Reporter & Target */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <img src={r.reporterImg} className="w-10 h-10 rounded-full object-cover border-2 border-zinc-800 shrink-0" />
                      <div>
                        <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-black mb-0.5">Reported By</div>
                        <div className="font-bold text-white text-sm">{r.reporter}</div>
                        <div className="text-[11px] text-zinc-500">{r.reporterEmail}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${reasonColors[r.reason] ?? 'text-zinc-400 bg-zinc-800'}`}>{r.reason}</span>
                      <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-black px-3 py-1.5 rounded-full border ${statusStyles[r.status]}`}>{r.status}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
                    <img src={r.targetImg} className="w-9 h-9 rounded-lg object-cover border border-zinc-700 shrink-0" />
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-black mb-0.5">Reported {r.targetType}</div>
                      <div className="font-bold text-red-400 text-sm">{r.target}</div>
                    </div>
                  </div>

                  <p className="text-zinc-400 text-sm leading-relaxed border-l-2 border-red-500/30 pl-4">{r.details}</p>

                  <div className="flex items-center gap-2 text-[11px] text-zinc-600">
                    <span className="font-mono">{r.id}</span>
                    <span>·</span>
                    <span>{r.date}</span>
                  </div>
                </div>

                {/* Right: Actions */}
                {r.status === 'open' || r.status === 'escalated' ? (
                  <div className="flex lg:flex-col gap-2 justify-end lg:justify-start pt-1 flex-wrap">
                    <button onClick={() => handleAction(r.id, 'resolved')}
                      className="px-4 py-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white text-[11px] uppercase tracking-wider font-black rounded-xl transition-all active:scale-95 flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" /> Resolve
                    </button>
                    {r.status !== 'escalated' && (
                      <button onClick={() => handleAction(r.id, 'escalated')}
                        className="px-4 py-2.5 bg-red-600/10 text-red-400 border border-red-500/20 hover:bg-red-600 hover:text-white text-[11px] uppercase tracking-wider font-black rounded-xl transition-all active:scale-95 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" /> Escalate
                      </button>
                    )}
                    <button onClick={() => handleAction(r.id, 'dismissed')}
                      className="px-4 py-2.5 bg-zinc-800/60 text-zinc-400 border border-zinc-700 hover:text-white hover:border-zinc-500 text-[11px] uppercase tracking-wider font-black rounded-xl transition-all active:scale-95 flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5" /> Dismiss
                    </button>
                  </div>
                ) : (
                  <div className="lg:self-start">
                    <span className="text-zinc-600 text-xs font-medium italic capitalize">{r.status}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>
    </AdminLayout>
  );
};

export default AdminReports;
