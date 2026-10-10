import { getCard } from '../data/cards';
import { ARENA, TOWER_POSITIONS } from './constants';
import { BattleSimulation } from './BattleSimulation';
import { createFusionResult, getFusionCost } from './FusionSystem';
import type { AIBehavior, CardDefinition, Lane, UnitState } from './types';

interface HandCard {
  card: CardDefinition;
  index: number;
}

export class AIController {
  private reactionTimer = 0;
  private readonly random: () => number;
  private readonly assistLevel: 0 | 1;
  private counterPushLane: Lane | null = null;
  private counterPushUntil = 0;

  constructor(random: () => number = Math.random, assistLevel: 0 | 1 = 0) {
    this.random = random;
    this.assistLevel = assistLevel;
  }

  update(delta: number, simulation: BattleSimulation): void {
    if (simulation.isBattleOver()) return;
    this.reactionTimer -= delta;
    if (this.reactionTimer > 0) return;
    this.scheduleNextReaction(simulation);

    // 三位 AI 都会犯错；差异只在犯错方式和频率。
    if (this.applyHumanMistake(simulation)) return;

    const pending = simulation.getPendingFusion('enemy');
    if (pending) {
      this.deployPending(simulation, pending.type);
      return;
    }

    if (this.shouldUseCatalyst(simulation) || this.shouldFuse(simulation)) return;
    this.playReactiveCard(simulation);
  }

  private behavior(simulation: BattleSimulation): AIBehavior {
    return simulation.stage.aiBehavior;
  }

  private scheduleNextReaction(simulation: BattleSimulation): void {
    const behavior = this.behavior(simulation);
    this.reactionTimer = behavior.reactionMin
      + this.random() * (behavior.reactionMax - behavior.reactionMin)
      + (this.assistLevel ? 0.25 : 0);
  }

  private applyHumanMistake(simulation: BattleSimulation): boolean {
    const behavior = this.behavior(simulation);
    const mistakeChance = behavior.mistakeChance + (this.assistLevel ? 0.08 : 0);
    if (this.random() >= mistakeChance) return false;

    if (behavior.archetype === 'grand-alchemist') {
      // 大炼金师只在低圣水或目标不明确时犹豫，不会主动送掉关键单位。
      const threats = this.findThreats(simulation, 170);
      if (threats.length > 0 && simulation.getElixir('enemy') >= 4) return false;
      return true;
    }

    if (this.random() < 0.55) return true;
    this.playRandomAffordableCard(simulation);
    return true;
  }

  private shouldUseCatalyst(simulation: BattleSimulation): boolean {
    const behavior = this.behavior(simulation);
    if (!simulation.stage.usesCatalysts || simulation.getFusionCatalyst('enemy')) return false;
    const catalysts = simulation.getHand('enemy').map((id, index) => ({ card: getCard(id), index })).filter(({ card }) => card.type === 'catalyst');
    const first = catalysts[0];
    if (!first || this.random() >= behavior.catalystChance) return false;
    const nonCatalysts = simulation.getHand('enemy').filter((id) => getCard(id).type !== 'catalyst');
    return nonCatalysts.length >= 2 && simulation.useCatalyst('enemy', first.index);
  }

  private shouldFuse(simulation: BattleSimulation): boolean {
    const behavior = this.behavior(simulation);
    const playable = simulation.getHand('enemy').map((id, index) => ({ card: getCard(id), index })).filter(({ card }) => card.type !== 'catalyst' && card.fusionTrait);
    if (playable.length < 2 || this.random() >= behavior.fusionChance) return false;
    const body = [...playable].sort((a, b) => fusionBodyScore(b.card) - fusionBodyScore(a.card))[0];
    const trait = playable.find(({ card, index }) => index !== body?.index && card.fusionTrait);
    if (!body || !trait) return false;
    const cost = getFusionCost(body.card, trait.card);
    if (!simulation.canAfford('enemy', cost)) return false;
    const result = createFusionResult(body.card.id, trait.card.id, simulation.getFusionCatalyst('enemy'), this.random);
    return simulation.fuseCards('enemy', [body.index, trait.index], result);
  }

  private playRandomAffordableCard(simulation: BattleSimulation): void {
    const candidates = simulation.getHand('enemy').map((id, index) => ({ card: getCard(id), index })).filter(({ card }) => card.type !== 'catalyst' && simulation.canAfford('enemy', card.cost));
    if (!candidates.length) return;
    const selected = candidates[Math.floor(this.random() * candidates.length)]!;
    const lane = this.choosePressureLane(simulation);
    const position = this.getDeployPosition(selected.card, lane, 'normal');
    simulation.playHandCard('enemy', selected.index, lane, position.x, position.y);
  }

