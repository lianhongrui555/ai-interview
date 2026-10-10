import type { CardDefinition } from '../core/types';

export const CARDS: Record<string, CardDefinition> = {
  anvil_guard: {
    id: 'anvil_guard', name: '铁砧守卫', role: '建筑杀手坦克', fusionNoun: '守卫', fusionTrait: 'armor', type: 'unit', tags: ['ground', 'tank', 'melee', 'building-only', 'win-condition'],
    cost: 4, power: 4.8, targeting: 'ground', artKey: 'unit_anvil', effectId: 'unit_default',
    description: '高生命的攻城坦克，只攻击防御塔和建筑，不理会敌方部队。',
    stats: { maxHp: 1800, damage: 180, range: 52, attackInterval: 1.35, speed: 36, radius: 29, movement: 'ground', targets: 'ground', targetPreference: 'buildings', sightRange: 80 },
  },
  spark_archer: {
    id: 'spark_archer', name: '星火弓手', fusionNoun: '弓手', fusionTrait: 'spark', type: 'unit', tags: ['ground', 'ranged', 'multi'],
    cost: 3, power: 3.6, targeting: 'ground', artKey: 'unit_archer', effectId: 'unit_default',
    description: '两名远程弓手，可以同时攻击空中与地面目标。',
    stats: { maxHp: 195, damage: 58, range: 270, attackInterval: 0.78, speed: 76, radius: 15, movement: 'ground', targets: 'both', spawnCount: 2, sightRange: 300 },
  },
  spore_squad: {
    id: 'spore_squad', name: '孢子小队', fusionNoun: '菌群', fusionTrait: 'spore', type: 'unit', tags: ['ground', 'swarm', 'melee'],
    cost: 2, power: 2.5, targeting: 'ground', artKey: 'unit_spore', effectId: 'unit_default',
    description: '四只快速孢子兵，数量多但单体生命较低。',
    stats: { maxHp: 135, damage: 44, range: 34, attackInterval: 0.65, speed: 102, radius: 11, movement: 'ground', targets: 'ground', spawnCount: 4, sightRange: 105 },
  },
  wind_griffin: {
    id: 'wind_griffin', name: '迅羽狮鹫', fusionNoun: '狮鹫', fusionTrait: 'gale', type: 'unit', tags: ['air', 'fast', 'melee'],
    cost: 3, power: 3.5, targeting: 'ground', artKey: 'unit_griffin', effectId: 'unit_default',
    description: '飞行单位，可以越河直达目标，速度很快。',
    stats: { maxHp: 510, damage: 92, range: 54, attackInterval: 0.88, speed: 112, radius: 20, movement: 'air', targets: 'both', sightRange: 130 },
  },
  steam_charger: {
    id: 'steam_charger', name: '蒸汽冲锋者', fusionNoun: '冲锋者', fusionTrait: 'steam', type: 'unit', tags: ['ground', 'charger', 'melee'],
    cost: 4, power: 4.7, targeting: 'ground', artKey: 'unit_charger', effectId: 'unit_charge',
    description: '长距离冲锋后造成双倍伤害，适合突破防线。',
    stats: { maxHp: 790, damage: 145, range: 46, attackInterval: 1.0, speed: 72, radius: 22, movement: 'ground', targets: 'ground', chargeDistance: 220, chargeMultiplier: 2, sightRange: 145 },
  },
  alchemy_cannon: {
    id: 'alchemy_cannon', name: '炼金炮台', fusionNoun: '炮台', fusionTrait: 'blast', type: 'building', tags: ['ground', 'building', 'ranged', 'area'],
    cost: 4, power: 4.2, targeting: 'ground', artKey: 'building_cannon', effectId: 'building_default',
    description: '固定炮台，向范围内敌人发射范围爆破弹。',
    stats: { maxHp: 830, damage: 116, range: 370, attackInterval: 1.25, speed: 0, radius: 27, movement: 'ground', targets: 'ground', splashRadius: 58, lifetime: 38, sightRange: 380 },
  },
  life_spring: {
    id: 'life_spring', name: '生命泉眼', fusionNoun: '泉眼', fusionTrait: 'life', type: 'building', tags: ['ground', 'building', 'support', 'heal'],
    cost: 4, power: 3.8, targeting: 'ground', artKey: 'building_spring', effectId: 'building_heal',
    description: '持续治疗范围内的友军，但无法攻击。',
    stats: { maxHp: 720, damage: 0, range: 45, attackInterval: 1.1, speed: 0, radius: 26, movement: 'ground', targets: 'ground', lifetime: 34, healPerSecond: 64, healRadius: 205, sightRange: 220 },
  },
  flame_flask: {
    id: 'flame_flask', name: '炽焰瓶', fusionNoun: '炽焰瓶', fusionTrait: 'spark', type: 'spell', tags: ['spell', 'damage', 'area', 'fire'],
    cost: 3, power: 3.8, targeting: 'area', artKey: 'spell_flame', effectId: 'spell_flame',
    description: '向指定区域投掷炽焰，对地面与空中敌人造成范围伤害。',
    spell: { radius: 135, effects: [{ kind: 'damage', value: 370, radius: 135 }] },
  },
  frost_reagent: {
    id: 'frost_reagent', name: '霜冻试剂', fusionNoun: '霜剂', fusionTrait: 'frost', type: 'spell', tags: ['spell', 'control', 'area', 'frost'],
    cost: 3, power: 3.5, targeting: 'area', artKey: 'spell_frost', effectId: 'spell_frost',
    description: '冻结区域内的敌人，使其在短时间内大幅减速。',
    spell: { radius: 155, effects: [{ kind: 'damage', value: 115 }, { kind: 'slow', value: 0.5, duration: 4.5, radius: 155 }] },
  },
  growth_serum: {
    id: 'growth_serum', name: '生长原液', fusionNoun: '生长液', fusionTrait: 'life', type: 'spell', tags: ['spell', 'support', 'heal', 'buff'],
    cost: 3, power: 3.6, targeting: 'area', artKey: 'spell_growth', effectId: 'spell_growth',
    description: '治疗范围内友军，并暂时提高移动速度。',
    spell: { radius: 185, effects: [{ kind: 'heal', value: 330 }, { kind: 'speed', value: 0.3, duration: 4.5 }] },
  },
  corrosion_mire: {
    id: 'corrosion_mire', name: '腐蚀泥沼', fusionNoun: '泥沼', fusionTrait: 'corrosion', type: 'trap', tags: ['trap', 'control', 'dot', 'ground'],
    cost: 3, power: 3.2, targeting: 'ground', artKey: 'trap_mire', effectId: 'trap_mire',
    description: '隐藏在地面的泥沼，触发后减速并持续腐蚀敌军。',
    trap: { triggerRadius: 54, radius: 125, effects: [{ kind: 'damage', value: 75 }, { kind: 'slow', value: 0.4, duration: 3.5, radius: 125 }, { kind: 'dot', value: 18, duration: 4, radius: 125 }], lifetime: 32 },
  },
  blast_rune: {
    id: 'blast_rune', name: '爆裂符文', fusionNoun: '符文', fusionTrait: 'detonation', type: 'trap', tags: ['trap', 'damage', 'area', 'ground'],
    cost: 3, power: 3.7, targeting: 'ground', artKey: 'trap_rune', effectId: 'trap_rune',
    description: '敌军接近时引爆，对周围地面单位造成大量伤害。',
    trap: { triggerRadius: 62, radius: 125, effects: [{ kind: 'damage', value: 410, radius: 125 }], lifetime: 32 },
  },
  order_crystal: {
    id: 'order_crystal', name: '秩序结晶', type: 'catalyst', tags: ['catalyst', 'order'], cost: 1, power: 1,
    targeting: 'none', artKey: 'catalyst_order', effectId: 'catalyst_order',
    description: '下一次熔铸只能产生作战类单位或建筑。', catalyst: { kind: 'order' },
  },
  chaos_dust: {
    id: 'chaos_dust', name: '混沌粉尘', type: 'catalyst', tags: ['catalyst', 'chaos'], cost: 1, power: 1,
    targeting: 'none', artKey: 'catalyst_chaos', effectId: 'catalyst_chaos',
    description: '下一次熔铸只能产生法术或陷阱。', catalyst: { kind: 'chaos' },
  },
};

export const ALL_CARD_IDS = Object.keys(CARDS);
export const INITIAL_UNLOCKED_IDS = [
  'anvil_guard', 'spark_archer', 'spore_squad', 'wind_griffin',
  'alchemy_cannon', 'flame_flask', 'frost_reagent', 'order_crystal',
];
export const INITIAL_DECK_IDS = [...INITIAL_UNLOCKED_IDS];

export function getCard(id: string): CardDefinition {
  const card = CARDS[id];
  if (!card) throw new Error(`未知卡牌: ${id}`);
  return card;
}

export function getDeckCards(ids: string[]): CardDefinition[] {
  return ids.map(getCard);
}



