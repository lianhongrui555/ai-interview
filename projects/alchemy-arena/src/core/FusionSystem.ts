import { BATTLE_RULES } from './constants';
import { getCard } from '../data/cards';
import type {
  CardDefinition,
  CatalystKind,
  EffectSpec,
  FusionRarity,
  FusionResult,
  FusionTrait,
  SpellSpec,
  TrapSpec,
  UnitStats,
} from './types';

export type RandomFn = () => number;

interface TraitDefinition {
  id: FusionTrait;
  name: string;
  adjective: string;
  color: number;
  common: string;
  rare: string;
}

export const TRAITS: Record<FusionTrait, TraitDefinition> = {
  armor: { id: 'armor', name: '坚甲', adjective: '坚甲', color: 0xc8b98e, common: '提高防御并获得额外生命。', rare: '获得高额伤害减免。' },
  spark: { id: 'spark', name: '星火', adjective: '星火', color: 0xff9a3d, common: '攻击附加短暂燃灼。', rare: '攻击造成更持久的余烬伤害。' },
  spore: { id: 'spore', name: '孢子', adjective: '孢子', color: 0x78d56f, common: '部署时额外生成一个孢子个体。', rare: '提供更强大的分裂增殖。' },
  gale: { id: 'gale', name: '疾风', adjective: '疾风', color: 0x8fe6df, common: '提高移动速度。', rare: '大幅提高机动性并强化突击。' },
  steam: { id: 'steam', name: '蒸汽', adjective: '蒸汽', color: 0xc4c8d0, common: '获得蒸汽冲锋。', rare: '冲锋威力显著提高。' },
  blast: { id: 'blast', name: '轰击', adjective: '轰击', color: 0xf0b84f, common: '攻击产生范围爆炸。', rare: '爆炸范围和冲击更强。' },
  life: { id: 'life', name: '生命', adjective: '生命', color: 0x9fe870, common: '部署时治疗附近友军。', rare: '治疗回响并覆盖更大范围。' },
  frost: { id: 'frost', name: '寒霜', adjective: '寒霜', color: 0x7edbff, common: '攻击或施法附加减速。', rare: '攻击造成更强的冻结控制。' },
  corrosion: { id: 'corrosion', name: '腐蚀', adjective: '腐蚀', color: 0x7ac65d, common: '攻击附加持续伤害。', rare: '腐蚀会快速扩散并持续更久。' },
  detonation: { id: 'detonation', name: '爆裂', adjective: '爆裂', color: 0xb46cff, common: '阵亡或触发时产生爆炸。', rare: '爆炸会连续发生两次。' },
};

interface SignatureRecipe {
  body: string;
  trait: string;
  result: Omit<FusionResult, 'cost' | 'bodyCardId' | 'traitCardId' | 'sourceCardIds' | 'rarity' | 'signatureRecipeId'>;
}

