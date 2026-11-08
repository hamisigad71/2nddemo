import { useState, useRef, useEffect } from 'react';
import { UploadCloud, ImagePlus, Loader2, Video, Save, Lock } from 'lucide-react';
import { createPost, uploadFileToSupabase } from '../lib/db';
import { useAuth } from '../context/AuthContext';
import { sendTelegramErrorAlert } from '../lib/telegramAlerts';

interface CreatePostFormProps {
  onPostCreated?: () => void;
}

const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB limit

const compressImage = async (file: File): Promise<File> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1080;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);
        
        ctx.drawImage(img, 0, 0, width, height);

        // Attempt WebP for ultra-lightweight high-quality transfers
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.webp'), {
              type: 'image/webp',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            // Fallback to JPEG if WebP blob creation fails
            canvas.toBlob((jpegBlob) => {
              if (!jpegBlob) return resolve(file);
              const compressedFile = new File([jpegBlob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            }, 'image/jpeg', 0.8);
          }
        }, 'image/webp', 0.8);
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
};

const CreatePostForm = ({ onPostCreated }: CreatePostFormProps) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'subscribers' | 'ppv'>('public');
  const [price, setPrice] = useState('');
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Post published successfully!');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState<'uploading' | 'saving'>('uploading');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  // Clean up blob URL for video preview on unmount or file change
  useEffect(() => {
    return () => {
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview);
      }
    };
  }, [videoPreview]);

  const processFile = (file: File) => {
    setUploadError(null);

    const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm|3gp|m4v|mkv|avi)$/i.test(file.name);
    const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|heic|avif)$/i.test(file.name);

    if (!isVideo && !isImage) {
      setUploadError('Please select a valid image or video file.');
      return;
    }

    if (isVideo) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      if (file.size > MAX_VIDEO_SIZE) {
        setUploadError(`Selected video is too large (${sizeMB}MB). Maximum allowed video size is 500MB.`);
        return;
      }
      if (videoPreview) URL.revokeObjectURL(videoPreview);
      setSelectedFile(file);
      setMediaType('video');
      setPreview(null);
      setVideoPreview(URL.createObjectURL(file));
    } else {
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview);
        setVideoPreview(null);
      }
      setSelectedFile(file);
      setMediaType('image');
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const status = submitter?.value === 'draft' ? 'draft' : 'published';
    if (!user || (status === 'published' && !selectedFile)) return;
    if (status === 'draft' && !selectedFile && !caption.trim()) {
      setUploadError('Add a caption or media before saving a draft.');
      return;
    }
    const numericPrice = Number(price);
    if (visibility === 'ppv' && status === 'published' && (!Number.isSafeInteger(numericPrice) || numericPrice < 1)) {
      setUploadError('Enter a whole-number PPV price of at least KES 1.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadPhase('uploading');
    setUploadError(null);
    try {
      let mediaUrl: string | null = null;
      if (selectedFile) {
        let fileToUpload = selectedFile;
        if (mediaType === 'image') {
          fileToUpload = await compressImage(selectedFile);
        }

        const cleanName = fileToUpload.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const fileName = `${Date.now()}_${cleanName}`;
        mediaUrl = await uploadFileToSupabase(
          fileToUpload,
          'Daysman Gad',
          `posts/${user.id}/${fileName}`,
          (percent) => setUploadProgress(percent)
        );

        if (!mediaUrl) {
          setUploadError('Upload failed. Please check your storage settings or connection.');
          return;
        }
      }

      setUploadPhase('saving');
      const isLocked = visibility === 'ppv' || visibility === 'subscribers';
      const finalPrice = visibility === 'ppv' ? numericPrice : 0;

      await createPost(
        user.id,
        caption,
        mediaUrl,
        isLocked,
        finalPrice,
        mediaType,
        { visibility, status }
      );

      setStatusMessage(status === 'draft' ? 'Draft saved successfully!' : 'Post published successfully!');
      setSuccess(true);
      setCaption('');
      setPrice('');
      setVisibility('public');
      setPreview(null);
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview);
        setVideoPreview(null);
      }
      setSelectedFile(null);
      onPostCreated?.();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      const errMsg = err?.message || err?.error_description || (typeof err === 'string' ? err : 'Upload failed. Please check file size and connection.');
      setUploadError(errMsg);

      // Instantly alert admin on Telegram
      sendTelegramErrorAlert({
        action: `Creator Post Upload (${mediaType?.toUpperCase() || 'POST'}, visibility: ${visibility})`,
        error: errMsg,
        user: user ? { id: user.id, email: user.email, name: user.user_metadata?.name || user.email } : null,
        context: {
          fileType: selectedFile?.type,
          fileSizeMB: selectedFile ? (selectedFile.size / (1024 * 1024)).toFixed(2) : 'none',
          visibility,
          price: visibility === 'ppv' ? price : 'free',
        },
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 mb-8 shadow-sm">
      <h3 className="text-lg font-bold mb-5 flex items-center gap-2">
        <ImagePlus className="w-5 h-5 text-primary" /> New Post
      </h3>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Media Drop Zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl overflow-hidden flex items-center justify-center cursor-pointer transition-all duration-200 min-h-48 group ${
            isDragging
              ? 'border-primary bg-primary/10 ring-4 ring-primary/20 scale-[1.01]'
              : preview || videoPreview
                ? 'border-primary/50 bg-black/20 backdrop-blur-sm'
                : 'border-border hover:border-primary/50 hover:bg-muted/30'
          }`}
        >
          {/* Overlay when uploading */}
          {uploading && (
            <div className="absolute inset-0 z-40 bg-black/75 backdrop-blur-md flex flex-col items-center justify-center gap-3 text-white pointer-events-none animate-in fade-in duration-200 px-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center animate-pulse">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
              <div className="text-center w-full max-w-xs">
                <p className="font-bold text-sm text-white">
                  {uploadPhase === 'uploading'
                    ? `Uploading ${mediaType === 'video' ? 'Video' : 'Media'} (${uploadProgress}%)`
                    : 'Applying security & saving post...'}
                </p>
                <div className="w-full bg-zinc-800 rounded-full h-2 my-2 overflow-hidden border border-zinc-700">
                  <div
                    className="bg-primary h-full transition-all duration-300 ease-out rounded-full"
                    style={{ width: `${uploadPhase === 'uploading' ? uploadProgress : 100}%` }}
                  />
                </div>
                <p className="text-xs text-zinc-300">
                  {uploadPhase === 'uploading'
                    ? 'Transferring securely to cloud storage...'
                    : 'Finalizing post metadata and permissions...'}
                </p>
              </div>
            </div>
          )}

          {/* Overlay when dragging over existing preview */}
          {isDragging && (preview || videoPreview) && (
            <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-sm border-2 border-dashed border-primary flex flex-col items-center justify-center text-primary gap-2 pointer-events-none animate-in fade-in duration-200">
              <UploadCloud className="w-12 h-12 animate-bounce" />
              <p className="font-bold text-sm text-white">Drop to replace media</p>
              <p className="text-xs text-muted-foreground">Release your file here</p>
            </div>
          )}

          {videoPreview ? (
            <div className="w-full relative overflow-hidden rounded-xl flex flex-col items-center p-3 bg-zinc-950 border border-zinc-800">
              <div className="relative z-10 w-full flex flex-col items-center">
                <div className="relative w-full flex justify-center">
                  <div className="w-full aspect-video max-h-72 bg-black rounded-lg flex flex-col items-center justify-center relative overflow-hidden border border-white/10 shadow-inner group/video">
                    {/* Real Video Player Preview with controls */}
                    <video
                      src={videoPreview}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-contain bg-black"
                      onClick={(e) => e.stopPropagation()}
                    />

                    {visibility !== 'public' && (
                      <div className="absolute top-2 right-2 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/80 border border-white/20 text-white text-[11px] font-bold shadow-lg pointer-events-none">
                        <Lock className="w-3 h-3 text-red-500" />
                        <span>{visibility === 'ppv' ? `PPV · KES ${price || '0'}` : 'Subscriber-Only'}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-2.5 flex items-center justify-between w-full px-2 text-xs">
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5 truncate max-w-[75%]">
                    <Video className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="truncate">{selectedFile?.name || "Video selected"}</span>
                    {selectedFile ? <span className="text-zinc-400 shrink-0 font-normal">({(selectedFile.size / (1024 * 1024)).toFixed(1)}MB)</span> : ""}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="text-zinc-400 hover:text-white underline cursor-pointer shrink-0 font-medium"
                  >
                    Change video
                  </button>
                </div>
              </div>
            </div>
          ) : preview ? (
            <div className="w-full relative overflow-hidden rounded-xl flex flex-col items-center">
              {/* Blurred ambient backdrop */}
              <div 
                className="absolute inset-0 bg-cover bg-center filter blur-2xl scale-125 opacity-40 pointer-events-none"
                style={{ backgroundImage: `url(${preview})` }}
              />
              <div className="absolute inset-0 bg-black/30 backdrop-blur-sm pointer-events-none" />

              <div className="relative z-10 w-full flex flex-col items-center p-2">
                <div className="relative w-full flex justify-center">
                  <img src={preview} alt="preview" className="w-full max-h-72 object-contain rounded-xl" />
                  {visibility !== 'public' && (
                    <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold shadow-lg">
                      <Lock className="w-3 h-3 text-red-500" />
                      <span>{visibility === 'ppv' ? `PPV · KES ${price || '0'}` : 'Subscriber-Only'}</span>
                    </div>
                  )}
                </div>
                <span className="mt-2 text-xs text-muted-foreground font-medium bg-black/60 px-3 py-1 rounded-full backdrop-blur-md text-white">
                  Click or drag another file to replace
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground text-center p-8 group-hover:text-primary transition-colors">
              <UploadCloud className={`w-10 h-10 mb-2 transition-transform duration-200 ${isDragging ? 'scale-125 text-primary animate-bounce' : ''}`} />
              <p className="font-bold text-sm text-foreground">
                {isDragging ? 'Drop your file now' : 'Click or drag & drop to upload'}
              </p>
              <p className="text-xs">Images (JPEG, PNG, WebP) or Videos (MP4, WebM) — max 500MB</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {/* Caption */}
        <textarea
          value={caption}
          onChange={e => setCaption(e.target.value)}
          rows={2}
          className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none placeholder:text-muted-foreground text-sm resize-none"
          placeholder="Write a caption..."
        />

        <div>
          <label htmlFor="post-visibility" className="block text-xs font-black uppercase tracking-wider text-muted-foreground mb-2">
            Who can view this post?
          </label>
          <select
            id="post-visibility"
            value={visibility}
            onChange={e => setVisibility(e.target.value as typeof visibility)}
            className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm font-bold"
          >
            <option value="public">Public — anyone can view</option>
            <option value="subscribers">Subscribers only — included with subscription</option>
            <option value="ppv">Pay per view — charge separately</option>
          </select>
          <p className="mt-2 text-xs text-muted-foreground">
            Subscriber-only posts are covered by a subscription. PPV posts require a separate purchase.
          </p>
        </div>

        {visibility === 'ppv' && (
          <div className="flex items-center gap-2">
            <span className="bg-muted border border-border rounded-l-xl px-4 py-3 text-muted-foreground text-sm font-bold">KES</span>
            <input
              type="number"
              min="1"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="e.g. 500"
              className="flex-1 bg-muted/30 border border-border rounded-r-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none text-sm"
            />
          </div>
        )}

        {uploadError && (
          <div className="text-red-500 text-sm font-bold bg-red-500/10 rounded-xl px-4 py-3 text-center">
            ❌ {uploadError}
          </div>
        )}

        {success && (
          <div className="text-primary text-sm font-bold bg-primary/10 rounded-xl px-4 py-3 text-center">
            ✅ {statusMessage}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="submit"
            value="published"
            disabled={!selectedFile || uploading}
            className="bg-red-600 hover:bg-red-700 text-white font-black rounded-xl py-3.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-md shadow-red-600/30"
          >
            {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Publish Now'}
          </button>
          <button
            type="submit"
            value="draft"
            disabled={uploading}
            className="bg-muted text-foreground font-bold rounded-xl py-3.5 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" /> Save as Draft
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePostForm;
