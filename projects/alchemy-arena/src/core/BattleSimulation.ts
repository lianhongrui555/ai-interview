import { getCard } from '../data/cards';
import type { StageConfig } from './types';
import { ARENA, BATTLE_RULES, DEPLOY_MARGIN, TOWER_POSITIONS } from './constants';
import { DeckSystem } from './DeckSystem';
import type {
  ActiveStatus,
  BattleEvent,
  BattleResult,
  BattleSnapshot,
  CardDefinition,
  EffectSpec,
  CatalystKind,
  BattleModifierId,
  BattleStatistics,
  BlessingId,
  DeploymentPreview,
  FusionResult,
  Lane,
  PlayableCard,
  Side,
  TowerState,
  TrapState,
  UnitState,
} from './types';

interface TargetRef {
  kind: 'unit' | 'tower';
  id: string;
  x: number;
  y: number;
  radius: number;
  movement: 'ground' | 'air';
}

export interface BattleSimulationOptions {
  regularSeconds?: number;
  overtimeSeconds?: number;
  startingElixir?: number;
  playerElixirMultiplier?: number;
  enemyElixirMultiplier?: number;
  enemyStatMultiplier?: number;
  timerEnabled?: boolean;
  infiniteElixir?: boolean;
  modifierId?: BattleModifierId;
  blessings?: Partial<Record<BlessingId, 1 | 2>>;
  bossShield?: boolean;
}

export class BattleSimulation {
  readonly towers: TowerState[];
  readonly units: UnitState[] = [];
  readonly traps: TrapState[] = [];
  readonly events: BattleEvent[] = [];
  readonly playerDeck: DeckSystem;
  readonly enemyDeck: DeckSystem;
  readonly stage: StageConfig;
  readonly options: Required<Omit<BattleSimulationOptions, 'modifierId' | 'blessings' | 'bossShield'>> & Pick<BattleSimulationOptions, 'modifierId' | 'blessings' | 'bossShield'>;

  private elixir: Record<Side, number> = { player: 5, enemy: 5 };
  private nextEntityId = 1;
  private elapsedSeconds = 0;
  private result: BattleResult | null = null;
  private overtime = false;
  private crowns: Record<Side, number> = { player: 0, enemy: 0 };
  private pendingFusion: Record<Side, FusionResult | null> = { player: null, enemy: null };
  private fusionCatalyst: Record<Side, CatalystKind | null> = { player: null, enemy: null };
  private readonly statistics: BattleStatistics = createStatistics();
  private readonly infiniteElixir: Record<Side, boolean> = { player: false, enemy: false };
  private activeModifier?: BattleModifierId;
  private modifierTimer = 0;
  private closedLane: Lane | null = null;
  private modifierWarning = '';

  constructor(
    stage: StageConfig,
    playerDeckIds: string[],
    enemyDeckIds: string[] = stage.deck,
    options: BattleSimulationOptions = {},
  ) {
    this.stage = stage;
    this.options = {
      regularSeconds: options.regularSeconds ?? BATTLE_RULES.regularSeconds,
      overtimeSeconds: options.overtimeSeconds ?? BATTLE_RULES.overtimeSeconds,
      startingElixir: options.startingElixir ?? BATTLE_RULES.startingElixir,
      playerElixirMultiplier: options.playerElixirMultiplier ?? 1,
      enemyElixirMultiplier: options.enemyElixirMultiplier ?? 1,
      enemyStatMultiplier: options.enemyStatMultiplier ?? 1,
      timerEnabled: options.timerEnabled ?? true,
      infiniteElixir: options.infiniteElixir ?? false,
      modifierId: options.modifierId,
      blessings: options.blessings,
      bossShield: options.bossShield,
    };
    this.activeModifier = options.modifierId;
    this.infiniteElixir.player = options.infiniteElixir ?? false;
    const startingBonus = 2 * (options.blessings?.['starting-elixir'] ?? 0);
    this.elixir = { player: Math.min(BATTLE_RULES.maxElixir, this.options.startingElixir + startingBonus), enemy: this.options.startingElixir };
    this.playerDeck = new DeckSystem(playerDeckIds, BATTLE_RULES.handSize);
    this.enemyDeck = new DeckSystem(enemyDeckIds, BATTLE_RULES.handSize);
    const towerMultiplier = 1 + 0.08 * (options.blessings?.['tower-health'] ?? 0);
    this.towers = createTowers().map((tower) => tower.side === 'player' && towerMultiplier > 1
      ? { ...tower, maxHp: Math.round(tower.maxHp * towerMultiplier), hp: Math.round(tower.maxHp * towerMultiplier) }
      : tower);
  }

  update(rawDeltaSeconds: number): void {
    if (this.result) return;
    const delta = Math.min(rawDeltaSeconds, 0.1);
    this.elapsedSeconds += delta;
    this.updateClock();
    if (this.result) return;
    this.updateModifiers(delta);
    this.updateElixir(delta);
    this.updateStatuses(delta);
    this.updateTraps(delta);
    this.updateUnits(delta);
    this.updateTowers(delta);
    this.checkEntityDeaths();
  }