  private deployPending(simulation: BattleSimulation, type: string): void {
    const threats = this.findThreats(simulation, 120);
    const lane = threats.length > 0 ? this.chooseThreatLane(simulation) : this.choosePressureLane(simulation);
    const laneY = lane === 'top' ? ARENA.topLaneY : ARENA.bottomLaneY;
    const cluster = getCluster(threats);
    if (type === 'spell') {
      simulation.deployPendingFusion('enemy', lane, cluster?.x ?? ARENA.riverRight + 120, cluster?.y ?? laneY);
      return;
    }
    if (type === 'trap') {
      const trapX = cluster
        ? Math.min(TOWER_POSITIONS.enemyTop.x - 170, Math.max(ARENA.riverRight + 35, cluster.x + 70))
        : ARENA.riverRight + 35;
      simulation.deployPendingFusion('enemy', lane, trapX, laneY);
      return;
    }
    const x = TOWER_POSITIONS.enemyTop.x - (threats.length > 0 ? 120 : 170);
    simulation.deployPendingFusion('enemy', lane, x, laneY + (this.random() - 0.5) * 35);
  }

  private playReactiveCard(simulation: BattleSimulation): void {
    const behavior = this.behavior(simulation);
    const candidates = simulation.getHand('enemy').map((id, index) => ({ card: getCard(id), index })).filter(({ card }) => card.type !== 'catalyst' && simulation.canAfford('enemy', card.cost));
    if (!candidates.length) return;

    const threats = this.findThreats(simulation, 170);
    const crossed = threats.filter((unit) => unit.x > ARENA.riverRight);
    const defending = threats.length > 0 && (crossed.length > 0 || this.random() < behavior.defenseWeight);
    const lane = defending ? this.chooseThreatLane(simulation) : this.choosePressureLane(simulation);
    const cluster = getCluster(threats);

    if (defending && behavior.archetype === 'silversmith' && crossed.length > 0) {
      this.counterPushLane = lane;
      this.counterPushUntil = simulation.getElapsedSeconds() + 8;
    }

    let selected = defending ? this.chooseDefenseCard(candidates, threats, behavior) : undefined;
    const counterPushing = this.isCounterPushing(simulation);
    if (!selected && counterPushing) selected = this.chooseCounterPushCard(candidates, behavior);
    if (!selected) selected = this.chooseOffenseCard(candidates, behavior);
    if (!selected) return;

    const mode = defending ? 'defense' : counterPushing ? 'counter' : behavior.archetype === 'apprentice' ? 'pressure' : 'normal';
    const position = this.getDeployPosition(selected.card, lane, mode);
    let x = selected.card.type === 'spell' ? cluster?.x ?? position.x : position.x;
    if (selected.card.type === 'trap' && cluster) {
      x = Math.min(TOWER_POSITIONS.enemyTop.x - 170, Math.max(ARENA.riverRight + 35, cluster.x + 70));
    }
    const y = selected.card.type === 'spell' ? cluster?.y ?? position.y : position.y;
    simulation.playHandCard('enemy', selected.index, lane, x, y);
  }

  private chooseDefenseCard(candidates: HandCard[], threats: UnitState[], behavior: AIBehavior): HandCard | undefined {
    const hasGroundThreat = threats.some((unit) => unit.movement === 'ground');
    const hasAirThreat = threats.some((unit) => unit.movement === 'air');

    if (behavior.archetype === 'silversmith') {
      if (hasGroundThreat) {
        const trap = candidates.find(({ card }) => card.type === 'trap');
        if (trap) return trap;
      }
      const building = candidates.find(({ card }) => card.type === 'building');
      if (building) return building;
    } else if (behavior.archetype === 'grand-alchemist') {
      if (threats.length >= 2) {
        const spell = candidates.find(({ card }) => card.type === 'spell');
        if (spell) return spell;
      }
      const defensive = candidates.find(({ card }) => card.type === 'trap' || card.type === 'building');
      if (defensive) return defensive;
    }

    const units = candidates.filter(({ card }) => card.type === 'unit');
    if (behavior.archetype === 'apprentice') {
      if (hasAirThreat) {
        const antiAir = units.find(({ card }) => card.stats?.targets !== 'ground');
        if (antiAir) return antiAir;
      }
      return units.sort((a, b) => a.card.cost - b.card.cost)[0];
    }
    return units.sort((a, b) => b.card.power - a.card.power)[0] ?? candidates[0];
  }

  private chooseCounterPushCard(candidates: HandCard[], behavior: AIBehavior): HandCard | undefined {
    if (behavior.archetype !== 'silversmith') return undefined;
    const units = candidates.filter(({ card }) => card.type === 'unit');
    return units.find(({ card }) => card.stats?.targetPreference === 'buildings' || card.tags.includes('charger'))
      ?? units.sort((a, b) => b.card.power - a.card.power)[0]
      ?? candidates[0];
  }

