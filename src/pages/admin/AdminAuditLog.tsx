import { useState } from 'react';
import { Search, Shield, UserX, CheckCircle, XCircle, DollarSign, Flag, Settings, Download } from 'lucide-react';
import AdminLayout from './AdminLayout';

const mockLogs = [
  { id: 'LOG001', admin: 'Elizabeth Gomez', action: 'Approved Creator', target: 'Grace Fashion', details: 'Creator account upgraded to active status', type: 'approve', timestamp: 'Oct 10, 2026 · 01:43 AM', ip: '197.156.XX.XX' },
  { id: 'LOG002', admin: 'Elizabeth Gomez', action: 'Banned User', target: 'Fatuma Hassan', details: 'User banned for violating terms of service', type: 'ban', timestamp: 'Oct 9, 2026 · 11:28 PM', ip: '197.156.XX.XX' },
  { id: 'LOG003', admin: 'Elizabeth Gomez', action: 'Approved Payout', target: 'Chef Kamau – KES 42,500', details: 'M-Pesa withdrawal approved and initiated', type: 'payout', timestamp: 'Oct 9, 2026 · 09:15 PM', ip: '197.156.XX.XX' },
  { id: 'LOG004', admin: 'Elizabeth Gomez', action: 'Deleted Post', target: 'Post #B3391 (ODC Music)', details: 'Content removed for violating community guidelines', type: 'delete', timestamp: 'Oct 9, 2026 · 07:02 PM', ip: '197.156.XX.XX' },
  { id: 'LOG005', admin: 'Elizabeth Gomez', action: 'Rejected Creator', target: 'Unknown Applicant', details: 'Creator application rejected — insufficient verification', type: 'reject', timestamp: 'Oct 8, 2026 · 04:31 PM', ip: '197.156.XX.XX' },
  { id: 'LOG006', admin: 'Elizabeth Gomez', action: 'Resolved Report', target: 'RPT003 against Amina K.', details: 'Report reviewed and dismissed — no violation found', type: 'flag', timestamp: 'Oct 8, 2026 · 02:11 PM', ip: '197.156.XX.XX' },
  { id: 'LOG007', admin: 'Elizabeth Gomez', action: 'Updated Settings', target: 'Platform Commission Rate', details: 'Commission rate updated from 12% to 15%', type: 'settings', timestamp: 'Oct 7, 2026 · 12:00 PM', ip: '197.156.XX.XX' },
  { id: 'LOG008', admin: 'Elizabeth Gomez', action: 'Rejected Payout', target: 'ODC Music – KES 15,200', details: 'Payout rejected — account under review', type: 'reject', timestamp: 'Oct 7, 2026 · 10:45 AM', ip: '197.156.XX.XX' },
];

const typeStyles: Record<string, { color: string; icon: React.ReactNode }> = {
  approve: { color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: <CheckCircle className="w-4 h-4" /> },
  ban: { color: 'text-red-400 bg-red-500/10 border-red-500/20', icon: <UserX className="w-4 h-4" /> },
  payout: { color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: <DollarSign className="w-4 h-4" /> },
  delete: { color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', icon: <XCircle className="w-4 h-4" /> },
  reject: { color: 'text-red-500 bg-red-600/10 border-red-600/20', icon: <XCircle className="w-4 h-4" /> },
  flag: { color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', icon: <Flag className="w-4 h-4" /> },
  settings: { color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20', icon: <Settings className="w-4 h-4" /> },
};

const AdminAuditLog = () => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const filtered = mockLogs.filter(l => {
    const matchType = typeFilter === 'all' || l.type === typeFilter;
    const matchSearch = l.action.toLowerCase().includes(search.toLowerCase())
      || l.target.toLowerCase().includes(search.toLowerCase())
      || l.details.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
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
                <Shield className="w-5 h-5" />
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Admin Audit Log</h1>
            </div>
            <p className="text-zinc-400 text-sm font-medium leading-relaxed">A chronological, tamper-proof trail of every administrative action. Protects you legally and maintains platform accountability.</p>
          </div>
          <button className="relative z-10 flex items-center gap-2 px-5 py-3 bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 text-sm font-black rounded-2xl transition-all active:scale-95 shrink-0">
            <Download className="w-4 h-4" /> Export CSV
          </button>
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
              placeholder="Search logs..."
              className="w-full bg-[#0d0e12] border border-zinc-800 pl-11 pr-4 py-3.5 rounded-2xl text-white text-sm font-medium focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all placeholder:text-zinc-600"
            />
          </div>
          <div className="flex bg-[#0d0e12] border border-zinc-800 p-1.5 rounded-2xl overflow-x-auto no-scrollbar">
            {['all', 'approve', 'reject', 'ban', 'payout', 'delete', 'flag', 'settings'].map(s => (
              <button
                key={s}
                onClick={() => setTypeFilter(s)}
                className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  typeFilter === s ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Log Timeline */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="py-20 text-center text-zinc-500 font-medium bg-[#0d0e12] border border-zinc-800 rounded-3xl">No logs match your search.</div>
          ) : filtered.map((l, idx) => {
            const style = typeStyles[l.type] ?? typeStyles['settings'];
            return (
              <div key={l.id} className="flex gap-4 items-start group">
                {/* Timeline line */}
                <div className="flex flex-col items-center mt-1 shrink-0">
                  <div className={`w-9 h-9 rounded-full border flex items-center justify-center ${style.color}`}>
                    {style.icon}
                  </div>
                  {idx < filtered.length - 1 && <div className="w-px flex-1 bg-zinc-800 mt-1 min-h-[24px]" />}
                </div>

                {/* Log card */}
                <div className="flex-1 bg-[#0d0e12] border border-zinc-800 group-hover:border-zinc-700 rounded-2xl p-5 transition-colors mb-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                    <div>
                      <span className="font-black text-white text-sm">{l.action}</span>
                      <span className="text-zinc-500 text-sm"> → </span>
                      <span className="text-red-400 font-bold text-sm">{l.target}</span>
                    </div>
                    <div className="text-[11px] text-zinc-600 font-mono whitespace-nowrap">{l.timestamp}</div>
                  </div>
                  <p className="text-zinc-400 text-sm leading-relaxed mb-3">{l.details}</p>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-4 text-[11px] text-zinc-600">
                      <span className="font-mono">{l.id}</span>
                      <span>Admin: <span className="text-zinc-400 font-medium">{l.admin}</span></span>
                      <span>IP: <span className="text-zinc-400 font-medium">{l.ip}</span></span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </AdminLayout>
  );
};

export default AdminAuditLog;
