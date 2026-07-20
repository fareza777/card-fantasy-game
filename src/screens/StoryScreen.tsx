import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ImageBackground,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  FACTION_LORE,
  ORIGINS_PROLOGUE,
  STORY_ACTS,
  STORY_CHAPTERS,
  StoryChapter,
  getChapter,
} from '../data/story';
import { getStoryArtForChapter } from '../data/storyArt';
import { getScenario } from '../data/storyScenarios';
import { getCard } from '../engine/cardDb';
import { palette, factionColors } from '../theme/colors';
import { type, fonts } from '../theme/typography';
import { radii, shadows } from '../theme/tokens';
import { RootStackParamList } from '../navigation/types';
import { CardZoomModal } from '../components/CardZoomModal';
import { VaultButton } from '../components/VaultButton';
import { Panel } from '../components/Panel';
import { ScreenHeader } from '../components/ScreenHeader';
import { Icon, IconName } from '../components/Icon';
import { CardDef } from '../types/card';
import { useGameStore, validateDeck } from '../store/gameStore';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const { width: SCREEN_W } = Dimensions.get('window');
const PANEL_H = Math.min(280, Math.round(SCREEN_W * 0.72));

const FACTION_ICONS: Record<string, IconName> = {
  Dawn: 'dawn',
  Tide: 'tide',
  Shade: 'shade',
  Ember: 'ember',
  Thorn: 'thorn',
  Neutral: 'neutral',
};

