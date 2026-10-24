import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, CheckCircle2, XCircle, Clock, Search, MoreVertical, TrendingUp, Users, ShieldAlert, Loader2, Trash2, AlertTriangle, Eye, X, ExternalLink, Crown, Check } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { getAdminCreators, updateCreatorStatus, deleteUserAccount, setCreatorVerified, approveCreatorApplication } from '../../lib/db';
import { supabase } from '../../lib/supabase';
import { toast } from '../../context/ToastContext';

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
  const navigate = useNavigate();
  const [creatorsList, setCreatorsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [deleteModalCreator, setDeleteModalCreator] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [kycModalCreator, setKycModalCreator] = useState<any | null>(null);
  const [resolvedDocs, setResolvedDocs] = useState<Record<string, { id: string | null; selfie: string | null }>>({});

  const resolveDocUrl = async (rawUrl: string | null | undefined): Promise<string | null> => {
    if (!rawUrl) return null;
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('data:')) {
      return rawUrl;
    }
    const cleanPath = rawUrl.replace(/^kyc-documents\//, '');
    const { data, error } = await supabase.storage.from('kyc-documents').createSignedUrl(cleanPath, 60 * 60);
    if (!error && data?.signedUrl) return data.signedUrl;
    const { data: pubData } = supabase.storage.from('kyc-documents').getPublicUrl(cleanPath);
    return pubData?.publicUrl || null;
  };

  const handleDeleteCreator = async () => {
    if (!deleteModalCreator) return;
    setDeleting(true);
    try {
      const success = await deleteUserAccount(deleteModalCreator.id);
      if (success) {
        toast.success(`Creator ${deleteModalCreator.name} permanently deleted.`);
        setDeleteModalCreator(null);
        await loadCreators();
      } else {
        toast.error('Failed to delete creator.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error deleting creator.');
    } finally {
      setDeleting(false);
    }
  };

  const loadCreators = async () => {
    setIsLoading(true);
    try {
      const data = await getAdminCreators();
      const list = data || [];
      setCreatorsList(list);

      const docsEntries = await Promise.all(
        list.map(async (c: any) => {
          const [idUrl, selfieUrl] = await Promise.all([
            resolveDocUrl(c.idDocUrl),
            resolveDocUrl(c.selfieUrl),
          ]);
          return [c.id, { id: idUrl, selfie: selfieUrl }] as const;
        })
      );
      setResolvedDocs(Object.fromEntries(docsEntries));
    } catch (err) {
      console.error('Error loading admin creators:', err);
      setCreatorsList([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCreators();
  }, []);

  const handleStatusChange = async (id: string, newStatus: 'active' | 'pending' | 'suspended') => {
    try {
      const creator = creatorsList.find(c => c.id === id);
      const hasFilledKyc = Boolean((creator?.hasId && creator?.hasSelfie) || creator?.kycStatus === 'pending');
      
      await updateCreatorStatus(id, newStatus);
      
      if (newStatus === 'active') {
        if (hasFilledKyc) {
          await setCreatorVerified(id, true);
          toast.success(`${creator?.name || 'Creator'} approved and verified with blue badge! 👑`);
        } else {
          toast.success(`${creator?.name || 'Creator'} approved as active. (KYC documents not yet submitted)`);
        }
      } else {
        toast.success(`Creator status changed to ${newStatus}`);
      }
      await loadCreators(); // Refresh data
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update creator status');
    }
  };

  const handleToggleVerified = async (id: string, verified: boolean) => {
    try {
      await setCreatorVerified(id, verified);
      setCreatorsList(prev => prev.map(c => c.id === id ? { ...c, isVerified: verified, kycStatus: verified ? 'verified' : 'rejected' } : c));
      if (kycModalCreator?.id === id) {
        setKycModalCreator((prev: any) => prev ? { ...prev, isVerified: verified, kycStatus: verified ? 'verified' : 'rejected' } : null);
      }
      toast.success(verified ? 'Creator identity verified; blue badge granted.' : 'Creator verification revoked.');
    } catch (err: any) {
      toast.error(err?.message || 'Could not update verification status.');
    }
  };

  const handleApproveCreator = async (id: string, type: 'creator' | 'vip') => {
    try {
      await approveCreatorApplication(id, type);
      const creator = creatorsList.find(c => c.id === id);
      toast.success(
        type === 'vip'
          ? `👑 ${creator?.name || 'Creator'} approved as VIP Creator!`
          : `✅ ${creator?.name || 'Creator'} approved as Verified Creator!`
      );
      if (kycModalCreator?.id === id) setKycModalCreator(null);
      await loadCreators();
    } catch (err: any) {
      toast.error(err?.message || 'Could not approve creator.');
    }
  };

  const filtered = creatorsList.filter(c => {
    const matchFilter = filter === 'all' || c.status === filter;
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || 
                        (c.email && c.email.toLowerCase().includes(search.toLowerCase()));
    return matchFilter && matchSearch;
  });

  // Only show creators who have submitted verification documents (ID or Selfie) in the Compliance Queue
  const pendingCreators = creatorsList.filter(
    c => !c.isVerified && (Boolean(c.idDocUrl || c.hasId) || Boolean(c.selfieUrl || c.hasSelfie))
  );

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto custom-scrollbar overflow-y-auto">

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 bg-gradient-to-r from-[#0d0e12] to-[#0d0e12] p-6 lg:p-8 rounded-3xl border border-zinc-800/80 shadow-2xl relative overflow-hidden">
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
            <div className="bg-[#0d0e12] border border-zinc-800 rounded-2xl p-4 flex flex-col items-center justify-center min-w-[100px]">
              <span className="text-2xl font-black text-white">{creatorsList.length}</span>
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Total</span>
            </div>
            <button
              onClick={() => setFilter('pending')}
              className="bg-red-950/20 border border-red-500/20 rounded-2xl p-4 flex flex-col items-center justify-center min-w-[100px] shadow-[0_0_15px_rgba(220,38,38,0.05)] hover:border-red-500/40 hover:bg-red-950/30 transition-all cursor-pointer text-center"
              title="Filter by pending creators"
            >
              <span className="text-2xl font-black text-red-500 drop-shadow-md">{pendingCreators.length}</span>
              <span className="text-[10px] uppercase font-bold text-red-400 tracking-wider">Pending</span>
            </button>
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
                <tr className="bg-[#0d0e12] border-b border-zinc-800">
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
                  <tr key={c.id} className="group hover:bg-[#0d0e12]/50 transition-colors">
                    <td className="px-6 py-4 pl-8">
                      <div className="flex items-center gap-4">
                        <div className="relative shrink-0 w-12 h-12">
                          <img src={c.img} className="w-full h-full rounded-full object-cover border-2 border-zinc-800 group-hover:border-red-500/50 transition-colors" />
                          <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0d0e12] ${c.status === 'active' ? 'bg-emerald-500' : c.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm group-hover:text-red-400 transition-colors flex items-center gap-1.5">
                            {c.name}
                            {c.isVerified && <span title="Verified Creator"><CheckCircle2 className="w-3.5 h-3.5 text-white fill-blue-500 shrink-0" /></span>}
                          </div>
                          <div className="text-[11px] text-zinc-500 font-medium flex items-center gap-2">
                            <span>@{String((c as any).handle || c.name || '').replace(/^@+/, '')}</span>
                            <span>•</span>
                            <span>{c.email}</span>
                          </div>
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
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setKycModalCreator(c)}
                          className={`px-2.5 py-1.5 text-[10px] uppercase tracking-wider font-black rounded-xl transition-all flex items-center gap-1 active:scale-95 border ${
                            c.hasId || c.hasSelfie
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                              : 'bg-[#0d0e12] text-zinc-500 border-zinc-800 hover:text-zinc-300'
                          }`}
                          title="Inspect Creator ID & Selfie Documents"
                        >
                          <Eye className="w-3.5 h-3.5" /> View KYC
                        </button>
                        {c.isVerified ? (
                          <button 
                            onClick={() => handleToggleVerified(c.id, false)} 
                            className="px-2.5 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 text-[10px] uppercase tracking-wider font-black rounded-xl transition-all flex items-center gap-1 active:scale-95"
                            title="Revoke Blue Verified Badge"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-white fill-blue-500" /> Verified
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleToggleVerified(c.id, true)} 
                            disabled={!c.hasId || !c.hasSelfie}
                            className="px-2.5 py-1.5 bg-[#0d0e12] text-zinc-400 border border-zinc-700 hover:text-blue-400 hover:border-blue-500/40 text-[10px] uppercase tracking-wider font-black rounded-xl transition-all flex items-center gap-1 active:scale-95"
                            title={c.hasId && c.hasSelfie ? "Approve submitted identity verification" : "Creator must submit ID and selfie first"}
                          >
                            + Verify
                          </button>
                        )}
                        {c.status === 'pending' && (
                          <>
                            <button onClick={() => handleStatusChange(c.id, 'active')} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[11px] uppercase tracking-wider font-black rounded-xl border border-red-500 shadow-lg shadow-red-600/20 transition-all active:scale-95">Approve</button>
                            <button onClick={() => handleStatusChange(c.id, 'suspended')} className="px-3 py-1.5 bg-[#0d0e12] text-zinc-400 hover:text-red-400 text-[11px] uppercase tracking-wider font-black rounded-xl border border-zinc-700 transition-all active:scale-95">Reject</button>
                          </>
                        )}
                        {c.status === 'active' && (
                          <button onClick={() => handleStatusChange(c.id, 'suspended')} className="px-3 py-1.5 bg-[#0d0e12] text-yellow-500 hover:text-yellow-400 hover:border-yellow-500/50 text-[11px] uppercase tracking-wider font-black rounded-xl border border-yellow-500/20 transition-all active:scale-95">Suspend</button>
                        )}
                        {c.status === 'suspended' && (
                          <button onClick={() => handleStatusChange(c.id, 'active')} className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600 hover:text-white text-[11px] uppercase tracking-wider font-black rounded-xl transition-all active:scale-95 shadow-md shadow-emerald-500/10 flex items-center gap-1 cursor-pointer" title="Unsuspend creator and restore account">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Unsuspend
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteModalCreator(c)}
                          className="px-3 py-1.5 bg-red-600/10 text-red-500 border border-red-500/20 hover:bg-red-600 hover:text-white text-[11px] uppercase tracking-wider font-black rounded-xl transition-all active:scale-95 flex items-center gap-1.5"
                          title="Permanently Delete Creator"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
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
              <p className="text-zinc-500 text-sm mt-1">Review applicant KYC and verification documents (National ID &amp; Selfie).</p>
            </div>
            <button
              onClick={() => navigate('/admin/applications')}
              className="text-red-500 text-sm font-bold hover:text-red-400 transition-colors flex items-center gap-1 cursor-pointer active:scale-95"
            >
              View All Applications &rarr;
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {pendingCreators.length === 0 ? (
              <div className="col-span-full py-8 text-center text-zinc-500 font-medium bg-[#0d0e12] border border-zinc-800 rounded-3xl">No pending applications in the queue.</div>
            ) : pendingCreators.map((p, i) => {
              const docIdUrl = resolvedDocs[p.id]?.id || p.idDocUrl;
              const docSelfieUrl = resolvedDocs[p.id]?.selfie || p.selfieUrl;
              return (
                <div key={p.id} className="bg-[#0d0e12] border border-zinc-800 rounded-3xl p-6 hover:border-zinc-700 transition-all group relative overflow-hidden shadow-xl flex flex-col justify-between">
                  <div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                    
                    <div className="flex items-start justify-between relative z-10 mb-4">
                      <div className="flex items-center gap-4">
                        <div className="relative shrink-0 w-14 h-14">
                          <img src={p.img} className="w-full h-full rounded-full object-cover border-2 border-zinc-700 group-hover:border-yellow-500/50 transition-colors" />
                          <div className="absolute -bottom-1 -right-1 bg-yellow-500/20 border border-yellow-500/40 text-yellow-500 w-5 h-5 rounded-full flex items-center justify-center">
                            <Clock className="w-3 h-3" />
                          </div>
                        </div>
                        <div>
                          <div className="font-bold text-white text-base">{p.name || `Applicant ${i+1}`}</div>
                          <div className="text-xs text-zinc-500">{p.email}</div>
                          <div className="text-[11px] text-zinc-500 mt-1 font-medium bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md inline-block uppercase tracking-wider">Niche: {p.category}</div>
                        </div>
                      </div>
                    </div>

                    {/* Legal Identity Summary */}
                    <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-3 mb-4 space-y-1.5 text-xs relative z-10">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500 font-bold uppercase text-[10px]">Legal Name</span>
                        <span className="text-white font-bold">{p.legalName || 'Not provided'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500 font-bold uppercase text-[10px]">National ID / Passport</span>
                        <span className="text-amber-400 font-mono font-bold">{p.nationalId || 'Not provided'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500 font-bold uppercase text-[10px]">Date of Birth</span>
                        <span className="text-zinc-300 font-semibold">{p.dob || 'Not provided'}</span>
                      </div>
                    </div>
                    
                    {/* Uploaded ID & Selfie Visual Previews */}
                    <div className="grid grid-cols-2 gap-3 mb-5 relative z-10">
                      <div className="border border-zinc-800 bg-zinc-900/60 rounded-2xl p-2.5 flex flex-col items-center">
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1.5">National ID Photo</span>
                        {docIdUrl ? (
                          <button
                            type="button"
                            onClick={() => setKycModalCreator(p)}
                            className="w-full h-28 rounded-xl overflow-hidden border border-zinc-700 hover:border-red-500 transition-all relative group/img cursor-pointer"
                          >
                            <img src={docIdUrl} alt="National ID" className="w-full h-full object-cover" />
                            <span className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-bold text-white">
                              Click to Enlarge
                            </span>
                          </button>
                        ) : (
                          <div className="w-full h-28 rounded-xl border border-dashed border-zinc-800 flex flex-col items-center justify-center text-zinc-500 text-[11px] gap-1">
                            <XCircle className="w-4 h-4 text-zinc-600" />
                            <span>Not Provided</span>
                          </div>
                        )}
                      </div>

                      <div className="border border-zinc-800 bg-zinc-900/60 rounded-2xl p-2.5 flex flex-col items-center">
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1.5">Selfie with ID</span>
                        {docSelfieUrl ? (
                          <button
                            type="button"
                            onClick={() => setKycModalCreator(p)}
                            className="w-full h-28 rounded-xl overflow-hidden border border-zinc-700 hover:border-red-500 transition-all relative group/img cursor-pointer"
                          >
                            <img src={docSelfieUrl} alt="Selfie with ID" className="w-full h-full object-cover" />
                            <span className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-bold text-white">
                              Click to Enlarge
                            </span>
                          </button>
                        ) : (
                          <div className="w-full h-28 rounded-xl border border-dashed border-zinc-800 flex flex-col items-center justify-center text-zinc-500 text-[11px] gap-1">
                            <XCircle className="w-4 h-4 text-zinc-600" />
                            <span>Not Provided</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 relative z-10">
                    <button
                      type="button"
                      onClick={() => handleApproveCreator(p.id, 'vip')}
                      disabled={!p.hasId || !p.hasSelfie}
                      className="flex-1 py-3 px-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 disabled:opacity-40 text-black font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1 shadow-md shadow-amber-500/20 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Crown className="w-3.5 h-3.5" /> Approve VIP
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApproveCreator(p.id, 'creator')}
                      disabled={!p.hasId || !p.hasSelfie}
                      className="flex-1 py-3 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1 shadow-md shadow-emerald-600/20 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => setKycModalCreator(p)}
                      className="px-3 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 text-[10px] font-bold transition-all flex items-center justify-center cursor-pointer"
                      title="Inspect KYC Dossier"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* KYC & Identity Documents Inspection Modal */}
        {kycModalCreator && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
            <div className="bg-[#0d0e12] border border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative my-8">
              <button
                type="button"
                onClick={() => setKycModalCreator(null)}
                className="absolute top-5 right-5 w-9 h-9 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-4 mb-6">
                <img src={kycModalCreator.img} alt={kycModalCreator.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-zinc-700" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-white">{kycModalCreator.name}</h3>
                    {kycModalCreator.isVerified && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
                        <CheckCircle2 className="w-3 h-3" /> Verified
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">{kycModalCreator.email} {kycModalCreator.phone ? `• ${kycModalCreator.phone}` : ''}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 mb-6">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Legal Full Name</div>
                  <div className="text-sm font-bold text-white mt-0.5">{kycModalCreator.legalName || 'Not submitted'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-zinc-500">National ID / Passport</div>
                  <div className="text-sm font-mono font-bold text-amber-400 mt-0.5">{kycModalCreator.nationalId || 'Not submitted'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Date of Birth</div>
                  <div className="text-sm font-bold text-zinc-200 mt-0.5">{kycModalCreator.dob || 'Not submitted'}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {[
                  ['National ID / Passport Document', resolvedDocs[kycModalCreator.id]?.id || kycModalCreator.idDocUrl],
                  ['Verification Selfie with ID', resolvedDocs[kycModalCreator.id]?.selfie || kycModalCreator.selfieUrl],
                ].map(([label, url]) => (
                  <div key={label} className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-3 flex flex-col">
                    <div className="text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">{label}</div>
                    {url ? (
                      <>
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full h-52 rounded-xl overflow-hidden border border-zinc-700 hover:border-red-500 transition-all block bg-black"
                        >
                          <img src={url} alt={label || 'Document'} className="w-full h-full object-contain" />
                        </a>
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Open Full Resolution in New Tab
                        </a>
                      </>
                    ) : (
                      <div className="w-full h-52 rounded-xl border border-dashed border-zinc-800 flex flex-col items-center justify-center text-zinc-500 text-xs gap-2">
                        <XCircle className="w-6 h-6 text-zinc-600" />
                        <span>No document uploaded yet</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setKycModalCreator(null)}
                  className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Close
                </button>
                {kycModalCreator.isVerified ? (
                  <button
                    type="button"
                    onClick={() => handleToggleVerified(kycModalCreator.id, false)}
                    className="px-5 py-2.5 rounded-xl bg-red-600/15 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Revoke Verification Badge
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!kycModalCreator.hasId || !kycModalCreator.hasSelfie}
                      onClick={() => handleApproveCreator(kycModalCreator.id, 'creator')}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Check className="w-4 h-4" /> Approve as Creator
                    </button>
                    <button
                      type="button"
                      disabled={!kycModalCreator.hasId || !kycModalCreator.hasSelfie}
                      onClick={() => handleApproveCreator(kycModalCreator.id, 'vip')}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 disabled:opacity-40 text-black text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-500/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Crown className="w-4 h-4" /> Approve as VIP
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Delete Creator Confirmation Modal */}
        {deleteModalCreator && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0d0e12] border border-red-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
              <div className="w-12 h-12 rounded-2xl bg-red-600/15 border border-red-500/30 flex items-center justify-center text-red-500 mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-white mb-2">Permanently Delete Creator?</h3>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed mb-6">
                Are you sure you want to delete <strong className="text-white">{deleteModalCreator.name}</strong> ({deleteModalCreator.email})?
                This will permanently wipe their creator profile, all their uploaded posts & media, erase subscriptions, and immediately log them out of the platform.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setDeleteModalCreator(null)}
                  className="flex-1 py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-black uppercase tracking-wider transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDeleteCreator}
                  className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
};

export default AdminCreators;
