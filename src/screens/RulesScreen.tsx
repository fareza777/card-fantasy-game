import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { palette } from '../theme/colors';
import { type, fonts } from '../theme/typography';
import { VaultScreenShell } from '../components/VaultScreenShell';
import { Icon, IconName } from '../components/Icon';

function RuleSection({ icon, title, children }: { icon: IconName; title: string; children: string }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Icon name={icon} size={14} color={palette.gold} />
        <Text style={styles.h}>{title}</Text>
      </View>
      <Text style={styles.p}>{children}</Text>
    </View>
  );
}

export function RulesScreen() {
  return (
    <VaultScreenShell>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <RuleSection icon="trophy" title="Goal">
          {
            'Reduce the enemy from 20 life to 0. If you cannot draw from an empty deck, you lose. Destroyed cards go to the Ashwell (spent runes — tap the Ashes pile in battle to inspect).'
          }
        </RuleSection>

        <RuleSection icon="timer" title="Turn structure">
          {
            '1. Ready — untap Domains & Units\n2. Upkeep — start-of-turn effects\n3. Draw — draw 1 (skipped on the very first turn)\n4. Main Phase 1 — play Domain / Units / Bonds / Relics; cast Sigils & Canticles\n5. Combat — declare attackers → blockers → damage\n6. Main Phase 2 — play more cards\n7. End / Cleanup — discard down to 7, clear damage, pass turn'
          }
        </RuleSection>

        <RuleSection icon="battle" title="Speed (when you may cast)">
          {
            'Domain, Unit, Bond, Relic, Canticle — Main Phase only (sorcery speed).\nSigil — Instant speed (Main, Combat steps, End Step, and response windows).\nExhaust Domain for Essence anytime you have priority.'
          }
        </RuleSection>

        <RuleSection icon="shield" title="Combat">
          {
            'Enter Combat from Main 1. Tap ready Units to attack the enemy player, then Confirm Attackers. The defender assigns blockers. Unblocked damage hits life. Blocked Units clash (Power vs Resolve). You can Skip Combat to go straight to Main 2.'
          }
        </RuleSection>

        <RuleSection icon="dust" title="Domains & Essence">
          {
            'Play up to 1 Domain per turn (unless an effect allows more). Exhaust a Domain to gain 1 Essence of its faction. Spend Essence to cast spells and deploy Units.'
          }
        </RuleSection>

        <RuleSection icon="cards" title="Keywords">
          {
            'Raid — may attack the turn it enters.\nFlash — may be cast at instant speed (including on the enemy turn).\nGuard — If you control an untapped Guard, you must assign it to block while any attacker is unblocked.\nWard — Enemy spells cannot choose a Ward unit as a target (combat damage still hits).\nDrain — combat damage also restores your life.\nPierce — excess damage beyond a Unit hits face.'
          }
        </RuleSection>

        <RuleSection icon="deck" title="Zones">
          {'Deck · Hand · Battlefield · Ashwell. Tap Ashes in battle to review spent cards.'}
        </RuleSection>

        <RuleSection icon="pack" title="Boosters">
          {
            'Each pack: 11 cards — 7 Common, 3 Uncommon, 1 Rare-or-better (~3% Legendary). Cost 100 gold. Spare copies can be Disenchanted for dust; Forge missing Commons–Rares in the Shop. Win a duel for +50 gold.'
          }
        </RuleSection>
      </ScrollView>
    </VaultScreenShell>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 22, paddingBottom: 44 },
  section: { marginBottom: 20 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 8,
    marginBottom: 9,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212,168,75,0.16)',
  },
  h: {
    fontFamily: fonts.display,
    color: palette.gold,
    fontSize: 15,
    letterSpacing: 0.8,
  },
  p: { ...type.body, lineHeight: 22 },
});