  getSnapshot(): BattleSnapshot {
    return {
      elapsed: this.elapsedSeconds,
      timeLeft: this.getTimeLeft(),
      overtime: this.overtime,
      playerElixir: this.elixir.player,
      enemyElixir: this.elixir.enemy,
      towers: this.towers.map((tower) => ({ ...tower })),
      units: this.units.map((unit) => ({ ...unit, statuses: unit.statuses.map((status) => ({ ...status })) })),
      traps: this.traps.map((trap) => ({ ...trap })),
      result: this.result ? { ...this.result } : null,
      modifierId: this.activeModifier,
    };
  }

  isBattleOver(): boolean { return this.result !== null; }
  getElapsedSeconds(): number { return this.elapsedSeconds; }
  getElixir(side: Side): number { return this.elixir[side]; }
  getHand(side: Side): string[] { return (side === 'player' ? this.playerDeck : this.enemyDeck).copyHand(); }
  getNextCard(side: Side): string { return (side === 'player' ? this.playerDeck : this.enemyDeck).peekNext(); }
  getPendingFusion(side: Side): FusionResult | null { return this.pendingFusion[side] ? { ...this.pendingFusion[side] } : null; }
  getFusionCatalyst(side: Side): CatalystKind | null { return this.fusionCatalyst[side]; }

  getStatistics(): BattleStatistics {
    return {
      damage: { ...this.statistics.damage },
      healing: { ...this.statistics.healing },
      elixirSpent: { ...this.statistics.elixirSpent },
      cardsPlayed: { ...this.statistics.cardsPlayed },
      fusions: { ...this.statistics.fusions },
      towersDestroyed: { ...this.statistics.towersDestroyed },
      byCard: Object.fromEntries(Object.entries(this.statistics.byCard).map(([id, value]) => [id, { ...value }])),
    };
  }

  setInfiniteElixir(side: Side, enabled: boolean): void {
    this.infiniteElixir[side] = enabled;
    if (enabled) this.elixir[side] = BATTLE_RULES.maxElixir;
  }

  clearBattlefield(): void {
    for (const unit of this.units) unit.alive = false;
    for (const trap of this.traps) trap.alive = false;
    this.units.length = 0;
    this.traps.length = 0;
    this.events.push({ type: 'modifier', text: '战场已清空' });
  }

  canDeployAt(side: Side, card: PlayableCard, lane: Lane, x: number, y: number): boolean {
    return this.getDeploymentPreview(side, card, lane, x, y).valid;
  }

  getDeploymentPreview(side: Side, card: PlayableCard, lane: Lane, x: number, y: number): DeploymentPreview {
    const bounds = this.getDeployBounds(side, lane);
    const insideArena = x >= ARENA.left && x <= ARENA.right && y >= ARENA.top && y <= ARENA.bottom;
    if (!insideArena || x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) return { valid: false, reason: 'outside-zone', bounds };
    if (!this.canAfford(side, card.cost)) return { valid: false, reason: 'not-enough-elixir', bounds };
    if (this.pendingFusion[side]) return { valid: false, reason: 'fusion-pending', bounds };
    if (card.type === 'spell') return { valid: true, bounds };
    if ((card.type === 'building' || card.type === 'trap') && this.inRiver(x)) return { valid: false, reason: 'river', bounds };
    const movement = 'stats' in card ? card.stats?.movement ?? 'ground' : 'ground';
    if (movement === 'ground' && this.inRiver(x)) return { valid: false, reason: 'river', bounds };
    return { valid: true, bounds };
  }

  getModifierState(): { id?: BattleModifierId; closedLane: Lane | null; warning: string } {
    return { id: this.activeModifier, closedLane: this.closedLane, warning: this.modifierWarning };
  }
  canAfford(side: Side, cost: number): boolean { return this.infiniteElixir[side] || this.elixir[side] + 0.0001 >= cost; }

  playHandCard(side: Side, handIndex: number, lane: Lane, x: number, y: number): boolean {
    const deck = side === 'player' ? this.playerDeck : this.enemyDeck;
    const cardId = deck.hand[handIndex];
    if (!cardId) return false;
    const card = getCard(cardId);
    if (!this.canAfford(side, card.cost)) return false;
    if (card.type === 'catalyst') return this.useCatalyst(side, handIndex);
    if (!this.isValidDeployment(side, card, lane, x, y)) return false;
    if (this.pendingFusion[side]) return false;
    deck.play(handIndex);
    this.elixir[side] -= card.cost;
    this.statistics.elixirSpent[side] += card.cost;
    this.statistics.cardsPlayed[side] += 1;
    this.getCardStat(card.id).played += 1;
    this.deployCard(side, card, lane, x, y);
    return true;
  }

  useCatalyst(side: Side, handIndex: number): boolean {
    const deck = side === 'player' ? this.playerDeck : this.enemyDeck;
    const cardId = deck.hand[handIndex];
    if (!cardId) return false;
    const card = getCard(cardId);
    if (card.type !== 'catalyst' || !card.catalyst || !this.canAfford(side, card.cost)) return false;
    deck.play(handIndex);
    this.elixir[side] -= card.cost;
    this.statistics.elixirSpent[side] += card.cost;
    this.statistics.cardsPlayed[side] += 1;
    this.getCardStat(card.id).played += 1;
    this.fusionCatalyst[side] = card.catalyst.kind;
    this.emit({ type: 'spell', side, cardId, text: `${card.name}：下一次熔铸稀有度已修正` });
    return true;
  }

