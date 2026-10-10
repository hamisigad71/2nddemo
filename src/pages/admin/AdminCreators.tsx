import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Search, MoreVertical, TrendingUp, Users, ShieldAlert, Loader2 } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { getAdminCreators, updateCreatorStatus } from '../../lib/db';

const mockCreators = [
  { id: 'mock1', name: 'Amina K.', email: 'amina@email.com', category: 'Fitness', subs: '12.4k', revenue: 'KES 420K', status: 'active', joined: 'Jan 2025', img: 'https://i.pinimg.com/736x/46/a5/70/46a57001c54ff217af4d11d485d4959a.jpg' },
  { id: 'mock2', name: 'Chef Kamau', email: 'kamau@email.com', category: 'Culinary', subs: '8.5k', revenue: 'KES 275K', status: 'active', joined: 'Feb 2025', img: 'https://i.pinimg.com/736x/76/34/d5/7634d55a25c897bd325bf125ebf824da.jpg' },
  { id: 'mock3', name: 'Wanjiku Tech', email: 'wanjiku@email.com', category: 'Education', subs: '24.1k', revenue: 'KES 380K', status: 'active', joined: 'Dec 2024', img: 'https://i.pinimg.com/736x/db/33/3a/db333afb2e79acfef7592a14cd8ad983.jpg' },
  { id: 'mock4', name: 'ODC Music', email: 'odc@email.com', category: 'Entertainment', subs: '45.2k', revenue: 'KES 312K', status: 'suspended', joined: 'Nov 2024', img: 'https://i.pinimg.com/736x/3d/8e/1e/3d8e1ed6cd529d4119275ff9f7428390.jpg' },
  { id: 'mock5', name: 'Grace Fashion', email: 'grace@email.com', category: 'Fashion', subs: '6.2k', revenue: 'KES 98K', status: 'pending', joined: 'Sep 2025', img: 'https://i.pravatar.cc/150?img=47' },
];

const statusStyles: Record<string, string> = {
  active: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  pending: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  suspended: 'text-red-400 bg-red-500/10 border-red-500/20',
};
const statusIcons: Record<string, React.ReactNode> = {
  active: <CheckCircle className="w-3.5 h-3.5 shrink-0" />,
  pending: <Clock className="w-3.5 h-3.5 shrink-0" />,
  suspended: <XCircle className="w-3.5 h-3.5 shrink-0" />,
};

