import { useState } from 'react';
import { CheckCircle, XCircle, Clock, Search, Filter, MoreVertical, Star } from 'lucide-react';
import AdminLayout from './AdminLayout';

const creators = [
  { id: 1, name: 'Amina K.', email: 'amina@email.com', category: 'Fitness', subs: '12.4k', revenue: 'KES 420K', status: 'active', joined: 'Jan 2025', img: 'https://i.pinimg.com/736x/46/a5/70/46a57001c54ff217af4d11d485d4959a.jpg' },
  { id: 2, name: 'Chef Kamau', email: 'kamau@email.com', category: 'Culinary', subs: '8.5k', revenue: 'KES 275K', status: 'active', joined: 'Feb 2025', img: 'https://i.pinimg.com/736x/76/34/d5/7634d55a25c897bd325bf125ebf824da.jpg' },
  { id: 3, name: 'Wanjiku Tech', email: 'wanjiku@email.com', category: 'Education', subs: '24.1k', revenue: 'KES 380K', status: 'active', joined: 'Dec 2024', img: 'https://i.pinimg.com/736x/db/33/3a/db333afb2e79acfef7592a14cd8ad983.jpg' },
  { id: 4, name: 'ODC Music', email: 'odc@email.com', category: 'Entertainment', subs: '45.2k', revenue: 'KES 312K', status: 'suspended', joined: 'Nov 2024', img: 'https://i.pinimg.com/736x/3d/8e/1e/3d8e1ed6cd529d4119275ff9f7428390.jpg' },
  { id: 5, name: 'Grace Fashion', email: 'grace@email.com', category: 'Fashion', subs: '6.2k', revenue: 'KES 98K', status: 'pending', joined: 'Sep 2025', img: 'https://i.pravatar.cc/150?img=47' },
  { id: 6, name: 'Baraka Fitness', email: 'baraka@email.com', category: 'Sports', subs: '3.1k', revenue: 'KES 55K', status: 'pending', joined: 'Sep 2025', img: 'https://i.pravatar.cc/150?img=12' },
  { id: 7, name: 'Zuri Beauty', email: 'zuri@email.com', category: 'Beauty', subs: '9.8k', revenue: 'KES 210K', status: 'active', joined: 'Mar 2025', img: 'https://i.pravatar.cc/150?img=32' },
];

const statusStyles: Record<string, string> = {
  active: 'text-emerald-400 bg-emerald-400/10',
  pending: 'text-yellow-400 bg-yellow-400/10',
  suspended: 'text-red-400 bg-red-400/10',
};
const statusIcons: Record<string, React.ReactNode> = {
  active: <CheckCircle className="w-3 h-3" />,
  pending: <Clock className="w-3 h-3" />,
  suspended: <XCircle className="w-3 h-3" />,
};

const AdminCreators = () => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = creators.filter(c => {
    const matchFilter = filter === 'all' || c.status === filter;
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">Creator Management</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage, verify, and monitor all creators.</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="px-3 py-1.5 bg-primary/10 text-primary rounded-full font-bold text-xs">12 Pending</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search creators..."
              className="w-full pl-9 pr-4 py-2.5 bg-muted/50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
            {['all', 'active', 'pending', 'suspended'].map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-2 rounded-xl text-xs font-bold capitalize transition-colors ${filter === s ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'}`}
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
                  <th className="px-6 py-3 font-semibold">Creator</th>
                  <th className="px-6 py-3 font-semibold">Category</th>
                  <th className="px-6 py-3 font-semibold">Subscribers</th>
                  <th className="px-6 py-3 font-semibold">Revenue</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold">Joined</th>
                  <th className="px-6 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={c.img} className="w-9 h-9 rounded-full object-cover border border-border" />
                        <div>
                          <div className="font-semibold">{c.name}</div>
                          <div className="text-[11px] text-muted-foreground">{c.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">{c.category}</td>
                    <td className="px-6 py-4 font-semibold">{c.subs}</td>
                    <td className="px-6 py-4 font-bold text-primary">{c.revenue}</td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full w-fit capitalize ${statusStyles[c.status]}`}>
                        {statusIcons[c.status]}{c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">{c.joined}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        {c.status === 'pending' && (
                          <>
                            <button className="px-2.5 py-1.5 bg-primary text-primary-foreground text-[11px] font-bold rounded-lg hover:brightness-110 transition-all">Approve</button>
                            <button className="px-2.5 py-1.5 bg-red-400/10 text-red-400 text-[11px] font-bold rounded-lg hover:bg-red-400 hover:text-white transition-all">Reject</button>
                          </>
                        )}
                        {c.status === 'active' && (
                          <button className="px-2.5 py-1.5 bg-red-400/10 text-red-400 text-[11px] font-bold rounded-lg hover:bg-red-400 hover:text-white transition-all">Suspend</button>
                        )}
                        {c.status === 'suspended' && (
                          <button className="px-2.5 py-1.5 bg-emerald-400/10 text-emerald-400 text-[11px] font-bold rounded-lg hover:bg-emerald-400 hover:text-black transition-all">Restore</button>
                        )}
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

        {/* Pending Applications */}
        <div className="bg-muted/30 border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400" />
              <h3 className="font-bold">Verification Queue</h3>
              <span className="text-xs bg-yellow-400/10 text-yellow-400 font-bold px-2 py-0.5 rounded-full">12 pending</span>
            </div>
          </div>
          <div className="divide-y divide-border">
            {[1,2,3].map(i => (
              <div key={i} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/20 transition-colors">
                <img src={`https://i.pravatar.cc/150?img=${i+40}`} className="w-10 h-10 rounded-full" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">Creator Applicant {i}</div>
                  <div className="text-xs text-muted-foreground">Submitted National ID · {['Fitness','Music','Education'][i-1]} · Applied 2 days ago</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:brightness-110 transition-all">Approve</button>
                  <button className="px-3 py-1.5 bg-red-400/10 text-red-400 text-xs font-bold rounded-lg hover:bg-red-400 hover:text-white transition-all">Reject</button>
                  <button className="px-3 py-1.5 bg-muted text-muted-foreground text-xs font-bold rounded-lg hover:bg-muted/80 transition-all">Review Docs</button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </AdminLayout>
  );
};

export default AdminCreators;
