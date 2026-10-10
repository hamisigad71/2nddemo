import { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout';
import { supabase } from '../../lib/supabase';
import type { EscortApplication } from '../../types/escort';
import { Loader2, Check, X, User as UserIcon, AlertCircle } from 'lucide-react';

const AdminEscorts = () => {
  const [applications, setApplications] = useState<EscortApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('escort_applications')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (err) {
      console.error('Error fetching applications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, newStatus: 'approved' | 'rejected', creatorId: string) => {
    try {
      setActionLoading(id);
      
      // Update the application status
      const { error: updateError } = await supabase
        .from('escort_applications')
        .update({ status: newStatus })
        .eq('id', id);

      if (updateError) throw updateError;
      
      // If approved, update the user profile to set is_escort = true
      if (newStatus === 'approved') {
        const { error: userError } = await supabase
          .from('users')
          .update({ is_escort: true })
          .eq('id', creatorId);
          
        if (userError) {
          console.error("Failed to update user escort status", userError);
          // Could revert application status here in a robust system but we proceed for now
        }
      }

      // Remove from pending list
      setApplications(prev => prev.filter(app => app.id !== id));
      
    } catch (err) {
      console.error(`Error updating application ${id}:`, err);
      // Optional: Add toast error notification here
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Escort Applications</h1>
            <p className="text-zinc-400 mt-1">Review and verify creators applying to be an escort.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-red-500" />
          </div>
        ) : applications.length === 0 ? (
          <div className="bg-[#0d0e12] border border-zinc-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-zinc-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">All Caught Up</h3>
            <p className="text-zinc-500">There are no pending escort applications to review at this time.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {applications.map(app => (
              <div key={app.id} className="bg-[#0d0e12] border border-zinc-800 rounded-2xl overflow-hidden shadow-xl shadow-black/20 flex flex-col">
                <div className="p-6 border-b border-zinc-800 flex-1">
                   <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                         <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                            <UserIcon className="w-6 h-6 text-orange-500" />
                         </div>
                         <div>
                            <h3 className="text-lg font-bold text-white">{app.name || 'No Name Provided'}</h3>
                            <div className="text-xs text-zinc-500 font-medium">{new Date(app.created_at).toLocaleDateString()}</div>
                         </div>
                      </div>
                      <span className="text-[10px] font-black tracking-wider uppercase px-2 py-1 rounded-md bg-blue-500/10 text-blue-500 border border-blue-500/20">
                        PENDING
                      </span>
                   </div>
                   
                   <div className="space-y-4 text-sm text-zinc-300">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-[#14161d] p-2.5 rounded-lg border border-zinc-800/50">
                          <span className="block text-[10px] text-zinc-500 uppercase font-black tracking-wider mb-0.5">Age</span>
                          <span className="font-semibold text-white">{app.age || 'N/A'}</span>
                        </div>
                        <div className="bg-[#14161d] p-2.5 rounded-lg border border-zinc-800/50">
                          <span className="block text-[10px] text-zinc-500 uppercase font-black tracking-wider mb-0.5">Location</span>
                          <span className="font-semibold text-white truncate">{app.location || 'N/A'}</span>
                        </div>
                        <div className="bg-[#14161d] p-2.5 rounded-lg border border-zinc-800/50">
                          <span className="block text-[10px] text-zinc-500 uppercase font-black tracking-wider mb-0.5">Build/Measure</span>
                          <span className="font-semibold text-white truncate">{app.measurements || 'N/A'}</span>
                        </div>
                      </div>
                      
                      <div className="bg-[#14161d] p-3 rounded-lg border border-zinc-800/50">
                         <span className="flex items-center gap-1.5 text-xs font-black text-zinc-400 uppercase tracking-wider mb-1.5"><AlertCircle className="w-3.5 h-3.5" /> Bio / About</span>
                         <p className="line-clamp-3 text-zinc-300">{app.bio || 'No bio provided'}</p>
                      </div>

                      <div className="bg-[#14161d] p-3 rounded-lg border border-zinc-800/50">
                         <span className="block text-xs font-black text-zinc-400 uppercase tracking-wider mb-1.5">Rates Overview</span>
                         <p className="line-clamp-2 text-zinc-300">{app.rates || 'No rates provided'}</p>
                      </div>
                   </div>
                </div>
                <div className="p-4 bg-[#111217] flex justify-end gap-3 mt-auto">
                    <button 
                      onClick={() => handleAction(app.id, 'rejected', app.creator_id)}
                      disabled={actionLoading === app.id}
                      className="px-4 py-2 bg-transparent text-red-500 hover:bg-red-500/10 border border-red-500/20 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-1.5 w-full sm:w-auto"
                    >
                      {actionLoading === app.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                      Reject
                    </button>
                    <button 
                      onClick={() => handleAction(app.id, 'approved', app.creator_id)}
                      disabled={actionLoading === app.id}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)] border border-red-500 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-1.5 w-full sm:w-auto"
                    >
                      {actionLoading === app.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Approve Application
                    </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </AdminLayout>
  );
};

export default AdminEscorts;