  fuseCards(side: Side, handIndices: [number, number], result: FusionResult): boolean {
    if (this.pendingFusion[side] || handIndices[0] === handIndices[1]) return false;
    const deck = side === 'player' ? this.playerDeck : this.enemyDeck;
    const cards = handIndices.map((index) => deck.hand[index]);
    if (cards.some((id) => !id) || !this.canAfford(side, result.cost)) return false;
    deck.consume(handIndices);
    this.elixir[side] -= result.cost;
    this.statistics.elixirSpent[side] += result.cost;
    this.statistics.fusions[side] += 1;
    this.pendingFusion[side] = result;
    this.fusionCatalyst[side] = null;
    this.emit({ type: 'spell', side, cardId: result.id, text: `熔铸完成：${result.name}` });
    return true;
  }

  deployPendingFusion(side: Side, lane: Lane, x: number, y: number): boolean {
    const result = this.pendingFusion[side];
    if (!result || !this.isValidDeployment(side, result, lane, x, y)) return false;
    this.pendingFusion[side] = null;
    this.statistics.cardsPlayed[side] += 1;
    this.getCardStat(result.id).played += 1;
    this.deployCard(side, result, lane, x, y);
    return true;
  }

  getDeployBounds(side: Side, lane: Lane): { left: number; right: number; top: number; bottom: number } {
    const laneY = lane === 'top' ? ARENA.topLaneY : ARENA.bottomLaneY;
    const laneHeight = 190;
    if (side === 'player') {
      const enemyGuard = this.towers.find((tower) => tower.side === 'enemy' && tower.lane === lane);
      const right = enemyGuard?.alive ? TOWER_POSITIONS.enemyTop.x - 72 : TOWER_POSITIONS.enemyKing.x - 80;
      return { left: ARENA.left + DEPLOY_MARGIN, right, top: Math.max(ARENA.top + 24, laneY - laneHeight), bottom: Math.min(ARENA.bottom - 24, laneY + laneHeight) };
    }
    const playerGuard = this.towers.find((tower) => tower.side === 'player' && tower.lane === lane);
    const left = playerGuard?.alive ? TOWER_POSITIONS.playerTop.x + 72 : TOWER_POSITIONS.playerKing.x + 80;
    return { left, right: ARENA.right - DEPLOY_MARGIN, top: Math.max(ARENA.top + 24, laneY - laneHeight), bottom: Math.min(ARENA.bottom - 24, laneY + laneHeight) };
  }

  getLaneForPosition(y: number): Lane { return y < (ARENA.topLaneY + ARENA.bottomLaneY) / 2 ? 'top' : 'bottom'; }

  private updateClock(): void {
    if (!this.options.timerEnabled) return;
    if (!this.overtime && this.elapsedSeconds >= this.options.regularSeconds) {
      if (this.crowns.player === this.crowns.enemy) {
        this.overtime = true;
        this.emit({ type: 'spell', text: '加时开始！圣水恢复速度翻倍' });
      } else {
        this.finish({ winner: this.crowns.player > this.crowns.enemy ? 'player' : 'enemy', reason: 'time', playerCrowns: this.crowns.player, enemyCrowns: this.crowns.enemy });
        return;
      }
    }
    if (this.overtime && this.elapsedSeconds >= this.options.regularSeconds + this.options.overtimeSeconds) {
      const playerHealth = this.totalTowerHealth('player');
      const enemyHealth = this.totalTowerHealth('enemy');
      const winner = playerHealth === enemyHealth ? 'draw' : playerHealth > enemyHealth ? 'player' : 'enemy';
      this.finish({ winner, reason: 'health', playerCrowns: this.crowns.player, enemyCrowns: this.crowns.enemy });
    }
  }

  private updateModifiers(delta: number): void {
    if (!this.activeModifier) return;
    this.modifierTimer += delta;
    if (this.activeModifier === 'bridge-rotation') {
      const phase = Math.floor(this.modifierTimer / 12) % 2;
      const nextClosed = phase === 1 ? 'top' : null;
      if (this.closedLane !== nextClosed) {
        this.closedLane = nextClosed;
        this.modifierWarning = nextClosed ? '上方桥梁暂时关闭' : '桥梁重新开放';
        this.emit({ type: 'modifier', text: this.modifierWarning });
      }
    } else if (this.activeModifier === 'lava-pulse') {
      const phase = this.modifierTimer % 20;
      if (phase >= 16 && phase < 17.2) {
        for (const unit of this.units) {
          if (!unit.alive || unit.movement !== 'ground' || !this.onBridge(unit.x, unit.y)) continue;
          this.damageUnit(unit, 42 * delta, unit.owner === 'player' ? 'enemy' : 'player');
        }
      }
    } else if (this.activeModifier === 'frost-current') {
      for (const unit of this.units) {
        if (!unit.alive || unit.movement !== 'ground' || !this.onBridge(unit.x, unit.y)) continue;
        upsertStatus(unit, { kind: 'slow', value: 0.35, remaining: 0.4, sourceId: -1 });
      }
    } else if (this.activeModifier === 'spore-cloud') {
      if (Math.floor(this.modifierTimer) % 3 === 0) {
        for (const unit of this.units) {
          if (!unit.alive || unit.movement !== 'ground' || !this.onBridge(unit.x, unit.y)) continue;
          const amount = Math.min(unit.maxHp - unit.hp, 18);
          unit.hp += amount;
          this.statistics.healing[unit.owner] += amount;
        }
      }
    }
  }

