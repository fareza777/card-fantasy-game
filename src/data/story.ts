export interface StoryChapter {
  id: string;
  title: string;
  subtitle: string;
  act: 'I' | 'II' | 'III';
  body: string[];
  linkedCardIds: string[];
  unlockHint?: string;
}

export const ORIGINS_PROLOGUE = `Before kingdoms kept calendars, the Archivists carved the Rune Vault into the marrow of the world and bound five Essences inside it — Dawn, Tide, Shade, Ember, and Thorn. Each Essence was not a god but a wound the world refused to forget: the first sunrise after the Long Night, the tide that drowned a tyrant fleet, the shadow that swallowed a false prophet, the fire that burned a city to save a continent, the thorn-forest that grew over mass graves until no bone showed. The Vault did not destroy these forces. It taught them to wait.

For centuries the Archivist order swore runners through the vault's living corridors — oathbound couriers who carry sealed rune-slips between sanctums, never looking directly at what sleeps behind the inner doors. You are one of them, newly sworn, still smelling of incense and cold stone. Your first ledger entry reads like a blessing. Your second reads like a warning.

Somewhere in the Vault's inverted geography, a rival voice has learned to mimic the catalog. They call themselves the Hollow Archivist, and their sermons are not written in ink but in absence — pages that forget their own text, seals that loosen when no one is watching. They do not want the Essences freed. They want Malvora's Ash unsealed: the last breath of a queen who made death into currency and called it mercy. The Archivists say she must never rise. The Hollow Archivist asks, quietly, whether mercy and rot are always different words for the same hunger.`;

export const STORY_ACTS: Record<'I' | 'II' | 'III', { label: string; description: string }> = {
  I: {
    label: 'Act I — The Oathbound Descent',
    description: 'Your initiation as a Vault Runner and the first fractures in the seals.',
  },
  II: {
    label: 'Act II — The Hollow Catalog',
    description: 'The enemy Archivist rewrites the Vault; factions bargain for survival.',
  },
  III: {
    label: 'Act III — Ash at the Threshold',
    description: 'Malvora stirs. Every Essence demands a price for what comes next.',
  },
};

