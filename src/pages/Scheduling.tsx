import CreatorLayout from '../components/CreatorLayout';
import { Calendar as CalendarIcon, Clock, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';

const Scheduling = () => {
  return (
    <CreatorLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">Content Calendar</h1>
          <p className="text-muted-foreground">Schedule your posts and mass messages in advance.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 font-bold rounded-lg shadow-lg hover:-translate-y-1 transition-transform">
          <CalendarIcon className="w-5 h-5" /> Schedule New
        </button>
      </div>

      <div className="bg-background border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col min-h-[600px]">
         
         <div className="p-4 border-b border-border flex items-center justify-between bg-muted/10">
            <h2 className="text-xl font-bold flex items-center gap-2">
               October 2026
            </h2>
            <div className="flex gap-2">
               <button className="p-2 border border-border rounded-lg bg-background hover:bg-muted">
                 <ChevronLeft className="w-5 h-5" />
               </button>
               <button className="p-2 border border-border rounded-lg bg-background font-bold text-sm">
                 Today
               </button>
               <button className="p-2 border border-border rounded-lg bg-background hover:bg-muted">
                 <ChevronRight className="w-5 h-5" />
               </button>
            </div>
         </div>

         <div className="flex-1 grid grid-cols-7 grid-rows-5 divide-y divide-x divide-border bg-muted/5">
            {/* Days of Week Header */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="py-2 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground bg-background border-b border-border">
                {day}
              </div>
            ))}

            {/* Calendar Cells (Fake Grid) */}
            {Array.from({ length: 35 }).map((_, i) => {
               const dayNum = i - 3; // Shift to start month
               const isCurrentMonth = dayNum > 0 && dayNum <= 31;
               const hasPost = dayNum === 12 || dayNum === 18 || dayNum === 25;
               const hasMassMessage = dayNum === 18 || dayNum === 5;
               
               return (
                 <div key={i} className={`min-h-[100px] p-2 flex flex-col ${!isCurrentMonth ? 'bg-muted/10 opacity-50' : 'bg-background hover:bg-muted/20 transition-colors cursor-pointer'}`}>
                    <div className={`text-xs font-bold self-end mb-2 ${dayNum === 15 ? 'bg-primary text-primary-foreground w-6 h-6 flex items-center justify-center rounded-full' : 'text-muted-foreground'}`}>
                       {isCurrentMonth ? dayNum : ''}
                    </div>
                    {isCurrentMonth && hasPost && (
                       <div className="bg-primary/10 text-primary border border-primary/20 text-[10px] sm:text-xs font-bold px-1.5 py-1 rounded truncate flex items-center gap-1 mb-1">
                          <ImageIcon className="w-3 h-3 hidden sm:block" /> Normal Post
                       </div>
                    )}
                    {isCurrentMonth && hasMassMessage && (
                       <div className="bg-secondary/10 text-secondary border border-secondary/20 text-[10px] sm:text-xs font-bold px-1.5 py-1 rounded truncate flex items-center gap-1">
                          <Clock className="w-3 h-3 hidden sm:block" /> Mass MSG
                       </div>
                    )}
                 </div>
               );
            })}
         </div>

      </div>
    </CreatorLayout>
  );
};
export default Scheduling;