  private updateElixir(delta: number): void {
    if (this.infiniteElixir.player) this.elixir.player = BATTLE_RULES.maxElixir;
    if (this.infiniteElixir.enemy) this.elixir.enemy = BATTLE_RULES.maxElixir;
    const overtimeMultiplier = this.overtime ? 2 : 1;
    const tideMultiplier = this.activeModifier === 'elixir-tide' && Math.floor(this.modifierTimer / 15) % 2 === 1 ? 1.4 : 1;
    const playerBlessing = 1 + 0.12 * (this.options.blessings?.['elixir-regen'] ?? 0);
    this.elixir.player = Math.min(BATTLE_RULES.maxElixir, this.elixir.player + (delta / BATTLE_RULES.elixirInterval) * overtimeMultiplier * tideMultiplier * this.options.playerElixirMultiplier * playerBlessing);
    this.elixir.enemy = Math.min(BATTLE_RULES.maxElixir, this.elixir.enemy + (delta / BATTLE_RULES.elixirInterval) * overtimeMultiplier * tideMultiplier * this.options.enemyElixirMultiplier);
  }

  private updateStatuses(delta: number): void {
    for (const unit of this.units) {
      if (!unit.alive) continue;
      let dotDamage = 0;
      for (const status of unit.statuses) {
        status.remaining -= delta;
        if (status.kind === 'dot') dotDamage += status.value * delta;
      }
      if (dotDamage > 0) this.damageUnit(unit, dotDamage, unit.owner === 'player' ? 'enemy' : 'player');
      unit.statuses = unit.statuses.filter((status) => status.remaining > 0);
      if (unit.hp <= 0) this.killUnit(unit);
    }
  }

  private updateTraps(delta: number): void {
    for (const trap of this.traps) {
      if (!trap.alive) continue;
      trap.age += delta;
      if (trap.age >= trap.lifetime) { trap.alive = false; continue; }
      const enemySide: Side = trap.owner === 'player' ? 'enemy' : 'player';
      const triggered = this.units.some((unit) => unit.alive && unit.owner === enemySide && unit.movement === 'ground' && distance(unit.x, unit.y, trap.x, trap.y) <= trap.triggerRadius + unit.radius);
      if (!triggered) continue;
      trap.alive = false;
      this.applyAreaEffects(trap.owner, trap.x, trap.y, trap.effects, trap.radius);
      this.emit({ type: 'trap-trigger', side: trap.owner, x: trap.x, y: trap.y, cardId: trap.cardId });
    }
  }

  private updateUnits(delta: number): void {
    for (const unit of this.units) {
      if (!unit.alive) continue;
      unit.age += delta;
      unit.attackCooldown = Math.max(0, unit.attackCooldown - delta);
      if (unit.lifetime !== undefined && unit.age >= unit.lifetime) { this.killUnit(unit); continue; }
      if (unit.isBuilding && unit.healPerSecond && unit.damage <= 0) {
        if (unit.attackCooldown <= 0) { this.healNearbyAllies(unit); unit.attackCooldown = unit.attackInterval; }
        continue;
      }
      const target = this.findTarget(unit);
      if (!target) continue;
      const currentDistance = distance(unit.x, unit.y, target.x, target.y);
      const attackDistance = unit.range + unit.radius + target.radius;
      if (currentDistance <= attackDistance) {
        if (unit.attackCooldown <= 0) { this.performAttack(unit, target); unit.attackCooldown = unit.attackInterval; }
        continue;
      }
      this.moveUnitTowardTarget(unit, target, delta);
    }
  }

  private updateTowers(delta: number): void {
    for (const tower of this.towers) {
      if (!tower.alive || (tower.lane === 'king' && !tower.activated)) continue;
      tower.attackCooldown = Math.max(0, tower.attackCooldown - delta);
      const enemySide: Side = tower.side === 'player' ? 'enemy' : 'player';
      const target = this.units
        .filter((unit) => unit.alive && unit.owner === enemySide)
        .map((unit) => ({ unit, dist: distance(tower.x, tower.y, unit.x, unit.y) }))
        .filter(({ unit, dist }) => dist <= tower.range + unit.radius)
        .sort((a, b) => a.dist - b.dist)[0]?.unit;
      if (!target || tower.attackCooldown > 0) continue;
      tower.attackCooldown = tower.attackInterval;
      this.damageUnit(target, tower.damage, tower.side);
      this.emit({ type: 'attack', side: tower.side, x: tower.x, y: tower.y, targetX: target.x, targetY: target.y });
    }
  }