const SIGNATURE_RECIPES: SignatureRecipe[] = [
  {
    body: 'flame_flask', trait: 'frost_reagent',
    result: { id: 'fusion_icefire', name: '冰火爆裂', type: 'spell', tags: ['spell', 'damage', 'slow', 'elemental'], powerScore: 5.2, targeting: 'area', artKey: 'spell_fusion_icefire', effectId: 'fusion_icefire', mechanicId: 'signature_icefire', description: '冰火交错，造成高额范围伤害并使幸存者减速。', trait: 'frost', spell: { radius: 185, effects: [{ kind: 'damage', value: 530, radius: 185 }, { kind: 'slow', value: 0.6, duration: 5, radius: 185 }] } },
  },
  {
    body: 'spore_squad', trait: 'growth_serum',
    result: { id: 'fusion_proliferation', name: '增殖菌群', type: 'unit', tags: ['ground', 'swarm', 'fast', 'heal'], powerScore: 4.3, targeting: 'ground', artKey: 'unit_fusion_proliferation', effectId: 'fusion_proliferation', mechanicId: 'signature_proliferation', description: '六只强化孢子快速涌出，移动速度极快。', trait: 'spore', stats: { maxHp: 180, damage: 58, range: 36, attackInterval: 0.58, speed: 125, radius: 11, movement: 'ground', targets: 'ground', spawnCount: 6 } },
  },
  {
    body: 'anvil_guard', trait: 'steam_charger',
    result: { id: 'fusion_forge_rider', name: '熔炉重骑', type: 'unit', tags: ['ground', 'tank', 'charger'], powerScore: 5.6, targeting: 'ground', artKey: 'unit_fusion_forge', effectId: 'fusion_forge_rider', mechanicId: 'signature_forge', description: '厚重装甲与蒸汽推进器结合，冲锋命中造成巨额伤害。', trait: 'steam', stats: { maxHp: 1320, damage: 185, range: 52, attackInterval: 1, speed: 72, radius: 27, movement: 'ground', targets: 'ground', chargeDistance: 210, chargeMultiplier: 2.25, attackEffects: [{ kind: 'damage', value: 80, radius: 75 }] } },
  },
  {
    body: 'wind_griffin', trait: 'blast_rune',
    result: { id: 'fusion_thunder_dive', name: '雷鸣俯冲', type: 'unit', tags: ['air', 'fast', 'damage', 'area'], powerScore: 5.1, targeting: 'ground', artKey: 'unit_fusion_thunder', effectId: 'fusion_thunder_dive', mechanicId: 'signature_thunder', description: '从天而降的狮鹫，落地时引爆一圈雷击。', trait: 'detonation', stats: { maxHp: 620, damage: 125, range: 58, attackInterval: 0.78, speed: 128, radius: 22, movement: 'air', targets: 'both', splashRadius: 72, deployEffects: [{ kind: 'damage', value: 260, radius: 145 }] } },
  },
  {
    body: 'alchemy_cannon', trait: 'corrosion_mire',
    result: { id: 'fusion_acid_cannon', name: '酸液炮台', type: 'building', tags: ['ground', 'building', 'ranged', 'dot'], powerScore: 5, targeting: 'ground', artKey: 'building_fusion_acid', effectId: 'fusion_acid_cannon', mechanicId: 'signature_acid', description: '发射腐蚀炮弹，命中后继续侵蚀敌军。', trait: 'corrosion', stats: { maxHp: 930, damage: 120, range: 390, attackInterval: 1.15, speed: 0, radius: 28, movement: 'ground', targets: 'ground', splashRadius: 72, lifetime: 40, attackEffects: [{ kind: 'dot', value: 24, duration: 4, radius: 78 }] } },
  },
  {
    body: 'life_spring', trait: 'frost_reagent',
    result: { id: 'fusion_frost_spring', name: '寒泉领域', type: 'building', tags: ['ground', 'building', 'heal', 'slow'], powerScore: 4.9, targeting: 'ground', artKey: 'building_fusion_frost', effectId: 'fusion_frost_spring', mechanicId: 'signature_frost_spring', description: '泉水持续治疗友军，同时让靠近的敌军减速。', trait: 'frost', stats: { maxHp: 850, damage: 0, range: 205, attackInterval: 1, speed: 0, radius: 28, movement: 'ground', targets: 'ground', lifetime: 38, healPerSecond: 82, healRadius: 215, attackEffects: [{ kind: 'slow', value: 0.35, duration: 1.5, radius: 205 }] } },
  },
];

export function getFusionCost(body: CardDefinition, trait: CardDefinition, discount = 0): number {
  return Math.max(2, Math.min(BATTLE_RULES.maxFusionCost, Math.max(body.cost, trait.cost) + 1 - discount));
}

export function getFusionPreviewCost(body: CardDefinition, trait: CardDefinition, discount = 0): number {
  return getFusionCost(body, trait, discount);
}

