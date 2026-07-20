import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
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
import { RootStackParamList } from '../navigation/types';
import { CardZoomModal } from '../components/CardZoomModal';
import { CardDef } from '../types/card';
import { useGameStore, validateDeck } from '../store/gameStore';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const { width: SCREEN_W } = Dimensions.get('window');
const PANEL_H = Math.min(280, Math.round(SCREEN_W * 0.72));

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
      <LinearGradient colors={['#0A0C10EE', '#0C1018CC', '#0A0C10F2']} style={StyleSheet.absoluteFill} />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: Math.max(insets.bottom, 24) + 20,
          paddingHorizontal: 18,
        }}
      >
        <Text style={styles.kicker}>ORIGINS SET · CAMPAIGN</Text>
        <Text style={styles.title}>Story</Text>
        <Text style={styles.lead}>{ORIGINS_PROLOGUE.split('\n\n')[0]}</Text>

        {(['I', 'II', 'III'] as const).map((act) => {
          const actChapters = STORY_CHAPTERS.filter((c) => c.act === act);
          const actClearedCount = actChapters.filter((c) => storyCleared.includes(c.id)).length;
          return (
            <View key={act} style={styles.actBlock}>
              <Text style={styles.actLabel}>{STORY_ACTS[act].label}</Text>
              <Text style={styles.actDesc}>{STORY_ACTS[act].description}</Text>
              <Text style={styles.actProgress}>
                {actClearedCount}/{actChapters.length} cleared in this act
              </Text>
              {actChapters.map((c) => {
                const sc = getScenario(c.id);
                const cleared = storyCleared.includes(c.id);
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => openChapter(c)}
                    style={({ pressed }) => [styles.chapterRow, pressed && { opacity: 0.85 }]}
                  >
                    <View style={[styles.chapterAccent, cleared && { backgroundColor: palette.success }]} />
                    <View style={{ flex: 1 }}>
                      <View style={styles.chapterTitleRow}>
                        <Text style={styles.chapterTitle}>{c.title}</Text>
                        {cleared && <Text style={styles.clearedBadge}>✓ Cleared</Text>}
                      </View>
                      <Text style={styles.chapterSub}>
                        {sc ? `Scenario · ${sc.foeName}` : c.subtitle}
                      </Text>
                    </View>
                    <Text style={styles.chev}>›</Text>
                  </Pressable>
                );
              })}
            </View>
          );
        })}

        <Text style={styles.factionHead}>Essence Lore</Text>
        {(Object.keys(FACTION_LORE) as (keyof typeof FACTION_LORE)[]).map((f) => (
          <View key={f} style={[styles.factionCard, { borderColor: factionColors[f].main + '66' }]}>
            <Text style={[styles.factionName, { color: factionColors[f].main }]}>{f}</Text>
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
    <View style={[styles.root, { backgroundColor: '#0A0C10' }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: Math.max(insets.bottom, 20) + 24,
          paddingHorizontal: 18,
        }}
      >
        <Pressable onPress={retreat} style={styles.back}>
          <Text style={styles.backText}>{beat > 0 ? '← Previous' : '← Story'}</Text>
        </Pressable>

        <Text style={styles.actTiny}>{STORY_ACTS[chapter.act].label}</Text>
        <Text style={styles.readTitle}>{chapter.title}</Text>
        <Text style={styles.readSub}>{chapter.subtitle}</Text>

        <View style={styles.panelFrame}>
          <Image source={art} style={styles.panelArt} resizeMode="cover" />
          <LinearGradient
            colors={['transparent', '#0A0C10EE']}
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
          <View style={styles.beatBox}>
            <Text style={styles.beatKicker}>Chapter opens</Text>
            <Text style={styles.para}>
              Tap Continue to walk this chapter scene by scene — like an RPG storyboard, not a scroll of walls of text.
            </Text>
          </View>
        )}

        {current.kind === 'panel' && (
          <View style={styles.beatBox}>
            <Text style={styles.beatKicker}>Beat {current.index + 1}</Text>
            <Text style={styles.para}>{current.text}</Text>
          </View>
        )}

        {current.kind === 'epilogue' && (
          <>
            {scenario && (
              <View style={styles.scenarioBox}>
                <Text style={styles.scenarioLabel}>Scenario battle</Text>
                <Text style={styles.scenarioFoe}>{scenario.foeName}</Text>
                <Text style={styles.scenarioBrief}>{scenario.briefing}</Text>
                <Text style={styles.scenarioReward}>
                  Reward {scenario.rewardGold} gold{cleared ? ' · cleared' : ''}
                </Text>
                <Pressable onPress={beginScenario} style={styles.scenarioBtn}>
                  <Text style={styles.scenarioBtnText}>
                    {cleared ? 'Replay Scenario' : 'Begin Scenario'}
                  </Text>
                </Pressable>
              </View>
            )}

            {!!chapter.unlockHint && (
              <View style={styles.hintBox}>
                <Text style={styles.hintLabel}>Vault note</Text>
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
            <Pressable onPress={advance} style={styles.continueBtn}>
              <Text style={styles.continueText}>Continue ›</Text>
            </Pressable>
          ) : (
            <Pressable onPress={onBack} style={styles.continueBtnGhost}>
              <Text style={styles.continueTextGhost}>Return to Story</Text>
            </Pressable>
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

const DISPLAY = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

const styles = StyleSheet.create({
  root: { flex: 1 },
  kicker: {
    color: palette.gold,
    letterSpacing: 2.5,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  title: {
    color: palette.text,
    fontSize: 32,
    fontFamily: DISPLAY,
    fontWeight: '700',
    marginBottom: 12,
  },
  lead: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 22,
    fontFamily: DISPLAY,
  },
  actBlock: { marginBottom: 22 },
  actLabel: { color: palette.goldBright, fontSize: 13, fontWeight: '800', marginBottom: 4 },
  actDesc: { color: palette.textMuted, fontSize: 12, marginBottom: 4, lineHeight: 17 },
  actProgress: {
    color: palette.gold,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  chapterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121820EE',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A3344',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  chapterAccent: {
    width: 3,
    height: 28,
    borderRadius: 2,
    backgroundColor: palette.gold,
    marginRight: 12,
  },
  chapterTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  chapterTitle: { color: palette.text, fontSize: 15, fontWeight: '800' },
  clearedBadge: {
    color: palette.success,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  chapterSub: { color: palette.textMuted, fontSize: 11, marginTop: 2 },
  chev: { color: palette.gold, fontSize: 22, marginLeft: 8 },
  factionHead: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 10,
    fontFamily: DISPLAY,
  },
  factionCard: {
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: '#10141ACC',
    padding: 12,
    marginBottom: 8,
  },
  factionName: { fontWeight: '800', fontSize: 13, marginBottom: 4, letterSpacing: 1 },
  factionBody: { color: palette.textMuted, fontSize: 12, lineHeight: 18 },
  back: { marginBottom: 10 },
  backText: { color: palette.gold, fontWeight: '700', fontSize: 14 },
  actTiny: { color: palette.gold, fontSize: 11, fontWeight: '700', marginBottom: 4 },
  readTitle: {
    color: palette.text,
    fontSize: 26,
    fontFamily: DISPLAY,
    fontWeight: '700',
    marginBottom: 4,
  },
  readSub: { color: palette.textMuted, fontSize: 13, marginBottom: 12, fontStyle: 'italic' },
  panelFrame: {
    height: PANEL_H,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#3A3428',
    marginBottom: 14,
    backgroundColor: '#080A0E',
  },
  panelArt: { width: '100%', height: '100%' },
  panelFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 72 },
  panelBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#0A0C10CC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.gold + '66',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  panelBadgeText: {
    color: palette.gold,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  beatBox: {
    backgroundColor: '#12161CEE',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A3344',
    padding: 14,
    marginBottom: 12,
  },
  beatKicker: {
    color: palette.gold,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  para: {
    color: '#E8E0D4',
    fontSize: 15,
    lineHeight: 24,
    fontFamily: DISPLAY,
  },
  hintBox: {
    backgroundColor: '#1A160C',
    borderColor: palette.gold + '66',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginVertical: 8,
  },
  hintLabel: { color: palette.gold, fontSize: 11, fontWeight: '800', marginBottom: 4 },
  hintBody: { color: palette.textMuted, fontSize: 12, lineHeight: 17 },
  scenarioBox: {
    marginVertical: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C44536AA',
    backgroundColor: '#1A1014EE',
  },
  scenarioLabel: {
    color: '#E8A090',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  scenarioFoe: { color: palette.text, fontSize: 18, fontWeight: '800', marginBottom: 6 },
  scenarioBrief: { color: palette.textMuted, fontSize: 13, lineHeight: 19, marginBottom: 8 },
  scenarioReward: { color: palette.gold, fontSize: 12, marginBottom: 12 },
  scenarioBtn: {
    backgroundColor: '#C44536',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  scenarioBtnText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  linkedHead: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 8,
  },
  linkedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  linkChip: {
    backgroundColor: '#1A2030',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3A4458',
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: '48%',
  },
  linkChipText: { color: palette.text, fontSize: 12, fontWeight: '600' },
  storyNav: { marginTop: 16, alignItems: 'center', gap: 12 },
  continueBtn: {
    backgroundColor: palette.gold,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    minWidth: '70%',
    alignItems: 'center',
  },
  continueText: { color: '#1A1200', fontWeight: '900', fontSize: 16 },
  continueBtnGhost: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    minWidth: '70%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.gold + '88',
  },
  continueTextGhost: { color: palette.gold, fontWeight: '800', fontSize: 15 },
  dots: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center' },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#3A4250',
  },
  dotHot: { backgroundColor: palette.gold, width: 16 },
});
