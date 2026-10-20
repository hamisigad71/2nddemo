import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CreatorLayout from '../../components/CreatorLayout';
import { Search, Filter, MessageSquareDiff, Users, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getCreatorChatConversations } from '../../lib/db';
import { resolveUserAvatar } from '../../lib/avatar';

const FanManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('All active');
  const [search, setSearch] = useState('');
  const [fans, setFans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFans = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const list = await getCreatorChatConversations(user.id);
        setFans(list || []);
      } catch (err) {
        console.error('Failed to load creator fans:', err);
        setFans([]);
      } finally {
        setLoading(false);
      }
    };
    fetchFans();
  }, [user]);

  const filtered = fans.filter(f => {
    const matchSearch = (f.name || '').toLowerCase().includes(search.toLowerCase()) || 
                        (f.handle || '').toLowerCase().includes(search.toLowerCase());
    if (activeTab === 'All active') return matchSearch && f.isSubscribed;
    if (activeTab === 'Expired') return matchSearch && !f.isSubscribed;
    return matchSearch;
  });

  return (
    <CreatorLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1 tracking-tight">Fan Management</h1>
          <p className="text-muted-foreground text-sm">Organize your fans, track active memberships, and send direct messages.</p>
        </div>
        <button 
          onClick={() => navigate('/creator/messages')}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 font-bold rounded-xl shadow-lg shadow-primary/20 hover:-translate-y-0.5 hover:shadow-primary/40 transition-all duration-200"
        >
          <MessageSquareDiff className="w-5 h-5" /> Direct Message
        </button>
      </div>

      <div className="bg-background border border-border/60 rounded-3xl overflow-hidden shadow-sm">
        
        {/* Toolbar */}
        <div className="p-5 border-b border-border/40 flex flex-col lg:flex-row gap-5 justify-between items-center bg-background/50 backdrop-blur-md">
           <div className="flex gap-2 overflow-x-auto w-full lg:w-auto scrollbar-hide pb-2 lg:pb-0">
             {['All active', 'Expired', 'Top Spenders', 'Recently Subscribed'].map((tab) => (
               <button 
                 key={tab} 
                 onClick={() => setActiveTab(tab)}
                 className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 ${activeTab === tab ? 'bg-foreground text-background shadow-sm' : 'bg-transparent text-muted-foreground hover:bg-foreground/5 hover:text-foreground'}`}
               >
                 {tab}
               </button>
             ))}
           </div>
           
           <div className="flex items-center gap-3 w-full lg:w-auto">
             <div className="relative flex-1 lg:w-72 group">
               <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
               <input 
                 type="text" 
                 value={search}
                 onChange={e => setSearch(e.target.value)}
                 placeholder="Search fans..." 
                 className="w-full pl-10 pr-4 py-2.5 bg-foreground/5 border border-transparent rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-background transition-all" 
               />
             </div>
             <button className="p-2.5 rounded-xl bg-foreground/5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground transition-colors">
               <Filter className="w-5 h-5" />
             </button>
           </div>
        </div>

        {/* Table / Content */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-sm font-bold">Loading subscribers...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-1">No Subscribers Yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              When fans subscribe to your page, their membership tier, status, and messaging access will appear right here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-foreground/[0.02] border-b border-border/40 text-muted-foreground uppercase text-[11px] font-bold tracking-widest">
                <tr>
                  <th className="p-5">Fan</th>
                  <th className="p-5">Status</th>
                  <th className="p-5">Tier</th>
                  <th className="p-5">Expiry Date</th>
                  <th className="p-5 text-right">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filtered.map((fan) => (
                  <tr key={fan.id} className="hover:bg-foreground/[0.02] transition-colors group">
                    <td className="p-5">
                      <div className="flex items-center gap-4">
                        <img 
                          src={resolveUserAvatar(fan.avatar, fan.name)} 
                          alt="user" 
                          className="w-10 h-10 rounded-full object-cover shadow-sm ring-2 ring-transparent group-hover:ring-primary/20 transition-all" 
                        />
                        <div>
                          <div className="font-bold text-[14px] text-foreground tracking-tight">{fan.name || 'Fan'}</div>
                          <div className="text-[12px] font-medium text-muted-foreground mt-0.5">{fan.handle || '@subscriber'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      {fan.isSubscribed ? (
                        <span className="bg-emerald-500/10 text-emerald-500 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Active
                        </span>
                      ) : (
                        <span className="bg-red-500/10 text-red-500 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest inline-flex items-center">
                          Expired
                        </span>
                      )}
                    </td>
                    <td className="p-5 font-bold text-[14px] text-foreground tracking-tight">
                      {fan.subscriptionTier || 'Standard VIP'}
                    </td>
                    <td className="p-5 text-muted-foreground font-medium text-[13px]">
                      {fan.subscriptionExpiresAt ? new Date(fan.subscriptionExpiresAt).toLocaleDateString() : 'Auto-renewing'}
                    </td>
                    <td className="p-5 text-right">
                      <button 
                        onClick={() => navigate(`/creator/messages?fan=${fan.id}`)}
                        className="px-3.5 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground font-bold text-xs rounded-xl transition-all"
                      >
                        Chat
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </CreatorLayout>
  );
};

export default FanManagement;
