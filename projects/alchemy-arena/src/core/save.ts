import { ALL_CARD_IDS, INITIAL_DECK_IDS, INITIAL_UNLOCKED_IDS } from '../data/cards';
import type { ActiveJourney, DeckPresetId, JourneyLayer, NodeId, PracticeSettings, SaveV1, SaveV2 } from './types';

const SAVE_KEY = 'alchemy-arena.save.v1';
const NODE_IDS: NodeId[] = ['l1_trial', 'l1_greenhouse', 'l2_silver', 'l2_frost', 'l3_crown'];

export function createDefaultV1(): SaveV1 {
  return { version: 1, unlockedCardIds: [...INITIAL_UNLOCKED_IDS], deckCardIds: [...INITIAL_DECK_IDS], clearedStageIds: [], settings: { musicVolume: 0.38, sfxVolume: 0.65 } };
}

export function createDefaultSave(): SaveV2 {
  return {
    version: 2,
    unlockedCardIds: [...INITIAL_UNLOCKED_IDS],
    deckPresets: { '1': [...INITIAL_DECK_IDS], '2': [...INITIAL_DECK_IDS], '3': [...INITIAL_DECK_IDS] },
    activeDeckPreset: 1,
    practice: { deckIds: [...INITIAL_DECK_IDS], opponent: 'off', infiniteElixir: true, timerEnabled: false },
    nodeStars: {},
    nodeLossStreaks: {},
    firstClearedNodeIds: [],
    unlockedJourneyLayers: [1],
    activeJourney: null,
    tutorialCompleted: false,
    tutorialStep: 0,
    settings: { musicVolume: 0.38, sfxVolume: 0.65, preferredBattleSpeed: 1 },
  };
}

export function loadSave(): SaveV2 {
  if (typeof localStorage === 'undefined') return createDefaultSave();
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return createDefaultSave();
    return sanitizeSave(JSON.parse(raw) as Partial<SaveV2> & Partial<SaveV1>);
  } catch {
    return createDefaultSave();
  }
}

export function persistSave(save: SaveV2): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(SAVE_KEY, JSON.stringify(sanitizeSave(save)));
}

export function resetSave(): SaveV2 {
  const save = createDefaultSave();
  persistSave(save);
  return save;
}

export function getActiveDeck(save: SaveV2): string[] {
  return [...save.deckPresets[String(save.activeDeckPreset) as '1' | '2' | '3']];
}

export function updateDeck(save: SaveV2, deckCardIds: string[], preset: DeckPresetId = save.activeDeckPreset): SaveV2 {
  if (deckCardIds.length !== 8 || new Set(deckCardIds).size !== 8) throw new Error('牌组必须正好包含 8 张不重复卡牌');
  if (deckCardIds.some((id) => !ALL_CARD_IDS.includes(id) || !save.unlockedCardIds.includes(id))) throw new Error('牌组包含未解锁卡牌');
  const next = cloneSave(save);
  next.deckPresets[String(preset) as '1' | '2' | '3'] = [...deckCardIds];
  persistSave(next);
  return next;
}

export function setActiveDeckPreset(save: SaveV2, preset: DeckPresetId): SaveV2 {
  const next = cloneSave(save);
  next.activeDeckPreset = preset;
  persistSave(next);
  return next;
}

export function updatePractice(save: SaveV2, practice: Partial<PracticeSettings>): SaveV2 {
  const next = cloneSave(save);
  const deck = practice.deckIds ?? next.practice.deckIds;
  next.practice = {
    deckIds: deck.length === 8 ? [...deck] : [...next.practice.deckIds],
    opponent: practice.opponent ?? next.practice.opponent,
    infiniteElixir: practice.infiniteElixir ?? next.practice.infiniteElixir,
    timerEnabled: practice.timerEnabled ?? next.practice.timerEnabled,
  };
  persistSave(next);
  return next;
}

export function updateSettings(save: SaveV2, settings: Partial<SaveV2['settings']>): SaveV2 {
  const next = cloneSave(save);
  next.settings = {
    musicVolume: clamp01(settings.musicVolume ?? next.settings.musicVolume),
    sfxVolume: clamp01(settings.sfxVolume ?? next.settings.sfxVolume),
    preferredBattleSpeed: settings.preferredBattleSpeed ?? next.settings.preferredBattleSpeed,
  };
  persistSave(next);
  return next;
}

export function setTutorialState(save: SaveV2, completed: boolean, step = 0): SaveV2 {
  const next = cloneSave(save);
  next.tutorialCompleted = completed;
  next.tutorialStep = Math.max(0, Math.min(4, Math.floor(step)));
  persistSave(next);
  return next;
}

export function saveActiveJourney(save: SaveV2, journey: ActiveJourney | null): SaveV2 {
  const next = cloneSave(save);
  next.activeJourney = journey ? cloneJourney(journey) : null;
  persistSave(next);
  return next;
}