export const STORY_CHAPTERS: StoryChapter[] = [
  {
    id: 'origins-01',
    title: 'The Ledger and the Door',
    subtitle: 'Initiation beneath the Sunlit Sanctum',
    act: 'I',
    body: [
      'You descend through the Sunlit Sanctum while dawn-essence pools in the floor-grates like melted gold. Senior Archivists stand only as hooded silhouettes against the stained light; they do not turn when they speak your oath, as if faces were another kind of seal the Vault prefers unbroken.',
      'Your palms still burn from the binding runes. The Vault of Ages accepts your name into its ledger — a relic older than any crown, its five sigils pulsing as though remembering every faction that ever paid tribute in blood or bargain.',
      'A Temple Acolyte walks ahead with a candle that does not flicker. "Runners do not guard the Vault," she says without looking back. "We carry what it refuses to hold alone." You are not sure whether that is honor or exile.',
      'At the first junction, your route-markers already disagree. One arrow points toward the sealed stacks. Another — newer, scratched in ash — points toward a corridor that should not exist on any map the Archivists gave you.',
    ],
    linkedCardIds: ['rv-001', 'rv-016', 'rv-041', 'rv-059'],
    unlockHint: 'Complete the tutorial battle to receive your starter deck.',
  },
  {
    id: 'origins-02',
    title: 'Five Wounds, Five Keys',
    subtitle: 'The geography of sealed Essences',
    act: 'I',
    body: [
      'The Archivists teach that the Vault is not a prison but a grammar: five Essences, five syntaxes by which reality may be spoken without tearing. Dawn is promise. Tide is memory. Shade is consequence. Ember is refusal. Thorn is persistence. Together they hold the world in a sentence it has not finished reading.',
      'Each sanctum corridor opens onto a domain-threshold — Sunlit halls, moonlit shoals, hollow crypts, cinder forges, wildroot groves — not places exactly, but moods made stone. Runners learn to read them the way sailors read weather.',
      'You catalog your first slips beside a wall of empty niches. Some niches still hum. Others have gone quiet in a way that feels deliberate, as if something inside chose to stop answering when called.',
      'That night you dream in five colors at once. When you wake, a Blessing of Dawn has been left at your bunk though no one admits to casting it — and your route ledger shows a sixth corridor you did not walk.',
    ],
    linkedCardIds: [
      'rv-001', 'rv-002', 'rv-003',
      'rv-004', 'rv-005', 'rv-006',
      'rv-007', 'rv-008', 'rv-009',
      'rv-010', 'rv-011', 'rv-012',
      'rv-013', 'rv-014', 'rv-015',
      'rv-041',
    ],
    unlockHint: 'Collect at least one Domain from each Essence faction.',
  },
  {
    id: 'origins-03',
    title: 'What the Tide Remembers',
    subtitle: 'Nerissa\'s warning in the Whispering Deep',
    act: 'I',
    body: [
      'The Tide vault-wing smells of salt and old parchment. Here the walls listen. Every footstep returns a half-second late, as if the Deep is choosing whether to repeat you.',
      'Nerissa, Tideborn Oracle, meets you at Moonlit Shoal without sending word beforehand — which means she saw your arrival before you made it. Her voice arrives from behind a veil of mist, never quite synced with the movement of her silhouette. "The Hollow Archivist is not a thief," she says. "Thieves want things. It wants the catalog to agree that nothing was ever stolen."',
      'She shows you a memory the Vault tried to redact: a runner drowned in duty, not water, because they read a page that unmade their own name. Tidal Recall could have saved them. The Archivists chose archive over rescue.',
      'Nerissa presses a rune-slip into your hand. "When the Hollow speaks, do not answer with certainty. Certainty is how seals break." The slip is marked with Everflow Current — and beneath it, in ash, a single word: Malvora.',
    ],
    linkedCardIds: ['rv-004', 'rv-005', 'rv-006', 'rv-025', 'rv-043', 'rv-044', 'rv-054'],
    unlockHint: 'Win a battle using at least two Tide cards.',
  },
  {
    id: 'origins-04',
    title: 'Ember Debts',
    subtitle: 'The Cinder Forge remembers every oath broken hot',
    act: 'II',
    body: [
      'Ember runners do not whisper. They bargain. In the Cinder Forge the air tastes of iron and old anger, and the Ember Whelps race along gantries as if the Vault were built for speed alone.',
      'Ignis, the Wildfire King, does not appear so much as announce himself — a crowned silhouette at the ridge-line of Emberfall, flame crawling his cloak like a living sigil. "The Archivists sealed us all," he says, "but only Ember still keeps receipts." He claims the Hollow Archivist offered him a simple trade: unseal Malvora\'s Ash and Ember walks free of the Vault forever.',
      'You ask whether he believes the Hollow. Ignis laughs, a sound like dry timber catching. "I believe hunger. The Hollow hungers for a world without Archivists. Malvora hungers for a world without endings. I hunger for a world that stops telling fire it must be patient."',
      'Before you leave, a Spark Bolt scars the wall beside your head — not to kill, but to measure reflex. "Bring me the Hourglass relic," Ignis says, "and I will tell you which seal the Hollow touches first." It is not an offer. It is a duel dressed as commerce.',
    ],
    linkedCardIds: ['rv-010', 'rv-011', 'rv-012', 'rv-031', 'rv-032', 'rv-049', 'rv-050', 'rv-035', 'rv-056', 'rv-060'],
    unlockHint: 'Defeat the Ember trial encounter in Act II.',
  },
  {
    id: 'origins-05',
    title: 'The Hollow Catalog',
    subtitle: 'When absence learns your name',
    act: 'II',
    body: [
      'You find the Hollow Archivist\'s work in the Ashen Catacomb: ledgers whose entries erase themselves as you read, niches that contain less than empty space. Shade-essence gathers here like breath on glass.',
      'The Hollow does not show a face — only a hooded outline that seems carved from the wall\'s own shadow, voice layered as if spoken from the bottom of a well. "I was an Archivist once," it says. "I catalogued mercy until I noticed mercy always arrived too late to the same villages."',
      'It speaks of Malvora, Queen of Ash, not as monster but as symptom: a ruler who inherited famine and chose to make death efficient rather than sacred. The Archivists sealed her not because she was evil, they argue, but because she proved death could be governed like grain — and governed things invite successors.',
      'Grave Pilferers skitter at the Hollow\'s command, not loyal but contractual. The Pact of the Hollow binds every fallen runner into a ledger of traded grief. You realize with cold clarity that your initiation oath shares the same cadence. Different ink. Same binding.',
    ],
    linkedCardIds: ['rv-007', 'rv-008', 'rv-009', 'rv-026', 'rv-027', 'rv-046', 'rv-055', 'rv-030'],
    unlockHint: 'Survive the Shade ambush with your life above 10.',
  },
  {
    id: 'origins-06',
    title: 'Rootbound Judgment',
    subtitle: 'Yggrid weighs what grows over graves',
    act: 'II',
    body: [
      'Thorn does not speak quickly. You wait three days in Wildroot Grove before Yggrid, the World Root, acknowledges your footstep — and even then only as vibration through bark, a language older than the Archivist script.',
      'Her messengers are beasts and tenders: Sprigwood Tenders planting seeds in cracks you did not know were wounds, a Grovewarden Treant blocking a path until you answer a riddle about what should be remembered versus what should be compost. Thorn\'s morality is not good versus evil. It is what persists versus what pretends it never happened.',
      'Yggrid shows you the Vault from below — roots threading through seal-stone like fingers through hair. "Malvora\'s Ash is a seed," she says. "The Archivists buried it. The Hollow waters it with grievance. I would let it sprout once, so the world learns the shape of that fruit — and then cut the tree." You cannot tell if that is wisdom or cruelty. Both feel Thorn-authentic.',
      'She offers Rootbound Pact without smiling. Growth, she warns, is never free; it only deferrs the invoice. Overgrowth can save a corridor. It can also erase the map you need to leave.',
    ],
    linkedCardIds: ['rv-013', 'rv-014', 'rv-015', 'rv-036', 'rv-038', 'rv-040', 'rv-052', 'rv-057'],
    unlockHint: 'Control three or more Domains in a single battle.',
  },
  {
    id: 'origins-07',
    title: 'Dawn\'s Last Argument',
    subtitle: 'Aurelian stands where light refuses compromise',
    act: 'III',
    body: [
      'Act III begins at Highglade Chapel with bells that ring at dawn for people who no longer come. Dawn-essence here feels thinner, stretched — as if someone has been drinking the morning itself.',
      'Aurelian, the Dawnbreaker, waits on the chapel steps as a winged silhouette against a sun that rises but does not warm. The Sunblade Paladin beside him says nothing; his sealed helm turns once toward you, judging without eyes.',
      'Aurelian\'s argument is simple and terrible: unseal Malvora and the Vault\'s grammar collapses. Shade consumes Dawn. Ember devours Thorn. Tide drowns memory until no one recalls why the seals existed. "The Hollow Archivist is right about our failures," Aurelian admits. "It is wrong to think failure obliges us to open the door and call the flood mercy."',
      'He offers Aegis Ward — protection for what you still carry — and asks you to choose a runner\'s oldest lie: that guarding a unjust peace is the same as building a just one. Behind him, Sanctuary of Light flickers, barely holding.',
    ],
    linkedCardIds: ['rv-002', 'rv-003', 'rv-018', 'rv-019', 'rv-020', 'rv-042', 'rv-053'],
    unlockHint: 'Restore 4 or more life in one turn using Dawn cards.',
  },
  {
    id: 'origins-08',
    title: 'Harvest at the Ash Threshold',
    subtitle: 'Malvora\'s seal cracks; the Vault asks who you serve',
    act: 'III',
    body: [
      'The final seal-room is not grand. It is a narrow chamber in Nightveil Hollow where ash drifts though no fire burns. Malvora, Queen of Ash, stands chained in rune-light — seen from behind, cracked crown, grey jubah, black flame licking the floor without heat.',
      'The Hollow Archivist\'s voice comes from everywhere at once: "She did not want to be queen of the dead. She wanted the dead to count." On the wall, Harvest of Shadows writhes in anticipation. Soul Siphon hums like a held breath.',
      'Malvora speaks for the first time without turning. "Every Archivist who sealed me still lives in the ledgers I wrote," she says. "You carry their oath. Ask whether their mercy ever reached your village before you decide I am the only monster in this room."',
      'Your Runeforged Blade pulses. The Shattered Hourglass shows two futures and refuses to tell you which is cowardice. Dawn bells ring far above. Tide rises in the lower stacks. Somewhere Ignis waits for fire. Yggrid\'s roots tighten around the seal-stone. The Vault does not care who wins — only that someone chooses, and pays in Essence.',
    ],
    linkedCardIds: [
      'rv-008', 'rv-009', 'rv-028', 'rv-029', 'rv-030',
      'rv-047', 'rv-048', 'rv-058', 'rv-059', 'rv-060',
    ],
    unlockHint: 'Win the Origins finale against the Hollow Archivist deck.',
  },
  {
    id: 'origins-09',
    title: 'Catalogued Aftermath',
    subtitle: 'What runners write when the seals hold — or don\'t',
    act: 'III',
    body: [
      'Victory does not echo in the Vault. It settles, like dust after a collapse you cannot yet measure.',
      'If the seal holds, the Archivists will call you faithful. Nerissa will call you late. Ignis will call you a debtor who escaped interest. Yggrid will call you compost with ambition. Aurelian will simply nod — the closest Dawn comes to praise.',
      'If the seal breaks, Malvora\'s Ash will not conquer the world in a day. That is not her method. She will rewrite ledgers, one name at a time, until mercy and rot share an index entry and the Hollow Archivist finally becomes redundant.',
      'You inscribe your report anyway. The Vault of Ages accepts it. For now, the five Essences remain five — wounds still teaching the world how to speak without tearing. You are still a Runner. The corridors still disagree about which way is out.',
    ],
    linkedCardIds: ['rv-019', 'rv-025', 'rv-035', 'rv-040', 'rv-059'],
    unlockHint: 'View your full story progress from the Collection screen.',
  },
];

