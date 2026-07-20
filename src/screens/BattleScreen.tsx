import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Platform,
  Animated,
  Dimensions,
  Modal,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { tryGetCard, totalCost } from '../engine/cardDb';
import { CardView } from '../components/CardView';
import { CardZoomModal } from '../components/CardZoomModal';
import { useGameStore } from '../store/gameStore';
import { palette, factionColors } from '../theme/colors';
import { CardDef, FieldPermanent, FieldUnit } from '../types/card';
import { STEP_LABELS, canPlayType } from '../types/battleFlow';

const { width: SCREEN_W } = Dimensions.get('window');
const DISPLAY = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const UI = Platform.select({ ios: 'Avenir Next', android: 'sans-serif-medium', default: 'System' });

const PHASE_TRACK: { key: string; label: string; match: (p: string) => boolean }[] = [
  { key: 'ready', label: 'Ready', match: (p) => p === 'untap' || p === 'upkeep' },
  { key: 'draw', label: 'Draw', match: (p) => p === 'draw' },
  { key: 'main1', label: 'Main 1', match: (p) => p === 'main1' },
  { key: 'combat', label: 'Combat', match: (p) => p.startsWith('combat') },
  { key: 'main2', label: 'Main 2', match: (p) => p === 'main2' },
  { key: 'end', label: 'End', match: (p) => p === 'end' || p === 'cleanup' || p === 'gameover' },
];

function essenceTotal(e: { dawn: number; tide: number; shade: number; ember: number; thorn: number; any: number }) {
  return e.dawn + e.tide + e.shade + e.ember + e.thorn + e.any;
}

function PhaseTrack({ phase }: { phase: string }) {
  return (
    <View style={styles.phaseTrack}>
      {PHASE_TRACK.map((step, i) => {
        const active = step.match(phase);
        return (
          <React.Fragment key={step.key}>
            {i > 0 && <View style={[styles.phaseRail, active && styles.phaseRailHot]} />}
            <View style={[styles.phaseStep, active && styles.phaseStepActive]}>
              <Text style={[styles.phaseStepText, active && styles.phaseStepTextActive]}>{step.label}</Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

function LifeStat({ life, foe }: { life: number; foe?: boolean }) {
  return (
    <View style={[styles.lifeStat, foe && styles.lifeStatFoe]}>
      <Text style={[styles.lifeStatLabel, foe && { color: '#C89088' }]}>LIFE</Text>
      <Text style={[styles.lifeStatNum, foe && { color: '#FFB4A8' }]}>{life}</Text>
    </View>
  );
}

function DyingGhost({
  cardId,
  foe,
  onDone,
}: {
  cardId: string;
  foe?: boolean;
  onDone: () => void;
}) {
  const opacity = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const card = tryGetCard(cardId);
  useEffect(() => {
    Animated.parallel([
      Animated.sequence([
        Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -1, duration: 60, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]),
      Animated.timing(opacity, { toValue: 0, duration: 720, useNativeDriver: true }),
    ]).start(() => onDone());
  }, [opacity, shake, onDone]);
  if (!card) return null;
  const tx = shake.interpolate({ inputRange: [-1, 1], outputRange: [-6, 6] });
  return (
    <Animated.View
      style={[
        styles.ghostSlot,
        foe && styles.ghostSlotFoe,
        { opacity, transform: [{ translateX: tx }, { scale: opacity.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] },
      ]}
      pointerEvents="none"
    >
      <CardView card={card} width={64} board />
      <View style={styles.ghostSlash} />
    </Animated.View>
  );
}

function FieldCard({
  unit,
  foe,
  attacking,
  blocking,
  selected,
  tapped,
  targeting,
  onPress,
  onLongPress,
}: {
  unit: FieldUnit;
  foe?: boolean;
  attacking?: boolean;
  blocking?: boolean;
  selected?: boolean;
  tapped?: boolean;
  targeting?: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const card = tryGetCard(unit.cardId);
  if (!card) return null;
  return (
    <View
      style={[
        styles.fieldCardSlot,
        (selected || attacking || blocking) && styles.fieldCardLift,
        targeting && styles.fieldAimGlow,
      ]}
    >
      <CardView
        card={card}
        width={64}
        board
        exerted={tapped}
        selected={selected || attacking || blocking}
        power={unit.power + unit.tempPower}
        resolve={unit.resolve}
        onPress={onPress}
        onLongPress={onLongPress}
      />
    </View>
  );
}

function StatPill({
  label,
  value,
  onPress,
  accent,
}: {
  label: string;
  value: string;
  onPress?: () => void;
  accent?: string;
}) {
  return (
    <Pressable onPress={onPress} style={styles.statPill} hitSlop={6}>
      <Text style={[styles.statPillValue, accent ? { color: accent } : null]}>{value}</Text>
      <Text style={styles.statPillLabel}>{label}</Text>
    </Pressable>
  );
}

function DomainChip({
  d,
  canTap,
  onTap,
  onInspect,
}: {
  d: FieldPermanent;
  canTap: boolean;
  onTap: () => void;
  onInspect: () => void;
}) {
  const c = tryGetCard(d.cardId);
  if (!c) return null;
  const col = factionColors[c.faction] ?? factionColors.Neutral;
  return (
    <Pressable
      onPress={() => canTap && onTap()}
      onLongPress={onInspect}
      delayLongPress={280}
      accessibilityLabel={`${c.faction} Domain${d.exhausted ? ' (exhausted)' : ' — tap to Exhaust'}`}
      style={[styles.domainTile, { borderColor: col.main + 'AA' }, d.exhausted && styles.exhausted]}
    >
      <CardView card={c} width={44} board exerted={!!d.exhausted} />
    </Pressable>
  );
}

function PermCard({
  p,
  onPress,
  onInspect,
}: {
  p: FieldPermanent;
  onPress?: () => void;
  onInspect: () => void;
}) {
  const c = tryGetCard(p.cardId);
  if (!c) return null;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onInspect}
      delayLongPress={280}
      style={[styles.permCardWrap, p.exhausted && styles.exhausted]}
    >
      <CardView card={c} width={44} board exerted={!!p.exhausted} />
    </Pressable>
  );
}

function DiscardFlyAway({
  cardId,
  progress,
}: {
  cardId: string;
  progress: Animated.Value;
}) {
  const card = tryGetCard(cardId);
  if (!card) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.discardFx,
        {
          opacity: progress.interpolate({ inputRange: [0, 0.65, 1], outputRange: [1, 0.85, 0] }),
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -110] }) },
            { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 48] }) },
            { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.35] }) },
            {
              rotate: progress.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '-28deg'],
              }),
            },
          ],
        },
      ]}
    >
      <CardView card={card} width={70} compact />
    </Animated.View>
  );
}

