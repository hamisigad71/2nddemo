import { useState } from 'react';
import { Search, MoreVertical, Users, UserX, UserCheck, RefreshCw, MessageSquare } from 'lucide-react';
import AdminLayout from './AdminLayout';

const users = [
  { id: 1, name: 'Kevin Otieno', email: 'kevin@email.com', type: 'fan', subs: 3, spent: 'KES 4,500', status: 'active', joined: 'Aug 2025', img: 'https://i.pravatar.cc/150?img=11' },
  { id: 2, name: 'Mercy Wanjiru', email: 'mercy@email.com', type: 'fan', subs: 1, spent: 'KES 800', status: 'active', joined: 'Sep 2025', img: 'https://i.pravatar.cc/150?img=5' },
  { id: 3, name: 'John Mwangi', email: 'john@email.com', type: 'fan', subs: 5, spent: 'KES 12,000', status: 'active', joined: 'Jun 2025', img: 'https://i.pravatar.cc/150?img=14' },
  { id: 4, name: 'Fatuma Hassan', email: 'fatuma@email.com', type: 'fan', subs: 2, spent: 'KES 2,400', status: 'banned', joined: 'Jul 2025', img: 'https://i.pravatar.cc/150?img=9' },
  { id: 5, name: 'Brian Kipkoech', email: 'brian@email.com', type: 'fan', subs: 0, spent: 'KES 0', status: 'active', joined: 'Sep 2025', img: 'https://i.pravatar.cc/150?img=17' },
  { id: 6, name: 'Aisha Salim', email: 'aisha@email.com', type: 'fan', subs: 4, spent: 'KES 7,200', status: 'active', joined: 'May 2025', img: 'https://i.pravatar.cc/150?img=25' },
];

const statusStyles: Record<string, string> = {
  active: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  banned: 'text-red-400 bg-red-500/10 border-red-500/20',
  suspended: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
};

const AdminUsers = () => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = users.filter(u => {
    const matchFilter = filter === 'all' || u.status === filter;
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto custom-scrollbar overflow-y-auto">

        {/* Premium Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 bg-gradient-to-r from-[#0d0e12] to-[#14161d] p-6 lg:p-8 rounded-3xl border border-zinc-800/80 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          
          <div className="relative z-10 flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500">
                <Users className="w-5 h-5" />
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">User / Fan Management</h1>
            </div>
            <p className="text-zinc-400 text-sm font-medium max-w-xl leading-relaxed">
              View and manage all registered platform fans. Issue refunds, manage bans, and communicate with user accounts.
            </p>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Users', value: '182,430', highlight: 'text-white' },
            { label: 'Active Today', value: '4,218', highlight: 'text-white' },
            { label: 'New This Week', value: '1,342', highlight: 'text-emerald-500' },
            { label: 'Banned', value: '14', highlight: 'text-red-500' },
          ].map(({ label, value, highlight }, i) => (
            <div key={i} className="bg-[#0d0e12] border border-zinc-800 rounded-3xl p-6 hover:border-zinc-700 transition-colors group relative overflow-hidden">
               <div className="text-[11px] uppercase tracking-widest font-black text-zinc-500 mb-2">{label}</div>
               <div className={`text-3xl font-black mb-1 drop-shadow-md ${highlight}`}>{value}</div>
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
              placeholder="Search users..."
              className="w-full bg-[#0d0e12] border border-zinc-800 pl-11 pr-4 py-3.5 rounded-2xl text-white text-sm font-medium focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all placeholder:text-zinc-600 shadow-sm"
            />
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-2 md:pb-0">
            <div className="flex bg-[#0d0e12] border border-zinc-800 p-1.5 rounded-2xl">
              {['all', 'active', 'banned'].map(s => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                    filter === s 
                      ? 'bg-red-600 text-white shadow-lg shadow-red-600/20 border border-red-500' 
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50 border border-transparent'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Extravagant Table */}
        <div className="bg-[#0d0e12] border border-zinc-800/80 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#14161d] border-b border-zinc-800">
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500 pl-8">User profile</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Subscriptions</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Total Spent</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Account Status</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Date Joined</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500 text-right pr-8">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filtered.map(u => (
                  <tr key={u.id} className="group hover:bg-[#14161d]/50 transition-colors">
                    <td className="px-6 py-4 pl-8">
                      <div className="flex items-center gap-4">
                        <div className="relative shrink-0 w-12 h-12">
                          <img src={u.img} className="w-full h-full rounded-full object-cover border-2 border-zinc-800 group-hover:border-red-500/50 transition-colors" />
                          <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0d0e12] ${u.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm group-hover:text-red-400 transition-colors">{u.name}</div>
                          <div className="text-[11px] text-zinc-500 font-medium">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 font-bold text-white text-sm">
                        <span className="text-zinc-400">{u.subs} active</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-black text-red-500 text-sm drop-shadow-md">{u.spent}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-black px-3 py-1.5 rounded-full border ${statusStyles[u.status]}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-400 text-xs font-medium">
                      {u.joined}
                    </td>
                    <td className="px-6 py-4 pr-8 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {u.status === 'active' ? (
                          <button className="px-4 py-2 bg-[#181a22] text-red-500 border border-red-500/20 hover:bg-red-600 hover:text-white text-[11px] uppercase tracking-wider font-black rounded-xl transition-all active:scale-95 flex items-center gap-1.5">
                            <UserX className="w-3.5 h-3.5" /> Ban
                          </button>
                        ) : (
                          <button className="px-4 py-2 bg-[#181a22] text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white text-[11px] uppercase tracking-wider font-black rounded-xl transition-all active:scale-95 flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5" /> Unban
                          </button>
                        )}
                        <button className="px-4 py-2 bg-[#181a22] text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 text-[11px] uppercase tracking-wider font-black rounded-xl transition-all active:scale-95 flex items-center gap-1.5">
                          <RefreshCw className="w-3.5 h-3.5" /> Refund
                        </button>
                        <button className="px-4 py-2 bg-[#181a22] text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 text-[11px] uppercase tracking-wider font-black rounded-xl transition-all active:scale-95 flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5" /> Message
                        </button>
                        <button className="p-2 bg-[#181a22] rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-all active:scale-95">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
};

export default AdminUsers;
