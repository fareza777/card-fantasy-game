# Rune Vault: Fantasy Card Battle

Commercial-ready mobile TCG (Google Play first). Player vs AI, Origins set of **60 cards**, booster economy, collection, deck builder.

## Pack (booster)
**6 cards** per pack: 3 Common · 2 Uncommon · 1 Rare+ (15% Legendary)

## Run locally
```bash
cd rune-vault
npm install
npx expo start
```
Press `a` for Android emulator / device, or scan QR with Expo Go.

## Play Store build (EAS)
1. `npm i -g eas-cli` && `eas login`
2. Set a real `extra.eas.projectId` in `app.json`
3. `eas build -p android --profile production`
4. Upload the `.aab` to Google Play Console

## Stack
Expo (React Native) · TypeScript · Zustand · React Navigation

## Origins set
- **60/60 cards** with unique artwork in `assets/cards/`
- Frame + rules text rendered in-app (accurate, readable)

## Rules identity
Domain / Essence / Exhaust / Unit / Rite / Bond / Relic  
Factions: Dawn · Tide · Shade · Ember · Thorn  
Keywords: Raid · Guard · Ward · Drain · Pierce