function HandCardFlyIn({ children, animate }: { children: React.ReactNode; animate: boolean }) {
  const y = useRef(new Animated.Value(animate ? -56 : 0)).current;
  const op = useRef(new Animated.Value(animate ? 0 : 1)).current;
  useEffect(() => {
    if (!animate) return;
    Animated.parallel([
      Animated.spring(y, { toValue: 0, friction: 7, tension: 80, useNativeDriver: true }),
      Animated.timing(op, { toValue: 1, duration: 240, useNativeDriver: true }),
    ]).start();
  }, [animate, y, op]);
  return (
    <Animated.View style={{ opacity: op, transform: [{ translateY: y }] }}>{children}</Animated.View>
  );
}

export function BattleScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, Platform.OS === 'android' ? 22 : 10);
  const {
    battle,
    playCard,
    tapDomain,
    passTurn,
    nextPhase,
    skipToMain2,
    toggleAttack,
    pickBlockTarget,
    setBlocker,
    selectHand,
    confirmCastTarget,
    cancelCastTarget,
    enemyBusy,
    passResponse,
    lastGoldGain,
    tutorialSeen,
    setTutorialSeen,
    concedeBattle,
    rematchBattle,
  } = useGameStore();

  const [zoomCard, setZoomCard] = useState<CardDef | null>(null);
  const [zoomHandIndex, setZoomHandIndex] = useState<number | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [ashwell, setAshwell] = useState<'player' | 'enemy' | null>(null);
  const [clashFx, setClashFx] = useState(false);
  const [ghosts, setGhosts] = useState<{ key: string; cardId: string; foe: boolean }[]>([]);
  const [discardFx, setDiscardFx] = useState<{ key: string; cardId: string } | null>(null);
  const unitSnap = useRef<Record<string, { cardId: string; foe: boolean }>>({});
  const resolvingRef = useRef(false);
  const combatPulse = useRef(new Animated.Value(0)).current;
  const clashFlash = useRef(new Animated.Value(0)).current;
  const seenHand = useRef<Set<string>>(new Set());
  const prevDiscardLen = useRef(0);
  const discardFly = useRef(new Animated.Value(0)).current;
  const scenarioFoeName = useGameStore((s) => s.scenarioFoeName);

  useEffect(() => {
    const unsub = nav.addListener('beforeRemove', () => {
      setZoomCard(null);
      setZoomHandIndex(null);
      setTimeout(() => useGameStore.getState().clearBattle(), 0);
    });
    return unsub;
  }, [nav]);

  useEffect(() => {
    if (!battle?.phase.startsWith('combat')) {
      combatPulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(combatPulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(combatPulse, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [battle?.phase, combatPulse]);

  // Death ghosts: fade units that left the board
  useEffect(() => {
    if (!battle) return;
    const next: Record<string, { cardId: string; foe: boolean }> = {};
    for (const u of battle.players.player.units) {
      if (u?.instanceId && u.cardId) next[u.instanceId] = { cardId: u.cardId, foe: false };
    }
    for (const u of battle.players.enemy.units) {
      if (u?.instanceId && u.cardId) next[u.instanceId] = { cardId: u.cardId, foe: true };
    }
    const died = Object.keys(unitSnap.current).filter((id) => !next[id]);
    if (died.length) {
      const stamp = Date.now();
      const ghostsNew = died
        .map((id, i) => {
          const snap = unitSnap.current[id];
          if (!snap?.cardId) return null;
          return {
            key: `${id}-${stamp}-${i}`,
            cardId: snap.cardId,
            foe: snap.foe,
          };
        })
        .filter(Boolean) as { key: string; cardId: string; foe: boolean }[];
      if (ghostsNew.length) setGhosts((g) => [...g, ...ghostsNew]);
    }
    unitSnap.current = next;
  }, [battle?.players.player.units, battle?.players.enemy.units]);

  // Discard → Ashwell fly-away
  useEffect(() => {
    if (!battle) return;
    const pile = battle.players.player.discard;
    const dLen = pile.length;
    if (dLen > prevDiscardLen.current && dLen > 0) {
      const cardId = pile[dLen - 1];
      if (cardId && tryGetCard(cardId)) {
        const key = `ash-${Date.now()}`;
        setDiscardFx({ key, cardId });
        discardFly.setValue(0);
        Animated.timing(discardFly, {
          toValue: 1,
          duration: 560,
          useNativeDriver: true,
        }).start(() => setDiscardFx((cur) => (cur?.key === key ? null : cur)));
      }
    }
    prevDiscardLen.current = dLen;
  }, [battle?.players.player.discard, discardFly]);

  // Track hand slots so newly drawn cards can animate once
  useEffect(() => {
    if (!battle) return;
    const keys = battle.players.player.hand.map((id, i) => `${id}#${i}`);
    // Defer mark-as-seen so the first paint of new cards still animates
    const t = setTimeout(() => {
      for (const k of keys) seenHand.current.add(k);
    }, 40);
    return () => clearTimeout(t);
  }, [battle?.players.player.hand]);

  const over = !!battle && (battle.phase === 'gameover' || !!battle.winner);
  const myTurn = !!battle && battle.active === 'player' && !over;
  const canAct = !!battle && battle.priority === 'player' && !over && !enemyBusy;
  const inCombat = !!battle && battle.phase.startsWith('combat');
  const defending = !!battle && battle.active === 'enemy' && battle.phase === 'combat_blockers';

  const hint = useMemo(() => {
    if (!battle) return '';
    if (over) return battle.winner === 'player' ? `Victory · +${lastGoldGain} gold` : 'Defeat';
    if (enemyBusy) return 'Enemy turn — watch the phase track…';
    if (battle.pendingTarget) {
      const mode = battle.pendingTarget.mode;
      if (mode === 'ownUnit') return 'Tap one of YOUR Units to aim the spell';
      if (mode === 'enemyUnit') return 'Tap an ENEMY Unit to aim the spell';
      return 'Choose a target for the spell';
      return 'Tap an enemy Unit — or Face (Pierce)';
    }
    if (defending) {
      return 'Block: tap attacker, then YOUR Unit (tap again to clear) — or Confirm';
    }
    if (!myTurn && !canAct) return 'Enemy turn…';
    if (battle.phase === 'main1') return 'Domains · tap ✦≋◆▲※ to Exhaust for Essence · then Play';
    if (battle.phase === 'combat_attackers') return 'Tap Units to declare attackers — then Confirm Attack';
    if (battle.phase === 'combat_blockers') return 'Review enemy blocks — Confirm for combat damage';
    if (battle.phase === 'main2') return 'Play more, then End Turn';
    return STEP_LABELS?.[battle.phase] ?? '';
  }, [battle, myTurn, over, enemyBusy, canAct, defending, lastGoldGain]);

  if (!battle) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: bottomPad }]}>
        <Text style={styles.muted}>No active duel.</Text>
        <Pressable onPress={() => nav.goBack()} style={styles.actionBtn}>
          <Text style={styles.actionBtnText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const me = battle.players.player;
  const foe = battle.players.enemy;
  const combat = battle.combat ?? { attackers: [], blockers: {}, selectedAttackerForBlock: null };

  const selectHandCard = (idx: number) => {
    if (battle.priority === 'player') selectHand(idx);
  };

  const inspect = (card: CardDef | null, handIdx: number | null = null) => {
    if (!card) return;
    setZoomHandIndex(handIdx);
    setZoomCard(card);
  };

  const zoomHandCard = zoomHandIndex != null ? tryGetCard(me.hand[zoomHandIndex]) : null;

  const onUnitMine = (instanceId: string) => {
    if (battle.pendingTarget?.mode === 'ownUnit') {
      confirmCastTarget({ type: 'unit', id: instanceId });
      return;
    }
    if (battle.phase === 'combat_attackers' && myTurn) {
      toggleAttack(instanceId);
      return;
    }
    if (battle.phase === 'combat_blockers' && battle.priority === 'player') {
      setBlocker(instanceId);
    }
  };

  const onUnitFoe = (instanceId: string) => {
    if (
      battle.pendingTarget &&
      (battle.pendingTarget.mode === 'enemyUnit' || battle.pendingTarget.mode === 'enemyUnitOrFace')
    ) {
      confirmCastTarget({ type: 'unit', id: instanceId });
      return;
    }
    if (battle.phase === 'combat_blockers' && battle.priority === 'player') {
      pickBlockTarget(instanceId);
    }
  };

  const primaryAction = () => {
    if (over) {
      nav.goBack();
      return;
    }
    if (!canAct || resolvingRef.current) return;
    if (battle.phase === 'combat_blockers') {
      resolvingRef.current = true;
      setClashFx(true);
      clashFlash.setValue(0);
      Animated.sequence([
        Animated.timing(clashFlash, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(clashFlash, { toValue: 0.35, duration: 280, useNativeDriver: true }),
        Animated.timing(clashFlash, { toValue: 0.9, duration: 200, useNativeDriver: true }),
        Animated.timing(clashFlash, { toValue: 0, duration: 320, useNativeDriver: true }),
      ]).start(() => {
        nextPhase();
        setClashFx(false);
        resolvingRef.current = false;
      });
      return;
    }
    if (battle.phase === 'main1' || battle.phase === 'combat_attackers') {
      nextPhase();
      return;
    }
    passTurn();
  };

  const primaryLabel = over
    ? 'Leave'
    : defending
      ? Object.keys(combat.blockers).length
        ? 'Confirm Blocks'
        : 'Take Damage'
      : battle.phase === 'main1'
        ? 'Enter Combat'
        : battle.phase === 'combat_attackers'
          ? combat.attackers.length
            ? 'Confirm Attack'
            : 'Skip Attack'
          : battle.phase === 'combat_blockers'
            ? 'Resolve Damage'
            : battle.phase === 'main2'
              ? 'End Turn'
              : 'Continue';

  const secondaryLabel =
    myTurn && battle.phase === 'main1'
      ? 'Skip Combat'
      : myTurn && battle.phase === 'combat_attackers'
        ? 'No Attack'
        : null;

  const secondaryAction = () => {
    if (secondaryLabel) skipToMain2();
  };

  const phasePillColor = inCombat
    ? '#C44536'
    : myTurn
      ? palette.gold
      : enemyBusy
        ? '#9AA3B5'
        : '#6B7280';
  const handCount = me.hand.length;
  const handW = Math.min(82, Math.max(68, SCREEN_W / Math.max(handCount, 5) - 4));
  const combatGlow = combatPulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });

  return (
    <View style={styles.root}>
      <Image
        source={require('../../assets/ui/bg-battle-arena-v2.jpg')}
        style={styles.bgImage}
        resizeMode="cover"
      />
      <LinearGradient colors={['#080A0ECC', '#0C1018A8', '#0A0C12EE']} style={styles.bgFill} />

      <View style={[styles.safe, { paddingTop: insets.top + 6, paddingBottom: bottomPad }]}>
        {/* ── Enemy header ── */}
        <View style={styles.header}>
          <LifeStat life={foe.life} foe />
          <View style={styles.headerMeta}>
            <Text style={styles.foeName}>{scenarioFoeName ?? 'Hollow Archivist'}</Text>
            <Text style={styles.headerSub}>
              Hand {foe.hand.length} · Deck {foe.deck.length} · Dom {foe.domains.length}
            </Text>
          </View>
          <Animated.View
            style={[
              styles.phasePill,
              { borderColor: phasePillColor, opacity: inCombat ? combatGlow : 1 },
            ]}
          >
            <Text style={[styles.phasePillText, { color: phasePillColor }]}>
              {inCombat
                ? defending
                  ? 'Block!'
                  : 'Combat'
                : myTurn
                  ? 'Your turn'
                  : over
                    ? 'Done'
                    : enemyBusy
                      ? 'Enemy…'
                      : 'Enemy'}
            </Text>
          </Animated.View>
          <Pressable onPress={() => setLogOpen(true)} style={styles.logIconBtn} hitSlop={8}>
            <Text style={styles.logIconText}>☰</Text>
          </Pressable>
          {!over && (
            <Pressable
              onPress={() =>
                Alert.alert('Concede duel?', 'This counts as a loss and ends the match now.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Concede', style: 'destructive', onPress: () => concedeBattle() },
                ])
              }
              style={styles.concedeBtn}
              hitSlop={8}
              accessibilityLabel="Concede"
            >
              <Text style={styles.concedeText}>Concede</Text>
            </Pressable>
          )}
        </View>

        <PhaseTrack phase={battle.phase} />

        {!!hint && (
          <Text style={styles.hint} numberOfLines={1}>
            {hint}
          </Text>
        )}

        {!tutorialSeen && battle.turn === 1 && battle.phase === 'main1' && !over && (
          <View style={styles.tutorialOverlay} pointerEvents="box-none">
            <View style={styles.tutorialCard}>
              <Text style={styles.tutorialTitle}>First turn</Text>
              <View style={styles.tutorialSteps}>
                <Text style={styles.tutorialStep}>1 Exhaust Domain</Text>
                <Text style={styles.tutorialStep}>2 Play Unit</Text>
                <Text style={styles.tutorialStep}>3 Enter Combat</Text>
              </View>
              <Pressable onPress={() => setTutorialSeen()} style={styles.tutorialBtn}>
                <Text style={styles.tutorialBtnText}>Got it</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ── Battlefield ── */}
        <View style={styles.arena}>
          {/* Enemy half: permanents then units (top of board) */}
          <View style={styles.half}>
            <View style={styles.permStrip}>
              <Text style={styles.domainCaption} numberOfLines={1}>
                Enemy · Essence {essenceTotal(foe.essence)}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.domainRow}
              >
                {foe.domains.map((d) => (
                  <DomainChip
                    key={d.instanceId}
                    d={d}
                    canTap={false}
                    onTap={() => {}}
                    onInspect={() => inspect(tryGetCard(d.cardId))}
                  />
                ))}
                {[...foe.bonds, ...foe.relics].map((p) => (
                  <PermCard
                    key={p.instanceId}
                    p={p}
                    onInspect={() => inspect(tryGetCard(p.cardId))}
                  />
                ))}
                {!foe.domains.length && !foe.bonds.length && !foe.relics.length && (
                  <Text style={styles.domainEmpty}>no domains</Text>
                )}
              </ScrollView>
            </View>
            <View style={styles.halfRow}>
              <StatPill label="Ash" value={`${foe.discard.length}`} onPress={() => setAshwell('enemy')} />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.unitRow}
                style={styles.unitScroll}
              >
                {foe.units.map((u) => (
                  <FieldCard
                    key={u.instanceId}
                    unit={u}
                    foe
                    attacking={combat.attackers.includes(u.instanceId)}
                    selected={combat.selectedAttackerForBlock === u.instanceId}
                    tapped={u.exhausted || combat.attackers.includes(u.instanceId)}
                    targeting={
                      !!battle.pendingTarget &&
                      (battle.pendingTarget.mode === 'enemyUnit' ||
                        battle.pendingTarget.mode === 'enemyUnitOrFace')
                    }
                    onPress={() => onUnitFoe(u.instanceId)}
                    onLongPress={() => inspect(tryGetCard(u.cardId))}
                  />
                ))}
                {ghosts
                  .filter((g) => g.foe)
                  .map((g) => (
                    <DyingGhost
                      key={g.key}
                      cardId={g.cardId}
                      foe
                      onDone={() => setGhosts((all) => all.filter((x) => x.key !== g.key))}
                    />
                  ))}
                {!foe.units.length && !ghosts.some((g) => g.foe) && (
                  <Text style={styles.emptyField}>No units</Text>
                )}
              </ScrollView>
            </View>
          </View>

          <View style={styles.divider}>
            <LinearGradient colors={['transparent', '#B9995C99', 'transparent']} style={styles.dividerLine} />
            <Text style={styles.turnBadge}>Turn {battle.turn}</Text>
          </View>

          {/* Player half: units then permanents */}
          <View style={styles.half}>
            <View style={styles.halfRow}>
              <StatPill
                label="Ash"
                value={`${me.discard.length}`}
                onPress={() => setAshwell('player')}
                accent={myTurn ? palette.gold : undefined}
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.unitRow}
                style={styles.unitScroll}
              >
                {me.units.map((u) => {
                  const isAtk = combat.attackers.includes(u.instanceId);
                  const isBlk = Object.values(combat.blockers).includes(u.instanceId);
                  return (
                    <FieldCard
                      key={u.instanceId}
                      unit={u}
                      attacking={isAtk}
                      blocking={isBlk}
                      tapped={u.exhausted || isAtk}
                      targeting={battle.pendingTarget?.mode === 'ownUnit'}
                      onPress={() => onUnitMine(u.instanceId)}
                      onLongPress={() => inspect(tryGetCard(u.cardId))}
                    />
                  );
                })}
                {ghosts
                  .filter((g) => !g.foe)
                  .map((g) => (
                    <DyingGhost
                      key={g.key}
                      cardId={g.cardId}
                      onDone={() => setGhosts((all) => all.filter((x) => x.key !== g.key))}
                    />
                  ))}
                {!me.units.length && !ghosts.some((g) => !g.foe) && (
                  <Text style={styles.emptyField}>No units</Text>
                )}
              </ScrollView>
            </View>
            <View style={styles.permStrip}>
              <Text style={styles.domainCaption} numberOfLines={1}>
                You · Essence {essenceTotal(me.essence)} · tap Domain to Exhaust
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.domainRow}
              >
                {me.domains.map((d) => (
                  <DomainChip
                    key={d.instanceId}
                    d={d}
                    canTap={canAct && !d.exhausted}
                    onTap={() => tapDomain(d.instanceId)}
                    onInspect={() => inspect(tryGetCard(d.cardId))}
                  />
                ))}
                {[...me.bonds, ...me.relics].map((p) => {
                  const isVault = p.cardId === 'rv-059';
                  return (
                    <PermCard
                      key={p.instanceId}
                      p={p}
                      onPress={() => {
                        if (isVault && myTurn && !p.exhausted) useGameStore.getState().tapVault(p.instanceId);
                      }}
                      onInspect={() => inspect(tryGetCard(p.cardId))}
                    />
                  );
                })}
                {!me.domains.length && !me.bonds.length && !me.relics.length && (
                  <Text style={styles.domainEmpty}>play a Domain</Text>
                )}
              </ScrollView>
            </View>
          </View>
        </View>

        {discardFx && <DiscardFlyAway cardId={discardFx.cardId} progress={discardFly} />}

        {clashFx && (
          <Animated.View
            style={[styles.clashOverlay, { opacity: clashFlash }]}
            pointerEvents="none"
          >
            <Text style={styles.clashText}>CLASH</Text>
            <Text style={styles.clashSub}>Steel meets steel</Text>
          </Animated.View>
        )}

        {/* Response window: player may cast an instant Sigil before priority returns */}
        {battle.responseWindow && !battle.pendingTarget && (
          <View style={styles.responseBanner}>
            <Text style={styles.responseBannerText}>Priority — cast a Sigil or Pass</Text>
            <Pressable onPress={() => passResponse()} style={styles.responsePassBtn}>
              <Text style={styles.responsePassText}>Pass Priority</Text>
            </Pressable>
          </View>
        )}

        {/* Targeting banner */}
        {!!battle.pendingTarget && (
          <View style={styles.targetBanner}>
            <Text style={styles.targetBannerText}>
              Aim {tryGetCard(battle.pendingTarget.cardId)?.name ?? 'spell'}
            </Text>
            <View style={styles.targetBannerActions}>
              {battle.pendingTarget.mode === 'enemyUnitOrFace' && (
                <Pressable
                  onPress={() => confirmCastTarget({ type: 'face' })}
                  style={styles.targetFaceBtn}
                >
                  <Text style={styles.targetFaceText}>Face</Text>
                </Pressable>
              )}
              <Pressable onPress={() => cancelCastTarget()} style={styles.targetCancelBtn}>
                <Text style={styles.targetCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ── Actions ABOVE hand (Play must stay tappable) ── */}
        <View style={styles.dock}>
          <View style={styles.dockLeft}>
            <LifeStat life={me.life} />
            <View style={{ flexShrink: 1 }}>
              <Text style={styles.youLabel}>You</Text>
              <Text style={styles.headerSub}>
                Deck {me.deck.length} · Ashes {me.discard.length}
              </Text>
            </View>
          </View>
          <View style={styles.dockActions}>
            {secondaryLabel && (
              <Pressable onPress={secondaryAction} style={styles.dockBtnGhost}>
                <Text style={styles.dockBtnTextMuted} numberOfLines={1}>
                  {secondaryLabel}
                </Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => {
                if (battle.selectedHandIndex == null || !canAct || battle.pendingTarget) return;
                playCard(battle.selectedHandIndex);
              }}
              style={[
                styles.dockBtnPlay,
                (battle.selectedHandIndex == null || !canAct || !!battle.pendingTarget) &&
                  styles.disabled,
              ]}
              disabled={battle.selectedHandIndex == null || !canAct || !!battle.pendingTarget}
            >
              <Text style={styles.dockBtnTextGold} numberOfLines={1}>
                Play
              </Text>
            </Pressable>
            <Pressable
              onPress={primaryAction}
              disabled={(!canAct && !over) || !!battle.pendingTarget || clashFx}
              style={({ pressed }) => [
                styles.dockBtnPrimary,
                inCombat && styles.dockBtnCombat,
                ((!canAct && !over) || !!battle.pendingTarget || clashFx) && styles.disabled,
                pressed && { transform: [{ scale: 0.97 }] },
              ]}
            >
              <Text style={styles.dockBtnTextLight} numberOfLines={1}>
                {clashFx ? 'Resolving…' : primaryLabel}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Ashwell (spent runes) inspector */}
        <Modal
          visible={ashwell != null}
          transparent
          animationType="fade"
          onRequestClose={() => setAshwell(null)}
        >
          <Pressable style={styles.logModalBg} onPress={() => setAshwell(null)}>
            <Pressable style={styles.logModalSheet} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.logTitle}>
                {ashwell === 'enemy' ? 'Enemy Ashwell' : 'Your Ashwell'}
              </Text>
              <Text style={styles.ashwellSub}>Spent runes rest here until the Vault reclaims them.</Text>
              <ScrollView style={styles.logModalScroll} horizontal={false}>
                {(ashwell === 'enemy' ? foe.discard : me.discard).length === 0 ? (
                  <Text style={styles.logLine}>Empty — nothing has been spent.</Text>
                ) : (
                  (ashwell === 'enemy' ? foe.discard : me.discard).map((id, i) => {
                    const c = tryGetCard(id);
                    return (
                      <Pressable
                        key={`${id}-${i}`}
                        onPress={() => c && inspect(c)}
                        style={styles.ashwellRow}
                      >
                        <Text style={styles.ashwellRowText} numberOfLines={1}>
                          {c?.name ?? id}
                          {c ? ` · ${c.type}` : ''}
                        </Text>
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>
              <Pressable onPress={() => setAshwell(null)} style={styles.logCloseBtn}>
                <Text style={styles.logCloseText}>Close</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Battle log modal */}
        <Modal visible={logOpen} transparent animationType="fade" onRequestClose={() => setLogOpen(false)}>
          <Pressable style={styles.logModalBg} onPress={() => setLogOpen(false)}>
            <Pressable style={styles.logModalSheet} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.logTitle}>Battle Log</Text>
              <ScrollView style={styles.logModalScroll}>
                {battle.log.slice(0, 40).map((l) => (
                  <Text key={l.id} style={styles.logLine}>
                    {l.text}
                  </Text>
                ))}
              </ScrollView>
              <Pressable onPress={() => setLogOpen(false)} style={styles.logCloseBtn}>
                <Text style={styles.logCloseText}>Close</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Victory / Defeat cinema */}
        <Modal visible={over} transparent animationType="fade">
          <View style={styles.cinemaBg}>
            <LinearGradient
              colors={
                battle.winner === 'player'
                  ? ['#1A160C', '#2A2010', '#1A160C']
                  : ['#1A0C0C', '#2A1010', '#1A0C0C']
              }
              style={styles.cinemaCard}
            >
              <Text
                style={[
                  styles.cinemaTitle,
                  { color: battle.winner === 'player' ? palette.goldBright : '#E8A090' },
                ]}
              >
                {battle.winner === 'player' ? 'Victory' : 'Defeat'}
              </Text>
              <Text style={styles.cinemaGold}>
                {battle.winner === 'player' ? `Victory · +${lastGoldGain} gold` : 'The Vault records this loss.'}
              </Text>
              <View style={styles.cinemaActions}>
                <Pressable
                  onPress={() => {
                    const ok = rematchBattle();
                    if (!ok) {
                      nav.goBack();
                      return;
                    }
                    unitSnap.current = {};
                    seenHand.current = new Set();
                    prevDiscardLen.current = 0;
                    setGhosts([]);
                    setDiscardFx(null);
                    setZoomCard(null);
                    setZoomHandIndex(null);
                  }}
                  style={styles.cinemaBtnGhost}
                >
                  <Text style={styles.cinemaBtnGhostText}>Rematch</Text>
                </Pressable>
                <Pressable onPress={() => nav.goBack()} style={styles.cinemaBtn}>
                  <Text style={styles.cinemaBtnText}>Leave</Text>
                </Pressable>
              </View>
            </LinearGradient>
          </View>
        </Modal>

        {/* ── Hand ── */}
        <View style={styles.handFan}>
          {me.hand.map((id, idx) => {
            const handCard = tryGetCard(id);
            if (!handCard) return null;
            const slotKey = `${id}#${idx}`;
            const isNewDraw = !seenHand.current.has(slotKey);
            const playable =
              canAct &&
              !battle.pendingTarget &&
              canPlayType(handCard.type, battle.phase, {
                flash: handCard.keywords.includes('Flash'),
              });
            const mid = (handCount - 1) / 2;
            const offset = idx - mid;
            const rot = offset * 2.6;
            const lift = Math.abs(offset) * -1.5;
            const selected = battle.selectedHandIndex === idx;
            return (
              <HandCardFlyIn key={slotKey} animate={isNewDraw}>
                <View
                  style={[
                    styles.handCardWrap,
                    {
                      marginLeft: idx === 0 ? 0 : -handW * 0.42,
                      zIndex: selected ? 40 : 10 + idx,
                      transform: [
                        { translateY: selected ? -10 + lift : lift },
                        { rotate: `${rot}deg` },
                      ],
                      opacity: playable ? 1 : 0.45,
                    },
                  ]}
                >
                  <CardView
                    card={handCard}
                    width={handW}
                    compact
                    selected={selected}
                    onPress={() => selectHandCard(idx)}
                    onLongPress={() => inspect(handCard, idx)}
                  />
                </View>
              </HandCardFlyIn>
            );
          })}
        </View>
      </View>

      <CardZoomModal
        card={zoomCard}
        visible={!!zoomCard}
        onClose={() => {
          setZoomCard(null);
          setZoomHandIndex(null);
        }}
        primaryLabel={
          zoomHandCard && battle.priority === 'player'
            ? zoomHandCard.type === 'Domain'
              ? 'Play Domain'
              : zoomHandCard.type === 'Sigil'
                ? `Cast Sigil (${totalCost(zoomHandCard.cost)})`
                : zoomHandCard.type === 'Canticle'
                  ? `Cast Canticle (${totalCost(zoomHandCard.cost)})`
                  : `Play (${totalCost(zoomHandCard.cost)})`
            : undefined
        }
        onPrimary={
          zoomHandIndex != null && zoomHandCard && battle.priority === 'player'
            ? () => playCard(zoomHandIndex)
            : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0C0E12' },
  bgImage: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, width: '100%', height: '100%' },
  bgFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  safe: { flex: 1 },
  muted: { color: palette.textMuted, textAlign: 'center', marginTop: 40, fontFamily: UI },
  discardFx: {
    position: 'absolute',
    left: SCREEN_W / 2 - 35,
    bottom: 200,
    zIndex: 80,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  headerMeta: { flex: 1 },
  foeName: {
    color: palette.text,
    fontSize: 17,
    fontFamily: DISPLAY,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  youLabel: {
    color: palette.text,
    fontSize: 15,
    fontFamily: DISPLAY,
    fontWeight: '700',
  },
  headerSub: {
    color: palette.textMuted,
    fontSize: 12,
    fontFamily: UI,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },

  lifeStat: {
    minWidth: 56,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: palette.gold + 'AA',
    backgroundColor: '#1A160CCC',
    alignItems: 'center',
  },
  lifeStatFoe: {
    borderColor: '#A05050AA',
    backgroundColor: '#1A0C10CC',
  },
  lifeStatLabel: {
    color: palette.gold,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    fontFamily: UI,
  },
  lifeStatNum: {
    color: palette.goldBright,
    fontSize: 20,
    fontWeight: '800',
    fontFamily: DISPLAY,
    fontVariant: ['tabular-nums'],
    marginTop: 1,
  },
  ghostSlot: {
    marginHorizontal: 3,
    opacity: 0.9,
  },
  ghostSlotFoe: {},
  ghostSlash: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: '#C44536',
    borderRadius: 8,
    backgroundColor: '#C4453622',
  },
  clashOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A0808AA',
    zIndex: 40,
  },
  clashText: {
    color: '#FFE8C8',
    fontSize: 42,
    fontFamily: DISPLAY,
    fontWeight: '800',
    letterSpacing: 6,
    textShadowColor: '#C44536',
    textShadowRadius: 12,
  },
  clashSub: {
    color: '#E0C090',
    fontSize: 13,
    fontFamily: UI,
    marginTop: 6,
    letterSpacing: 1,
  },

  phasePill: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#1A1210CC',
  },
  phasePillText: { fontSize: 12, fontWeight: '700', fontFamily: UI, letterSpacing: 0.4 },

  phaseTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 0,
  },
  phaseStep: {
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  phaseStepActive: {
    borderColor: palette.gold,
    backgroundColor: '#1A160CCC',
  },
  phaseStepText: {
    color: '#5A6170',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: UI,
    letterSpacing: 0.2,
  },
  phaseStepTextActive: { color: palette.text },
  phaseRail: { width: 8, height: 1, backgroundColor: '#2A303C' },
  phaseRailHot: { backgroundColor: palette.gold + '66' },

  hint: {
    textAlign: 'center',
    color: palette.textMuted,
    fontSize: 11,
    fontFamily: UI,
    fontStyle: 'italic',
    paddingHorizontal: 16,
    marginBottom: 4,
  },

  arena: {
    flex: 1,
    marginHorizontal: 4,
    overflow: 'hidden',
    minHeight: 160,
  },
  half: {
    flex: 1,
    paddingVertical: 2,
    paddingHorizontal: 4,
    justifyContent: 'center',
    overflow: 'hidden',
    minHeight: 0,
  },
  halfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  unitScroll: { flex: 1 },
  unitRow: {
    alignItems: 'center',
    gap: 4,
    paddingRight: 8,
    paddingVertical: 4,
    minHeight: 96,
  },
  fieldCardSlot: {
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  fieldCardLift: {
    transform: [{ translateY: -3 }],
  },
  emptyField: {
    color: '#FFFFFF33',
    fontSize: 11,
    fontFamily: UI,
    paddingHorizontal: 12,
    paddingVertical: 20,
  },
  fieldAimGlow: {
    shadowColor: '#C44536',
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 8,
  },
  statPill: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  statPillValue: {
    color: '#D8DEE8',
    fontSize: 13,
    fontWeight: '800',
    fontFamily: UI,
  },
  statPillLabel: {
    color: '#8A93A3',
    fontSize: 9,
    fontWeight: '600',
    fontFamily: UI,
    marginTop: 1,
  },
  sidePile: { alignItems: 'center', width: 48, justifyContent: 'center' },
  sidePileBox: {
    minWidth: 42,
    paddingHorizontal: 6,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4A5568AA',
    backgroundColor: '#1A2230CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidePileValue: { color: '#E8ECF4', fontSize: 12, fontWeight: '800', fontFamily: UI },
  sidePileLabel: { color: '#9AA3B5', fontSize: 9, marginTop: 3, fontFamily: UI, fontWeight: '600' },

  permStrip: {
    paddingLeft: 6,
    paddingRight: 4,
    paddingVertical: 2,
    maxHeight: 78,
  },
  domainBlock: { marginTop: 2, paddingLeft: 8 },
  domainCaption: {
    color: '#9AA3B5',
    fontSize: 9,
    fontFamily: UI,
    fontWeight: '600',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  domainRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 5,
    alignItems: 'center',
    paddingRight: 8,
    paddingVertical: 2,
  },
  domainEmpty: { color: '#5A6170', fontSize: 9, fontFamily: UI },
  domainTile: {
    borderRadius: 6,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: '#121820AA',
  },
  permCardWrap: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#6B5A3A88',
    overflow: 'hidden',
    backgroundColor: '#1A160CAA',
  },
  domainChip: {
    minWidth: 36,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  domainChipSym: { fontSize: 12, fontWeight: '800' },
  exhausted: { opacity: 0.4 },

  divider: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 14,
  },
  dividerLine: { position: 'absolute', left: 24, right: 24, height: StyleSheet.hairlineWidth },
  turnBadge: {
    color: palette.gold,
    fontSize: 9,
    fontWeight: '700',
    fontFamily: UI,
    letterSpacing: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 10,
  },

  logIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3A4252',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121820AA',
    marginLeft: 4,
  },
  logIconText: { color: palette.gold, fontSize: 14, fontWeight: '800' },
  concedeBtn: {
    marginLeft: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#5A3038',
    backgroundColor: '#1A1014AA',
  },
  concedeText: { color: '#E8A090', fontSize: 10, fontWeight: '800', fontFamily: UI },
  logModalBg: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'flex-end',
  },
  logModalSheet: {
    maxHeight: '55%',
    backgroundColor: '#121820',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: '#2A3344',
    padding: 16,
  },
  logModalScroll: { maxHeight: 280, marginVertical: 10 },
  logTitle: {
    color: palette.gold,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  logLine: { color: '#9AA3B5', fontSize: 12, fontFamily: UI, marginBottom: 6, lineHeight: 16 },
  logCloseBtn: {
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: palette.gold,
  },
  logCloseText: { color: '#1A1200', fontWeight: '900' },

  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 6,
    gap: 6,
    flexWrap: 'wrap',
    zIndex: 30,
    elevation: 12,
    backgroundColor: '#0A0C12F2',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#3A425266',
  },
  dockLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  dockActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    maxWidth: '100%',
  },
  ghostBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3A4252',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 96,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostText: { color: palette.textMuted, fontSize: 12, fontWeight: '700', fontFamily: UI },
  playChip: {
    borderRadius: 12,
    backgroundColor: '#1A2230',
    borderWidth: 1,
    borderColor: palette.gold + '66',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 96,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playChipText: { color: palette.goldBright, fontWeight: '800', fontSize: 12, fontFamily: UI },
  actionBtn: {
    borderRadius: 12,
    backgroundColor: '#2A1A14',
    borderWidth: 1.5,
    borderColor: '#C44536',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 96,
    minHeight: 42,
    maxWidth: 148,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnCombat: {
    backgroundColor: '#3A1814',
    borderColor: '#E85D3B',
  },
  actionBtnText: {
    color: '#F5E6DC',
    fontSize: 12,
    fontWeight: '800',
    fontFamily: UI,
    letterSpacing: 0.2,
  },
  dockBtnGhost: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3A4252',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 96,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockBtnPlay: {
    borderRadius: 12,
    backgroundColor: '#1A2230',
    borderWidth: 1.5,
    borderColor: palette.gold + '88',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 96,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockBtnPrimary: {
    borderRadius: 12,
    backgroundColor: '#2A1A14',
    borderWidth: 1.5,
    borderColor: '#C44536',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 96,
    minHeight: 42,
    maxWidth: 148,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockBtnCombat: {
    backgroundColor: '#3A1814',
    borderColor: '#E85D3B',
  },
  dockBtnTextMuted: { color: palette.textMuted, fontSize: 12, fontWeight: '700', fontFamily: UI },
  dockBtnTextGold: { color: palette.goldBright, fontSize: 12, fontWeight: '800', fontFamily: UI },
  dockBtnTextLight: { color: '#F5E6DC', fontSize: 12, fontWeight: '800', fontFamily: UI },
  ashwellSub: {
    color: palette.textMuted,
    fontSize: 11,
    fontFamily: UI,
    marginTop: 4,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  ashwellRow: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2A3344',
  },
  ashwellRowText: { color: palette.text, fontSize: 13, fontFamily: UI },
  disabled: { opacity: 0.35 },

  targetBanner: {
    marginHorizontal: 12,
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.gold,
    backgroundColor: '#1A160CEE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  targetBannerText: { color: palette.goldBright, fontWeight: '800', fontSize: 12, flex: 1 },
  targetBannerActions: { flexDirection: 'row', gap: 6 },
  targetFaceBtn: {
    backgroundColor: '#C44536',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  targetFaceText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  targetCancelBtn: {
    borderWidth: 1,
    borderColor: '#5A6170',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  targetCancelText: { color: palette.textMuted, fontWeight: '700', fontSize: 11 },

  responseBanner: {
    marginHorizontal: 12,
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3B8FD9AA',
    backgroundColor: '#0C1A28EE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  responseBannerText: { color: '#A8D4F5', fontWeight: '800', fontSize: 12, flex: 1 },
  responsePassBtn: {
    backgroundColor: '#3B8FD9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  responsePassText: { color: '#0A1420', fontWeight: '800', fontSize: 11 },

  tutorialOverlay: {
    position: 'absolute',
    top: 4,
    left: 12,
    right: 12,
    zIndex: 35,
    alignItems: 'center',
  },
  tutorialCard: {
    backgroundColor: '#0F1420F0',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: palette.gold,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    maxWidth: 360,
  },
  tutorialTitle: {
    color: palette.goldBright,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  tutorialSteps: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 10,
  },
  tutorialStep: {
    color: palette.text,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: UI,
  },
  tutorialBtn: {
    backgroundColor: palette.gold,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  tutorialBtnText: { color: '#1A1200', fontWeight: '800', fontSize: 12 },

  cinemaBg: {
    flex: 1,
    backgroundColor: '#000000CC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  cinemaCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: palette.gold + '88',
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  cinemaTitle: {
    fontSize: 38,
    fontFamily: DISPLAY,
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: 12,
  },
  cinemaGold: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
  },
  cinemaActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  cinemaBtn: {
    backgroundColor: palette.gold,
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 14,
    minWidth: 120,
    alignItems: 'center',
  },
  cinemaBtnText: { color: '#1A1200', fontWeight: '900', fontSize: 16 },
  cinemaBtnGhost: {
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 14,
    minWidth: 110,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.gold + '88',
  },
  cinemaBtnGhostText: { color: palette.gold, fontWeight: '800', fontSize: 15 },

  handFan: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingTop: 12,
    paddingBottom: 2,
    height: 128,
    overflow: 'hidden',
    zIndex: 10,
    backgroundColor: '#080A0E',
  },
  handCardWrap: {
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
});
