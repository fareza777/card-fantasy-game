import { StoryChapter } from './story';

/** Scripted opponent decks for Vault Ledger scenario battles (40 cards each). */
export interface StoryScenario {
  chapterId: string;
  foeName: string;
  briefing: string;
  rewardGold: number;
  enemyDeck: string[];
}

function deck(parts: [string, number][]): string[] {
  const out: string[] = [];
  for (const [id, n] of parts) {
    for (let i = 0; i < n; i++) out.push(id);
  }
  while (out.length < 40) out.push(parts[0][0]);
  return out.slice(0, 40);
}

export const STORY_SCENARIOS: StoryScenario[] = [
  {
    chapterId: 'origins-01',
    foeName: 'Sanctum Shade',
    briefing: 'A rogue shadow slips past the Sunlit Sanctum seals. Clear it before the ledger notices.',
    rewardGold: 40,
    enemyDeck: deck([
      ['rv-007', 6],
      ['rv-008', 6],
      ['rv-026', 4],
      ['rv-027', 4],
      ['rv-046', 4],
      ['rv-016', 2],
      ['rv-031', 4],
      ['rv-049', 4],
      ['rv-010', 6],
    ]),
  },
  {
    chapterId: 'origins-02',
    foeName: 'Fractured Catalog',
    briefing: 'Five Essence echoes quarrel in the corridor. Stabilize the grammar of the Vault.',
    rewardGold: 45,
    enemyDeck: deck([
      ['rv-001', 3],
      ['rv-004', 3],
      ['rv-007', 3],
      ['rv-010', 3],
      ['rv-013', 3],
      ['rv-016', 3],
      ['rv-021', 3],
      ['rv-026', 3],
      ['rv-031', 3],
      ['rv-036', 3],
      ['rv-041', 2],
      ['rv-046', 2],
      ['rv-049', 2],
      ['rv-043', 2],
      ['rv-052', 2],
    ]),
  },
  {
    chapterId: 'origins-03',
    foeName: 'Tide Redactor',
    briefing: "Nerissa's warning made flesh — a Tide agent rewriting names from the Deep.",
    rewardGold: 50,
    enemyDeck: deck([
      ['rv-004', 6],
      ['rv-005', 6],
      ['rv-006', 4],
      ['rv-021', 4],
      ['rv-022', 3],
      ['rv-023', 3],
      ['rv-025', 2],
      ['rv-043', 4],
      ['rv-044', 4],
      ['rv-045', 2],
      ['rv-054', 2],
    ]),
  },
  {
    chapterId: 'origins-04',
    foeName: 'Ignis Debt-Collector',
    briefing: 'Ember comes due. Pay in steel or burn with the corridor.',
    rewardGold: 55,
    enemyDeck: deck([
      ['rv-010', 6],
      ['rv-011', 6],
      ['rv-012', 4],
      ['rv-031', 4],
      ['rv-032', 4],
      ['rv-033', 3],
      ['rv-034', 2],
      ['rv-035', 1],
      ['rv-049', 4],
      ['rv-050', 3],
      ['rv-051', 2],
      ['rv-056', 1],
    ]),
  },
  {
    chapterId: 'origins-05',
    foeName: 'Hollow Archivist',
    briefing: 'The rival catalog speaks. Do not answer with certainty — answer with force.',
    rewardGold: 60,
    enemyDeck: deck([
      ['rv-007', 6],
      ['rv-008', 6],
      ['rv-009', 6],
      ['rv-026', 4],
      ['rv-027', 4],
      ['rv-028', 3],
      ['rv-029', 2],
      ['rv-030', 1],
      ['rv-046', 3],
      ['rv-047', 3],
      ['rv-048', 2],
    ]),
  },
  {
    chapterId: 'origins-06',
    foeName: 'Rootbound Sentinel',
    briefing: "Yggrid's judgment: prove you persist, or become compost.",
    rewardGold: 55,
    enemyDeck: deck([
      ['rv-013', 6],
      ['rv-014', 6],
      ['rv-015', 6],
      ['rv-036', 4],
      ['rv-037', 4],
      ['rv-038', 3],
      ['rv-039', 2],
      ['rv-040', 1],
      ['rv-052', 4],
      ['rv-057', 2],
      ['rv-017', 2],
    ]),
  },
  {
    chapterId: 'origins-07',
    foeName: 'False Dawn Echo',
    briefing: "Aurelian's argument twisted — a light that heals nothing and wards everything wrong.",
    rewardGold: 60,
    enemyDeck: deck([
      ['rv-001', 5],
      ['rv-002', 5],
      ['rv-003', 5],
      ['rv-016', 4],
      ['rv-017', 4],
      ['rv-018', 3],
      ['rv-019', 2],
      ['rv-020', 1],
      ['rv-041', 4],
      ['rv-042', 4],
      ['rv-053', 3],
    ]),
  },
  {
    chapterId: 'origins-08',
    foeName: 'Malvora, Queen of Ash',
    briefing: 'The Ash Threshold. Choose carefully — the Vault is listening.',
    rewardGold: 100,
    enemyDeck: deck([
      ['rv-007', 5],
      ['rv-008', 5],
      ['rv-009', 5],
      ['rv-026', 3],
      ['rv-027', 3],
      ['rv-028', 3],
      ['rv-029', 3],
      ['rv-030', 2],
      ['rv-046', 3],
      ['rv-047', 3],
      ['rv-048', 3],
      ['rv-055', 2],
    ]),
  },
  {
    chapterId: 'origins-09',
    foeName: 'Aftermath Shade',
    briefing: 'Dust settles. One last echo challenges your report before the ledger closes.',
    rewardGold: 70,
    enemyDeck: deck([
      ['rv-007', 4],
      ['rv-010', 4],
      ['rv-013', 4],
      ['rv-001', 4],
      ['rv-026', 3],
      ['rv-031', 3],
      ['rv-036', 3],
      ['rv-016', 3],
      ['rv-046', 3],
      ['rv-049', 3],
      ['rv-052', 3],
      ['rv-041', 3],
    ]),
  },
];

export function getScenario(chapterId: string): StoryScenario | undefined {
  return STORY_SCENARIOS.find((s) => s.chapterId === chapterId);
}

export function chapterHasScenario(chapter: StoryChapter): boolean {
  return !!getScenario(chapter.id);
}
