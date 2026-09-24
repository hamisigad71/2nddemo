import { useState } from 'react';
import { Search, Filter, CheckCircle, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

const Discover = () => {
  const [activeTab, setActiveTab] = useState('trending');
  
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="border-b border-border bg-background/95 sticky top-0 z-20 p-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-4 items-center w-full md:w-auto">
            <Link to="/" className="text-xl font-bold text-primary mr-2 md:hidden">MALI.</Link>
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search creators..." 
                className="w-full bg-input/50 border border-border rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-primary focus:outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
            {['trending', 'popular', 'new'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 rounded-full text-sm font-semibold capitalize whitespace-nowrap transition-colors ${activeTab === tab ? 'bg-primary text-primary-foreground' : 'bg-input/30 hover:bg-input text-muted-foreground border border-transparent hover:border-border'}`}
              >
                {tab}
              </button>
            ))}
            <button className="px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap bg-input/30 hover:bg-input flex items-center gap-1 transition-colors border border-transparent hover:border-border ml-2">
              <Filter className="w-4 h-4" /> Filters
            </button>
          </div>
        </div>
      </div>
      
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 lg:p-8">
        <h1 className="text-3xl font-bold mb-6 capitalize">{activeTab} Creators</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
           {/* Mock Creator Cards */}
           {[1,2,3,4,5,6,7,8].map(i => (
             <Link to="/creator/123" key={i} className="group flex flex-col bg-input/10 border border-border rounded-xl overflow-hidden hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                <div className="h-32 bg-muted relative overflow-hidden">
                  <img src={`https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&q=80&sig=${i}`} alt="cover" className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="px-5 pb-5 -mt-10 relative flex-1 flex flex-col">
                  <img src={`https://i.pravatar.cc/150?img=${i+10}`} alt="avatar" className="w-20 h-20 rounded-full border-4 border-background object-cover bg-background shadow-sm" />
                  <div className="mt-3 text-xs font-semibold text-secondary uppercase tracking-wider">Lifestyle & Culture</div>
                  <h3 className="text-xl font-bold flex items-center gap-1 mt-1 text-foreground">
                    Jane Doe {i} <CheckCircle className="w-4 h-4 text-primary" />
                  </h3>
                  <p className="text-sm text-muted-foreground font-medium">@janedoe{i}</p>
                  
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-3">
                    <MapPin className="w-3.5 h-3.5" /> Nairobi, Kenya
                  </div>
                  
                  <div className="mt-5 pt-4 border-t border-border flex items-center justify-between mt-auto">
                    <div className="text-sm font-medium text-foreground">{1.2 * i}k followers</div>
                    <div className="text-sm font-bold text-primary">KES 500/mo</div>
                  </div>
                </div>
             </Link>
           ))}
        </div>
      </main>
    </div>
  )
}
export default Discover;
