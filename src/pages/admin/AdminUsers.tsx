import { useState, useEffect } from 'react';
import { Search, Users, UserX, UserCheck, Check, X, ShieldAlert, Loader2 } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { supabase } from '../../lib/supabase';
import { getAdminUsers, updateUserStatus } from '../../lib/db';
import { toast } from '../../context/ToastContext';
import { resolveUserAvatar } from '../../lib/avatar';

const statusStyles: Record<string, string> = {
  active: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  banned: 'text-red-400 bg-red-500/10 border-red-500/20',
  suspended: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
};

const AdminUsers = () => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [view, setView] = useState<'list' | 'kyc'>('list');
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const data = await getAdminUsers();
      setUsersList(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (view === 'kyc') fetchPending();
  }, [view]);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('users').select('*').eq('kyc_status', 'pending');
      if (!error) setPendingUsers(data || []);
    } finally {
      setLoading(false);
    }
  };

  const handleKycAction = async (id: string, newStatus: 'verified' | 'rejected') => {
    setActionLoading(id);
    try {
      await supabase.from('users').update({ kyc_status: newStatus }).eq('uid', id);
      setPendingUsers(prev => prev.filter(u => u.uid !== id));
      toast.success(`User KYC status set to ${newStatus}`);
    } catch {
      toast.error('Failed to update KYC status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleBan = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'banned' ? 'active' : 'banned';
    try {
      await updateUserStatus(userId, newStatus as any);
      setUsersList(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
      toast.success(`User marked as ${newStatus}`);
    } catch {
      toast.error('Failed to update user status');
    }
  };

  const filtered = usersList.filter(u => {
    const matchFilter = filter === 'all' || u.status === filter;
    const matchSearch = (u.name || '').toLowerCase().includes(search.toLowerCase()) || 
                        (u.email || '').toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto custom-scrollbar overflow-y-auto">

        {/* Premium Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 bg-gradient-to-r from-[#0d0e12] to-[#0d0e12] p-6 lg:p-8 rounded-3xl border border-zinc-800/80 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          
          <div className="relative z-10 flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500">
                <Users className="w-5 h-5" />
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">User / Fan Management</h1>
            </div>
            <p className="text-zinc-400 text-sm font-medium max-w-xl leading-relaxed mb-6">
              View and manage all registered platform users directly from the live database. Manage bans, verification, and user activity.
            </p>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setView('list')}
                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                  view === 'list' 
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/25 border border-red-500 scale-100' 
                    : 'bg-[#0d0e12] text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700'
                }`}
              >
                All Users ({usersList.length})
              </button>
              <button 
                onClick={() => setView('kyc')}
                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 relative ${
                  view === 'kyc' 
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/25 border border-red-500 scale-100' 
                    : 'bg-[#0d0e12] text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700'
                }`}
              >
                ID Verifications / KYC
                {pendingUsers.length > 0 && (
                  <span className="ml-2 w-2 h-2 rounded-full bg-red-400 inline-block animate-pulse"></span>
                )}
              </button>
            </div>
          </div>
        </div>

        {view === 'list' ? (
          <>
            {/* Search and Filters Bar */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search real users by name or email..."
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
              <div className="overflow-x-auto min-h-[300px]">
                {loadingUsers ? (
                  <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                    <Loader2 className="w-8 h-8 animate-spin text-red-500 mb-3" />
                    <span className="text-sm">Loading live users from database...</span>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="py-20 text-center text-sm text-zinc-500">
                    No users matching criteria. New subscriber registrations will appear here immediately.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#0d0e12] border-b border-zinc-800">
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500 pl-8">User profile</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Account Type</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Subscriptions</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Total Spent</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Account Status</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Date Joined</th>
                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500 text-right pr-8">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {filtered.map(u => (
                        <tr key={u.id} className="group hover:bg-[#0d0e12]/50 transition-colors">
                          <td className="px-6 py-4 pl-8">
                            <div className="flex items-center gap-4">
                              <div className="relative shrink-0 w-12 h-12">
                                <img src={u.img} alt={u.name} className="w-full h-full rounded-full object-cover border-2 border-zinc-800 group-hover:border-red-500/50 transition-colors" />
                                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0d0e12] ${u.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                              </div>
                              <div>
                                <div className="font-bold text-white text-sm group-hover:text-red-400 transition-colors">{u.name}</div>
                                <div className="text-[11px] text-zinc-500 font-medium">{u.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-zinc-800/60 text-zinc-300 border border-zinc-700/50 uppercase text-[10px] tracking-wider">
                              {u.type}
                            </span>
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
                            <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-black px-3 py-1.5 rounded-full border ${statusStyles[u.status] || statusStyles.active}`}>
                              {u.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-zinc-400 text-xs font-medium">
                            {u.joined}
                          </td>
                          <td className="px-6 py-4 pr-8 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {u.status === 'active' ? (
                                <button 
                                  onClick={() => handleToggleBan(u.id, u.status)}
                                  className="px-4 py-2 bg-[#0d0e12] text-red-500 border border-red-500/20 hover:bg-red-600 hover:text-white text-[11px] uppercase tracking-wider font-black rounded-xl transition-all active:scale-95 flex items-center gap-1.5"
                                >
                                  <UserX className="w-3.5 h-3.5" /> Ban
                                </button>
                              ) : (
                                <button 
                                  onClick={() => handleToggleBan(u.id, u.status)}
                                  className="px-4 py-2 bg-[#0d0e12] text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white text-[11px] uppercase tracking-wider font-black rounded-xl transition-all active:scale-95 flex items-center gap-1.5"
                                >
                                  <UserCheck className="w-3.5 h-3.5" /> Unban
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-6">
            {loading ? (
              <div className="flex justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-red-500" />
              </div>
            ) : pendingUsers.length === 0 ? (
              <div className="bg-[#0d0e12] border border-zinc-800 rounded-3xl p-16 flex flex-col items-center justify-center text-center shadow-2xl">
                <div className="w-20 h-20 rounded-full bg-zinc-800/30 border border-zinc-800 flex items-center justify-center mb-5">
                  <ShieldAlert className="w-10 h-10 text-zinc-600" />
                </div>
                <h3 className="text-2xl font-black text-white mb-2">No Pending Approvals</h3>
                <p className="text-zinc-500 max-w-sm">All identity verifications have been processed. Great job keeping the queue perfectly clean!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingUsers.map(user => (
                  <div key={user.uid} className="bg-[#0d0e12] border border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-4 mb-4">
                        <img src={resolveUserAvatar(user.avatar, user.name)} alt="avatar" className="w-12 h-12 rounded-xl object-cover ring-2 ring-zinc-800" />
                        <div>
                          <div className="font-bold text-white text-base">{user.name}</div>
                          <div className="text-xs text-zinc-500">{user.email}</div>
                        </div>
                      </div>
                      <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl mb-6">
                        <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-black mb-1">Phone Number</div>
                        <div className="text-sm font-bold text-white">{user.phone || 'Not provided'}</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-zinc-800">
                      <button 
                        disabled={actionLoading === user.uid}
                        onClick={() => handleKycAction(user.uid, 'verified')}
                        className="py-3 bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                      >
                        {actionLoading === user.uid ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Approve</>}
                      </button>
                      <button 
                        disabled={actionLoading === user.uid}
                        onClick={() => handleKycAction(user.uid, 'rejected')}
                        className="py-3 bg-red-600/10 text-red-500 border border-red-500/20 hover:bg-red-600 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                      >
                        {actionLoading === user.uid ? <Loader2 className="w-4 h-4 animate-spin" /> : <><X className="w-4 h-4" /> Reject</>}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </AdminLayout>
  );
};

export default AdminUsers;
