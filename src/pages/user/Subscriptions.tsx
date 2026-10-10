import UserLayout from '../../components/UserLayout';
import { CheckCircle2, XCircle, MoreVertical, RefreshCw } from 'lucide-react';

const Subscriptions = () => {
  return (
    <UserLayout>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white mb-1">
          Active Subscriptions
        </h1>
        <p className="text-sm text-zinc-400">
          Manage the creators you are currently supporting.
        </p>
      </div>

      <div className="space-y-4">
        {[1, 2, 3].map((i) => {
          const isAutoRenew = i !== 3;
          return (
            <div
              key={i}
              className="bg-black border border-white/10 rounded-2xl p-5 md:p-6 shadow-lg hover:border-white/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={`https://i.pravatar.cc/150?img=${i + 20}`}
                    alt="creator"
                    className="w-16 h-16 rounded-full object-cover ring-2 ring-red-500/30 ring-offset-2 ring-offset-black"
                  />
                  {isAutoRenew && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-black" />
                  )}
                </div>
                <div>
                  <div className="font-bold text-lg text-white flex items-center gap-2.5">
                    Creator Name {i}
                    <span
                      className={`text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full font-bold border ${
                        i === 1
                          ? 'bg-red-500/10 text-red-400 border-red-500/30'
                          : i === 2
                          ? 'bg-white/10 text-white border-white/20'
                          : 'bg-zinc-900 text-zinc-400 border-white/10'
                      }`}
                    >
                      {i === 1 ? 'VIP Tier' : i === 2 ? 'Superfan Tier' : 'Fan Tier'}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400 mb-2">@creator_{i}</div>
                  <div
                    className={`text-xs font-semibold flex items-center gap-1.5 ${
                      isAutoRenew ? 'text-zinc-300' : 'text-red-400'
                    }`}
                  >
                    {isAutoRenew ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-red-500" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-red-500" />
                    )}
                    {isAutoRenew ? 'Auto-renews Oct 28' : 'Expires Oct 15'}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto mt-2 sm:mt-0 pt-4 sm:pt-0 border-t border-white/10 sm:border-0">
                <div className="text-left sm:text-right">
                  <div className="font-extrabold text-xl text-white">
                    KES {i === 1 ? '5,000' : i === 2 ? '1,500' : '500'}
                    <span className="text-xs text-zinc-400 font-medium ml-1">/mo</span>
                  </div>
                </div>
                <button className="p-2.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors border border-white/10">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-12">
        <h2 className="text-xl font-extrabold text-white mb-4">
          Expired Subscriptions
        </h2>
        <div className="bg-black border border-white/10 rounded-2xl p-5 flex items-center justify-between hover:border-white/20 transition-all">
          <div className="flex items-center gap-3.5">
            <img
              src="https://i.pravatar.cc/150?img=40"
              alt="creator"
              className="w-12 h-12 rounded-full object-cover grayscale opacity-60 ring-1 ring-white/10"
            />
            <div>
              <div className="font-bold text-sm text-white">Creator Name 4</div>
              <div className="text-xs text-zinc-400">Expired Sept 12</div>
            </div>
          </div>
          <button className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all hover:scale-105 active:scale-95 shadow-[0_2px_10px_rgba(220,38,38,0.3)] flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            Resubscribe
          </button>
        </div>
      </div>
    </UserLayout>
  );
};

export default Subscriptions;
