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
import { fonts, type } from '../theme/typography';
import { radii, shadows } from '../theme/tokens';
import { Icon, IconName } from '../components/Icon';
import { VaultButton } from '../components/VaultButton';
import { CardDef, FieldPermanent, FieldUnit, EssenceCost, Faction, StackItem } from '../types/card';
import { STEP_LABELS, canPlayType } from '../types/battleFlow';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

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

const CARD_W = Math.min(100, Math.max(78, Math.round(SCREEN_W * 0.2)));
const DOMAIN_W = Math.round(CARD_W * 0.74);

const ESSENCE_TYPES: { key: keyof EssenceCost; label: string; color: string }[] = [
  { key: 'dawn', label: 'D', color: factionColors.Dawn.main },
  { key: 'tide', label: 'T', color: factionColors.Tide.main },
  { key: 'shade', label: 'S', color: factionColors.Shade.main },
  { key: 'ember', label: 'E', color: factionColors.Ember.main },
  { key: 'thorn', label: 'R', color: factionColors.Thorn.main },
  { key: 'any', label: 'A', color: '#C5CBD6' },
];

function EssenceBar({ essence, label }: { essence: EssenceCost; label?: string }) {
  const total = essenceTotal(essence);
  return (
    <View style={styles.essenceBar}>
      {!!label && <Text style={styles.essenceLabel}>{label}</Text>}
      {total === 0 ? (
        <Text style={styles.essenceEmpty}>0</Text>
      ) : (
        ESSENCE_TYPES.filter((t) => (essence[t.key] ?? 0) > 0).map((t) => (
          <View key={t.key} style={[styles.essencePip, { backgroundColor: t.color }]}>
            <Text style={styles.essencePipText}>{essence[t.key]}</Text>
          </View>
        ))
      )}
    </View>
  );
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
      <Icon name="heart" size={10} color={foe ? '#C89088' : palette.gold} />
      <Text style={[styles.lifeStatNum, foe && { color: '#FFB4A8' }]}>{life}</Text>
    </View>
  );
}

