import { useState } from 'react';
import { ImageOff } from 'lucide-react';

interface FeedImageProps {
  src: string;
  alt?: string;
  priority?: boolean;
  isLocked?: boolean;
  className?: string;
}

export default function FeedImage({
  src,
  alt = 'post media',
  priority = false,
  isLocked = false,
  className = '',
}: FeedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div className="relative w-full bg-zinc-950 overflow-hidden min-h-[320px] sm:min-h-[400px] max-h-[650px] flex items-center justify-center">
      {/* Shimmer Skeleton placeholder while downloading */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-zinc-900 animate-pulse flex flex-col items-center justify-center z-0">
          <div className="w-12 h-12 rounded-full bg-zinc-800/80 flex items-center justify-center mb-2">
            <div className="w-6 h-6 border-2 border-red-500/40 border-t-red-500 rounded-full animate-spin" />
          </div>
          <span className="text-zinc-600 text-xs font-medium tracking-wide">Loading media...</span>
        </div>
      )}

      {/* Error state */}
      {hasError ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-600 gap-2">
          <ImageOff className="w-10 h-10 stroke-[1.5]" />
          <span className="text-xs">Failed to load media</span>
        </div>
      ) : (
        <>
          {/* Subtle Ambient Glow behind image */}
          <div
            className={`absolute inset-0 opacity-30 blur-2xl scale-105 pointer-events-none transition-opacity duration-700 ${
              isLoaded ? 'opacity-30' : 'opacity-0'
            }`}
            style={{
              backgroundImage: `url(${src})`,
              backgroundPosition: 'center',
              backgroundSize: 'cover',
            }}
          />

          <img
            src={src}
            alt={alt}
            referrerPolicy="no-referrer"
            loading={priority ? 'eager' : 'lazy'}
            decoding={priority ? 'sync' : 'async'}
            fetchPriority={priority ? 'high' : 'auto'}
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            className={`relative z-10 w-full object-cover max-h-[600px] transition-all duration-500 ease-out ${
              isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.98]'
            } ${isLocked ? 'filter blur-lg scale-105 opacity-80' : ''} ${className}`}
          />
        </>
      )}
    </div>
  );
}
