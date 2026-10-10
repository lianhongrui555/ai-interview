import { getJourneyNode, getNodesForLayer } from '../data/levels';
import { pickBlessingChoices, pickUnusedModifiers } from '../data/journey';
import { addNodeLoss, chooseRewardCards, recordNodeCompletion, resetNodeLossStreak, saveActiveJourney } from './save';
import type {
  ActiveJourney,
  BlessingId,
  NodeId,
  SaveV2,
  Side,
} from './types';

export interface JourneyBattleOutcome {
  winner: Side | 'draw';
  playerKingAlive: boolean;
  elapsedSeconds: number;
}

export function createJourney(deckIds: string[], random: () => number = Math.random): ActiveJourney {
  const emptyModifiers: ActiveJourney['nodeModifiers'] = {};
  const modifiers = pickUnusedModifiers(emptyModifiers, 4, random);
  return {
    status: 'idle',
    currentNodeId: 'l1_trial',
    route: [],
    nodeModifiers: {
      l1_trial: modifiers[0]!,
      l1_greenhouse: modifiers[1]!,
      l2_silver: modifiers[2]!,
      l2_frost: modifiers[3]!,
    },
    blessings: {},
    lockedDeckIds: [...deckIds],
    pendingNextNodes: getNodesForLayer(1).map((node) => node.id),
  };
}

export function selectJourneyNode(save: SaveV2, nodeId: NodeId): SaveV2 {
  if (!save.activeJourney) return save;
  const journey = cloneJourney(save.activeJourney);
  journey.currentNodeId = nodeId;
  journey.status = 'active';
  journey.pendingNextNodes = undefined;
  if (!journey.route.includes(nodeId)) journey.route.push(nodeId);
  return saveActiveJourney(save, journey);
}

export function completeJourneyNode(save: SaveV2, nodeId: NodeId, outcome: JourneyBattleOutcome): SaveV2 {
  const stars = calculateStars(outcome);
  let next = stars > 0 ? recordNodeCompletion(save, nodeId, stars as 1 | 2 | 3) : save;
  if (!next.activeJourney) return next;
  const journey = cloneJourney(next.activeJourney);
  const node = getJourneyNode(nodeId);
  if (outcome.winner !== 'player') {
    next = addNodeLoss(next, nodeId);
    return saveActiveJourney(next, null);
  }
  next = resetNodeLossStreak(next, nodeId);

  journey.status = 'reward';
  journey.pendingCardChoices = stars > 0 && !save.firstClearedNodeIds.includes(nodeId)
    ? chooseRewardCards(next)
    : undefined;
  journey.pendingNextNodes = node.layer < 3 ? getNodesForLayer((node.layer + 1) as 2 | 3).map((choice) => choice.id) : undefined;
  journey.pendingBlessingChoices = node.layer < 3 && blessingCount(journey) < 2
    ? pickBlessingChoices(journey.blessings)
    : undefined;
  if (node.layer === 3 && !journey.pendingCardChoices?.length) journey.status = 'complete';
  next = saveActiveJourney(next, journey);
  return next;
}

export function chooseNextJourneyNode(save: SaveV2, nodeId: NodeId): SaveV2 {
  if (!save.activeJourney?.pendingNextNodes?.includes(nodeId)) return save;
  const journey = cloneJourney(save.activeJourney);
  journey.pendingNextNodes = undefined;
  journey.currentNodeId = nodeId;
  journey.status = 'active';
  journey.route.push(nodeId);
  return saveActiveJourney(save, journey);
}

export function chooseJourneyBlessing(save: SaveV2, blessingId: BlessingId): SaveV2 {
  if (!save.activeJourney) return save;
  const journey = cloneJourney(save.activeJourney);
  if (!journey.pendingBlessingChoices?.includes(blessingId)) return save;
  const current = journey.blessings[blessingId] ?? 0;
  journey.blessings[blessingId] = Math.min(2, current + 1) as 1 | 2;
  journey.pendingBlessingChoices = undefined;
  journey.status = 'active';
  return saveActiveJourney(save, journey);
}

export function finalizeJourneyReward(save: SaveV2): SaveV2 {
  if (!save.activeJourney) return save;
  const journey = cloneJourney(save.activeJourney);
  journey.pendingCardChoices = undefined;
  if (getJourneyNode(journey.currentNodeId).layer === 3) journey.status = 'complete';
  return saveActiveJourney(save, journey);
}

export function abandonJourney(save: SaveV2): SaveV2 {
  return saveActiveJourney(save, null);
}

export function calculateStars(outcome: JourneyBattleOutcome): 0 | 1 | 2 | 3 {
  if (outcome.winner !== 'player') return 0;
  let stars = 1;
  if (outcome.playerKingAlive) stars += 1;
  if (outcome.elapsedSeconds <= 150) stars += 1;
  return Math.min(3, stars) as 1 | 2 | 3;
}

export function blessingCount(journey: ActiveJourney): number {
  return Object.values(journey.blessings).reduce((sum, value) => sum + (value ?? 0), 0);
}

export function getCurrentNodeId(journey: ActiveJourney | null): NodeId | null {
  return journey?.currentNodeId ?? null;
}

export function cloneJourney(journey: ActiveJourney): ActiveJourney {
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