const AdminCreators = () => {
  const [creatorsList, setCreatorsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const loadCreators = async () => {
    setIsLoading(true);
    const data = await getAdminCreators();
    setCreatorsList([...data, ...mockCreators]);
    setIsLoading(false);
  };

  useEffect(() => {
    loadCreators();
  }, []);

  const handleStatusChange = async (id: string, newStatus: 'active' | 'pending' | 'suspended') => {
    await updateCreatorStatus(id, newStatus);
    await loadCreators(); // Refresh data
  };

  const filtered = creatorsList.filter(c => {
    const matchFilter = filter === 'all' || c.status === filter;
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || 
                        (c.email && c.email.toLowerCase().includes(search.toLowerCase()));
    return matchFilter && matchSearch;
  });

  const pendingCreators = creatorsList.filter(c => c.status === 'pending');

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto custom-scrollbar overflow-y-auto">

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 bg-gradient-to-r from-[#0d0e12] to-[#14161d] p-6 lg:p-8 rounded-3xl border border-zinc-800/80 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          
          <div className="relative z-10 flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500">
                <Users className="w-5 h-5" />
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Creator Management</h1>
            </div>
            <p className="text-zinc-400 text-sm font-medium max-w-xl leading-relaxed">
              Oversee the elite creator roster. Manage verifications, monitor revenue performance, and handle creator access levels securely.
            </p>
          </div>
          <div className="relative z-10 flex gap-4 shrink-0">
            <div className="bg-[#181a22] border border-zinc-800 rounded-2xl p-4 flex flex-col items-center justify-center min-w-[100px]">
              <span className="text-2xl font-black text-white">{creatorsList.length}</span>
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Total</span>
            </div>
            <div className="bg-red-950/20 border border-red-500/20 rounded-2xl p-4 flex flex-col items-center justify-center min-w-[100px] shadow-[0_0_15px_rgba(220,38,38,0.05)]">
              <span className="text-2xl font-black text-red-500 drop-shadow-md">{pendingCreators.length}</span>
              <span className="text-[10px] uppercase font-bold text-red-400 tracking-wider">Pending</span>
            </div>
          </div>
        </div>

        {/* Controls / Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96 group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-zinc-500 group-focus-within:text-red-500 transition-colors" />
            </div>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, or ID..."
              className="w-full bg-[#0d0e12] border border-zinc-800 pl-11 pr-4 py-3.5 rounded-2xl text-white text-sm font-medium focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all placeholder:text-zinc-600 shadow-sm"
            />
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-2 md:pb-0">
            <div className="flex bg-[#0d0e12] border border-zinc-800 p-1.5 rounded-2xl">
              {['all', 'active', 'pending', 'suspended'].map(s => (
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
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500 pl-8">Creator details</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Niche</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Audience</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Revenue (YTD)</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Account Status</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Date Joined</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500 text-right pr-8">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <Loader2 className="w-8 h-8 md:w-10 md:h-10 text-red-500 animate-spin mx-auto opacity-80" />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-500 font-medium">No creators found matching your criteria.</td>
                  </tr>
                ) : filtered.map(c => (
                  <tr key={c.id} className="group hover:bg-[#14161d]/50 transition-colors">
                    <td className="px-6 py-4 pl-8">
                      <div className="flex items-center gap-4">
                        <div className="relative shrink-0 w-12 h-12">
                          <img src={c.img} className="w-full h-full rounded-full object-cover border-2 border-zinc-800 group-hover:border-red-500/50 transition-colors" />
                          <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0d0e12] ${c.status === 'active' ? 'bg-emerald-500' : c.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm group-hover:text-red-400 transition-colors">{c.name}</div>
                          <div className="text-[11px] text-zinc-500 font-medium">{c.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-lg bg-zinc-800/40 border border-zinc-700/50 text-xs font-bold text-zinc-300">
                        {c.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 font-black text-white text-sm">
                        <Users className="w-4 h-4 text-zinc-600" />
                        {c.subs}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 font-black text-white text-sm">
                        <TrendingUp className="w-4 h-4 text-emerald-500 opacity-70" />
                        {c.revenue ? (
                          <><span className="text-red-500">{c.revenue.split(' ')[0]}</span> {c.revenue.split(' ')[1]}</>
                        ) : (
                          <span className="text-zinc-500">N/A</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-black px-3 py-1.5 rounded-full border ${statusStyles[c.status]}`}>
                        {statusIcons[c.status]} {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-400 text-xs font-medium">
                      {c.joined}
                    </td>
                    <td className="px-6 py-4 pr-8 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {c.status === 'pending' && (
                          <>
                            <button onClick={() => handleStatusChange(c.id, 'active')} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-[11px] uppercase tracking-wider font-black rounded-xl border border-red-500 shadow-lg shadow-red-600/20 transition-all active:scale-95">Approve</button>
                            <button onClick={() => handleStatusChange(c.id, 'suspended')} className="px-4 py-2 bg-[#181a22] text-zinc-400 hover:text-red-400 text-[11px] uppercase tracking-wider font-black rounded-xl border border-zinc-700 transition-all active:scale-95">Reject</button>
                          </>
                        )}
                        {c.status === 'active' && (
                          <button onClick={() => handleStatusChange(c.id, 'suspended')} className="px-4 py-2 bg-[#181a22] text-zinc-400 hover:text-red-400 hover:border-red-500/50 text-[11px] uppercase tracking-wider font-black rounded-xl border border-zinc-700 transition-all active:scale-95">Suspend</button>
                        )}
                        {c.status === 'suspended' && (
                          <button onClick={() => handleStatusChange(c.id, 'active')} className="px-4 py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white text-[11px] uppercase tracking-wider font-black rounded-xl transition-all active:scale-95">Restore</button>
                        )}
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

        {/* Verification Queue (Pending Application Showcase) */}
        <div className="grid grid-cols-1 gap-6 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-yellow-500" /> Compliance Queue
              </h2>
              <p className="text-zinc-500 text-sm mt-1">Review applicant KYC and verification documents.</p>
            </div>
            <button className="text-red-500 text-sm font-bold hover:text-red-400 transition-colors">View All Applications &rarr;</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {pendingCreators.length === 0 ? (
              <div className="col-span-full py-8 text-center text-zinc-500 font-medium bg-[#0d0e12] border border-zinc-800 rounded-3xl">No pending creations in the queue.</div>
            ) : pendingCreators.map((p, i) => (
              <div key={p.id} className="bg-[#0d0e12] border border-zinc-800 rounded-3xl p-6 hover:border-zinc-700 transition-all group relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                
                <div className="flex items-start justify-between relative z-10 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="relative shrink-0 w-14 h-14">
                      <img src={p.img} className="w-full h-full rounded-full object-cover border-2 border-zinc-700 group-hover:border-yellow-500/50 transition-colors" />
                      <div className="absolute -bottom-1 -right-1 bg-yellow-500/20 border border-yellow-500/40 text-yellow-500 w-5 h-5 rounded-full flex items-center justify-center">
                        <Clock className="w-3 h-3" />
                      </div>
                    </div>
                    <div>
                      <div className="font-bold text-white text-base">{p.name || `Applicant ${i+1}`}</div>
                      <div className="text-[11px] text-zinc-500 mt-1 font-medium bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md inline-block uppercase tracking-wider">Niche: {p.category}</div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3 mb-6 relative z-10">
                  <div className="flex items-center justify-between text-xs border border-zinc-800/50 bg-[#14161d] p-3 rounded-xl">
                    <span className="text-zinc-400 font-medium tracking-wide">National ID</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> Uploaded</span>
                  </div>
                  <div className="flex items-center justify-between text-xs border border-zinc-800/50 bg-[#14161d] p-3 rounded-xl">
                    <span className="text-zinc-400 font-medium tracking-wide">Selfie Match</span>
                    <span className="text-yellow-400 font-bold flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Pending Review</span>
                  </div>
                </div>

                <div className="flex gap-3 relative z-10">
                  <button onClick={() => handleStatusChange(p.id, 'active')} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-red-600/20 transition-all border border-red-500 active:scale-95">Approve Now</button>
                  <button className="w-14 flex items-center justify-center bg-[#181a22] hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl border border-zinc-700 transition-all active:scale-95">
                    <MoreVertical className="w-4 h-4" />
                  </button>
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
