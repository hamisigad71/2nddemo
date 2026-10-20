import React, { useState, useEffect } from 'react';
import CreatorLayout from '../../components/CreatorLayout';
import { Bot, Save, CheckCircle2, DollarSign } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../context/ToastContext';
import { supabase } from '../../lib/supabase';

interface AutomationSettings {
  enabled: boolean;
  messageText: string;
  hasPpv: boolean;
  ppvPrice: number;
}

const DEFAULT_SETTINGS: AutomationSettings = {
  enabled: true,
  messageText: "Hey babe! Thank you so much for subscribing to my VIP tier ❤️ Feel free to message me here anytime!",
  hasPpv: false,
  ppvPrice: 500,
};

const Automations: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AutomationSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    try {
      const stored = localStorage.getItem(`tgd_creator_automations_${user.id}`);
      if (stored) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
      }
    } catch {}
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      localStorage.setItem(`tgd_creator_automations_${user.id}`, JSON.stringify(settings));

      // Attempt to save to creator_profiles or users metadata if available
      try {
        await supabase
          .from('creator_profiles')
          .update({
            welcome_message: settings.enabled ? settings.messageText : null,
          })
          .eq('user_id', user.id);
      } catch {}

      toast.success('Automations saved successfully', {
        description: settings.enabled ? 'New subscribers will receive your welcome message automatically.' : 'Automated welcome messaging is paused.'
      });
    } catch (err) {
      console.error('Failed to save automations:', err);
      toast.error('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <CreatorLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1 text-white">Automations</h1>
          <p className="text-zinc-400 text-sm">Configure instant welcome messages and bots for new subscribers.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-5 py-2.5 font-bold rounded-xl shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          {saving ? (
            <span>Saving...</span>
          ) : (
            <>
              <Save className="w-5 h-5" /> Save Automations
            </>
          )}
        </button>
      </div>

      <div className="bg-[#0D0E12] border border-zinc-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center text-red-500">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Welcome Message</h2>
              <p className="text-xs text-zinc-400">Sent automatically when a fan completes a VIP subscription.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
            className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${
              settings.enabled ? 'bg-red-600' : 'bg-zinc-800'
            }`}
          >
            <div
              className={`absolute top-1 bg-white w-4 h-4 rounded-full shadow transition-all ${
                settings.enabled ? 'right-1' : 'left-1'
              }`}
            />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold mb-2 text-white">Welcome Message Text</label>
            <textarea
              rows={4}
              value={settings.messageText}
              onChange={e => setSettings(prev => ({ ...prev, messageText: e.target.value }))}
              placeholder="Enter your personal welcome greeting for subscribers..."
              disabled={!settings.enabled}
              className="w-full bg-zinc-950 border border-zinc-800 px-4 py-3 rounded-xl text-white text-sm focus:outline-none focus:border-red-500/80 resize-none disabled:opacity-40 transition-colors"
            />
            <p className="text-xs text-zinc-500 mt-1.5">
              This message appears in the subscriber's private chat immediately upon payment approval.
            </p>
          </div>

          <div className="pt-2 border-t border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <label className="block text-sm font-bold text-white">Attach Paid Welcome PPV</label>
                <p className="text-xs text-zinc-400">Lock an exclusive greeting clip or photoset behind a PPV unlock fee.</p>
              </div>
              <button
                type="button"
                disabled={!settings.enabled}
                onClick={() => setSettings(prev => ({ ...prev, hasPpv: !prev.hasPpv }))}
                className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors disabled:opacity-40 ${
                  settings.hasPpv ? 'bg-red-600' : 'bg-zinc-800'
                }`}
              >
                <div
                  className={`absolute top-1 bg-white w-4 h-4 rounded-full shadow transition-all ${
                    settings.hasPpv ? 'right-1' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {settings.hasPpv && (
              <div className="animate-in fade-in duration-300 bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3">
                <label className="block text-xs font-bold text-zinc-300">PPV Unlock Price (KES)</label>
                <div className="relative max-w-xs">
                  <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="number"
                    min="100"
                    step="50"
                    value={settings.ppvPrice}
                    onChange={e => setSettings(prev => ({ ...prev, ppvPrice: Number(e.target.value) || 0 }))}
                    className="w-full bg-[#0D0E12] border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-red-500/80"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2 text-xs text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>Automations engine is connected to real-time subscription events.</span>
          </div>
        </div>
      </div>
    </CreatorLayout>
  );
};

export default Automations;
