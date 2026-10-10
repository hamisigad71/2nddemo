import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import CreatorLayout from '../../components/CreatorLayout';
import type { EscortApplication } from '../../types/escort';
import { Loader2, CheckCircle2, XCircle, AlertCircle, Upload, Save, User as UserIcon } from 'lucide-react';

const EscortRegistration = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [application, setApplication] = useState<EscortApplication | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    age: '',
    location: '',
    measurements: '',
    rates: ''
  });

  useEffect(() => {
    const fetchApplication = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('escort_applications')
          .select('*')
          .eq('creator_id', user.id)
          .single();
          
        if (error && error.code !== 'PGRST116') { // PGRST116 is not found
          throw error;
        }
        
        if (data) {
          setApplication(data);
          setFormData({
            name: data.name || '',
            bio: data.bio || '',
            age: data.age?.toString() || '',
            location: data.location || '',
            measurements: data.measurements || '',
            rates: data.rates || ''
          });
        }
      } catch (err: any) {
        console.error('Error fetching application:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchApplication();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSubmitting(true);
    setError(null);
    
    try {
      const payload = {
        creator_id: user.id,
        name: formData.name,
        bio: formData.bio,
        age: formData.age ? parseInt(formData.age) : null,
        location: formData.location,
        measurements: formData.measurements,
        rates: formData.rates,
        status: 'pending' // Always force to pending on submit/update
      };

      if (application) {
        const { error: updateError } = await supabase
          .from('escort_applications')
          .update(payload)
          .eq('id', application.id);
          
        if (updateError) throw updateError;
        setApplication({ ...application, ...payload, status: 'pending' } as EscortApplication);
      } else {
        const { data, error: insertError } = await supabase
          .from('escort_applications')
          .insert([payload])
          .select()
          .single();
          
        if (insertError) throw insertError;
        setApplication(data as EscortApplication);
      }
    } catch (err: any) {
      console.error('Error submitting application:', err);
      setError(err.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <CreatorLayout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </CreatorLayout>
    );
  }

  return (
    <CreatorLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 items-center flex gap-3">
           <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
             <UserIcon className="w-6 h-6 text-orange-500" />
           </div>
           <div>
              <h1 className="text-3xl font-bold">Escort Registration</h1>
              <p className="text-muted-foreground mt-1">Apply to join as a verified escort on The Gents Dollhouse.</p>
           </div>
        </div>
        
        {application && application.status === 'approved' && (
          <div className="mb-8 p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col items-center text-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Application Approved</h2>
            <p className="text-muted-foreground">Your profile is now verified as an Escort. You can update your details below if needed.</p>
          </div>
        )}

        {application && application.status === 'pending' && (
          <div className="mb-8 p-6 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex flex-col items-center text-center">
            <Loader2 className="w-16 h-16 text-blue-500 mb-4 animate-spin-slow" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Application Under Review</h2>
            <p className="text-muted-foreground">Our team is currently reviewing your application. You will be notified once approved.</p>
          </div>
        )}
        
        {application && application.status === 'rejected' && (
          <div className="mb-8 p-6 rounded-2xl bg-red-500/10 border border-red-500/20 flex flex-col items-center text-center">
            <XCircle className="w-16 h-16 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Application Rejected</h2>
            <p className="text-muted-foreground mb-4">Unfortunately, your application was not approved at this time. You can review and update your information below to reapply.</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-500 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-background border border-border p-6 rounded-2xl shadow-sm space-y-6">
           <h3 className="text-xl font-bold">Profile Details</h3>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Stage Name / Full Name</label>
                <input 
                  type="text" 
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full bg-input/10 border border-border rounded-xl px-4 py-3 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium" 
                  placeholder="How should clients address you?"
                  required 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Age</label>
                <input 
                  type="number" 
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  className="w-full bg-input/10 border border-border rounded-xl px-4 py-3 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium" 
                  placeholder="e.g. 24"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Location</label>
                <input 
                  type="text" 
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full bg-input/10 border border-border rounded-xl px-4 py-3 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium" 
                  placeholder="City, Area"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Measurements / Body Type</label>
                <input 
                  type="text" 
                  name="measurements"
                  value={formData.measurements}
                  onChange={handleChange}
                  className="w-full bg-input/10 border border-border rounded-xl px-4 py-3 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium" 
                  placeholder="e.g. Slim, athletic, 36-24-36"
                />
              </div>
           </div>

           <div className="space-y-2">
              <label className="text-sm font-medium">Rates (Overview)</label>
              <textarea 
                name="rates"
                value={formData.rates}
                onChange={handleChange}
                rows={3}
                className="w-full bg-input/10 border border-border rounded-xl px-4 py-3 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium resize-none" 
                placeholder="Briefly describe your rates for different timeframes/services..."
              />
           </div>

           <div className="space-y-2">
              <label className="text-sm font-medium">Bio / About Me</label>
              <textarea 
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows={4}
                className="w-full bg-input/10 border border-border rounded-xl px-4 py-3 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium resize-none" 
                placeholder="Tell potential clients about yourself..."
                required
              />
           </div>

           {/* Simple placeholder for Photos for now */}
           <div className="space-y-2">
              <label className="text-sm font-medium">Verification Photos</label>
              <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-muted-foreground bg-input/5">
                 <Upload className="w-8 h-8 mb-2 opacity-50" />
                 <p className="text-sm">Photo upload will be available after initial approval.</p>
              </div>
           </div>

           <div className="pt-4 border-t border-border flex justify-end">
              <button 
                type="submit" 
                disabled={submitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all min-w-[200px]"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Save className="w-5 h-5" /> 
                    {application && application.status !== 'rejected' ? 'Update Application' : 'Submit Application'}
                  </>
                )}
              </button>
           </div>
        </form>
      </div>
    </CreatorLayout>
  );
};

export default EscortRegistration;
