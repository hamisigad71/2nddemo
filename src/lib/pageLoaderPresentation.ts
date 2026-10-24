export type LoaderTheme = 'light' | 'dark';

export interface PageLoaderPresentation {
  mobileBackdrop: string;
  surface: string;
  title: string;
  subtitle: string;
  progressTrack: string;
  progressText: string;
  bottomTagline: string;
  showMobilePhoto: boolean;
}

export const getPageLoaderPresentation = (theme: LoaderTheme): PageLoaderPresentation => {
  if (theme === 'light') {
    return {
      mobileBackdrop: 'md:hidden absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,#FFFFFF_0%,#F7F5F7_55%,#F0E9EF_100%)]',
      surface: 'rounded-[2rem] border border-white/90 bg-white/85 px-7 py-9 shadow-[0_24px_80px_rgba(39,35,43,0.12)] backdrop-blur-xl md:rounded-none md:border-0 md:bg-transparent md:px-0 md:py-0 md:shadow-none md:backdrop-blur-none',
      title: 'text-[#27232B] md:text-foreground',
      subtitle: 'text-[#756B76] md:text-muted-foreground',
      progressTrack: 'border border-[#E8E1E6] bg-[#F1EDF0]',
      progressText: 'text-[#756B76] md:text-muted-foreground',
      bottomTagline: 'text-[#756B76] md:text-muted-foreground',
      showMobilePhoto: false,
    };
  }

  return {
    mobileBackdrop: '',
    surface: '',
    title: 'text-white',
    subtitle: 'text-white/80',
    progressTrack: 'border border-white/5 bg-white/10 backdrop-blur-md',
    progressText: 'text-primary',
    bottomTagline: 'text-white/60',
    showMobilePhoto: true,
  };
};