export function getFusionRarity(catalyst: CatalystKind | null, random: RandomFn): FusionRarity {
  const roll = random();
  if (catalyst === 'order') return roll < 0.55 ? 'common' : roll < 0.9 ? 'rare' : 'signature';
  if (catalyst === 'chaos') return roll < 0.55 ? 'common' : roll < 0.75 ? 'rare' : 'signature';
  return roll < 0.65 ? 'common' : roll < 0.85 ? 'rare' : 'signature';
}
export function createFusionResult(bodyCardId: string, traitCardId: string, catalyst: CatalystKind | null = null, random: RandomFn = Math.random, fusionDiscount = 0): FusionResult {
  const body = getCard(bodyCardId);
  const traitCard = getCard(traitCardId);
  if (body.type === 'catalyst' || traitCard.type === 'catalyst' || !traitCard.fusionTrait) throw new Error('催化剂不能作为融合素材');
  const rarity = getFusionRarity(catalyst, random);

  if (rarity === 'signature') {
    const recipe = SIGNATURE_RECIPES.find((item) => item.body === body.id && item.trait === traitCard.id);
    if (recipe) {
      return { ...recipe.result, cost: getFusionCost(body, traitCard, fusionDiscount), bodyCardId: body.id, traitCardId: traitCard.id, sourceCardIds: [body.id, traitCard.id], rarity, signatureRecipeId: recipe.result.id };
    }
  }
  return createTraitFusion(body, traitCard, rarity, fusionDiscount);
}

function createTraitFusion(body: CardDefinition, traitCard: CardDefinition, rarity: FusionRarity, discount: number): FusionResult {
  const trait = traitCard.fusionTrait!;
  const traitInfo = TRAITS[trait];
  const signature = rarity === 'signature';
  const rare = rarity === 'rare' || signature;
  const base: Omit<FusionResult, 'stats' | 'spell' | 'trap'> = {
    id: `fusion_${body.id}_${trait}_${rarity}`,
    name: signature ? `传奇·${traitInfo.adjective}·${body.name}` : `${traitInfo.adjective}·${body.name}`,
    type: body.type as FusionResult['type'],
    tags: [...new Set([...body.tags, trait, 'fusion', rarity])],
    cost: getFusionCost(body, traitCard, discount),
    powerScore: Math.max(body.power, traitCard.power) + Math.min(body.power, traitCard.power) * 0.32,
    targeting: body.targeting,
    artKey: `fusion_${body.id}_${trait}_${rarity}`,
    effectId: `fusion_${trait}_${rarity}`,
    mechanicId: `${rare ? 'rare' : 'common'}_${trait}`,
    description: `${body.name}获得${traitInfo.name}词缀。${traitInfo.common}${rare ? traitInfo.rare : ''}`,
    rarity,
    bodyCardId: body.id,
    traitCardId: traitCard.id,
    trait,
    sourceCardIds: [body.id, traitCard.id],
  };
  if (body.type === 'unit' || body.type === 'building') return { ...base, stats: applyTraitToStats(body.stats ?? fallbackStats(body), trait, rare, signature) };
  if (body.type === 'spell') return { ...base, spell: applyTraitToSpell(body.spell ?? { radius: 130, effects: [] }, trait, rare, signature) };
  return { ...base, trap: applyTraitToTrap(body.trap ?? { triggerRadius: 58, radius: 125, effects: [], lifetime: 32 }, trait, rare, signature) };
}
function applyTraitToStats(source: UnitStats, trait: FusionTrait, rare: boolean, signature: boolean): UnitStats {
  const stats: UnitStats = { ...source, attackEffects: cloneEffects(source.attackEffects), deployEffects: cloneEffects(source.deployEffects), deathEffects: cloneEffects(source.deathEffects) };
  const powerScale = signature ? 1.5 : rare ? 1 : 0.65;
  switch (trait) {
    case 'armor': stats.maxHp = Math.round(stats.maxHp * (rare ? 1.18 : 1.1)); stats.damageReduction = Math.max(stats.damageReduction ?? 0, rare ? 0.35 : 0.12); break;
    case 'spark': stats.attackEffects!.push({ kind: 'dot', value: Math.round(18 * powerScale), duration: signature ? 5 : rare ? 4 : 3, radius: 50 }); break;
    case 'spore': stats.spawnCount = (stats.spawnCount ?? 1) + (rare ? 2 : 1); break;
    case 'gale': stats.speed = Math.round(stats.speed * (signature ? 1.45 : rare ? 1.3 : 1.15)); break;
    case 'steam': stats.chargeDistance = stats.chargeDistance ?? 180; stats.chargeMultiplier = Math.max(stats.chargeMultiplier ?? 1, signature ? 2.2 : rare ? 1.8 : 1.4); break;
    case 'blast': stats.splashRadius = Math.max(stats.splashRadius ?? 0, 65) + (signature ? 100 : rare ? 60 : 0); break;
    case 'life': stats.deployEffects!.push({ kind: 'heal', value: Math.round(120 * powerScale), radius: signature ? 200 : 145 }); break;
    case 'frost': stats.attackEffects!.push({ kind: 'slow', value: rare ? 0.62 : 0.35, duration: signature ? 4 : 2.5, radius: 60 }); break;
    case 'corrosion': stats.attackEffects!.push({ kind: 'dot', value: Math.round(18 * powerScale), duration: signature ? 6 : rare ? 5 : 4, radius: 65 }); break;
    case 'detonation': stats.deathEffects!.push({ kind: 'damage', value: Math.round(180 * powerScale), radius: signature ? 145 : 105 }); break;
  }
  return stats;
}

