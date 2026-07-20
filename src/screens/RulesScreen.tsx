import React from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import { palette } from '../theme/colors';
import { VaultScreenShell } from '../components/VaultScreenShell';

export function RulesScreen() {
  return (
    <VaultScreenShell>
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>How to Play</Text>

      <Text style={styles.h}>Goal</Text>
      <Text style={styles.p}>
        Reduce the enemy from 20 life to 0. If you cannot draw from an empty deck, you lose. Destroyed
        cards go to the Ashwell (spent runes — tap the Ashes pile in battle to inspect).
      </Text>

      <Text style={styles.h}>Turn structure</Text>
      <Text style={styles.p}>
        1. Ready — untap Domains & Units{'\n'}
        2. Upkeep — start-of-turn effects{'\n'}
        3. Draw — draw 1 (skipped on the very first turn){'\n'}
        4. Main Phase 1 — play Domain / Units / Bonds / Relics; cast Sigils & Canticles{'\n'}
        5. Combat — declare attackers → blockers → damage{'\n'}
        6. Main Phase 2 — play more cards{'\n'}
        7. End / Cleanup — discard down to 7, clear damage, pass turn
      </Text>

      <Text style={styles.h}>Speed (when you may cast)</Text>
      <Text style={styles.p}>
        Domain, Unit, Bond, Relic, Canticle — Main Phase only (sorcery speed).{'\n'}
        Sigil — Instant speed (Main, Combat steps, End Step, and response windows).{'\n'}
        Exhaust Domain for Essence anytime you have priority.
      </Text>

      <Text style={styles.h}>Combat</Text>
      <Text style={styles.p}>
        Enter Combat from Main 1. Tap ready Units to attack the enemy player, then Confirm
        Attackers. The defender assigns blockers. Unblocked damage hits life. Blocked Units clash
        (Power vs Resolve). You can Skip Combat to go straight to Main 2.
      </Text>

      <Text style={styles.h}>Domains & Essence</Text>
      <Text style={styles.p}>
        Play up to 1 Domain per turn (unless an effect allows more). Exhaust a Domain to gain 1
        Essence of its faction. Spend Essence to cast spells and deploy Units.
      </Text>

      <Text style={styles.h}>Keywords</Text>
      <Text style={styles.p}>
        Raid — may attack the turn it enters.{'\n'}
        Flash — may be cast at instant speed (including on the enemy turn).{'\n'}
        Guard — If you control an untapped Guard, you must assign it to block while any
        attacker is unblocked.{'\n'}
        Ward — Enemy spells cannot choose a Ward unit as a target (combat damage still hits).
        {'\n'}
        Drain — combat damage also restores your life.{'\n'}
        Pierce — excess damage beyond a Unit hits face.
      </Text>

      <Text style={styles.h}>Zones</Text>
      <Text style={styles.p}>
        Deck · Hand · Battlefield · Ashwell. Tap Ashes in battle to review spent cards.
      </Text>

      <Text style={styles.h}>Boosters</Text>
      <Text style={styles.p}>
        Each pack: 11 cards — 7 Common, 3 Uncommon, 1 Rare-or-better (~3% Legendary). Cost 100 gold.
        Spare copies can be Disenchanted for dust; Forge missing Commons–Rares in the Shop.
        Win a duel for +50 gold.
      </Text>
    </ScrollView>
    </VaultScreenShell>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 24, paddingBottom: 40 },
  title: { color: palette.text, fontSize: 28, fontWeight: '800', marginBottom: 16 },
  h: { color: palette.gold, fontSize: 16, fontWeight: '800', marginTop: 16, marginBottom: 6 },
  p: { color: palette.text, lineHeight: 22, fontSize: 14 },
});
