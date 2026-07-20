# Rune Vault — Audit Implementation (19 Jul 2026 night)

Implemented all 10 audit recommendations.

## Engine
1. **Stack + priority** — Rites push/pop stack log; `responseWindow` + `offerResponseWindow` / `passPriority` during enemy Main.
2. **Guard & Ward** — Ward illegal for Rite targets; Guards must block if able (`combatRules.ts`).
3. **Data-driven** — Bonds call `applyCardEtb`; AI respects structured `rite` fx.
4. **Smarter AI** — selective attackers; board-aware rite scoring; 4 archetypes (shade/ember/dawn/tide) with Domain×4 limits.

## Features
5. Story progress — cleared seals, act %, soft-gate, Home Continue Ledger.
6. Deck curve + Slot A/B; Collection type/rarity/owned filters + tap detail.
7. Shop hero art; Profile story/last win; victory gold via `lastGoldGain`.
8. First-battle tutorial overlay; casual AI deck variety.

## Visual
9. VaultScreenShell on secondary screens; rune tab glyphs.
10. Essence pip strips; victory/defeat cinema modal; empty-field copy.
