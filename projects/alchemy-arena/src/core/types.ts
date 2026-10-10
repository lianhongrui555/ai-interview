export type Side = 'player' | 'enemy';
export type Lane = 'top' | 'bottom';
export type CardType = 'unit' | 'building' | 'spell' | 'trap' | 'catalyst';
export type BattleCardType = Exclude<CardType, 'catalyst'>;
export type TargetMode = 'none' | 'ground' | 'area' | 'lane';
export type MovementMode = 'ground' | 'air';
export type TargetMask = 'ground' | 'air' | 'both';

export type FusionTrait =
  | 'armor' | 'spark' | 'spore' | 'gale' | 'steam'
  | 'blast' | 'life' | 'frost' | 'corrosion' | 'detonation';
export type FusionRarity = 'common' | 'rare' | 'signature';
export type CatalystKind = 'order' | 'chaos';

export type BattleMode = 'campaign' | 'practice' | 'tutorial';
export type AIArchetype = 'apprentice' | 'silversmith' | 'grand-alchemist';
export type DeckPresetId = 1 | 2 | 3;
export type JourneyLayer = 1 | 2 | 3;
export type NodeId = 'l1_trial' | 'l1_greenhouse' | 'l2_silver' | 'l2_frost' | 'l3_crown';
export type BattleThemeId = 'trial' | 'spore' | 'silver' | 'frost' | 'crown';
export type BattleModifierId =
  | 'bridge-rotation' | 'lava-pulse' | 'frost-current'
  | 'elixir-tide' | 'spore-cloud' | 'reinforcement';
export type BlessingId =
  | 'fusion-discount' | 'signature-chance' | 'elixir-regen'
  | 'unit-power' | 'tower-health' | 'starting-elixir';

export interface EffectSpec {
  kind: 'damage' | 'heal' | 'slow' | 'dot' | 'speed';
  value: number;
  duration?: number;
  radius?: number;
}

export interface UnitStats {
  maxHp: number;
  damage: number;
  range: number;
  attackInterval: number;
  speed: number;
  radius: number;
  damageReduction?: number;
  movement: MovementMode;
  targets: TargetMask;
  targetPreference?: 'any' | 'buildings';
  sightRange?: number;
  attackEffects?: EffectSpec[];
  deployEffects?: EffectSpec[];
  deathEffects?: EffectSpec[];
  splashRadius?: number;
  chargeDistance?: number;
  chargeMultiplier?: number;
  lifetime?: number;
  spawnCount?: number;
  healPerSecond?: number;
  healRadius?: number;
}

export interface SpellSpec {
  radius: number;
  effects: EffectSpec[];
}

export interface TrapSpec {
  triggerRadius: number;
  radius: number;
  effects: EffectSpec[];
  lifetime: number;
}

export interface CatalystSpec {
  kind: CatalystKind;
}

export interface CardDefinition {
  id: string;
  name: string;
  role?: string;
  fusionNoun?: string;
  fusionTrait?: FusionTrait;
  type: CardType;
  tags: string[];
  cost: number;
  power: number;
  targeting: TargetMode;
  artKey: string;
  effectId: string;
  description: string;
  stats?: UnitStats;
  spell?: SpellSpec;
  trap?: TrapSpec;
  catalyst?: CatalystSpec;
}

export interface FusionResult {
  id: string;
  name: string;
  role?: string;
  type: BattleCardType;
  tags: string[];
  cost: number;
  powerScore: number;
  targeting: TargetMode;
  artKey: string;
  effectId: string;
  mechanicId: string;
  description: string;
  rarity: FusionRarity;
  bodyCardId: string;
  traitCardId: string;
  trait: FusionTrait;
  sourceCardIds: [string, string];
  signatureRecipeId?: string;
  stats?: UnitStats;
  spell?: SpellSpec;
  trap?: TrapSpec;
}

export type PlayableCard = CardDefinition | FusionResult;


export interface AIBehavior {
  archetype: AIArchetype;
  reactionMin: number;
  reactionMax: number;
  fusionChance: number;
  catalystChance: number;
  defenseWeight: number;
  offenseWeight: number;
  laneSwitchChance: number;
  mistakeChance: number;
  preferTraps: boolean;
  preferBuildings: boolean;
}
export interface StageConfig {
  id: number;
  name: string;
  subtitle: string;
  aiName: string;
  aiBehavior: AIBehavior;
  deck: string[];
  usesCatalysts: boolean;
  usesTraps: boolean;
  difficultyLabel: string;
  themeId: BattleThemeId;
}

export interface StageNodeDefinition {
  id: NodeId;
  layer: JourneyLayer;
  name: string;
  subtitle: string;
  aiStageId: number;
  themeId: BattleThemeId;
  deck: string[];
  boss: boolean;
  starGoals: readonly string[];
}

export interface PracticeSettings {
  deckIds: string[];
  opponent: 'off' | 1 | 2 | 3;
  infiniteElixir: boolean;
  timerEnabled: boolean;
}

