import { TextStyle } from 'react-native';
import { palette } from './colors';

/**
 * Rune Vault typography.
 *
 * Display: Cinzel — engraved fantasy serif for titles, buttons, card names.
 * UI: Inter — clean sans for body, stats, metadata.
 */
export const fonts = {
  display: 'Cinzel_700Bold',
  displayBlack: 'Cinzel_900Black',
  displayMedium: 'Cinzel_500Medium',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;

/** Shared text presets. Spread into styles: `...type.kicker` */
export const type = {
  /** Tiny uppercase gold label above titles. */
  kicker: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    letterSpacing: 2.6,
    textTransform: 'uppercase',
    color: palette.gold,
  } as TextStyle,
  /** Giant Cinzel hero title. */
  display: {
    fontFamily: fonts.displayBlack,
    fontSize: 40,
    letterSpacing: 1.5,
    color: palette.text,
  } as TextStyle,
  /** Screen title. */
  title: {
    fontFamily: fonts.display,
    fontSize: 26,
    letterSpacing: 1,
    color: palette.text,
  } as TextStyle,
  /** Section heading. */
  heading: {
    fontFamily: fonts.display,
    fontSize: 17,
    letterSpacing: 0.6,
    color: palette.text,
  } as TextStyle,
  /** Standard body copy. */
  body: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: palette.text,
  } as TextStyle,
  /** Muted helper / meta text. */
  caption: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    lineHeight: 17,
    color: palette.textMuted,
  } as TextStyle,
  /** Numbers and short stat values. */
  stat: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: palette.text,
  } as TextStyle,
  /** Primary button label — small-caps Cinzel. */
  button: {
    fontFamily: fonts.display,
    fontSize: 15,
    letterSpacing: 1.2,
    color: '#1A1200',
  } as TextStyle,
  /** Secondary / ghost button label. */
  buttonGhost: {
    fontFamily: fonts.display,
    fontSize: 14,
    letterSpacing: 1,
    color: palette.gold,
  } as TextStyle,
};