function applyTraitToSpell(source: SpellSpec, trait: FusionTrait, rare: boolean, signature: boolean): SpellSpec {
  const radius = source.radius + (rare ? 30 : 10);
  const effects = cloneEffects(source.effects);
  const scale = signature ? 1.5 : rare ? 1 : 0.65;
  const traitEffects: Record<FusionTrait, EffectSpec> = {
    armor: { kind: 'damage', value: Math.round(90 * scale), radius },
    spark: { kind: 'dot', value: Math.round(22 * scale), duration: rare ? 4 : 3, radius },
    spore: { kind: 'heal', value: Math.round(120 * scale), radius },
    gale: { kind: 'damage', value: Math.round(110 * scale), radius },
    steam: { kind: 'damage', value: Math.round(130 * scale), radius },
    blast: { kind: 'damage', value: Math.round(150 * scale), radius },
    life: { kind: 'heal', value: Math.round(180 * scale), radius },
    frost: { kind: 'slow', value: rare ? 0.65 : 0.4, duration: rare ? 4 : 2.5, radius },
    corrosion: { kind: 'dot', value: Math.round(26 * scale), duration: rare ? 6 : 4, radius },
    detonation: { kind: 'damage', value: Math.round(190 * scale), radius },
  };
  effects.push({ ...traitEffects[trait] });
  return { radius, effects };
}

function applyTraitToTrap(source: TrapSpec, trait: FusionTrait, rare: boolean, signature: boolean): TrapSpec {
  const spell = applyTraitToSpell({ radius: source.radius, effects: source.effects }, trait, rare, signature);
  return { ...source, radius: spell.radius, effects: spell.effects };
}

function cloneEffects(effects?: EffectSpec[]): EffectSpec[] { return (effects ?? []).map((effect) => ({ ...effect })); }
function fallbackStats(card: CardDefinition): UnitStats { return { maxHp: Math.round(card.power * 170), damage: Math.round(card.power * 32), range: card.type === 'building' ? 260 : 48, attackInterval: 1, speed: card.type === 'building' ? 0 : 62, radius: 19, movement: 'ground', targets: card.type === 'building' ? 'ground' : 'both' }; }
export function listSignaturePairs(): Array<[string, string]> { return SIGNATURE_RECIPES.map((recipe) => [recipe.body, recipe.trait]); }

