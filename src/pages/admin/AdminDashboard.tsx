import { ShieldAlert, Users, DollarSign, Activity, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside className="w-64 bg-input/10 border-r border-border p-6 flex flex-col hidden lg:flex">
         <Link to="/" className="text-2xl font-bold tracking-tighter text-primary mb-10 text-destructive">Hideaway <span className="text-xs uppercase tracking-widest text-muted-foreground">Admin</span></Link>
         <nav className="flex-1 space-y-2">
            <a href="#" className="flex items-center gap-3 px-4 py-3 bg-primary/10 text-primary rounded-xl font-bold">
              <Activity className="w-5 h-5" /> Platform Overview
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:bg-input hover:text-foreground rounded-xl transition-colors font-medium">
              <Users className="w-5 h-5" /> Verification Queue <span className="ml-auto bg-destructive text-white text-xs px-2 py-0.5 rounded-full">12</span>
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:bg-input hover:text-foreground rounded-xl transition-colors font-medium">
              <ShieldAlert className="w-5 h-5" /> Moderation <span className="ml-auto bg-destructive text-white text-xs px-2 py-0.5 rounded-full">3</span>
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:bg-input hover:text-foreground rounded-xl transition-colors font-medium">
              <DollarSign className="w-5 h-5" /> Payouts & Finance
            </a>
         </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6 md:p-10 lg:p-12 overflow-y-auto">
         <h1 className="text-3xl font-bold mb-8">Admin Overview</h1>
         
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-background border border-border p-6 rounded-2xl shadow-sm">
               <p className="text-muted-foreground text-sm font-medium mb-1">Total Users</p>
               <h3 className="text-2xl font-bold">45.2k</h3>
            </div>
            <div className="bg-background border border-border p-6 rounded-2xl shadow-sm">
               <p className="text-muted-foreground text-sm font-medium mb-1">Verified Creators</p>
               <h3 className="text-2xl font-bold">1,240</h3>
            </div>
            <div className="bg-background border border-border p-6 rounded-2xl shadow-sm border-emerald-500/30">
               <p className="text-muted-foreground text-sm font-medium mb-1">Platform Revenue</p>
               <h3 className="text-2xl font-bold text-primary">KES 4.2M</h3>
            </div>
            <div className="bg-destructive/10 border border-destructive/30 p-6 rounded-2xl shadow-sm">
               <p className="text-destructive text-sm font-medium mb-1 flex items-center gap-2">
                 <AlertTriangle className="w-4 h-4" /> Pending Reviews
               </p>
               <h3 className="text-2xl font-bold text-destructive">15</h3>
            </div>
         </div>
         
         {/* Pending Verification Table */}
         <h3 className="text-xl font-bold mb-4">Pending Creator Verification</h3>
         <div className="bg-background border border-border rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
           <table className="w-full text-left">
             <thead className="bg-input/30 text-muted-foreground text-sm">
               <tr>
                 <th className="p-4 font-semibold">User</th>
                 <th className="p-4 font-semibold">ID Document</th>
                 <th className="p-4 font-semibold">Category</th>
                 <th className="p-4 font-semibold">Action</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-border text-sm">
               {[1,2,3].map(i => (
                  <tr key={i} className="hover:bg-input/10 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                         <img src={`https://i.pravatar.cc/150?img=${i+30}`} className="w-10 h-10 rounded-full" />
                         <div>
                            <div className="font-bold">Creator Applicant {i}</div>
                            <div className="text-xs text-muted-foreground">joined 2 days ago</div>
                         </div>
                      </div>
                    </td>
                    <td className="p-4">National ID (Front/Back)</td>
                    <td className="p-4">Entertainment</td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button className="px-3 py-1.5 bg-primary text-primary-foreground font-bold rounded-lg text-xs hover:bg-emerald-600 transition-colors">Approve</button>
                        <button className="px-3 py-1.5 bg-destructive/10 text-destructive font-bold rounded-lg text-xs hover:bg-destructive hover:text-white transition-colors">Reject</button>
                      </div>
                    </td>
                  </tr>
               ))}
             </tbody>
           </table>
         </div>
      </main>
    </div>
  );
};
export default AdminDashboard;