  private performAttack(unit: UnitState, target: TargetRef): void {
    let damage = unit.damage;
    if (unit.chargeDistance > 0 && unit.chargeProgress >= unit.chargeDistance) { damage *= unit.chargeMultiplier; unit.chargeProgress = 0; }
    if (target.kind === 'unit') {
      const targetUnit = this.units.find((item) => item.id === Number(target.id));
      if (!targetUnit?.alive) return;
      this.damageUnit(targetUnit, damage, unit.owner);
      for (const effect of unit.attackEffects) this.applyEffectToUnit(effect, targetUnit, unit.owner);
      if (unit.splashRadius > 0) this.applySplashDamage(unit.owner, targetUnit.x, targetUnit.y, damage, unit.splashRadius, targetUnit.id);
    } else {
      const tower = this.towers.find((item) => item.id === target.id);
      if (!tower?.alive) return;
      this.damageTower(tower, damage, unit.owner);
    }
    this.emit({ type: 'attack', side: unit.owner, unitId: unit.id, x: unit.x, y: unit.y, targetX: target.x, targetY: target.y });
  }

  private moveUnitTowardTarget(unit: UnitState, target: TargetRef, delta: number): void {
    let destinationX = target.x;
    let destinationY = target.y;
    if (unit.movement === 'ground') {
      const bridgeY = unit.lane === 'top' ? ARENA.topLaneY : ARENA.bottomLaneY;
      const ownSideBeforeBridge = unit.owner === 'player' ? unit.x < ARENA.riverLeft - unit.radius : unit.x > ARENA.riverRight + unit.radius;
      if (this.closedLane === unit.lane && ownSideBeforeBridge) {
        const waitX = unit.owner === 'player' ? ARENA.riverLeft - unit.radius - 4 : ARENA.riverRight + unit.radius + 4;
        const wx = waitX - unit.x;
        const wy = bridgeY - unit.y;
        const wl = Math.hypot(wx, wy);
        if (wl > 0.5) {
          const ws = Math.min(wl, unit.speed * this.getSpeedMultiplier(unit) * delta);
          unit.x += wx / wl * ws;
          unit.y += wy / wl * ws;
        }
        return;
      }
      if (unit.owner === 'player') {
        if (unit.x < ARENA.riverLeft - unit.radius) destinationX = ARENA.riverLeft + unit.radius;
        else if (unit.x < ARENA.riverRight + unit.radius) destinationX = ARENA.riverRight + unit.radius;
      } else {
        if (unit.x > ARENA.riverRight + unit.radius) destinationX = ARENA.riverRight - unit.radius;
        else if (unit.x > ARENA.riverLeft - unit.radius) destinationX = ARENA.riverLeft - unit.radius;
      }
      destinationY = bridgeY;
      if (unit.x >= ARENA.riverLeft - unit.radius && unit.x <= ARENA.riverRight + unit.radius) {
        destinationX = unit.owner === 'player' ? ARENA.riverRight + unit.radius + 5 : ARENA.riverLeft - unit.radius - 5;
        destinationY = bridgeY;
      } else if ((unit.owner === 'player' && unit.x > ARENA.riverRight) || (unit.owner === 'enemy' && unit.x < ARENA.riverLeft)) {
        destinationX = target.x;
        destinationY = target.y;
      }
    }
    const dx = destinationX - unit.x;
    const dy = destinationY - unit.y;
    const length = Math.hypot(dx, dy);
    if (length < 0.5) return;
    const speedMultiplier = this.getSpeedMultiplier(unit);
    const step = Math.min(length, unit.speed * speedMultiplier * delta);
    unit.x += (dx / length) * step;
    unit.y += (dy / length) * step;
    if (unit.chargeDistance > 0 && unit.chargeProgress < unit.chargeDistance) unit.chargeProgress += step;
  }

  private getSpeedMultiplier(unit: UnitState): number {
    let slow = 0;
    let speedBoost = 0;
    for (const status of unit.statuses) {
      if (status.kind === 'slow') slow = Math.max(slow, status.value);
      if (status.kind === 'speed') speedBoost = Math.max(speedBoost, status.value);
    }
    return Math.max(0.25, 1 - slow + speedBoost);
  }

  private findTarget(unit: UnitState): TargetRef | null {
    const enemySide: Side = unit.owner === 'player' ? 'enemy' : 'player';
    if (unit.targetPreference === 'buildings') {
      const guard = this.towers.find((tower) => tower.side === enemySide && tower.lane === unit.lane && tower.alive);
      if (guard) return towerTarget(guard);
      const king = this.towers.find((tower) => tower.side === enemySide && tower.lane === 'king' && tower.alive);
      return king ? towerTarget(king) : null;
    }
    const enemyUnits = this.units
      .filter((candidate) => candidate.alive && candidate.owner === enemySide && canTarget(unit.targets, candidate.movement))
      .map((candidate) => ({ candidate, dist: distance(unit.x, unit.y, candidate.x, candidate.y) }))
      .filter(({ candidate, dist }) => Math.abs(candidate.y - unit.y) <= 100 && dist <= unit.sightRange + candidate.radius)
      .sort((a, b) => a.dist - b.dist);
    if (enemyUnits[0]) {
      const target = enemyUnits[0].candidate;
      return { kind: 'unit', id: String(target.id), x: target.x, y: target.y, radius: target.radius, movement: target.movement };
    }
    const laneGuard = this.towers.find((tower) => tower.side === enemySide && tower.lane === unit.lane && tower.alive);
    if (laneGuard) return towerTarget(laneGuard);
    const king = this.towers.find((tower) => tower.side === enemySide && tower.lane === 'king' && tower.alive);
    return king ? towerTarget(king) : null;
  }

