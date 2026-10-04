import { useState } from 'react';
import { Search, Filter, MoreVertical, CheckCircle, XCircle, Clock } from 'lucide-react';
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
  active: 'text-emerald-400 bg-emerald-400/10',
  banned: 'text-red-400 bg-red-400/10',
  suspended: 'text-yellow-400 bg-yellow-400/10',
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
      <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">

        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">User / Fan Management</h1>
          <p className="text-muted-foreground text-sm mt-1">View and manage all registered fans and users.</p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Users', value: '182,430' },
            { label: 'Active Today', value: '4,218' },
            { label: 'New This Week', value: '1,342' },
            { label: 'Banned', value: '14' },
          ].map(({ label, value }, i) => (
            <div key={i} className="bg-muted/30 border border-border rounded-2xl p-4">
              <div className="text-xs text-muted-foreground mb-1">{label}</div>
              <div className="text-xl font-black text-foreground">{value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search users..."
              className="w-full pl-9 pr-4 py-2.5 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center gap-2">
            {['all', 'active', 'banned'].map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-2 rounded-xl text-xs font-bold capitalize transition-colors ${filter === s ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-muted/30 border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider border-b border-border">
                <tr>
                  <th className="px-6 py-3 font-semibold">User</th>
                  <th className="px-6 py-3 font-semibold">Subscriptions</th>
                  <th className="px-6 py-3 font-semibold">Total Spent</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold">Joined</th>
                  <th className="px-6 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {filtered.map(u => (
                  <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={u.img} className="w-9 h-9 rounded-full object-cover border border-border" />
                        <div>
                          <div className="font-semibold">{u.name}</div>
                          <div className="text-[11px] text-muted-foreground">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold">{u.subs} active</td>
                    <td className="px-6 py-4 font-bold text-primary">{u.spent}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${statusStyles[u.status]}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">{u.joined}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        {u.status === 'active' ? (
                          <button className="px-2.5 py-1.5 bg-red-400/10 text-red-400 text-[11px] font-bold rounded-lg hover:bg-red-400 hover:text-white transition-all">Ban</button>
                        ) : (
                          <button className="px-2.5 py-1.5 bg-emerald-400/10 text-emerald-400 text-[11px] font-bold rounded-lg hover:bg-emerald-400 hover:text-black transition-all">Unban</button>
                        )}
                        <button className="px-2.5 py-1.5 bg-muted text-muted-foreground text-[11px] font-bold rounded-lg hover:bg-muted/80 transition-all">Refund</button>
                        <button className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
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
