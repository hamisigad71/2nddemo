import { useState } from 'react';
import { ArrowLeft, Image as ImageIcon, Video, Lock, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';

const CreatePost = () => {
  const [isPremium, setIsPremium] = useState(true);
  
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center py-10 px-4">
       <div className="w-full max-w-2xl">
         <Link to="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-medium mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
         </Link>
         
         <div className="bg-input/5 border border-border rounded-2xl p-6 md:p-8 shadow-sm">
            <h1 className="text-2xl font-bold mb-6 text-foreground">Create New Post</h1>
            
            {/* Upload Area */}
            <div className="border-2 border-dashed border-border hover:border-primary/50 transition-colors rounded-xl bg-background flex flex-col items-center justify-center p-12 text-center mb-6 cursor-pointer group">
               <div className="flex gap-4 mb-4">
                 <div className="w-12 h-12 bg-input rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors"><ImageIcon className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" /></div>
                 <div className="w-12 h-12 bg-input rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors"><Video className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" /></div>
               </div>
               <h3 className="font-bold text-lg mb-1 text-foreground">Upload Media</h3>
               <p className="text-muted-foreground text-sm">Drag and drop or click to browse. Max 500MB.</p>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold mb-2 text-foreground">Post Title</label>
                <input 
                  type="text" 
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none placeholder:text-muted-foreground text-sm" 
                  placeholder="E.g. Weekly Workout Routine"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold mb-2 text-foreground">Description</label>
                <textarea 
                  rows={4}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none placeholder:text-muted-foreground text-sm resize-none" 
                  placeholder="What's this post about?"
                ></textarea>
              </div>
              
              <div className="border border-border p-4 rounded-xl bg-background">
                 <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold mb-1 text-foreground">Access Level</h4>
                      <p className="text-sm text-muted-foreground">Who can see this content?</p>
                    </div>
                    
                    <div className="flex bg-input/50 p-1 rounded-lg border border-border">
                      <button 
                         type="button"
                         onClick={() => setIsPremium(false)}
                         className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-bold transition-all ${!isPremium ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                         <Globe className="w-4 h-4" /> Free
                      </button>
                      <button 
                         type="button"
                         onClick={() => setIsPremium(true)}
                         className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-bold transition-all ${isPremium ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                         <Lock className="w-4 h-4" /> Premium
                      </button>
                    </div>
                 </div>
              </div>
              
              <div className="pt-6 border-t border-border flex justify-end gap-3">
                 <button className="px-6 py-3 rounded-xl font-bold bg-input/50 text-foreground hover:bg-input border border-transparent hover:border-border transition-all">Save Draft</button>
                 <button className="px-8 py-3 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-emerald-600 transition-colors shadow-lg shadow-primary/20">Publish Post</button>
              </div>
            </div>
         </div>
       </div>
    </div>
  );
};

export default CreatePost;