  private healNearbyAllies(unit: UnitState): void {
    const candidates = this.units
      .filter((candidate) => candidate.alive && candidate.owner === unit.owner && candidate.hp < candidate.maxHp)
      .map((candidate) => ({ candidate, dist: distance(unit.x, unit.y, candidate.x, candidate.y) }))
      .filter(({ candidate, dist }) => dist <= (unit.healRadius ?? unit.range) + candidate.radius)
      .sort((a, b) => a.candidate.hp / a.candidate.maxHp - b.candidate.hp / b.candidate.maxHp);
    const target = candidates[0]?.candidate;
    if (target) { const amount = Math.min(target.maxHp - target.hp, unit.healPerSecond ?? 0); target.hp += amount; this.statistics.healing[unit.owner] += amount; this.getCardStat(unit.cardId).healing += amount; }
  }

  private deployCard(side: Side, card: PlayableCard, lane: Lane, x: number, y: number): void {
    if (card.type === 'spell' && card.spell) {
      this.applyAreaEffects(side, x, y, card.spell.effects, card.spell.radius);
      this.emit({ type: 'spell', side, x, y, cardId: card.id });
      return;
    }
    if (card.type === 'trap' && card.trap) {
      this.traps.push({ id: this.nextEntityId++, owner: side, cardId: card.id, lane, x, y, triggerRadius: card.trap.triggerRadius, radius: card.trap.radius, effects: card.trap.effects.map((effect) => ({ ...effect })), lifetime: card.trap.lifetime, age: 0, alive: true });
      this.emit({ type: 'deploy', side, x, y, cardId: card.id });
      return;
    }
    const stats = card.stats;
    if (!stats) return;
    const statMultiplier = side === 'enemy' ? this.options.enemyStatMultiplier : 1;
    const spawnCount = stats.spawnCount ?? 1;
    const spread = spawnCount > 1 ? Math.min(72, 22 * (spawnCount - 1)) : 0;
    for (let index = 0; index < spawnCount; index += 1) {
      const offset = spawnCount === 1 ? 0 : -spread / 2 + (spread / (spawnCount - 1)) * index;
      const unit = this.createUnit(side, card.id, card.name, lane, x, y + offset, stats, statMultiplier);
      this.units.push(unit);
      if (stats.deployEffects?.length) this.applyAreaEffects(side, x, y, stats.deployEffects, Math.max(...stats.deployEffects.map((effect) => effect.radius ?? 120)));
    }
    this.emit({ type: 'deploy', side, x, y, cardId: card.id });
  }

  private createUnit(side: Side, cardId: string, name: string, lane: Lane, x: number, y: number, stats: NonNullable<CardDefinition['stats']>, multiplier: number): UnitState {
    return {
      id: this.nextEntityId++, owner: side, cardId, name, lane, x, y,
      maxHp: Math.round(stats.maxHp * multiplier), hp: Math.round(stats.maxHp * multiplier), damage: stats.damage * multiplier, damageReduction: stats.damageReduction ?? 0,
      range: stats.range, attackInterval: stats.attackInterval, attackCooldown: Math.random() * stats.attackInterval * 0.35,
      speed: stats.speed, radius: stats.radius, movement: stats.movement, targets: stats.targets, targetPreference: stats.targetPreference ?? 'any', sightRange: stats.sightRange ?? stats.range + 50,
      attackEffects: (stats.attackEffects ?? []).map((effect) => ({ ...effect, value: effect.kind === 'damage' ? effect.value * multiplier : effect.value })),
      deathEffects: (stats.deathEffects ?? []).map((effect) => ({ ...effect })), splashRadius: stats.splashRadius ?? 0,
      chargeDistance: stats.chargeDistance ?? 0, chargeMultiplier: stats.chargeMultiplier ?? 1, chargeProgress: 0,
      lifetime: stats.lifetime, age: 0, alive: true, statuses: [], isBuilding: getCardSafeType(cardId) === 'building' || name.includes('炮台') || name.includes('泉'),
      healPerSecond: stats.healPerSecond, healRadius: stats.healRadius,
    };
  }

  private applyAreaEffects(side: Side, x: number, y: number, effects: EffectSpec[], defaultRadius: number): void {
    const enemySide: Side = side === 'player' ? 'enemy' : 'player';
    for (const effect of effects) {
      const radius = effect.radius ?? defaultRadius;
      if (effect.kind === 'damage' || effect.kind === 'slow' || effect.kind === 'dot') {
        for (const unit of this.units) {
          if (!unit.alive || unit.owner !== enemySide || distance(x, y, unit.x, unit.y) > radius + unit.radius) continue;
          this.applyEffectToUnit(effect, unit, side);
        }
      } else {
        for (const unit of this.units) {
          if (!unit.alive || unit.owner !== side || distance(x, y, unit.x, unit.y) > radius + unit.radius) continue;
          this.applyEffectToUnit(effect, unit, side);
        }
      }
    }
    if (effects.some((effect) => effect.kind === 'damage')) {
      const totalDamage = effects.filter((effect) => effect.kind === 'damage').reduce((sum, effect) => sum + effect.value, 0);
      for (const tower of this.towers) {
        if (!tower.alive || tower.side !== enemySide) continue;
        if (distance(x, y, tower.x, tower.y) <= defaultRadius + 54) this.damageTower(tower, totalDamage * 0.35, side);
      }
    }
  }