  private chooseOffenseCard(candidates: HandCard[], behavior: AIBehavior): HandCard | undefined {
    const units = candidates.filter(({ card }) => card.type === 'unit');
    if (behavior.archetype === 'apprentice') {
      const preferred = units.filter(({ card }) => card.tags.includes('swarm') || card.tags.includes('ranged') || card.tags.includes('tank'));
      const pool = preferred.length > 0 ? preferred : units;
      return pool[Math.floor(this.random() * pool.length)] ?? candidates[0];
    }
    if (behavior.archetype === 'silversmith') {
      return units.sort((a, b) => b.card.power - a.card.power)[0] ?? candidates[0];
    }
    return [...candidates].sort((a, b) => b.card.power - a.card.power)[0];
  }

  private getDeployPosition(card: CardDefinition, lane: Lane, mode: 'normal' | 'defense' | 'counter' | 'pressure'): { x: number; y: number } {
    const laneY = lane === 'top' ? ARENA.topLaneY : ARENA.bottomLaneY;
    if (card.type === 'trap') return { x: ARENA.riverRight + 35, y: laneY };
    if (card.type === 'building') return { x: TOWER_POSITIONS.enemyTop.x - 105, y: laneY + (this.random() - 0.5) * 35 };
    if (card.type === 'spell') return { x: ARENA.riverRight + 120, y: laneY };
    let x = this.deployX(card);
    if (mode === 'pressure') x = ARENA.riverRight + 45 + (card.stats?.movement === 'air' ? 35 : 0);
    if (mode === 'counter') x = ARENA.riverRight + 150;
    if (mode === 'defense') x = TOWER_POSITIONS.enemyTop.x - 125;
    return { x, y: laneY + (this.random() - 0.5) * 45 };
  }

  private deployX(card: CardDefinition): number {
    if (card.type === 'building' || card.type === 'trap') return TOWER_POSITIONS.enemyTop.x - 110;
    if (card.stats?.targetPreference === 'buildings') return TOWER_POSITIONS.enemyTop.x - 175;
    return TOWER_POSITIONS.enemyTop.x - 145;
  }

  private isCounterPushing(simulation: BattleSimulation): boolean {
    return this.counterPushLane !== null && simulation.getElapsedSeconds() < this.counterPushUntil;
  }

  private findThreats(simulation: BattleSimulation, distance: number): UnitState[] {
    return simulation.units.filter((unit) => unit.alive && unit.owner === 'player' && unit.x > ARENA.riverRight - distance);
  }

  private chooseThreatLane(simulation: BattleSimulation): Lane {
    const threats = this.findThreats(simulation, 200);
    const top = threats.filter((unit) => unit.lane === 'top').reduce((sum, unit) => sum + unit.hp, 0);
    const bottom = threats.filter((unit) => unit.lane === 'bottom').reduce((sum, unit) => sum + unit.hp, 0);
    if (top === bottom) return this.random() < 0.5 ? 'top' : 'bottom';
    return top > bottom ? 'top' : 'bottom';
  }

  private choosePressureLane(simulation: BattleSimulation): Lane {
    const behavior = this.behavior(simulation);
    const top = simulation.units.filter((unit) => unit.alive && unit.owner === 'player' && unit.lane === 'top').reduce((sum, unit) => sum + unit.hp, 0);
    const bottom = simulation.units.filter((unit) => unit.alive && unit.owner === 'player' && unit.lane === 'bottom').reduce((sum, unit) => sum + unit.hp, 0);
    if (this.isCounterPushing(simulation) && this.counterPushLane) return this.counterPushLane;

    const weakerLane: Lane = top < bottom ? 'top' : 'bottom';
    const concentration = Math.abs(top - bottom);
    const canSwitch = behavior.archetype === 'grand-alchemist' || behavior.archetype === 'apprentice';
    if (concentration >= 450 && canSwitch && this.random() < behavior.laneSwitchChance) return weakerLane;
    return this.random() < 0.5 ? 'top' : 'bottom';
  }
}

function fusionBodyScore(card: CardDefinition): number {
  const typeBias = card.type === 'unit' ? 1 : card.type === 'building' ? 0.5 : 0;
  return card.power + typeBias;
}

function getCluster(units: UnitState[]): { x: number; y: number; count: number } | null {
  if (units.length === 0) return null;
  return {
    x: units.reduce((sum, unit) => sum + unit.x, 0) / units.length,
    y: units.reduce((sum, unit) => sum + unit.y, 0) / units.length,
    count: units.length,
  };
}
