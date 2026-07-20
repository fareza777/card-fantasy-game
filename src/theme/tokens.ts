import { ViewStyle } from 'react-native';
import { palette } from './colors';

export const radii = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
} as const;

/** Standard animation durations (ms). */
export const motion = {
  fast: 140,
  med: 240,
  slow: 420,
} as const;

/** Shadow presets — warm-tinted, never pure black on blue. */
export const shadows = {
  /** Soft gold glow for primary CTAs and legendary accents. */
  goldGlow: {
    shadowColor: palette.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  } as ViewStyle,
  /** Elevated card/panel sitting above the background. */
  cardLift: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  } as ViewStyle,
  /** Deep ambient shadow for modals and floating docks. */
  deep: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 16,
  } as ViewStyle,
};

/** Translucent overlays used for scrims and glass panels. */
export const overlays = {
  scrimSoft: 'rgba(7, 10, 15, 0.55)',
  scrimHeavy: 'rgba(7, 10, 15, 0.82)',
  glassPanel: 'rgba(20, 26, 36, 0.78)',
  glassBorder: 'rgba(212, 168, 75, 0.22)',
} as const;