export interface ActiveJourney {
  status: 'idle' | 'active' | 'reward' | 'complete';
  currentNodeId: NodeId;
  route: NodeId[];
  nodeModifiers: Partial<Record<NodeId, BattleModifierId>>;
  blessings: Partial<Record<BlessingId, 1 | 2>>;
  lockedDeckIds: string[];
  pendingCardChoices?: string[];
  pendingNextNodes?: NodeId[];
  pendingBlessingChoices?: BlessingId[];
}

export interface SaveV1 {
  version: 1;
  unlockedCardIds: string[];
  deckCardIds: string[];
  clearedStageIds: number[];
  settings: { musicVolume: number; sfxVolume: number };
}

export interface SaveV2 {
  version: 2;
  unlockedCardIds: string[];
  deckPresets: Record<'1' | '2' | '3', string[]>;
  activeDeckPreset: DeckPresetId;
  practice: PracticeSettings;
  nodeStars: Partial<Record<NodeId, 0 | 1 | 2 | 3>>;
  nodeLossStreaks: Partial<Record<NodeId, number>>;
  firstClearedNodeIds: NodeId[];
  unlockedJourneyLayers: JourneyLayer[];
  activeJourney: ActiveJourney | null;
  tutorialCompleted: boolean;
  tutorialStep: number;
  settings: {
    musicVolume: number;
    sfxVolume: number;
    preferredBattleSpeed: 1 | 2;
  };
}

export interface TowerState {
  id: string;
  side: Side;
  lane: 'king' | Lane;
  x: number;
  y: number;
  maxHp: number;
  hp: number;
  damage: number;
  range: number;
  attackInterval: number;
  attackCooldown: number;
  alive: boolean;
  activated: boolean;
}

export interface UnitState {
  id: number;
  owner: Side;
  cardId: string;
  name: string;
  lane: Lane;
  x: number;
  y: number;
  maxHp: number;
  hp: number;
  damage: number;
  range: number;
  attackInterval: number;
  attackCooldown: number;
  speed: number;
  radius: number;
  damageReduction?: number;
  movement: MovementMode;
  targets: TargetMask;
  targetPreference: 'any' | 'buildings';
  sightRange: number;
  attackEffects: EffectSpec[];
  deathEffects: EffectSpec[];
  splashRadius: number;
  chargeDistance: number;
  chargeMultiplier: number;
  chargeProgress: number;
  lifetime?: number;
  age: number;
  alive: boolean;
  statuses: ActiveStatus[];
  isBuilding: boolean;
  healPerSecond?: number;
  healRadius?: number;
}

export interface ActiveStatus {
  kind: 'slow' | 'dot' | 'speed';
  value: number;
  remaining: number;
  sourceId: number;
}

export interface TrapState {
  id: number;
  owner: Side;
  cardId: string;
  lane: Lane;
  x: number;
  y: number;
  triggerRadius: number;
  radius: number;
  effects: EffectSpec[];
  lifetime: number;
  age: number;
  alive: boolean;
}

export interface BattleEvent {
  type:
    | 'deploy'
    | 'attack'
    | 'spell'
    | 'trap-trigger'
    | 'unit-died'
    | 'tower-damaged'
    | 'tower-destroyed'
    | 'tower-activated'
    | 'battle-ended'
    | 'modifier';
  side?: Side;
  x?: number;
  y?: number;
  targetX?: number;
  targetY?: number;
  unitId?: number;
  cardId?: string;
  amount?: number;
  text?: string;
}

export interface BattleSnapshot {
  elapsed: number;
  timeLeft: number;
  overtime: boolean;
  playerElixir: number;
  enemyElixir: number;
  towers: TowerState[];
  units: UnitState[];
  traps: TrapState[];
  result: BattleResult | null;
  modifierId?: BattleModifierId;
}

export interface BattleResult {
  winner: Side | 'draw';
  reason: 'king-destroyed' | 'time' | 'health';
  playerCrowns: number;
  enemyCrowns: number;
}

export interface BattleStatistics {
  damage: Record<Side, number>;
  healing: Record<Side, number>;
  elixirSpent: Record<Side, number>;
  cardsPlayed: Record<Side, number>;
  fusions: Record<Side, number>;
  towersDestroyed: Record<Side, number>;
  byCard: Record<string, { played: number; damage: number; healing: number }>;
}

export interface DeploymentPreview {
  valid: boolean;
  reason?: 'outside-zone' | 'river' | 'not-enough-elixir' | 'fusion-pending' | 'paused';
  bounds: { left: number; right: number; top: number; bottom: number };
}

export interface BattleSceneData {
  mode: BattleMode;
  stageId: number;
  nodeId?: NodeId;
  deckIds: string[];
  practice?: PracticeSettings;
  modifierId?: BattleModifierId;
  blessings?: Partial<Record<BlessingId, 1 | 2>>;
  tutorialStep?: number;
  aiAssistLevel?: 0 | 1;
}
