import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { uploadFileToSupabase } from '../../lib/db';
import CreatorLayout from '../../components/CreatorLayout';
import type { EscortApplication } from '../../types/escort';
import { Loader2, CheckCircle2, XCircle, AlertCircle, Upload, Save, User as UserIcon, X, ImagePlus } from 'lucide-react';

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

  // Photo upload state
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [existingPhotoUrls, setExistingPhotoUrls] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const photoDragCounter = useRef(0);

  useEffect(() => {
    if (!user) return;

    // Initial fetch
    const fetchApplication = async () => {
      try {
        const { data, error } = await supabase
          .from('escort_applications')
          .select('*')
          .eq('creator_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') throw error;

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
          if (data.verification_photos?.length) {
            setExistingPhotoUrls(data.verification_photos);
          }
        }
      } catch (err: any) {
        console.error('Error fetching application:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchApplication();

    // Realtime subscription — auto-update when admin approves/rejects
    const channel = supabase
      .channel(`escort_app_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'escort_applications',
          filter: `creator_id=eq.${user.id}`,
        },
        (payload) => {
          setApplication(payload.new as any);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addPhotoFiles = (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (!validFiles.length) return;
    setPhotoFiles(prev => [...prev, ...validFiles].slice(0, 6)); // max 6
    validFiles.forEach(f => {
      const url = URL.createObjectURL(f);
      setPhotoPreviews(prev => [...prev, url].slice(0, 6));
    });
  };

  const removeNewPhoto = (index: number) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const removeExistingPhoto = (index: number) => {
    setExistingPhotoUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handlePhotoDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    photoDragCounter.current += 1;
    if (e.dataTransfer.items?.length) setIsDraggingPhoto(true);
  };

  const handlePhotoDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handlePhotoDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    photoDragCounter.current -= 1;
    if (photoDragCounter.current <= 0) { photoDragCounter.current = 0; setIsDraggingPhoto(false); }
  };

  const handlePhotoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPhoto(false);
    photoDragCounter.current = 0;
    if (e.dataTransfer.files?.length) addPhotoFiles(e.dataTransfer.files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    setError(null);

    try {
      // Upload any new photos first
      let allPhotoUrls = [...existingPhotoUrls];
      if (photoFiles.length > 0) {
        setUploadingPhotos(true);
        const uploads = await Promise.all(
          photoFiles.map(async (file) => {
            const clean = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const path = `escort-verification/${user.id}/${Date.now()}_${clean}`;
            return uploadFileToSupabase(file, 'hideaway post storage', path);
          })
        );
        const successful = uploads.filter(Boolean) as string[];
        allPhotoUrls = [...allPhotoUrls, ...successful];
        setExistingPhotoUrls(allPhotoUrls);
        setPhotoFiles([]);
        setPhotoPreviews([]);
        setUploadingPhotos(false);
      }

      const payload = {
        creator_id: user.id,
        name: formData.name,
        bio: formData.bio,
        age: formData.age ? parseInt(formData.age) : null,
        location: formData.location,
        measurements: formData.measurements,
        rates: formData.rates,
        verification_photos: allPhotoUrls,
        status: 'pending'
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
      setUploadingPhotos(false);
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

           {/* Verification Photo Upload */}
           <div className="space-y-3">
             <label className="text-sm font-medium flex items-center gap-2">
               <ImagePlus className="w-4 h-4 text-primary" />
               Verification Photos
               <span className="text-xs text-muted-foreground font-normal">(up to 6 photos)</span>
             </label>

             {/* Existing uploaded photos */}
             {existingPhotoUrls.length > 0 && (
               <div className="flex flex-wrap gap-3 mb-3">
                 {existingPhotoUrls.map((url, i) => (
                   <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-border group">
                     <img src={url} alt={`verification ${i+1}`} className="w-full h-full object-cover" />
                     <button
                       type="button"
                       onClick={() => removeExistingPhoto(i)}
                       className="absolute top-1 right-1 w-5 h-5 bg-black/70 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                     >
                       <X className="w-3 h-3" />
                     </button>
                   </div>
                 ))}
               </div>
             )}

             {/* New photo previews */}
             {photoPreviews.length > 0 && (
               <div className="flex flex-wrap gap-3 mb-3">
                 {photoPreviews.map((url, i) => (
                   <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-primary/40 group">
                     <img src={url} alt={`new ${i+1}`} className="w-full h-full object-cover" />
                     <div className="absolute top-1 left-1 bg-primary/80 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">NEW</div>
                     <button
                       type="button"
                       onClick={() => removeNewPhoto(i)}
                       className="absolute top-1 right-1 w-5 h-5 bg-black/70 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                     >
                       <X className="w-3 h-3" />
                     </button>
                   </div>
                 ))}
               </div>
             )}

             {/* Drop zone — hidden if max photos reached */}
             {(existingPhotoUrls.length + photoPreviews.length) < 6 && (
               <div
                 onClick={() => photoInputRef.current?.click()}
                 onDragEnter={handlePhotoDragEnter}
                 onDragOver={handlePhotoDragOver}
                 onDragLeave={handlePhotoDragLeave}
                 onDrop={handlePhotoDrop}
                 className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-muted-foreground cursor-pointer transition-all duration-200 ${
                   isDraggingPhoto
                     ? 'border-primary bg-primary/10 ring-4 ring-primary/20 scale-[1.01]'
                     : 'border-border hover:border-primary/50 hover:bg-muted/10'
                 }`}
               >
                 <Upload className={`w-8 h-8 mb-2 transition-transform duration-200 ${isDraggingPhoto ? 'scale-125 text-primary animate-bounce' : 'opacity-50'}`} />
                 <p className="text-sm font-semibold text-foreground">
                   {isDraggingPhoto ? 'Drop photos here' : 'Click or drag & drop photos'}
                 </p>
                 <p className="text-xs mt-1">JPEG, PNG, WebP — max 6 photos total</p>
                 <input
                   ref={photoInputRef}
                   type="file"
                   accept="image/*"
                   multiple
                   className="hidden"
                   onChange={e => e.target.files && addPhotoFiles(e.target.files)}
                 />
               </div>
             )}

             {uploadingPhotos && (
               <div className="flex items-center gap-2 text-sm text-primary font-medium">
                 <Loader2 className="w-4 h-4 animate-spin" />
                 Uploading photos...
               </div>
             )}
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