  private applyEffectToUnit(effect: EffectSpec, unit: UnitState, sourceSide: Side): void {
    if (!unit.alive) return;
    if (effect.kind === 'damage') this.damageUnit(unit, effect.value, sourceSide);
    else if (effect.kind === 'heal') { const amount = Math.min(unit.maxHp - unit.hp, effect.value); unit.hp += amount; this.statistics.healing[sourceSide] += amount; this.getCardStat(unit.cardId).healing += amount; }
    else if (effect.kind === 'slow') upsertStatus(unit, { kind: 'slow', value: effect.value, remaining: effect.duration ?? 3, sourceId: -1 });
    else if (effect.kind === 'speed') upsertStatus(unit, { kind: 'speed', value: effect.value, remaining: effect.duration ?? 3, sourceId: -1 });
    else if (effect.kind === 'dot') upsertStatus(unit, { kind: 'dot', value: effect.value, remaining: effect.duration ?? 3, sourceId: -1 });
    if (sourceSide && unit.hp <= 0) this.killUnit(unit);
  }

  private applySplashDamage(side: Side, x: number, y: number, damage: number, radius: number, excludedId: number): void {
    const enemySide: Side = side === 'player' ? 'enemy' : 'player';
    for (const unit of this.units) {
      if (!unit.alive || unit.owner !== enemySide || unit.id === excludedId) continue;
      if (distance(x, y, unit.x, unit.y) <= radius + unit.radius) this.damageUnit(unit, damage * 0.65, side);
    }
  }

  private damageUnit(unit: UnitState, damage: number, sourceSide?: Side): void {
    if (!unit.alive) return;
    const finalDamage = damage * (1 - Math.max(0, Math.min(0.8, unit.damageReduction ?? 0)));
    unit.hp -= finalDamage;
    if (sourceSide) {
      this.statistics.damage[sourceSide] += finalDamage;
      this.getCardStat(unit.cardId).damage += 0;
    }
    if (unit.hp <= 0) this.killUnit(unit);
  }

  private killUnit(unit: UnitState): void {
    if (!unit.alive) return;
    unit.alive = false;
    if (unit.deathEffects.length > 0) this.applyAreaEffects(unit.owner, unit.x, unit.y, unit.deathEffects, Math.max(...unit.deathEffects.map((effect) => effect.radius ?? 100)));
    this.emit({ type: 'unit-died', side: unit.owner, unitId: unit.id, x: unit.x, y: unit.y, cardId: unit.cardId });
  }

  private damageTower(tower: TowerState, damage: number, attacker: Side): void {
    if (!tower.alive) return;
    let finalDamage = damage;
    if (this.options.bossShield && tower.side === 'enemy' && tower.lane === 'king') {
      const guardAlive = this.towers.some((item) => item.side === 'enemy' && item.lane !== 'king' && item.alive);
      if (guardAlive) finalDamage *= 0.4;
    }
    tower.hp -= finalDamage;
    if (tower.lane === 'king') tower.activated = true;
    this.statistics.damage[attacker] += finalDamage;
    this.emit({ type: 'tower-damaged', side: attacker, x: tower.x, y: tower.y, targetX: tower.x, targetY: tower.y, amount: finalDamage });
    if (tower.hp > 0) return;
    tower.hp = 0;
    tower.alive = false;
    this.crowns[attacker] += tower.lane === 'king' ? 3 : 1;
    this.statistics.towersDestroyed[attacker] += tower.lane === 'king' ? 3 : 1;
    this.emit({ type: 'tower-destroyed', side: attacker, x: tower.x, y: tower.y, text: tower.lane === 'king' ? '国王塔被摧毁' : '守卫塔被摧毁' });
    if (tower.lane !== 'king') this.activateKingTower(tower.side);
    if (this.activeModifier === 'reinforcement' && tower.lane !== 'king') this.spawnReinforcement(tower.side, tower.lane);
    if (tower.lane === 'king') this.finish({ winner: attacker, reason: 'king-destroyed', playerCrowns: this.crowns.player, enemyCrowns: this.crowns.enemy });
  }

  private activateKingTower(side: Side): void {
    const king = this.towers.find((tower) => tower.side === side && tower.lane === 'king');
    if (!king?.alive || king.activated) return;
    king.activated = true;
    king.attackCooldown = 0;
    this.emit({ type: 'tower-activated', side, x: king.x, y: king.y, text: '国王塔被唤醒' });
  }

  private checkEntityDeaths(): void {
    for (const unit of this.units) if (unit.alive && unit.hp <= 0) this.killUnit(unit);
  }