function DyingGhost({
  cardId,
  foe,
  onDone,
  width = CARD_W,
}: {
  cardId: string;
  foe?: boolean;
  onDone: () => void;
  width?: number;
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
      <CardView card={card} width={width} board />
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
  exhausted,
  targeting,
  onPress,
  onLongPress,
  width = CARD_W,
}: {
  unit: FieldUnit;
  foe?: boolean;
  attacking?: boolean;
  blocking?: boolean;
  selected?: boolean;
  exhausted?: boolean;
  targeting?: boolean;
  onPress: () => void;
  onLongPress: () => void;
  width?: number;
}) {
  const card = tryGetCard(unit.cardId);
  if (!card) return null;
  return (
    <View
      style={[
        styles.fieldCardSlot,
        (selected || attacking || blocking) && styles.fieldCardLift,
        targeting && styles.fieldAimGlow,
        attacking && styles.fieldCardAttackGlow,
        blocking && styles.fieldCardBlockGlow,
      ]}
    >
      <CardView
        card={card}
        width={width}
        board
        exerted={exhausted}
        attacking={attacking}
        blocking={blocking}
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

const FACTION_TOKEN_ICON: Record<Faction, IconName> = {
  Dawn: 'dawn',
  Tide: 'tide',
  Shade: 'shade',
  Ember: 'ember',
  Thorn: 'thorn',
  Neutral: 'neutral',
};

/** Compact land-style token: faction symbol, glows when ready, dims when tapped. */
function DomainToken({
  faction,
  exhausted,
  canTap,
  onPress,
  onLongPress,
}: {
  faction: Faction;
  exhausted: boolean;
  canTap: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const col = factionColors[faction] ?? factionColors.Neutral;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={260}
      style={({ pressed }) => [
        styles.token,
        {
          borderColor: exhausted ? col.deep : col.main,
          backgroundColor: (exhausted ? col.deep : col.main) + (exhausted ? '18' : '2E'),
        },
        canTap && styles.tokenReady,
        pressed && canTap && { transform: [{ scale: 0.9 }] },
      ]}
    >
      <Icon name={FACTION_TOKEN_ICON[faction]} size={15} color={exhausted ? '#5A6070' : col.main} />
    </Pressable>
  );
}

/**
 * MTG-style resource row: essence pool + tappable Domain tokens + any
 * Bonds/Relics. Domains are symbols (not full cards) so the board stays
 * readable no matter how many you have.
 */
function ResourceStrip({
  essence,
  domains,
  perms,
  foe,
  canAct,
  onTapDomain,
  onInspect,
  onPermPress,
  permW,
}: {
  essence: EssenceCost;
  domains: FieldPermanent[];
  perms: FieldPermanent[];
  foe?: boolean;
  canAct?: boolean;
  onTapDomain: (id: string) => void;
  onInspect: (cardId: string) => void;
  onPermPress?: (p: FieldPermanent) => void;
  permW: number;
}) {
  const ready = domains.filter((d) => !d.exhausted).length;
  return (
    <View style={[styles.resStrip, foe && styles.resStripFoe]}>
      <View style={styles.resPool}>
        <Text style={[styles.resLabel, foe && styles.resLabelFoe]}>{foe ? 'FOE' : 'YOU'}</Text>
        <EssenceBar essence={essence} />
      </View>
      <View style={styles.resDivider} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.resScroll}
      >
        {domains.map((d) => {
          const c = tryGetCard(d.cardId);
          const canTap = !!canAct && !foe && !d.exhausted;
          return (
            <DomainToken
              key={d.instanceId}
              faction={c?.faction ?? 'Neutral'}
              exhausted={!!d.exhausted}
              canTap={canTap}
              onPress={() => canTap && onTapDomain(d.instanceId)}
              onLongPress={() => onInspect(d.cardId)}
            />
          );
        })}
        {domains.length > 0 && (
          <Text style={styles.resReady}>
            {ready}/{domains.length}
          </Text>
        )}
        {perms.map((p) => (
          <PermCard
            key={p.instanceId}
            p={p}
            width={permW}
            onPress={onPermPress ? () => onPermPress(p) : undefined}
            onInspect={() => onInspect(p.cardId)}
          />
        ))}
        {domains.length === 0 && perms.length === 0 && (
          <Text style={styles.resEmpty}>{foe ? 'no domains' : 'play a Domain'}</Text>
        )}
      </ScrollView>
    </View>
  );
}

function PermCard({
  p,
  onPress,
  onInspect,
  width = DOMAIN_W,
}: {
  p: FieldPermanent;
  onPress?: () => void;
  onInspect: () => void;
  width?: number;
}) {
  const c = tryGetCard(p.cardId);
  if (!c) return null;
  return (
    <View style={[styles.permCardWrap, p.exhausted && styles.exhausted]}>
      <CardView
        card={c}
        width={width}
        board
        exerted={!!p.exhausted}
        onPress={onPress}
        onLongPress={onInspect}
      />
    </View>
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
      <CardView card={card} width={84} compact />
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

/** The Stack — spells/triggers waiting to resolve (top resolves first). */
function StackOverlay({ stack }: { stack: StackItem[] }) {
  if (!stack.length) return null;
  return (
    <View style={styles.stackOverlay} pointerEvents="none">
      <Text style={styles.stackTitle}>THE STACK</Text>
      <Text style={styles.stackHint}>resolves top-first</Text>
      <View style={styles.stackList}>
        {stack.map((s, i) => {
          const c = tryGetCard(s.cardId);
          const foe = s.controller === 'enemy';
          return (
            <View
              key={s.id}
              style={[
                styles.stackItem,
                foe ? styles.stackItemFoe : styles.stackItemMine,
                { marginTop: i === 0 ? 0 : -10, zIndex: 20 - i },
              ]}
            >
              <Text style={[styles.stackWho, { color: foe ? '#E8A090' : palette.goldBright }]}>
                {foe ? 'ENEMY' : 'YOU'}
              </Text>
              <Text style={styles.stackName} numberOfLines={1}>
                {c?.name ?? s.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
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
  const [arenaH, setArenaH] = useState(0);
  const [logOpen, setLogOpen] = useState(false);
  const [ashwell, setAshwell] = useState<'player' | 'enemy' | null>(null);
  const [clashFx, setClashFx] = useState(false);
  const [ghosts, setGhosts] = useState<{ key: string; cardId: string; foe: boolean }[]>([]);
  const [discardFx, setDiscardFx] = useState<{ key: string; cardId: string } | null>(null);
  const [turnBanner, setTurnBanner] = useState<{ key: number; text: string; foe: boolean } | null>(null);
  const [castFx, setCastFx] = useState<{ key: number; name: string } | null>(null);
  const castAnim = useRef(new Animated.Value(0)).current;
  const unitSnap = useRef<Record<string, { cardId: string; foe: boolean }>>({});
  const resolvingRef = useRef(false);
  const combatPulse = useRef(new Animated.Value(0)).current;
  const clashFlash = useRef(new Animated.Value(0)).current;
  const turnBannerAnim = useRef(new Animated.Value(0)).current;
  const seenHand = useRef<Set<string>>(new Set());
  const prevDiscardLen = useRef(0);
  const prevTurnKey = useRef<string | null>(null);
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

  // Turn-change banner — a quick "Your Turn / Enemy Turn" sweep on hand-off.
  useEffect(() => {
    if (!battle || battle.winner) return;
    const key = `${battle.turn}-${battle.active}`;
    if (prevTurnKey.current === null) {
      prevTurnKey.current = key;
      return;
    }
    if (prevTurnKey.current !== key) {
      prevTurnKey.current = key;
      const foe = battle.active === 'enemy';
      setTurnBanner({ key: battle.turn * 2 + (foe ? 1 : 0), text: foe ? 'Enemy Turn' : 'Your Turn', foe });
      turnBannerAnim.setValue(0);
      Animated.sequence([
        Animated.timing(turnBannerAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.delay(720),
        Animated.timing(turnBannerAnim, { toValue: 0, duration: 260, useNativeDriver: true }),
      ]).start(() => setTurnBanner(null));
    }
  }, [battle?.turn, battle?.active, battle?.winner, turnBannerAnim]);


  const over = !!battle && (battle.phase === 'gameover' || !!battle.winner);
  const myTurn = !!battle && battle.active === 'player' && !over;
  const canAct = !!battle && battle.priority === 'player' && !over && !enemyBusy;
  const inCombat = !!battle && battle.phase.startsWith('combat');
  const defending = !!battle && battle.active === 'enemy' && battle.phase === 'combat_blockers';

  const hint = useMemo(() => {
    if (!battle) return '';
    if (over) return battle.winner === 'player' ? `Victory · +${lastGoldGain} gold` : 'Defeat';
    if (enemyBusy) return battle.log[0]?.text ?? 'Enemy is acting…';
    if (battle.pendingTarget) {
      const mode = battle.pendingTarget.mode;
      if (mode === 'ownUnit') return 'Tap one of YOUR Units to aim the spell';
      if (mode === 'enemyUnit') return 'Tap an ENEMY Unit to aim the spell';
      return 'Choose a target for the spell';
    }
    if (defending) {
      return 'Block: tap attacker, then YOUR Unit (tap again to clear) — or Confirm';
    }
    if (!myTurn && !canAct) return 'Enemy turn…';
    if (battle.phase === 'main1') return 'Tap a Domain for Essence, then play a card';
    if (battle.phase === 'combat_attackers') return 'Tap Units to attack, then Confirm';
    if (battle.phase === 'combat_blockers') return 'Confirm to resolve combat damage';
    if (battle.phase === 'main2') return 'Play more, then End Turn';
    return STEP_LABELS?.[battle.phase] ?? '';
  }, [battle, myTurn, over, enemyBusy, canAct, defending, lastGoldGain]);

  if (!battle) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: bottomPad }]}>
        <Text style={styles.muted}>No active duel.</Text>
        <VaultButton label="Back" variant="secondary" onPress={() => nav.goBack()} />
      </View>
    );
  }

  const me = battle.players.player;
  const foe = battle.players.enemy;
  const combat = battle.combat ?? { attackers: [], blockers: {}, selectedAttackerForBlock: null };

  const selectHandCard = (idx: number) => {
    if (battle.priority === 'player') selectHand(idx);
  };

  // Play a card; flash a cast ripple for spells so instants/sorceries land with weight.
  const doPlay = (idx: number) => {
    const card = tryGetCard(me.hand[idx]);
    if (card && (card.type === 'Sigil' || card.type === 'Canticle')) {
      setCastFx({ key: idx + me.hand.length * 1000, name: card.name });
      castAnim.setValue(0);
      Animated.sequence([
        Animated.timing(castAnim, { toValue: 1, duration: 170, useNativeDriver: true }),
        Animated.delay(340),
        Animated.timing(castAnim, { toValue: 0, duration: 260, useNativeDriver: true }),
      ]).start(() => setCastFx(null));
    }
    playCard(idx);
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
  const { handW, handH, handOverlap, fanHeight } = useMemo(() => {
    const maxW = 96;
    const minW = 72;
    const baseW = Math.min(maxW, Math.max(minW, Math.round(SCREEN_W * 0.22)));
    const avail = SCREEN_W - 48;
    const n = Math.max(1, handCount);

    let width = baseW;
    let overlap = 0;
    if (n === 1) {
      width = Math.min(baseW, avail);
    } else {
      const needed = baseW * n;
      if (needed <= avail) {
        overlap = 0;
        width = Math.min(baseW, Math.round(avail / n));
      } else {
        const maxOverlap = 0.36;
        const maxPossible = baseW * (n - 1) * maxOverlap;
        if (needed - avail <= maxPossible) {
          overlap = (needed - avail) / (baseW * (n - 1));
          width = baseW;
        } else {
          overlap = maxOverlap;
          width = Math.max(minW, Math.round(avail / (1 + (n - 1) * (1 - maxOverlap))));
        }
      }
    }
    const artH = Math.round(width * 1.05);
    const h = 34 + artH + 18;
    const fanH = h + 20;
    return { handW: width, handH: h, handOverlap: overlap, fanHeight: fanH };
  }, [handCount]);
  const combatGlow = combatPulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });

  // Size the battlefield to the space actually available so nothing clips.
  // Domains are now compact tokens in a fixed-height strip, so the two unit
  // rows get almost all the vertical space. Solve unit width to fit both rows.
  const { boardW, permW } = useMemo(() => {
    const BOARD_RATIO = 88 / 63;
    const stripH = 56; // resource strip (essence + domain tokens) per side
    const dividerH = 26;
    // Fallback estimate for the first paint (before onLayout): screen minus chrome.
    const estimate = Math.max(240, SCREEN_H * 0.46);
    const usable = Math.max(0, (arenaH || estimate) - dividerH - stripH * 2);
    const perRow = usable / 2; // one unit row per side
    const raw = perRow / BOARD_RATIO;
    const byWidth = Math.round(SCREEN_W * 0.22);
    const w = Math.max(58, Math.min(108, byWidth, Math.floor(raw)));
    return { boardW: w, permW: 38 };
  }, [arenaH]);

  return (
    <View style={styles.root}>
      <Image
        source={require('../../assets/ui/bg-battle-arena-v2.jpg')}
        style={styles.bgImage}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['rgba(8,10,14,0.55)', 'rgba(12,16,24,0.35)', 'rgba(8,10,14,0.72)']}
        style={styles.bgFill}
      />

      <View style={[styles.safe, { paddingTop: insets.top + 4, paddingBottom: bottomPad }]}>
        {/* ── Enemy header ── */}
        <View style={styles.header}>
          <LifeStat life={foe.life} foe />
          <View style={styles.headerMeta}>
            <Text style={styles.foeName} numberOfLines={2}>
              {scenarioFoeName ?? 'Hollow Archivist'}
            </Text>
            <Text style={styles.headerSub} numberOfLines={1}>
              Hand {foe.hand.length} · Deck {foe.deck.length}
            </Text>
          </View>
          <Animated.View
            style={[
              styles.phasePill,
              { borderColor: phasePillColor, opacity: inCombat ? combatGlow : 1 },
            ]}
          >
            <Text style={[styles.phasePillText, { color: phasePillColor }]} numberOfLines={1}>
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
            <Icon name="stats" size={15} color={palette.gold} />
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
              <Icon name="close" size={16} color="#E8A090" />
            </Pressable>
          )}
        </View>

        <PhaseTrack phase={battle.phase} />

        {!!hint && (
          <Text style={styles.hint} numberOfLines={2}>
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
              <VaultButton label="Got it" small onPress={() => setTutorialSeen()} />
            </View>
          </View>
        )}

        {/* ── Battlefield ── */}
        <View
          style={styles.arena}
          onLayout={(e) => {
            const h = Math.round(e.nativeEvent.layout.height);
            if (h && Math.abs(h - arenaH) > 4) setArenaH(h);
          }}
        >
          {/* Enemy half: resource strip (top), then units */}
          <View style={styles.half}>
            <ResourceStrip
              essence={foe.essence}
              domains={foe.domains}
              perms={[...foe.bonds, ...foe.relics]}
              foe
              onTapDomain={() => {}}
              onInspect={(id) => inspect(tryGetCard(id))}
              permW={permW}
            />
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
                    width={boardW}
                    attacking={combat.attackers.includes(u.instanceId)}
                    selected={combat.selectedAttackerForBlock === u.instanceId}
                    exhausted={u.exhausted}
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
                      width={boardW}
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
            <View style={styles.turnBadgeWrap}>
              <Text style={styles.turnBadge}>Turn {battle.turn}</Text>
            </View>
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
                      width={boardW}
                      attacking={isAtk}
                      blocking={isBlk}
                      exhausted={u.exhausted}
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
                      width={boardW}
                      onDone={() => setGhosts((all) => all.filter((x) => x.key !== g.key))}
                    />
                  ))}
                {!me.units.length && !ghosts.some((g) => !g.foe) && (
                  <Text style={styles.emptyField}>No units</Text>
                )}
              </ScrollView>
            </View>
            <ResourceStrip
              essence={me.essence}
              domains={me.domains}
              perms={[...me.bonds, ...me.relics]}
              canAct={canAct}
              onTapDomain={(id) => tapDomain(id)}
              onInspect={(id) => inspect(tryGetCard(id))}
              onPermPress={(p) => {
                if (p.cardId === 'rv-059' && myTurn && !p.exhausted) {
                  useGameStore.getState().tapVault(p.instanceId);
                }
              }}
              permW={permW}
            />
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

        {/* The Stack — waiting spells/triggers (enemy casts sit here until you pass) */}
        <StackOverlay stack={battle.stack} />

        {/* Cast ripple for spells */}
        {castFx && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.castFx,
              {
                opacity: castAnim,
                transform: [
                  { scale: castAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) },
                ],
              },
            ]}
          >
            <View style={styles.castRing}>
              <Icon name="dust" size={20} color={palette.goldBright} />
            </View>
            <Text style={styles.castName} numberOfLines={1}>
              {castFx.name}
            </Text>
          </Animated.View>
        )}

        {/* Turn hand-off sweep */}
        {turnBanner && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.turnSweep,
              {
                opacity: turnBannerAnim,
                transform: [
                  { scale: turnBannerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
                ],
              },
            ]}
          >
            <Text style={[styles.turnSweepText, turnBanner.foe && { color: '#F0B4A8' }]}>
              {turnBanner.text}
            </Text>
          </Animated.View>
        )}

        {/* Response window: player may cast an instant Sigil before the stack resolves */}
        {battle.responseWindow && !battle.pendingTarget && (
          <View style={styles.responseBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.responseBannerText}>
                {battle.stack.length ? 'Respond to the Stack' : 'Priority'}
              </Text>
              <Text style={styles.responseBannerSub}>Cast a Sigil (instant) or pass to resolve.</Text>
            </View>
            <Pressable onPress={() => passResponse()} style={styles.responsePassBtn}>
              <Text style={styles.responsePassText}>Pass</Text>
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
            <Text style={styles.dockDeck} numberOfLines={1}>
              Deck {me.deck.length}
            </Text>
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
                doPlay(battle.selectedHandIndex);
              }}
              style={[
                styles.dockBtnPlay,
                (battle.selectedHandIndex == null || !canAct || !!battle.pendingTarget) &&
                  styles.disabled,
              ]}
              disabled={battle.selectedHandIndex == null || !canAct || !!battle.pendingTarget}
            >
              <LinearGradient
                colors={['rgba(212,168,75,0.24)', 'rgba(212,168,75,0.10)']}
                style={styles.dockBtnFill}
              />
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
              <LinearGradient
                colors={inCombat ? ['#D8553F', '#8A2418'] : ['#F0C75E', '#C09A3E']}
                style={styles.dockBtnFill}
              />
              <Text
                style={[styles.dockBtnTextLight, !inCombat && { color: '#1A1200' }]}
                numberOfLines={1}
              >
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
              <VaultButton
                label="Close"
                variant="secondary"
                small
                onPress={() => setAshwell(null)}
                style={styles.modalBtn}
              />
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
              <VaultButton
                label="Close"
                variant="secondary"
                small
                onPress={() => setLogOpen(false)}
                style={styles.modalBtn}
              />
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
              <Icon
                name={battle.winner === 'player' ? 'trophy' : 'skull'}
                size={30}
                color={battle.winner === 'player' ? palette.goldBright : '#E8A090'}
              />
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
                <VaultButton
                  label="Rematch"
                  variant="secondary"
                  icon="refresh"
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
                  style={styles.cinemaAction}
                />
                <VaultButton
                  label="Leave"
                  icon="forward"
                  onPress={() => nav.goBack()}
                  style={styles.cinemaAction}
                />
              </View>
            </LinearGradient>
          </View>
        </Modal>

        {/* ── Hand ── */}
        <View style={[styles.handFan, { height: fanHeight }]}>
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
            const rot = offset * 2.0;
            const lift = Math.abs(offset) * -1.5;
            const selected = battle.selectedHandIndex === idx;
            return (
              <HandCardFlyIn key={slotKey} animate={isNewDraw}>
                <View
                  style={[
                    styles.handCardWrap,
                    {
                      marginLeft: idx === 0 ? 0 : -Math.round(handW * handOverlap),
                      zIndex: selected ? 40 : 10 + idx,
                      transform: [
                        { translateY: selected ? -18 + lift : lift },
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
            ? () => {
                const idx = zoomHandIndex;
                setZoomCard(null);
                setZoomHandIndex(null);
                doPlay(idx);
              }
            : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bgDeep },
  bgImage: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, width: '100%', height: '100%' },
  bgFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  safe: { flex: 1 },
  muted: { ...type.caption, textAlign: 'center', marginTop: 40, marginBottom: 16 },
  discardFx: {
    position: 'absolute',
    left: SCREEN_W / 2 - 42,
    bottom: 196,
    zIndex: 80,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 2,
    gap: 6,
  },
  headerMeta: { flex: 1 },
  foeName: {
    color: palette.text,
    fontSize: 14,
    fontFamily: fonts.display,
    letterSpacing: 0.3,
    lineHeight: 18,
  },
  headerSub: { ...type.caption, fontSize: 11, marginTop: 2, color: '#C0C6D0' },

  lifeStat: {
    minWidth: 60,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: 'rgba(212,168,75,0.55)',
    backgroundColor: 'rgba(26,22,12,0.85)',
    alignItems: 'center',
    gap: 2,
  },
  lifeStatFoe: {
    borderColor: 'rgba(196,69,54,0.55)',
    backgroundColor: 'rgba(26,12,16,0.85)',
  },
  lifeStatNum: {
    color: palette.goldBright,
    fontSize: 21,
    fontFamily: fonts.displayBlack,
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
    borderRadius: radii.sm,
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
    fontFamily: fonts.displayBlack,
    letterSpacing: 6,
    textShadowColor: '#C44536',
    textShadowRadius: 12,
  },
  clashSub: { ...type.caption, color: '#E0C090', marginTop: 6, letterSpacing: 1 },

  phasePill: {
    borderWidth: 1.5,
    borderRadius: radii.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
    minWidth: 62,
    alignItems: 'center',
    backgroundColor: 'rgba(20,16,12,0.85)',
  },
  phasePillText: { fontSize: 12, fontFamily: fonts.bodySemi, letterSpacing: 0.5 },

  phaseTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 8,
    gap: 0,
  },
  phaseStep: {
    paddingHorizontal: 5,
    paddingVertical: 5,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: 38,
    alignItems: 'center',
  },
  phaseStepActive: {
    borderColor: 'rgba(212,168,75,0.6)',
    backgroundColor: 'rgba(212,168,75,0.12)',
  },
  phaseStepText: {
    color: '#5F6B7E',
    fontSize: 10,
    fontFamily: fonts.bodySemi,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  phaseStepTextActive: { color: palette.goldBright },
  phaseRail: { width: 10, height: 1.5, backgroundColor: '#2A303C' },
  phaseRailHot: { backgroundColor: 'rgba(212,168,75,0.4)' },

  hint: {
    ...type.caption,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 12,
    paddingVertical: 2,
    marginBottom: 2,
    lineHeight: 18,
    minHeight: 22,
  },

  arena: {
    flex: 1,
    marginHorizontal: 6,
    overflow: 'hidden',
    minHeight: 150,
  },
  half: {
    flex: 1,
    paddingVertical: 2,
    paddingHorizontal: 6,
    justifyContent: 'space-between',
    overflow: 'hidden',
    minHeight: 0,
  },
  halfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  unitScroll: { flex: 1 },
  unitRow: {
    alignItems: 'center',
    gap: 8,
    paddingRight: 4,
    paddingLeft: 4,
    paddingVertical: 4,
    minHeight: 0,
  },
  fieldCardSlot: { paddingHorizontal: 3, paddingVertical: 3 },
  fieldCardLift: {
    transform: [{ translateY: -4 }, { scale: 1.03 }],
  },
  fieldCardAttackGlow: {
    shadowColor: '#C44536',
    shadowOpacity: 0.9,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  fieldCardBlockGlow: {
    shadowColor: '#3B8FD9',
    shadowOpacity: 0.9,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  emptyField: {
    ...type.caption,
    color: 'rgba(255,255,255,0.35)',
    paddingHorizontal: 12,
    paddingVertical: 20,
  },
  fieldAimGlow: {
    shadowColor: '#FFB84D',
    shadowOpacity: 0.9,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 9,
  },
  statPill: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 38,
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(120,140,170,0.28)',
    backgroundColor: 'rgba(10,13,18,0.55)',
  },
  statPillValue: {
    color: '#D8DEE8',
    fontSize: 13,
    fontFamily: fonts.bodyBold,
  },
  statPillLabel: {
    color: '#8A93A3',
    fontSize: 8.5,
    fontFamily: fonts.bodySemi,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 1,
  },

  permStrip: {
    paddingLeft: 6,
    paddingRight: 4,
    paddingVertical: 4,
    zIndex: 20,
    elevation: 8,
  },
  domainCaption: {
    fontFamily: fonts.bodySemi,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: palette.gold,
    marginBottom: 4,
  },
  essenceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  essenceLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: palette.gold,
    marginRight: 4,
  },
  essencePip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.35)',
  },
  essencePipText: {
    color: '#0A0E14',
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 0.2,
  },
  essenceEmpty: {
    color: palette.textMuted,
    fontSize: 11,
    fontFamily: fonts.bodySemi,
  },
  domainRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 6,
    alignItems: 'center',
    paddingRight: 4,
    paddingVertical: 3,
    minHeight: 0,
  },
  domainEmpty: { ...type.caption, fontSize: 10, color: '#A8B0C0' },
  domainTile: {
    borderRadius: radii.sm,
    borderWidth: 2,
    overflow: 'visible',
    backgroundColor: 'rgba(10,13,18,0.75)',
    padding: 3,
  },
  domainTileHot: {
    shadowColor: palette.gold,
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 6,
  },
  permCardWrap: {
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: 'rgba(180,150,80,0.65)',
    overflow: 'visible',
    backgroundColor: 'rgba(26,22,12,0.75)',
    padding: 3,
  },
  exhausted: { opacity: 0.45 },

  // ── Compact resource strip (essence pool + domain tokens) ──
  resStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(212,168,75,0.22)',
    backgroundColor: 'rgba(10,13,18,0.62)',
  },
  resStripFoe: {
    borderColor: 'rgba(196,69,54,0.22)',
    backgroundColor: 'rgba(14,10,12,0.55)',
  },
  resPool: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  resLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 9.5,
    letterSpacing: 0.8,
    color: palette.gold,
  },
  resLabelFoe: { color: '#C89088' },
  resDivider: { width: 1, alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.10)' },
  resScroll: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 6 },
  resReady: {
    fontFamily: fonts.bodySemi,
    fontSize: 10,
    color: '#8A93A3',
    marginLeft: 2,
    marginRight: 4,
  },
  resEmpty: { ...type.caption, fontSize: 10.5, color: '#8A93A3', fontStyle: 'italic' },
  token: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokenReady: {
    shadowColor: palette.gold,
    shadowOpacity: 0.7,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },

  divider: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 22,
    marginVertical: 2,
  },
  dividerLine: { position: 'absolute', left: 24, right: 24, height: StyleSheet.hairlineWidth },
  turnBadgeWrap: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(10,13,18,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(212,168,75,0.45)',
  },
  turnBadge: {
    color: palette.goldBright,
    fontSize: 11,
    fontFamily: fonts.bodyBold,
    letterSpacing: 1.2,
  },

  logIconBtn: {
    width: 30,
    height: 30,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(212,168,75,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16,21,30,0.7)',
  },
  concedeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(196,69,54,0.45)',
    backgroundColor: 'rgba(26,16,20,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logModalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  logModalSheet: {
    maxHeight: '55%',
    backgroundColor: '#10141C',
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(212,168,75,0.2)',
    padding: 18,
  },
  logModalScroll: { maxHeight: 280, marginVertical: 10 },
  logTitle: {
    color: palette.gold,
    fontSize: 15,
    fontFamily: fonts.display,
    letterSpacing: 1,
  },
  logLine: { ...type.caption, fontSize: 12.5, marginBottom: 6, lineHeight: 17 },
  modalBtn: { alignSelf: 'center', paddingHorizontal: 30 },

  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 8,
    flexWrap: 'nowrap',
    zIndex: 30,
    elevation: 12,
    backgroundColor: 'rgba(8,10,14,0.72)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(212,168,75,0.22)',
  },
  // flexShrink:0 so the life anchor never collapses under the action buttons
  // (that collapse is what made "Skip Combat" overlap the life number).
  dockLeft: { alignItems: 'center', gap: 2, flexShrink: 0 },
  dockDeck: { ...type.caption, fontSize: 10, color: '#A8B0C0' },
  dockActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    flexWrap: 'nowrap',
    justifyContent: 'flex-end',
  },
  dockBtnGhost: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#3A4252',
    paddingHorizontal: 8,
    paddingVertical: 10,
    minWidth: 58,
    minHeight: 44,
    flexShrink: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dockBtnPlay: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(212,168,75,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 10,
    minWidth: 58,
    minHeight: 44,
    flexShrink: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dockBtnPrimary: {
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 96,
    minHeight: 44,
    flexGrow: 1,
    flexShrink: 1,
    maxWidth: 176,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...shadows.cardLift,
  },
  dockBtnCombat: {},
  dockBtnFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: radii.md,
  },
  dockBtnTextMuted: { color: palette.textMuted, fontSize: 12.5, fontFamily: fonts.bodySemi },
  dockBtnTextGold: {
    color: palette.goldBright,
    fontSize: 13,
    fontFamily: fonts.display,
    letterSpacing: 0.6,
  },
  dockBtnTextLight: {
    color: '#F5E6DC',
    fontSize: 13,
    fontFamily: fonts.display,
    letterSpacing: 0.6,
  },
  ashwellSub: { ...type.caption, marginTop: 4, marginBottom: 4, fontStyle: 'italic' },
  ashwellRow: {
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2A3344',
  },
  ashwellRowText: { color: palette.text, fontSize: 13, fontFamily: fonts.body },
  disabled: { opacity: 0.35 },

  targetBanner: {
    marginHorizontal: 12,
    marginTop: 6,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.gold,
    backgroundColor: 'rgba(26,22,12,0.94)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  targetBannerText: { color: palette.goldBright, fontFamily: fonts.bodySemi, fontSize: 12.5, flex: 1 },
  targetBannerActions: { flexDirection: 'row', gap: 6 },
  targetFaceBtn: {
    backgroundColor: '#C44536',
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  targetFaceText: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 11 },
  targetCancelBtn: {
    borderWidth: 1,
    borderColor: '#5A6170',
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  targetCancelText: { color: palette.textMuted, fontFamily: fonts.bodySemi, fontSize: 11 },

  responseBanner: {
    marginHorizontal: 12,
    marginTop: 6,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(59,143,217,0.5)',
    backgroundColor: 'rgba(12,26,40,0.94)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  responseBannerText: { color: '#A8D4F5', fontFamily: fonts.bodySemi, fontSize: 13 },
  responseBannerSub: { color: '#7FA8C8', fontFamily: fonts.bodyMedium, fontSize: 10.5, marginTop: 1 },
  responsePassBtn: {
    backgroundColor: '#3B8FD9',
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  responsePassText: { color: '#0A1420', fontFamily: fonts.bodyBold, fontSize: 12 },

  // ── The Stack ──
  stackOverlay: {
    position: 'absolute',
    top: '32%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 60,
  },
  stackTitle: {
    color: palette.goldBright,
    fontFamily: fonts.display,
    fontSize: 13,
    letterSpacing: 2,
  },
  stackHint: { ...type.caption, fontSize: 10, fontStyle: 'italic', marginBottom: 8 },
  stackList: { alignItems: 'center' },
  stackItem: {
    minWidth: 168,
    maxWidth: 240,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radii.md,
    borderWidth: 1.5,
    alignItems: 'center',
    ...shadows.deep,
  },
  stackItemMine: {
    backgroundColor: 'rgba(26,22,12,0.97)',
    borderColor: 'rgba(212,168,75,0.7)',
  },
  stackItemFoe: {
    backgroundColor: 'rgba(28,14,14,0.97)',
    borderColor: 'rgba(196,69,54,0.7)',
  },
  stackWho: { fontFamily: fonts.bodyBold, fontSize: 8.5, letterSpacing: 1 },
  stackName: { color: palette.text, fontFamily: fonts.display, fontSize: 13, marginTop: 2 },

  // ── Cast ripple ──
  castFx: {
    position: 'absolute',
    top: '38%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 58,
  },
  castRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: 'rgba(240,199,94,0.85)',
    backgroundColor: 'rgba(26,22,12,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.goldGlow,
  },
  castName: {
    color: palette.goldBright,
    fontFamily: fonts.display,
    fontSize: 14,
    letterSpacing: 0.5,
    marginTop: 8,
    textShadowColor: '#000',
    textShadowRadius: 8,
  },

  // ── Turn hand-off sweep ──
  turnSweep: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 55,
  },
  turnSweepText: {
    color: palette.goldBright,
    fontFamily: fonts.displayBlack,
    fontSize: 30,
    letterSpacing: 3,
    textShadowColor: '#000',
    textShadowRadius: 12,
  },


  tutorialOverlay: {
    position: 'relative',
    marginHorizontal: 12,
    marginVertical: 4,
    zIndex: 20,
    alignItems: 'center',
  },
  tutorialCard: {
    backgroundColor: 'rgba(15,20,32,0.96)',
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: palette.gold,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    maxWidth: 360,
    ...shadows.deep,
  },
  tutorialTitle: { ...type.kicker, marginBottom: 8 },
  tutorialSteps: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  tutorialStep: {
    color: palette.text,
    fontSize: 11.5,
    fontFamily: fonts.bodySemi,
  },

  cinemaBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  cinemaCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: radii.xl,
    borderWidth: 1.5,
    borderColor: 'rgba(212,168,75,0.45)',
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    ...shadows.deep,
  },
  cinemaTitle: {
    fontSize: 34,
    fontFamily: fonts.displayBlack,
    letterSpacing: 3,
    marginTop: 12,
    marginBottom: 10,
  },
  cinemaGold: {
    color: palette.text,
    fontSize: 14.5,
    fontFamily: fonts.bodySemi,
    marginBottom: 24,
    textAlign: 'center',
  },
  cinemaActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  cinemaAction: { minWidth: 118 },

  handFan: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingTop: 8,
    paddingBottom: 4,
    minHeight: 126,
    overflow: 'visible',
    zIndex: 10,
    backgroundColor: 'rgba(8,10,14,0.55)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(212,168,75,0.14)',
  },
  handCardWrap: {
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
});
