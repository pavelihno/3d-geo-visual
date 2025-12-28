export type ThemeMode = 'light' | 'dark';

type ColorSet = {
  background: string;
  surface: string;
  surfaceMuted: string;
  surfaceSubtle: string;
  border: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  accentSurface: string;
  accentHover: string;
  shadow: string;
  ring: string;
};

type Spacing = {
  layoutX: string;
  layoutY: string;
  gap: string;
  controlPadding: string;
};

type Radii = {
  xl: string;
  lg: string;
  pill: string;
};

type Typography = {
  label: string;
  body: string;
  subtle: string;
  title: string;
  smallCaps: string;
};

export const designTokens: {
  colors: Record<ThemeMode, ColorSet>;
  spacing: Spacing;
  radii: Radii;
  typography: Typography;
} = {
  colors: {
    light: {
      background: 'bg-gradient-to-br from-slate-100 via-white to-blue-50',
      surface: 'bg-white/80',
      surfaceMuted: 'bg-white/60',
      surfaceSubtle: 'bg-slate-50/80',
      border: 'border-white/60',
      borderStrong: 'border-slate-200/70',
      textPrimary: 'text-slate-900',
      textSecondary: 'text-slate-500',
      accent: 'text-blue-600',
      accentSurface: 'bg-blue-600',
      accentHover: 'hover:bg-blue-500',
      shadow: 'shadow-xl shadow-blue-100/50',
      ring: 'focus-visible:ring-blue-500/40',
    },
    dark: {
      background: 'bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950',
      surface: 'bg-slate-900/80',
      surfaceMuted: 'bg-slate-900/60',
      surfaceSubtle: 'bg-slate-800/70',
      border: 'border-slate-800/70',
      borderStrong: 'border-slate-700/70',
      textPrimary: 'text-slate-100',
      textSecondary: 'text-slate-400',
      accent: 'text-sky-300',
      accentSurface: 'bg-sky-500',
      accentHover: 'hover:bg-sky-400',
      shadow: 'shadow-2xl shadow-blue-900/30',
      ring: 'focus-visible:ring-sky-400/40',
    },
  },
  spacing: {
    layoutX: 'px-6 sm:px-7',
    layoutY: 'py-6 sm:py-7',
    gap: 'gap-4 sm:gap-5',
    controlPadding: 'py-3.5 px-4',
  },
  radii: {
    xl: 'rounded-[32px]',
    lg: 'rounded-2xl',
    pill: 'rounded-full',
  },
  typography: {
    label: 'text-[11px] font-black uppercase tracking-[0.18em]',
    body: 'text-sm font-semibold',
    subtle: 'text-xs font-medium',
    title: 'text-xl sm:text-2xl font-black tracking-tight',
    smallCaps: 'text-[10px] font-black uppercase tracking-[0.26em]'
  },
};

export const getThemeClasses = (mode: ThemeMode) => {
  const palette = designTokens.colors[mode];
  return {
    palette,
    panel: `${palette.surface} backdrop-blur-xl ${palette.border} ${designTokens.radii.xl} ${palette.shadow}`,
    softPanel: `${palette.surfaceSubtle} backdrop-blur-lg ${palette.borderStrong} ${designTokens.radii.lg}`,
    button: `transition-all duration-200 active:scale-95 ${palette.shadow} ${designTokens.radii.lg}`,
    textPrimary: palette.textPrimary,
    textSecondary: palette.textSecondary,
    focusRing: `${designTokens.radii.lg} focus-visible:outline-none focus-visible:ring-2 ${palette.ring}`,
    mutedSurface: `${palette.surfaceMuted} ${palette.borderStrong} ${designTokens.radii.lg}`,
  };
};