export function recordNodeCompletion(save: SaveV2, nodeId: NodeId, stars: 1 | 2 | 3): SaveV2 {
  const next = cloneSave(save);
  next.nodeStars[nodeId] = Math.max(next.nodeStars[nodeId] ?? 0, stars) as 1 | 2 | 3;
  if (!next.firstClearedNodeIds.includes(nodeId)) next.firstClearedNodeIds.push(nodeId);
  const layer = Number(nodeId[1]) as JourneyLayer;
  const unlocked = new Set(next.unlockedJourneyLayers);
  unlocked.add(layer);
  if (layer < 3) unlocked.add((layer + 1) as JourneyLayer);
  next.unlockedJourneyLayers = [...unlocked].sort() as JourneyLayer[];
  persistSave(next);
  return next;
}

export function unlockCard(save: SaveV2, cardId: string): SaveV2 {
  if (!ALL_CARD_IDS.includes(cardId) || save.unlockedCardIds.includes(cardId)) return cloneSave(save);
  const next = cloneSave(save);
  next.unlockedCardIds.push(cardId);
  persistSave(next);
  return next;
}

export function chooseRewardCards(save: SaveV2, random: () => number = Math.random): string[] {
  const pool = ALL_CARD_IDS.filter((id) => !save.unlockedCardIds.includes(id));
  const choices: string[] = [];
  while (choices.length < Math.min(3, pool.length) && pool.length > 0) {
    const index = Math.floor(random() * pool.length);
    const cardId = pool.splice(index, 1)[0];
    if (cardId) choices.push(cardId);
  }
  return choices;
}

export function sanitizeSave(input: any): SaveV2 {
  if (input.version === 1 || (!('version' in input) && Array.isArray(input.deckCardIds))) return migrateV1(input as SaveV1);
  const defaults = createDefaultSave();
  const unlocked = Array.isArray(input.unlockedCardIds) ? input.unlockedCardIds.filter((id: string) => ALL_CARD_IDS.includes(id)) : defaults.unlockedCardIds;
  const uniqueUnlocked = [...new Set([...INITIAL_UNLOCKED_IDS, ...unlocked])];
  const sanitizeDeck = (value: unknown, fallback: string[]): string[] => {
    const ids = Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string' && uniqueUnlocked.includes(id)) : [];
    const unique = [...new Set(ids)];
    return unique.length === 8 ? unique : [...fallback];
  };
  const rawPresets = input.deckPresets ?? defaults.deckPresets;
  const deckPresets = {
    '1': sanitizeDeck(rawPresets['1'], defaults.deckPresets['1']),
    '2': sanitizeDeck(rawPresets['2'], defaults.deckPresets['2']),
    '3': sanitizeDeck(rawPresets['3'], defaults.deckPresets['3']),
  } as SaveV2['deckPresets'];
  const practiceInput = input.practice ?? defaults.practice;
  const practiceDeck = sanitizeDeck(practiceInput.deckIds, defaults.practice.deckIds);
  const nodeStars = sanitizeNodeStars(input.nodeStars);
  const layers = Array.isArray(input.unlockedJourneyLayers) ? input.unlockedJourneyLayers.filter((layer: number) => [1, 2, 3].includes(layer)) : defaults.unlockedJourneyLayers;
  return {
    version: 2,
    unlockedCardIds: uniqueUnlocked,
    deckPresets,
    activeDeckPreset: ([1, 2, 3].includes(input.activeDeckPreset as number) ? input.activeDeckPreset : 1) as DeckPresetId,
    practice: {
      deckIds: practiceDeck,
      opponent: ['off', 1, 2, 3].includes(practiceInput.opponent as string | number) ? practiceInput.opponent : 'off',
      infiniteElixir: practiceInput.infiniteElixir ?? true,
      timerEnabled: practiceInput.timerEnabled ?? false,
    },
    nodeStars,
    nodeLossStreaks: sanitizeNodeLossStreaks(input.nodeLossStreaks),
    firstClearedNodeIds: Array.isArray(input.firstClearedNodeIds) ? ([...new Set((input.firstClearedNodeIds as string[]).filter((id) => NODE_IDS.includes(id as NodeId)))] as NodeId[]) : [],
    unlockedJourneyLayers: [...new Set([1, ...layers])].sort() as JourneyLayer[],
    activeJourney: sanitizeJourney(input.activeJourney),
    tutorialCompleted: input.tutorialCompleted ?? true,
    tutorialStep: Math.max(0, Math.min(4, Number(input.tutorialStep) || 0)),
    settings: {
      musicVolume: clamp01(input.settings?.musicVolume ?? defaults.settings.musicVolume),
      sfxVolume: clamp01(input.settings?.sfxVolume ?? defaults.settings.sfxVolume),
      preferredBattleSpeed: input.settings?.preferredBattleSpeed === 2 ? 2 : 1,
    },
  };
}

