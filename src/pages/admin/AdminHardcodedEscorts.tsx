import { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout';
import {
  ShieldCheck, ShieldOff, Wifi, WifiOff, Pencil, Save, X,
  RotateCcw, MapPin, Star, DollarSign, Link as LinkIcon, User, AlertTriangle
} from 'lucide-react';
import { getEscorts, saveEscorts, resetEscorts, type EscortProfile } from '../../lib/mockData';
import { toast } from '../../context/ToastContext';

/* ------------------------------------------------------------------ */
/*  Helpers                                                              */
/* ------------------------------------------------------------------ */
const Toggle = ({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) => (
  <label className="flex items-center gap-3 cursor-pointer select-none">
    <div
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 border ${value ? 'bg-red-600 border-red-500' : 'bg-zinc-800 border-zinc-700'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${value ? 'translate-x-5' : 'translate-x-0'}`} />
    </div>
    <span className="text-sm font-semibold text-zinc-300">{label}</span>
  </label>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">{label}</label>
    {children}
  </div>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className="w-full bg-[#0d0e12] border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all"
  />
);

const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    {...props}
    rows={3}
    className="w-full bg-[#0d0e12] border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all resize-none"
  />
);

/* ------------------------------------------------------------------ */
/*  Edit Modal                                                           */
/* ------------------------------------------------------------------ */
interface EditModalProps {
  escort: EscortProfile;
  onSave: (updated: EscortProfile) => void;
  onClose: () => void;
}

function EditModal({ escort, onSave, onClose }: EditModalProps) {
  const [form, setForm] = useState<EscortProfile>({ ...escort });

  const set = <K extends keyof EscortProfile>(key: K, value: EscortProfile[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0a0b0f] border border-zinc-800 rounded-3xl shadow-2xl shadow-black/60">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0a0b0f] border-b border-zinc-800/80 px-6 py-4 flex items-center justify-between rounded-t-3xl">
          <div className="flex items-center gap-3">
            <img src={form.avatar} alt={form.name} className="w-10 h-10 rounded-xl object-cover border border-zinc-700" />
            <div>
              <h3 className="text-white font-black text-lg leading-tight">Edit Profile</h3>
              <p className="text-zinc-500 text-xs">{escort.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Toggles */}
          <div className="flex flex-wrap gap-6 p-4 bg-zinc-900/40 rounded-2xl border border-zinc-800/50">
            <Toggle value={form.isOnline} onChange={v => set('isOnline', v)} label="Online Now" />
            <Toggle value={form.isVerified} onChange={v => set('isVerified', v)} label="Verified Badge" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Display Name">
              <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Chloe Vibe" />
            </Field>
            <Field label="Location">
              <Input value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Nairobi, KE" />
            </Field>
            <Field label="Price per Hour (KES)">
              <Input type="number" value={form.price_hr} onChange={e => set('price_hr', parseInt(e.target.value) || 0)} placeholder="3500" />
            </Field>
            <Field label="Age">
              <Input type="number" value={form.age ?? ''} onChange={e => set('age', parseInt(e.target.value) || undefined)} placeholder="24" />
            </Field>
            <Field label="Rating (1–5)">
              <Input type="number" step="0.1" min="1" max="5" value={form.rating} onChange={e => set('rating', parseFloat(e.target.value) || 0)} placeholder="4.9" />
            </Field>
          </div>

          <Field label="Bio">
            <Textarea value={form.bio} onChange={e => set('bio', e.target.value)} placeholder="Short description shown on profile..." />
          </Field>

          <Field label="Avatar URL">
            <div className="flex gap-3">
              <div className="flex-1">
                <Input value={form.avatar} onChange={e => set('avatar', e.target.value)} placeholder="https://..." />
              </div>
              {form.avatar && (
                <img src={form.avatar} alt="preview" className="w-12 h-12 rounded-xl object-cover border border-zinc-700 shrink-0" />
              )}
            </div>
          </Field>

          <Field label="Cover Image URL">
            <div className="flex gap-3 flex-col">
              <Input value={form.cover_image} onChange={e => set('cover_image', e.target.value)} placeholder="https://..." />
              {form.cover_image && (
                <img src={form.cover_image} alt="cover preview" className="w-full h-24 rounded-xl object-cover border border-zinc-700" />
              )}
            </div>
          </Field>

          <Field label="Services (comma-separated)">
            <Input
              value={form.services.join(', ')}
              onChange={e => set('services', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              placeholder="Dinner Date, VIP Events, GFE"
            />
          </Field>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#0a0b0f] border-t border-zinc-800/80 px-6 py-4 flex justify-end gap-3 rounded-b-3xl">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 rounded-xl transition-all">
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-black bg-red-600 hover:bg-red-500 text-white border border-red-500 rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.3)] transition-all active:scale-95"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                            */
/* ------------------------------------------------------------------ */
export default function AdminHardcodedEscorts() {
  const [escorts, setEscorts] = useState<EscortProfile[]>([]);
  const [editing, setEditing] = useState<EscortProfile | null>(null);
  const [showReset, setShowReset] = useState(false);

  useEffect(() => {
    setEscorts(getEscorts());
  }, []);

  const handleSave = (updated: EscortProfile) => {
    const next = escorts.map(e => (e.id === updated.id ? updated : e));
    setEscorts(next);
    saveEscorts(next);
    setEditing(null);
    toast.success('Profile saved successfully', {
      description: 'Changes are now live on public escort pages.'
    });
  };

  const handleReset = () => {
    resetEscorts();
    setEscorts(getEscorts());
    setShowReset(false);
    toast.info('Reset to defaults', {
      description: 'All 8 escort profiles have been restored.'
    });
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Hardcoded Profiles</h1>
            <p className="text-zinc-400 mt-1 text-sm">Edit the 8 featured escorts. Changes saved to browser storage and appear immediately on public pages.</p>
          </div>
          <button
            onClick={() => setShowReset(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 rounded-xl transition-all shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {escorts.map(escort => (
            <div key={escort.id} className="group bg-[#0d0e12] border border-zinc-800 hover:border-zinc-600 rounded-2xl overflow-hidden flex flex-col transition-colors">
              {/* Image */}
              <div className="relative aspect-[3/4] overflow-hidden bg-zinc-900">
                <img
                  src={escort.avatar}
                  alt={escort.name}
                  loading="lazy"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                {/* Badges */}
                <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
                  <span className={`flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full border backdrop-blur-sm ${escort.isOnline ? 'bg-black/70 border-white/10 text-white' : 'bg-black/70 border-white/10 text-zinc-500'}`}>
                    {escort.isOnline ? <Wifi className="w-2.5 h-2.5 text-red-500" /> : <WifiOff className="w-2.5 h-2.5" />}
                    {escort.isOnline ? 'Online' : 'Offline'}
                  </span>
                  {escort.isVerified
                    ? <ShieldCheck className="w-5 h-5 text-red-400 drop-shadow" />
                    : <ShieldOff className="w-5 h-5 text-zinc-600" />
                  }
                </div>
                {/* Name overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <h3 className="text-white font-black text-lg leading-tight truncate">{escort.name}</h3>
                </div>
              </div>

              {/* Details */}
              <div className="p-4 flex-1 flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <MapPin className="w-3 h-3 text-red-500" />
                    <span className="truncate">{escort.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <Star className="w-3 h-3 text-red-500 fill-red-500" />
                    <span>{escort.rating.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <DollarSign className="w-3 h-3 text-red-500" />
                    <span className="text-red-400 font-bold">KES {escort.price_hr.toLocaleString()}/hr</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <User className="w-3 h-3 text-red-500" />
                    <span>{escort.age ?? '—'} yrs</span>
                  </div>
                </div>

                <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed flex-1">{escort.bio}</p>

                {escort.services.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {escort.services.slice(0, 3).map(s => (
                      <span key={s} className="text-[9px] uppercase tracking-widest font-black px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-md border border-zinc-700/50">{s}</span>
                    ))}
                    {escort.services.length > 3 && (
                      <span className="text-[9px] uppercase tracking-widest font-black px-2 py-0.5 bg-zinc-800 text-zinc-500 rounded-md border border-zinc-700/50">+{escort.services.length - 3}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="px-4 pb-4 flex gap-2">
                <button
                  onClick={() => setEditing(escort)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-black rounded-xl border border-red-500 shadow-[0_0_12px_rgba(220,38,38,0.2)] transition-all active:scale-95"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit Profile
                </button>
                <a
                  href={`/creator/${escort.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl border border-zinc-700 transition-all"
                  title="View public page"
                >
                  <LinkIcon className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Reset Confirm Dialog */}
        {showReset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowReset(false)} />
            <div className="relative z-10 w-full max-w-sm bg-[#0a0b0f] border border-zinc-800 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <h3 className="text-white font-black">Reset All Profiles?</h3>
                  <p className="text-zinc-500 text-xs">This will undo all your edits.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowReset(false)} className="flex-1 py-2.5 text-sm font-bold text-zinc-400 bg-zinc-800 border border-zinc-700 rounded-xl hover:bg-zinc-700 transition-all">
                  Cancel
                </button>
                <button onClick={handleReset} className="flex-1 py-2.5 text-sm font-black text-white bg-orange-600 hover:bg-orange-500 border border-orange-500 rounded-xl transition-all">
                  Yes, Reset
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editing && (
        <EditModal escort={editing} onSave={handleSave} onClose={() => setEditing(null)} />
      )}
    </AdminLayout>
  );
}
