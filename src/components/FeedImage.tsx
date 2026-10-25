import { useState, useRef, useEffect } from 'react';
import { ImageOff, Volume2, VolumeX, Play } from 'lucide-react';

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
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isVideo = Boolean(
    src && (src.match(/\.(mp4|webm|mov|m4v)(\?.*)?$/i) || src.startsWith('blob:') && src.includes('video'))
  );

  useEffect(() => {
    if (isVideo && videoRef.current) {
      if (isLocked) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().catch(() => {
          // Autoplay blocked without user interaction (normal on mobile)
          setIsPlaying(false);
        });
      }
    }
  }, [isVideo, isLocked]);

  const togglePlayPause = () => {
    if (isLocked || !videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const nextMute = !isMuted;
    videoRef.current.muted = nextMute;
    setIsMuted(nextMute);
  };

  return (
    <div className="relative w-full bg-zinc-950 overflow-hidden flex items-center justify-center select-none isolate max-h-[680px]">
      {/* Shimmer Skeleton placeholder while downloading */}
      {!isLoaded && !hasError && (
        <div className="w-full aspect-[4/3] sm:aspect-video bg-zinc-900/90 animate-pulse flex flex-col items-center justify-center z-0 py-20">
          <div className="w-12 h-12 rounded-full bg-zinc-800/80 flex items-center justify-center mb-2 shadow-inner">
            <div className="w-6 h-6 border-2 border-red-500/40 border-t-red-500 rounded-full animate-spin" />
          </div>
          <span className="text-zinc-500 text-xs font-semibold tracking-wide">
            {isVideo ? 'Loading video...' : 'Loading media...'}
          </span>
        </div>
      )}

      {/* Error state */}
      {hasError ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-600 gap-2 w-full bg-zinc-900/50">
          <ImageOff className="w-10 h-10 stroke-[1.5]" />
          <span className="text-xs font-medium">Failed to load media</span>
        </div>
      ) : isVideo ? (
        /* Video Post Player */
        <div 
          onClick={togglePlayPause} 
          className="relative w-full flex items-center justify-center cursor-pointer group"
        >
          {/* Subtle Ambient Glow behind video */}
          <div
            className={`absolute inset-0 opacity-40 blur-3xl scale-125 pointer-events-none transition-opacity duration-700 ${
              isLoaded ? 'opacity-40' : 'opacity-0'
            }`}
          />
          <video
            ref={videoRef}
            src={src}
            loop
            playsInline
            muted={isMuted}
            preload={priority ? 'auto' : 'metadata'}
            onLoadedData={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            className={`relative z-10 w-full h-auto max-h-[660px] object-contain transition-all duration-500 ease-out ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            } ${isLocked ? 'filter blur-xl scale-110 opacity-75 pointer-events-none' : ''} ${className}`}
          />

          {/* Play / Pause Center Floating Overlay Button (when user pauses) */}
          {!isLocked && isLoaded && !isPlaying && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 pointer-events-none">
              <div className="w-14 h-14 rounded-full bg-zinc-900/90 border border-white/20 flex items-center justify-center text-white shadow-2xl backdrop-blur-md">
                <Play className="w-6 h-6 fill-white ml-0.5" />
              </div>
            </div>
          )}

          {/* Sound Mute/Unmute Control */}
          {!isLocked && isLoaded && (
            <button
              onClick={toggleMute}
              type="button"
              className="absolute bottom-4 right-4 z-30 p-2.5 rounded-full bg-black/70 border border-white/20 text-white hover:bg-black/90 hover:scale-105 active:scale-95 transition-all shadow-lg backdrop-blur-md cursor-pointer"
              aria-label={isMuted ? 'Unmute video' : 'Mute video'}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-zinc-300" />
              ) : (
                <Volume2 className="w-4 h-4 text-red-500" />
              )}
            </button>
          )}
        </div>
      ) : (
        /* Image Post */
        <>
          {/* Subtle Ambient Glow behind image */}
          <div
            className={`absolute inset-0 opacity-40 blur-3xl scale-125 pointer-events-none transition-opacity duration-700 ${
              isLoaded ? 'opacity-40' : 'opacity-0'
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
            className={`relative z-10 w-full h-auto max-h-[660px] object-contain transition-all duration-500 ease-out ${
              isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.98]'
            } ${isLocked ? 'filter blur-xl scale-110 opacity-75' : ''} ${className}`}
          />
        </>
      )}
    </div>
  );
}