export function StoryScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [openId, setOpenId] = useState<string | null>(null);
  const storyCleared = useGameStore((s) => s.storyCleared);
  const chapter = openId ? getChapter(openId) : null;

  const openChapter = (c: StoryChapter) => {
    const idx = STORY_CHAPTERS.findIndex((x) => x.id === c.id);
    const prev = idx > 0 ? STORY_CHAPTERS[idx - 1] : null;
    if (idx > 0 && prev && !storyCleared.includes(prev.id)) {
      Alert.alert(
        'Story locked',
        `Recommended: clear "${prev.title}" first for context. You may still continue.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue anyway', onPress: () => setOpenId(c.id) },
        ],
      );
      return;
    }
    setOpenId(c.id);
  };

  if (chapter) {
    return (
      <ChapterReader
        chapter={chapter}
        onBack={() => setOpenId(null)}
        onCard={(id) => nav.navigate('CardDetail', { cardId: id })}
        onBattle={() => nav.navigate('Battle')}
      />
    );
  }

  return (
    <ImageBackground
      source={require('../../assets/ui/bg-home-vault.png')}
      style={styles.root}
      imageStyle={{ opacity: 0.35 }}
    >
      <LinearGradient
        colors={['rgba(7,10,15,0.88)', 'rgba(9,12,18,0.82)', 'rgba(7,10,15,0.96)']}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: Math.max(insets.bottom, 24) + 20,
          paddingHorizontal: 18,
        }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader kicker="ORIGINS SET · CAMPAIGN" title="Story" />
        <Text style={styles.lead}>{ORIGINS_PROLOGUE.split('\n\n')[0]}</Text>

        {(['I', 'II', 'III'] as const).map((act) => {
          const actChapters = STORY_CHAPTERS.filter((c) => c.act === act);
          const actClearedCount = actChapters.filter((c) => storyCleared.includes(c.id)).length;
          const actDone = actClearedCount === actChapters.length;
          return (
            <View key={act} style={styles.actBlock}>
              <View style={styles.actHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actLabel}>{STORY_ACTS[act].label}</Text>
                  <Text style={styles.actDesc}>{STORY_ACTS[act].description}</Text>
                </View>
                <View style={[styles.actProgressPill, actDone && styles.actProgressPillDone]}>
                  {actDone && <Icon name="check" size={10} color="#9EE8C4" />}
                  <Text style={[styles.actProgress, actDone && { color: '#9EE8C4' }]}>
                    {actClearedCount}/{actChapters.length}
                  </Text>
                </View>
              </View>
              {actChapters.map((c) => {
                const sc = getScenario(c.id);
                const cleared = storyCleared.includes(c.id);
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => openChapter(c)}
                    style={({ pressed }) => [styles.chapterRow, pressed && { opacity: 0.88 }]}
                  >
                    <LinearGradient
                      colors={['rgba(30,39,56,0.9)', 'rgba(16,21,30,0.94)']}
                      style={StyleSheet.absoluteFill}
                    />
                    <View style={[styles.chapterAccent, cleared && { backgroundColor: palette.success }]} />
                    <View style={{ flex: 1 }}>
                      <View style={styles.chapterTitleRow}>
                        <Text style={styles.chapterTitle}>{c.title}</Text>
                        {cleared && (
                          <View style={styles.clearedBadge}>
                            <Icon name="check" size={9} color="#9EE8C4" />
                            <Text style={styles.clearedBadgeText}>Cleared</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.chapterSub}>
                        {sc ? `Scenario · ${sc.foeName}` : c.subtitle}
                      </Text>
                    </View>
                    <Icon name="forward" size={16} color={palette.goldDim} />
                  </Pressable>
                );
              })}
            </View>
          );
        })}

        <Text style={styles.factionHead}>Essence Lore</Text>
        {(Object.keys(FACTION_LORE) as (keyof typeof FACTION_LORE)[]).map((f) => (
          <View key={f} style={[styles.factionCard, { borderColor: factionColors[f].main + '55' }]}>
            <View style={styles.factionTitleRow}>
              <Icon name={FACTION_ICONS[f]} size={14} color={factionColors[f].main} />
              <Text style={[styles.factionName, { color: factionColors[f].main }]}>{f}</Text>
            </View>
            <Text style={styles.factionBody}>{FACTION_LORE[f]}</Text>
          </View>
        ))}
      </ScrollView>
    </ImageBackground>
  );
}

type Beat =
  | { kind: 'title' }
  | { kind: 'panel'; text: string; index: number; total: number }
  | { kind: 'epilogue' };

function ChapterReader({
  chapter,
  onBack,
  onCard,
  onBattle,
}: {
  chapter: StoryChapter;
  onBack: () => void;
  onCard: (id: string) => void;
  onBattle: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [zoom, setZoom] = useState<CardDef | null>(null);
  const [beat, setBeat] = useState(0);
  const startBattle = useGameStore((s) => s.startBattle);
  const deck = useGameStore((s) => s.deck);
  const owned = useGameStore((s) => s.owned);
  const storyCleared = useGameStore((s) => s.storyCleared);
  const scenario = getScenario(chapter.id);
  const cleared = storyCleared.includes(chapter.id);
  const linked = useMemo(
    () => chapter.linkedCardIds.map((id) => getCard(id)).filter(Boolean),
    [chapter],
  );
  const art = getStoryArtForChapter(chapter.id, chapter.act);

  const beats: Beat[] = useMemo(() => {
    const pages: Beat[] = [{ kind: 'title' }];
    chapter.body.forEach((text, index) => {
      pages.push({ kind: 'panel', text, index, total: chapter.body.length });
    });
    pages.push({ kind: 'epilogue' });
    return pages;
  }, [chapter]);

  const current = beats[Math.min(beat, beats.length - 1)];
  const atEnd = beat >= beats.length - 1;

  const beginScenario = () => {
    if (!scenario) return;
    const err = validateDeck(deck, owned);
    if (err) {
      Alert.alert('Deck not ready', err);
      return;
    }
    const ok = startBattle({
      enemyDeck: scenario.enemyDeck,
      scenarioId: scenario.chapterId,
      foeName: scenario.foeName,
    });
    if (!ok) {
      Alert.alert('Cannot start', 'Scenario battle failed to start.');
      return;
    }
    onBattle();
  };

  const advance = () => {
    if (!atEnd) setBeat((b) => Math.min(b + 1, beats.length - 1));
  };

  const retreat = () => {
    if (beat > 0) setBeat((b) => b - 1);
    else onBack();
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.bgDeep }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: Math.max(insets.bottom, 20) + 24,
          paddingHorizontal: 18,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={retreat} style={styles.back} hitSlop={8}>
          <Icon name="back" size={15} color={palette.gold} />
          <Text style={styles.backText}>{beat > 0 ? 'Previous' : 'Story'}</Text>
        </Pressable>

        <Text style={type.kicker}>{STORY_ACTS[chapter.act].label}</Text>
        <Text style={styles.readTitle}>{chapter.title}</Text>
        <Text style={styles.readSub}>{chapter.subtitle}</Text>

        <View style={styles.panelFrame}>
          <Image source={art} style={styles.panelArt} resizeMode="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(7,10,15,0.92)']}
            style={styles.panelFade}
            pointerEvents="none"
          />
          <View style={styles.panelBadge}>
            <Text style={styles.panelBadgeText}>
              {current.kind === 'title'
                ? 'Scene 0'
                : current.kind === 'panel'
                  ? `Scene ${current.index + 1}/${current.total}`
                  : 'Aftermath'}
            </Text>
          </View>
        </View>

        {current.kind === 'title' && (
          <Panel style={styles.beatBox}>
            <Text style={styles.beatKicker}>CHAPTER OPENS</Text>
            <Text style={styles.para}>
              Tap Continue to walk this chapter scene by scene — like an RPG storyboard, not a
              scroll of walls of text.
            </Text>
          </Panel>
        )}

        {current.kind === 'panel' && (
          <Panel style={styles.beatBox}>
            <Text style={styles.beatKicker}>BEAT {current.index + 1}</Text>
            <Text style={styles.para}>{current.text}</Text>
          </Panel>
        )}

        {current.kind === 'epilogue' && (
          <>
            {scenario && (
              <View style={styles.scenarioBox}>
                <Text style={styles.scenarioLabel}>SCENARIO BATTLE</Text>
                <Text style={styles.scenarioFoe}>{scenario.foeName}</Text>
                <Text style={styles.scenarioBrief}>{scenario.briefing}</Text>
                <View style={styles.scenarioRewardRow}>
                  <Icon name="gold" size={12} color={palette.goldBright} />
                  <Text style={styles.scenarioReward}>
                    Reward {scenario.rewardGold} gold{cleared ? ' · cleared' : ''}
                  </Text>
                </View>
                <Pressable
                  onPress={beginScenario}
                  style={({ pressed }) => [styles.scenarioBtn, pressed && { opacity: 0.9 }]}
                >
                  <LinearGradient
                    colors={['#D8553F', '#A83224']}
                    style={[StyleSheet.absoluteFill, { borderRadius: radii.md }]}
                  />
                  <Icon name="battle" size={15} color="#FFF" />
                  <Text style={styles.scenarioBtnText}>
                    {cleared ? 'Replay Scenario' : 'Begin Scenario'}
                  </Text>
                </Pressable>
              </View>
            )}

            {!!chapter.unlockHint && (
              <View style={styles.hintBox}>
                <Text style={styles.hintLabel}>VAULT NOTE</Text>
                <Text style={styles.hintBody}>{chapter.unlockHint}</Text>
              </View>
            )}
            <Text style={styles.linkedHead}>Linked cards</Text>
            <View style={styles.linkedRow}>
              {linked.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => onCard(c.id)}
                  onLongPress={() => setZoom(c)}
                  delayLongPress={280}
                  style={styles.linkChip}
                >
                  <Icon name="cards" size={11} color={palette.goldDim} />
                  <Text style={styles.linkChipText} numberOfLines={1}>
                    {c.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <View style={styles.storyNav}>
          {!atEnd ? (
            <VaultButton label="Continue" icon="forward" onPress={advance} style={styles.continueBtn} />
          ) : (
            <VaultButton
              label="Return to Story"
              variant="secondary"
              onPress={onBack}
              style={styles.continueBtn}
            />
          )}
          <View style={styles.dots}>
            {beats.map((_, i) => (
              <View key={i} style={[styles.dot, i === beat && styles.dotHot]} />
            ))}
          </View>
        </View>
      </ScrollView>
      <CardZoomModal card={zoom} visible={!!zoom} onClose={() => setZoom(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  lead: {
    fontFamily: fonts.displayMedium,
    color: '#CFC6B2',
    fontSize: 14.5,
    lineHeight: 23,
    marginBottom: 24,
  },
  actBlock: { marginBottom: 24 },
  actHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  actLabel: { ...type.heading, color: palette.goldBright, fontSize: 15, marginBottom: 3 },
  actDesc: { ...type.caption, fontSize: 12, lineHeight: 17 },
  actProgressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(212,168,75,0.35)',
    backgroundColor: 'rgba(212,168,75,0.08)',
  },
  actProgressPillDone: {
    borderColor: 'rgba(61,139,110,0.5)',
    backgroundColor: 'rgba(61,139,110,0.10)',
  },
  actProgress: { fontFamily: fonts.bodyBold, color: palette.gold, fontSize: 11 },
  chapterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(120,140,170,0.16)',
    paddingVertical: 13,
    paddingHorizontal: 13,
    marginBottom: 8,
    overflow: 'hidden',
    gap: 12,
  },
  chapterAccent: { width: 3, height: 30, borderRadius: 2, backgroundColor: palette.gold },
  chapterTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  chapterTitle: { fontFamily: fonts.display, color: palette.text, fontSize: 15, letterSpacing: 0.3 },
  clearedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(61,139,110,0.45)',
    backgroundColor: 'rgba(61,139,110,0.10)',
  },
  clearedBadgeText: {
    color: '#9EE8C4',
    fontSize: 9.5,
    fontFamily: fonts.bodySemi,
    letterSpacing: 0.4,
  },
  chapterSub: { ...type.caption, fontSize: 11, marginTop: 2 },
  factionHead: { ...type.heading, marginTop: 6, marginBottom: 12 },
  factionCard: {
    borderWidth: 1,
    borderRadius: radii.md,
    backgroundColor: 'rgba(16,20,26,0.8)',
    padding: 13,
    marginBottom: 8,
  },
  factionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  factionName: { fontFamily: fonts.bodyBold, fontSize: 12.5, letterSpacing: 1.6, textTransform: 'uppercase' },
  factionBody: { ...type.caption, fontSize: 12, lineHeight: 18 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 12, alignSelf: 'flex-start' },
  backText: { fontFamily: fonts.bodySemi, color: palette.gold, fontSize: 14 },
  readTitle: {
    fontFamily: fonts.displayBlack,
    color: palette.text,
    fontSize: 26,
    letterSpacing: 0.8,
    marginTop: 6,
    marginBottom: 4,
  },
  readSub: { ...type.caption, fontSize: 13, marginBottom: 14, fontStyle: 'italic' },
  panelFrame: {
    height: PANEL_H,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212,168,75,0.25)',
    marginBottom: 14,
    backgroundColor: '#080A0E',
    ...shadows.cardLift,
  },
  panelArt: { width: '100%', height: '100%' },
  panelFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 72 },
  panelBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(7,10,15,0.8)',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(212,168,75,0.4)',
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  panelBadgeText: {
    color: palette.gold,
    fontSize: 10,
    fontFamily: fonts.bodyBold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  beatBox: { padding: 15, marginBottom: 12 },
  beatKicker: { ...type.kicker, fontSize: 10, marginBottom: 8 },
  para: {
    fontFamily: fonts.body,
    color: '#E8E0D4',
    fontSize: 15,
    lineHeight: 24,
  },
  hintBox: {
    backgroundColor: 'rgba(26,22,12,0.9)',
    borderColor: 'rgba(212,168,75,0.4)',
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 13,
    marginVertical: 8,
  },
  hintLabel: { ...type.kicker, fontSize: 10, marginBottom: 5 },
  hintBody: { ...type.caption, fontSize: 12, lineHeight: 17 },
  scenarioBox: {
    marginVertical: 8,
    padding: 15,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(196,69,54,0.55)',
    backgroundColor: 'rgba(26,16,20,0.92)',
  },
  scenarioLabel: {
    color: '#E8A090',
    fontSize: 10.5,
    fontFamily: fonts.bodySemi,
    letterSpacing: 1.6,
    marginBottom: 7,
  },
  scenarioFoe: {
    fontFamily: fonts.display,
    color: palette.text,
    fontSize: 19,
    letterSpacing: 0.5,
    marginBottom: 7,
  },
  scenarioBrief: { ...type.caption, fontSize: 13, lineHeight: 19, marginBottom: 10 },
  scenarioRewardRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  scenarioReward: { fontFamily: fonts.bodySemi, color: palette.goldBright, fontSize: 12.5 },
  scenarioBtn: {
    flexDirection: 'row',
    borderRadius: radii.md,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  scenarioBtnText: {
    color: '#FFF',
    fontFamily: fonts.display,
    fontSize: 15,
    letterSpacing: 0.8,
  },
  linkedHead: { ...type.heading, fontSize: 14, marginTop: 12, marginBottom: 10 },
  linkedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  linkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(26,32,48,0.9)',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(120,140,170,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    maxWidth: '48%',
  },
  linkChipText: { fontFamily: fonts.bodyMedium, color: palette.text, fontSize: 12 },
  storyNav: { marginTop: 18, alignItems: 'center', gap: 14 },
  continueBtn: { minWidth: '72%', alignSelf: 'center' },
  dots: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3A4250' },
  dotHot: { backgroundColor: palette.gold, width: 18 },
});