export function getChapter(id: string): StoryChapter | undefined {
  return STORY_CHAPTERS.find((chapter) => chapter.id === id);
}

export function getChaptersByAct(act: 'I' | 'II' | 'III'): StoryChapter[] {
  return STORY_CHAPTERS.filter((chapter) => chapter.act === act);
}

export const FACTION_LORE: Record<'Dawn' | 'Tide' | 'Shade' | 'Ember' | 'Thorn', string> = {
  Dawn:
    'Dawn is the Essence of kept promises — the light that returns not because the world deserves it but because someone once swore it would. Archivists invoke it for healing, wards, and the stubborn belief that tomorrow can be better without pretending yesterday did no harm.',
  Tide:
    'Tide is memory with teeth — currents that store what land forgets, tides that return what was thrown away. Its oracles do not predict the future; they recall versions of it the Vault tried to redact, and ask whether rescue is still possible at the price of truth.',
  Shade:
    'Shade is consequence made ambient — not evil, but the ledger\'s shadow: every deferred punishment, every name crossed out instead of mourned. Malvora\'s Ash sleeps here because Shade alone admits that mercy and rot sometimes share handwriting.',
  Ember:
    'Ember is refusal that burns — the Essence of doors kicked open, debts called due, and patience mistaken for permission. It does not start wars in the Vault; it finishes arguments the other factions politely postponed until someone flinched.',
  Thorn:
    'Thorn is persistence without sentiment — roots that break stone, seasons that outlive empires, groves that grow over graves until history becomes habitat. Thorn judges not by intention but by what still stands after the fire and the flood have argued themselves hoarse.',
};
