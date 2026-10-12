import { useState, useRef, useEffect } from 'react';
import { UploadCloud, Lock, Unlock, ImagePlus, Loader2, Video } from 'lucide-react';
import { createPost, uploadFileToSupabase } from '../lib/db';
import { useAuth } from '../context/AuthContext';

interface CreatePostFormProps {
  onPostCreated?: () => void;
}

const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB limit

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
  const [isLocked, setIsLocked] = useState(false);
  const [price, setPrice] = useState('');
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
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

    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setUploadError('Please select a valid image or video file.');
      return;
    }

    if (file.type.startsWith('video/')) {
      if (file.size > MAX_VIDEO_SIZE) {
        setUploadError('Video file exceeds maximum size limit of 50MB.');
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
    if (!user || !selectedFile) return;

    setUploading(true);
    setUploadError(null);
    try {
      let fileToUpload = selectedFile;
      if (mediaType === 'image') {
        fileToUpload = await compressImage(selectedFile);
      }

      // Safe clean filename
      const cleanName = fileToUpload.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `posts/${user.id}/${Date.now()}_${cleanName}`;
      const mediaUrl = await uploadFileToSupabase(fileToUpload, 'hideaway post storage', path);

      if (!mediaUrl) {
        setUploadError('Upload failed. Please check your storage settings or connection.');
        return;
      }

      await createPost(
        user.id,
        caption,
        mediaUrl,
        isLocked,
        isLocked ? parseFloat(price) || 0 : 0,
        mediaType
      );

      setSuccess(true);
      setCaption('');
      setPrice('');
      setIsLocked(false);
      setPreview(null);
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview);
        setVideoPreview(null);
      }
      setSelectedFile(null);
      onPostCreated?.();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setUploadError('An unexpected error occurred while publishing post.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-background border border-border rounded-2xl p-6 mb-8 shadow-sm">
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
                ? 'border-primary/50 bg-black/40'
                : 'border-border hover:border-primary/50 hover:bg-muted/30'
          }`}
        >
          {/* Overlay when dragging over existing preview */}
          {isDragging && (preview || videoPreview) && (
            <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-sm border-2 border-dashed border-primary flex flex-col items-center justify-center text-primary gap-2 pointer-events-none animate-in fade-in duration-200">
              <UploadCloud className="w-12 h-12 animate-bounce" />
              <p className="font-bold text-sm text-white">Drop to replace media</p>
              <p className="text-xs text-muted-foreground">Release your file here</p>
            </div>
          )}

          {videoPreview ? (
            <div className="w-full flex flex-col items-center p-2 relative">
              <video
                src={videoPreview}
                controls
                playsInline
                className="w-full max-h-72 object-contain rounded-lg shadow-md"
              />
              <span className="mt-2 text-xs text-primary font-semibold flex items-center gap-1">
                <Video className="w-3.5 h-3.5" /> Video attached · Click or drag to change
              </span>
            </div>
          ) : preview ? (
            <div className="w-full relative flex flex-col items-center">
              <img src={preview} alt="preview" className="w-full max-h-72 object-cover rounded-xl" />
              <span className="mt-2 text-xs text-muted-foreground font-medium">
                Click or drag another file to replace
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground text-center p-8 group-hover:text-primary transition-colors">
              <UploadCloud className={`w-10 h-10 mb-2 transition-transform duration-200 ${isDragging ? 'scale-125 text-primary animate-bounce' : ''}`} />
              <p className="font-bold text-sm text-foreground">
                {isDragging ? 'Drop your file now' : 'Click or drag & drop to upload'}
              </p>
              <p className="text-xs">Images (JPEG, PNG, WebP) or Videos (MP4, WebM) — max 50MB</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/mp4,video/webm,video/quicktime"
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

        {/* Lock Toggle */}
        <div className="flex items-center justify-between bg-muted/30 rounded-xl px-4 py-3 border border-border">
          <div className="flex items-center gap-2">
            {isLocked ? <Lock className="w-4 h-4 text-primary" /> : <Unlock className="w-4 h-4 text-muted-foreground" />}
            <span className="text-sm font-bold">Pay-Per-View (Locked Post)</span>
          </div>
          <button
            type="button"
            onClick={() => setIsLocked(v => !v)}
            className={`w-11 h-6 rounded-full transition-colors relative ${isLocked ? 'bg-primary' : 'bg-muted'}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${isLocked ? 'left-6' : 'left-1'}`} />
          </button>
        </div>

        {/* Price (shown only if locked) */}
        {isLocked && (
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
            ✅ Post published successfully!
          </div>
        )}

        <button
          type="submit"
          disabled={!selectedFile || uploading}
          className="w-full bg-primary text-primary-foreground font-bold rounded-xl py-3.5 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
        >
          {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : 'Publish Post'}
        </button>
      </form>
    </div>
  );
};

export default CreatePostForm;
