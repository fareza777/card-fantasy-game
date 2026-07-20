import { ImageSourcePropType } from 'react-native';

/** Act-level storyboard panels (RPG cinematic). */
export const STORY_ACT_ART: Record<'I' | 'II' | 'III', ImageSourcePropType> = {
  I: require('../../assets/story/story-act-i.jpg'),
  II: require('../../assets/story/story-act-ii.jpg'),
  III: require('../../assets/story/story-act-iii.jpg'),
};

/** Optional per-chapter panels (falls back to act art). */
export const STORY_CHAPTER_ART: Partial<Record<string, ImageSourcePropType>> = {
  'origins-01': require('../../assets/story/story-ch-01.jpg'),
  'origins-03': require('../../assets/story/story-ch-03.jpg'),
  'origins-08': require('../../assets/story/story-ch-08.jpg'),
};

export function getStoryArtForAct(act: 'I' | 'II' | 'III'): ImageSourcePropType {
  return STORY_ACT_ART[act];
}

export function getStoryArtForChapter(
  chapterId: string,
  act: 'I' | 'II' | 'III',
): ImageSourcePropType {
  return STORY_CHAPTER_ART[chapterId] ?? STORY_ACT_ART[act];
}