  private isValidDeployment(side: Side, card: PlayableCard, lane: Lane, x: number, y: number): boolean {
    if (card.type === 'catalyst') return false;
    if (card.type === 'spell') {
      return x >= ARENA.left && x <= ARENA.right && y >= ARENA.top && y <= ARENA.bottom;
    }
    const bounds = this.getDeployBounds(side, lane);
    if (x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) return false;
    if (card.type === 'building' || card.type === 'trap') return !this.inRiver(x);
    const movement = card.stats?.movement ?? 'ground';
    return movement === 'air' || !this.inRiver(x);
  }

  private onBridge(x: number, y: number): boolean {
    if (x < ARENA.riverLeft || x > ARENA.riverRight) return false;
    return Math.abs(y - ARENA.topLaneY) <= 60 || Math.abs(y - ARENA.bottomLaneY) <= 60;
  }

  private spawnReinforcement(side: Side, lane: Lane): void {
    const card = getCard('spore_squad');
    if (!card.stats) return;
    const baseX = side === 'player' ? TOWER_POSITIONS.playerTop.x - 45 : TOWER_POSITIONS.enemyTop.x + 45;
    const y = lane === 'top' ? ARENA.topLaneY : ARENA.bottomLaneY;
    for (let index = 0; index < 3; index += 1) this.units.push(this.createUnit(side, card.id, card.name, lane, baseX, y - 24 + index * 24, card.stats, 1));
    this.emit({ type: 'modifier', side, x: baseX, y, text: '增援协议启动' });
  }

  private inRiver(x: number): boolean { return x >= ARENA.riverLeft - 12 && x <= ARENA.riverRight + 12; }
  private totalTowerHealth(side: Side): number { return this.towers.filter((tower) => tower.side === side && tower.alive).reduce((sum, tower) => sum + tower.hp, 0); }
  private getTimeLeft(): number { return this.overtime ? Math.max(0, this.options.regularSeconds + this.options.overtimeSeconds - this.elapsedSeconds) : Math.max(0, this.options.regularSeconds - this.elapsedSeconds); }

  private finish(result: BattleResult): void {
    if (this.result) return;
    this.result = result;
    this.emit({ type: 'battle-ended', text: result.winner });
  }

  private getCardStat(cardId: string): { played: number; damage: number; healing: number } {
    const current = this.statistics.byCard[cardId];
    if (current) return current;
    const created = { played: 0, damage: 0, healing: 0 };
    this.statistics.byCard[cardId] = created;
    return created;
  }

  private emit(event: BattleEvent): void { this.events.push(event); }
}

function createTowers(): TowerState[] {
  return [
    createTower('player_king', 'player', 'king', TOWER_POSITIONS.playerKing.x, TOWER_POSITIONS.playerKing.y, 2500, 105, 340, 0.95, false),
    createTower('player_top', 'player', 'top', TOWER_POSITIONS.playerTop.x, TOWER_POSITIONS.playerTop.y, 1500, 82, 315, 0.95, true),
    createTower('player_bottom', 'player', 'bottom', TOWER_POSITIONS.playerBottom.x, TOWER_POSITIONS.playerBottom.y, 1500, 82, 315, 0.95, true),
    createTower('enemy_king', 'enemy', 'king', TOWER_POSITIONS.enemyKing.x, TOWER_POSITIONS.enemyKing.y, 2500, 105, 340, 0.95, false),
    createTower('enemy_top', 'enemy', 'top', TOWER_POSITIONS.enemyTop.x, TOWER_POSITIONS.enemyTop.y, 1500, 82, 315, 0.95, true),
    createTower('enemy_bottom', 'enemy', 'bottom', TOWER_POSITIONS.enemyBottom.x, TOWER_POSITIONS.enemyBottom.y, 1500, 82, 315, 0.95, true),
  ];
}

function createTower(id: string, side: Side, lane: TowerState['lane'], x: number, y: number, maxHp: number, damage: number, range: number, attackInterval: number, activated: boolean): TowerState {
  return { id, side, lane, x, y, maxHp, hp: maxHp, damage, range, attackInterval, attackCooldown: 0, alive: true, activated };
}

function towerTarget(tower: TowerState): TargetRef { return { kind: 'tower', id: tower.id, x: tower.x, y: tower.y, radius: 42, movement: 'ground' }; }
function canTarget(mask: UnitState['targets'], movement: UnitState['movement']): boolean { return mask === 'both' || mask === movement; }
function upsertStatus(unit: UnitState, incoming: ActiveStatus): void {
  const existing = unit.statuses.find((status) => status.kind === incoming.kind);
  if (existing) { existing.value = Math.max(existing.value, incoming.value); existing.remaining = Math.max(existing.remaining, incoming.remaining); }
  else unit.statuses.push(incoming);
}
function getCardSafeType(cardId: string): string | null { try { return getCard(cardId).type; } catch { return null; } }
function distance(ax: number, ay: number, bx: number, by: number): number { return Math.hypot(ax - bx, ay - by); }







function createStatistics(): BattleStatistics {
  return {
    damage: { player: 0, enemy: 0 },
    healing: { player: 0, enemy: 0 },
    elixirSpent: { player: 0, enemy: 0 },
    cardsPlayed: { player: 0, enemy: 0 },
    fusions: { player: 0, enemy: 0 },
    towersDestroyed: { player: 0, enemy: 0 },
    byCard: {},
  };
}