function migrateV1(input: SaveV1): SaveV2 {
  const defaults = createDefaultSave();
  const unlocked = Array.isArray(input.unlockedCardIds) ? input.unlockedCardIds.filter((id: string) => ALL_CARD_IDS.includes(id)) : defaults.unlockedCardIds;
  const uniqueUnlocked = [...new Set([...INITIAL_UNLOCKED_IDS, ...unlocked])];
  const deck = Array.isArray(input.deckCardIds) ? input.deckCardIds.filter((id) => uniqueUnlocked.includes(id)) : [];
  const uniqueDeck = [...new Set(deck)];
  const activeDeck = uniqueDeck.length === 8 ? uniqueDeck : [...defaults.deckPresets['1']];
  const layers: JourneyLayer[] = [1];
  if (input.clearedStageIds?.includes(1)) layers.push(2);
  if (input.clearedStageIds?.includes(2) || input.clearedStageIds?.includes(3)) layers.push(3);
  const migrated: SaveV2 = {
    ...defaults,
    unlockedCardIds: uniqueUnlocked,
    deckPresets: { '1': activeDeck, '2': [...activeDeck], '3': [...activeDeck] },
    practice: { ...defaults.practice, deckIds: [...activeDeck] },
    unlockedJourneyLayers: layers,
    tutorialCompleted: true,
    settings: {
      musicVolume: clamp01(input.settings?.musicVolume ?? defaults.settings.musicVolume),
      sfxVolume: clamp01(input.settings?.sfxVolume ?? defaults.settings.sfxVolume),
      preferredBattleSpeed: 1,
    },
  };
  persistSave(migrated);
  return migrated;
}

function sanitizeJourney(journey: ActiveJourney | null | undefined): ActiveJourney | null {
  if (!journey || !NODE_IDS.includes(journey.currentNodeId)) return null;
  return cloneJourney(journey);
}

export function getAIAssistLevel(save: SaveV2, nodeId: NodeId): 0 | 1 {
  return (save.nodeLossStreaks[nodeId] ?? 0) >= 2 ? 1 : 0;
}

export function addNodeLoss(save: SaveV2, nodeId: NodeId): SaveV2 {
  const next = cloneSave(save);
  next.nodeLossStreaks[nodeId] = (next.nodeLossStreaks[nodeId] ?? 0) + 1;
  persistSave(next);
  return next;
}

export function resetNodeLossStreak(save: SaveV2, nodeId: NodeId): SaveV2 {
  const next = cloneSave(save);
  delete next.nodeLossStreaks[nodeId];
  persistSave(next);
  return next;
}

function sanitizeNodeLossStreaks(value: Partial<Record<NodeId, number>> | undefined): Partial<Record<NodeId, number>> {
  if (!value) return {};
  return Object.fromEntries(Object.entries(value).filter(([id, count]) => NODE_IDS.includes(id as NodeId) && Number(count) > 0).map(([id, count]) => [id, Math.min(10, Number(count))]));
}
function sanitizeNodeStars(value: Partial<Record<NodeId, 0 | 1 | 2 | 3>> | undefined): SaveV2['nodeStars'] {
  if (!value) return {};
  return Object.fromEntries(Object.entries(value).filter(([id]) => NODE_IDS.includes(id as NodeId))) as SaveV2['nodeStars'];
}

function cloneJourney(journey: ActiveJourney): ActiveJourney {
  return {
    ...journey,
    route: [...journey.route],
    nodeModifiers: { ...journey.nodeModifiers },
    blessings: { ...journey.blessings },
    lockedDeckIds: [...journey.lockedDeckIds],
    pendingCardChoices: journey.pendingCardChoices ? [...journey.pendingCardChoices] : undefined,
    pendingNextNodes: journey.pendingNextNodes ? [...journey.pendingNextNodes] : undefined,
    pendingBlessingChoices: journey.pendingBlessingChoices ? [...journey.pendingBlessingChoices] : undefined,
  };
}

function cloneSave(save: SaveV2): SaveV2 {
  return {
    ...save,
    unlockedCardIds: [...save.unlockedCardIds],
    deckPresets: { '1': [...save.deckPresets['1']], '2': [...save.deckPresets['2']], '3': [...save.deckPresets['3']] },
    practice: { ...save.practice, deckIds: [...save.practice.deckIds] },
    nodeStars: { ...save.nodeStars },
    nodeLossStreaks: { ...save.nodeLossStreaks },
    firstClearedNodeIds: [...save.firstClearedNodeIds],
    unlockedJourneyLayers: [...save.unlockedJourneyLayers],
    activeJourney: save.activeJourney ? cloneJourney(save.activeJourney) : null,
    settings: { ...save.settings },
  };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}
