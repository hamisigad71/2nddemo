import { useState, useEffect } from 'react';
import { 
  Search, ShieldCheck, CheckCircle2, Crown, XCircle, AlertTriangle, 
  ExternalLink, ZoomIn, Eye, RefreshCw, Loader2, Sparkles, User, 
  FileText, Camera, Phone, Mail, Calendar, Check, X, ShieldAlert
} from 'lucide-react';
import AdminLayout from './AdminLayout';
import { 
  getAdminApplications, 
  approveCreatorApplication, 
  rejectCreatorApplication,
  type CreatorApplicationItem 
} from '../../lib/db';
import { resolveUserAvatar } from '../../lib/avatar';
import { toast } from '../../context/ToastContext';

const AdminApplications = () => {
  const [applications, setApplications] = useState<CreatorApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'ready' | 'incomplete' | 'rejected'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Inspection Modal State
  const [inspectItem, setInspectItem] = useState<CreatorApplicationItem | null>(null);

  // Reject Modal State
  const [rejectModalItem, setRejectModalItem] = useState<CreatorApplicationItem | null>(null);
  const [rejectReason, setRejectReason] = useState('Please upload a clearer, well-lit photo of your National ID and selfie.');
  const [customRejectReason, setCustomRejectReason] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getAdminApplications();
      setApplications(data);
    } catch (err) {
      console.error('Failed to load applications:', err);
      toast.error('Failed to load creator applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('applications_updated', handleUpdate);
    window.addEventListener('creators_updated', handleUpdate);
    return () => {
      window.removeEventListener('applications_updated', handleUpdate);
      window.removeEventListener('creators_updated', handleUpdate);
    };
  }, []);

  const handleApprove = async (app: CreatorApplicationItem, type: 'creator' | 'vip') => {
    setActionLoading(`${app.uid}-${type}`);
    try {
      await approveCreatorApplication(app.uid, type);
      toast.success(
        type === 'vip' 
          ? `👑 ${app.name} approved as VIP Creator!` 
          : `✅ ${app.name} approved as Verified Creator!`
      );
      if (inspectItem?.uid === app.uid) setInspectItem(null);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to approve application.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectModalItem) return;
    const finalReason = customRejectReason.trim() || rejectReason;
    setActionLoading(`${rejectModalItem.uid}-reject`);
    try {
      await rejectCreatorApplication(rejectModalItem.uid, finalReason);
      toast.success(`Application rejected for ${rejectModalItem.name}. Notification sent.`);
      setRejectModalItem(null);
      setCustomRejectReason('');
      if (inspectItem?.uid === rejectModalItem.uid) setInspectItem(null);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to reject application.');
    } finally {
      setActionLoading(null);
    }
  };

  // Filter logic
  const filteredApps = applications.filter((app) => {
    const q = search.toLowerCase();
    const matchSearch =
      (app.name && app.name.toLowerCase().includes(q)) ||
      (app.legalName && app.legalName.toLowerCase().includes(q)) ||
      (app.email && app.email.toLowerCase().includes(q)) ||
      (app.phone && app.phone.toLowerCase().includes(q)) ||
      (app.nationalId && app.nationalId.toLowerCase().includes(q));

    if (!matchSearch) return false;

    if (filterTab === 'ready') return app.hasBothDocs && app.kycStatus !== 'rejected';
    if (filterTab === 'incomplete') return !app.hasBothDocs && app.kycStatus !== 'rejected';
    if (filterTab === 'rejected') return app.kycStatus === 'rejected';
    return true;
  });

  const readyCount = applications.filter(a => a.hasBothDocs && a.kycStatus !== 'rejected').length;
  const incompleteCount = applications.filter(a => !a.hasBothDocs && a.kycStatus !== 'rejected').length;
  const rejectedCount = applications.filter(a => a.kycStatus === 'rejected').length;

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                  Creator Applications & KYC Review
                  <span className="text-xs bg-red-600 text-white font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    {applications.length} Pending
                  </span>
                </h1>
                <p className="text-zinc-400 text-xs sm:text-sm mt-0.5">
                  Inspect submitted National IDs and verification selfies. Approve applicants as regular Creators or elevate them to VIP Creators.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-red-500' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-[#121217] border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Total Queue</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-white">{applications.length}</span>
              <span className="text-xs text-zinc-500">Applicants</span>
            </div>
          </div>

          <div className="bg-[#121217] border border-emerald-500/20 bg-emerald-500/5 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Ready for Review</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-emerald-400">{readyCount}</span>
              <span className="text-[10px] text-emerald-500/80 font-bold uppercase">ID + Selfie OK</span>
            </div>
          </div>

          <div className="bg-[#121217] border border-amber-500/20 bg-amber-500/5 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Awaiting Docs</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-amber-400">{incompleteCount}</span>
              <span className="text-[10px] text-amber-500/80 font-bold uppercase">Missing Photos</span>
            </div>
          </div>

          <div className="bg-[#121217] border border-red-500/20 bg-red-500/5 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Needs Resubmit</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black text-red-400">{rejectedCount}</span>
              <span className="text-[10px] text-red-500/80 font-bold uppercase">Rejected KYC</span>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#121217] p-3 rounded-2xl border border-zinc-800">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search applicant name, legal name, ID number, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/60 border border-zinc-800 focus:border-red-500/50 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                filterTab === 'all'
                  ? 'bg-red-600 text-white'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white'
              }`}
            >
              All ({applications.length})
            </button>
            <button
              onClick={() => setFilterTab('ready')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                filterTab === 'ready'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-zinc-900 text-zinc-400 hover:text-emerald-400'
              }`}
            >
              Ready ({readyCount})
            </button>
            <button
              onClick={() => setFilterTab('incomplete')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                filterTab === 'incomplete'
                  ? 'bg-amber-600 text-white'
                  : 'bg-zinc-900 text-zinc-400 hover:text-amber-400'
              }`}
            >
              Missing Docs ({incompleteCount})
            </button>
            <button
              onClick={() => setFilterTab('rejected')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                filterTab === 'rejected'
                  ? 'bg-red-900 text-white'
                  : 'bg-zinc-900 text-zinc-400 hover:text-red-400'
              }`}
            >
              Rejected ({rejectedCount})
            </button>
          </div>
        </div>

        {/* Applications List */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Loading Applications...</p>
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="bg-[#121217] border border-zinc-800 rounded-3xl p-12 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-black text-white">No Applications Found</h3>
            <p className="text-xs text-zinc-500 max-w-sm mt-1">
              {search
                ? `No applications matched "${search}". Try clearing your search.`
                : 'All creator applications have been reviewed. New submissions will appear here automatically.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredApps.map((app) => {
              const avatarUrl = resolveUserAvatar({ avatarUrl: app.avatar, name: app.name });
              const isWorking = actionLoading?.startsWith(app.uid);

              return (
                <div
                  key={app.uid}
                  className="bg-[#121217] border border-zinc-800/80 hover:border-zinc-700/80 rounded-3xl p-5 sm:p-6 transition-all shadow-xl shadow-black/40 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                >
                  {/* Left Column: Creator Identity & Info */}
                  <div className="flex items-start gap-4 flex-1">
                    <img
                      src={avatarUrl}
                      alt={app.name}
                      className="w-16 h-16 rounded-2xl object-cover border border-white/10 shrink-0 bg-zinc-900 shadow-md"
                    />
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-black text-white truncate">{app.name}</h3>
                        {app.isVip && (
                          <span className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Crown className="w-3 h-3" /> VIP Requested
                          </span>
                        )}
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          app.kycStatus === 'verified'
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                            : app.kycStatus === 'rejected'
                            ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                            : app.hasBothDocs
                            ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}>
                          {app.kycStatus === 'verified' ? 'Verified' : app.kycStatus === 'rejected' ? 'Rejected' : app.hasBothDocs ? 'Ready for Review' : 'Missing Photos'}
                        </span>
                      </div>

                      {/* Contact & Meta */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
                        {app.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 text-zinc-500" />
                            <span>{app.email}</span>
                          </div>
                        )}
                        {app.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-zinc-500" />
                            <span>{app.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                          <span>Submitted {new Date(app.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Legal KYC Details Badge Strip */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                        <div className="bg-black/40 border border-white/5 rounded-xl px-3 py-1.5">
                          <span className="text-zinc-500 block text-[9px] uppercase font-bold">Legal Name</span>
                          <span className="text-white font-semibold truncate block">
                            {app.legalName || <span className="text-zinc-600 italic">Not provided</span>}
                          </span>
                        </div>
                        <div className="bg-black/40 border border-white/5 rounded-xl px-3 py-1.5">
                          <span className="text-zinc-500 block text-[9px] uppercase font-bold">National ID #</span>
                          <span className="text-white font-mono font-semibold truncate block">
                            {app.nationalId || <span className="text-zinc-600 italic">Not provided</span>}
                          </span>
                        </div>
                        <div className="bg-black/40 border border-white/5 rounded-xl px-3 py-1.5">
                          <span className="text-zinc-500 block text-[9px] uppercase font-bold">Date of Birth</span>
                          <span className="text-white font-semibold truncate block">
                            {app.dob || <span className="text-zinc-600 italic">Not provided</span>}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Middle Column: Visual KYC Document Thumbnails */}
                  <div className="flex items-center gap-3 shrink-0 bg-black/40 p-3 rounded-2xl border border-white/5">
                    {/* National ID Document */}
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center gap-1">
                        <FileText className="w-3 h-3 text-red-500" /> National ID
                      </span>
                      {app.idDocUrl ? (
                        <div
                          onClick={() => setInspectItem(app)}
                          className="relative group cursor-pointer w-24 h-16 rounded-xl overflow-hidden border border-white/10 hover:border-red-500 transition-all bg-black"
                        >
                          <img
                            src={app.idDocUrl}
                            alt="National ID"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <ZoomIn className="w-4 h-4" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-24 h-16 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/50 flex flex-col items-center justify-center text-zinc-600 text-[10px]">
                          <X className="w-4 h-4 mb-0.5 text-zinc-700" />
                          <span>No ID</span>
                        </div>
                      )}
                    </div>

                    {/* Verification Selfie */}
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center gap-1">
                        <Camera className="w-3 h-3 text-red-500" /> Selfie w/ ID
                      </span>
                      {app.selfieUrl ? (
                        <div
                          onClick={() => setInspectItem(app)}
                          className="relative group cursor-pointer w-24 h-16 rounded-xl overflow-hidden border border-white/10 hover:border-red-500 transition-all bg-black"
                        >
                          <img
                            src={app.selfieUrl}
                            alt="Selfie"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <ZoomIn className="w-4 h-4" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-24 h-16 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/50 flex flex-col items-center justify-center text-zinc-600 text-[10px]">
                          <X className="w-4 h-4 mb-0.5 text-zinc-700" />
                          <span>No Selfie</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
                    {/* Inspect Documents Button */}
                    <button
                      type="button"
                      onClick={() => setInspectItem(app)}
                      className="px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Eye className="w-4 h-4 text-zinc-400" />
                      Inspect Documents
                    </button>

                    {/* Approve as VIP Creator */}
                    <button
                      type="button"
                      disabled={isWorking}
                      onClick={() => handleApprove(app, 'vip')}
                      className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 disabled:opacity-40 cursor-pointer"
                    >
                      {actionLoading === `${app.uid}-vip` ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Crown className="w-3.5 h-3.5" />
                      )}
                      Approve as VIP
                    </button>

                    {/* Approve as Regular Creator */}
                    <button
                      type="button"
                      disabled={isWorking}
                      onClick={() => handleApprove(app, 'creator')}
                      className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 disabled:opacity-40 cursor-pointer"
                    >
                      {actionLoading === `${app.uid}-creator` ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      Approve as Creator
                    </button>

                    {/* Reject / Resubmit */}
                    <button
                      type="button"
                      disabled={isWorking}
                      onClick={() => setRejectModalItem(app)}
                      className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject / Resubmit
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ========================================================================= */}
        {/* Full Document Inspection Modal */}
        {/* ========================================================================= */}
        {inspectItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-in fade-in overflow-y-auto">
            <div className="bg-[#121217] border border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-4xl w-full shadow-2xl relative my-auto space-y-6">
              
              {/* Modal Top Bar */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-3">
                  <img
                    src={resolveUserAvatar({ avatarUrl: inspectItem.avatar, name: inspectItem.name })}
                    alt={inspectItem.name}
                    className="w-12 h-12 rounded-xl object-cover border border-white/10"
                  />
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      {inspectItem.name}
                      {inspectItem.isVip && (
                        <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <Crown className="w-3 h-3" /> VIP Requested
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-zinc-400">KYC Verification Dossier & ID Match</p>
                  </div>
                </div>

                <button
                  onClick={() => setInspectItem(null)}
                  className="w-9 h-9 rounded-full bg-zinc-900 border border-white/10 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Legal Info Summary Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-black/40 border border-white/5 rounded-2xl p-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase block">Legal Name</span>
                  <span className="text-white font-bold">{inspectItem.legalName || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase block">National ID / Passport</span>
                  <span className="text-white font-mono font-bold">{inspectItem.nationalId || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase block">Date of Birth</span>
                  <span className="text-white font-bold">{inspectItem.dob || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase block">Phone</span>
                  <span className="text-white font-mono font-bold">{inspectItem.phone || 'N/A'}</span>
                </div>
              </div>

              {/* Side-by-Side Photos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* National ID Photo */}
                <div className="bg-black/60 border border-zinc-800 rounded-2xl p-4 flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-red-500" />
                      1. National ID Document
                    </span>
                    {inspectItem.idDocUrl && (
                      <a
                        href={inspectItem.idDocUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1"
                      >
                        Open Full Res <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  {inspectItem.idDocUrl ? (
                    <div className="aspect-[4/3] rounded-xl overflow-hidden bg-black border border-white/10 flex items-center justify-center">
                      <img
                        src={inspectItem.idDocUrl}
                        alt="National ID"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[4/3] rounded-xl bg-zinc-900/50 border border-dashed border-zinc-800 flex flex-col items-center justify-center text-zinc-500 text-xs">
                      <AlertTriangle className="w-6 h-6 text-amber-500 mb-1" />
                      <span>ID Document not uploaded</span>
                    </div>
                  )}
                </div>

                {/* Verification Selfie Photo */}
                <div className="bg-black/60 border border-zinc-800 rounded-2xl p-4 flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-red-500" />
                      2. Verification Selfie (Holding ID)
                    </span>
                    {inspectItem.selfieUrl && (
                      <a
                        href={inspectItem.selfieUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1"
                      >
                        Open Full Res <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  {inspectItem.selfieUrl ? (
                    <div className="aspect-[4/3] rounded-xl overflow-hidden bg-black border border-white/10 flex items-center justify-center">
                      <img
                        src={inspectItem.selfieUrl}
                        alt="Verification Selfie"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[4/3] rounded-xl bg-zinc-900/50 border border-dashed border-zinc-800 flex flex-col items-center justify-center text-zinc-500 text-xs">
                      <AlertTriangle className="w-6 h-6 text-amber-500 mb-1" />
                      <span>Selfie not uploaded</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Bottom Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    setRejectModalItem(inspectItem);
                  }}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" /> Reject / Request Resubmit
                </button>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleApprove(inspectItem, 'creator')}
                    className="flex-1 sm:flex-initial px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer"
                  >
                    <Check className="w-4 h-4" /> Approve as Creator
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApprove(inspectItem, 'vip')}
                    className="flex-1 sm:flex-initial px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 cursor-pointer"
                  >
                    <Crown className="w-4 h-4" /> Approve as VIP
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* Rejection / Resubmit Modal */}
        {/* ========================================================================= */}
        {rejectModalItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <div className="bg-[#121217] border border-red-900/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-left space-y-4">
              <button
                onClick={() => setRejectModalItem(null)}
                className="absolute top-5 right-5 text-zinc-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-red-600/15 border border-red-500/30 flex items-center justify-center text-red-500">
                <ShieldAlert className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-xl font-black text-white">Reject / Request Resubmission</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Specify the reason why <strong>{rejectModalItem.name}</strong>'s documents cannot be accepted. An immediate notification will be sent to them.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400">
                  Select Quick Reason:
                </label>
                {[
                  'Please upload a clearer, well-lit photo of your National ID and selfie.',
                  'Selfie photo does not match the person pictured on the National ID.',
                  'National ID document is expired or illegible.',
                  'Missing legal name or ID number mismatch.',
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => {
                      setRejectReason(reason);
                      setCustomRejectReason('');
                    }}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                      rejectReason === reason && !customRejectReason
                        ? 'border-red-500 bg-red-500/10 text-white font-bold'
                        : 'border-zinc-800 bg-black/40 text-zinc-400 hover:text-white hover:border-zinc-700'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              <div className="space-y-1 pt-2">
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400">
                  Or Custom Reason:
                </label>
                <textarea
                  rows={2}
                  value={customRejectReason}
                  onChange={(e) => setCustomRejectReason(e.target.value)}
                  placeholder="Enter specific instructions for the creator..."
                  className="w-full bg-black/60 border border-zinc-800 focus:border-red-500 rounded-xl p-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setRejectModalItem(null)}
                  className="flex-1 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs uppercase tracking-wider border border-white/10 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={Boolean(actionLoading)}
                  onClick={handleConfirmReject}
                  className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );

  function handleConfirmReject() {
    handleRejectConfirm();
  }
};

export default AdminApplications;
