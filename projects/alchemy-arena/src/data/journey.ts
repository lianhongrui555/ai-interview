import type { BattleModifierId, BlessingId, NodeId } from '../core/types';

export interface ModifierDefinition { id: BattleModifierId; name: string; description: string; color: number; }
export interface BlessingDefinition { id: BlessingId; name: string; description: string; color: number; }

export const BATTLE_MODIFIERS: Record<BattleModifierId, ModifierDefinition> = {
  'bridge-rotation': { id: 'bridge-rotation', name: '桥梁轮换', description: '每隔一段时间，一座桥会关闭并在预警后重新开放。', color: 0xd0a462 },
  'lava-pulse': { id: 'lava-pulse', name: '熔岩脉冲', description: '桥面周期性喷发，对上方地面单位造成持续伤害。', color: 0xe05a38 },
  'frost-current': { id: 'frost-current', name: '寒霜暗流', description: '地面单位通过桥面时会被明显减速。', color: 0x72cdf0 },
  'elixir-tide': { id: 'elixir-tide', name: '圣水潮汐', description: '双方圣水恢复速度周期性地增强。', color: 0xb76ce1 },
  'spore-cloud': { id: 'spore-cloud', name: '孢子云', description: '河道附近周期性治疗经过的地面单位。', color: 0x68c86f },
  reinforcement: { id: 'reinforcement', name: '增援协议', description: '守卫塔被摧毁时，塔的拥有方会获得防守增援。', color: 0xd8bd69 },
};

export const BLESSINGS: Record<BlessingId, BlessingDefinition> = {
  'fusion-discount': { id: 'fusion-discount', name: '熔炉亲和', description: '每层使融合费用降低 1，最低 2 费。', color: 0xb568df },
  'signature-chance': { id: 'signature-chance', name: '精准配方', description: '每层使招牌配方概率提高 12 个百分点。', color: 0xe8b84d },
  'elixir-regen': { id: 'elixir-regen', name: '圣水回流', description: '每层使圣水恢复速度提高 12%。', color: 0xca67dc },
  'unit-power': { id: 'unit-power', name: '炼金军势', description: '每层使己方单位生命和伤害提高 6%。', color: 0x4cc6d7 },
  'tower-health': { id: 'tower-health', name: '重铸塔甲', description: '每层使己方塔最大生命提高 8%。', color: 0xc99b67 },
  'starting-elixir': { id: 'starting-elixir', name: '战术补给', description: '每层使每场开始时额外获得 2 点圣水。', color: 0x8b62d4 },
};

export const MODIFIER_IDS = Object.keys(BATTLE_MODIFIERS) as BattleModifierId[];
export const BLESSING_IDS = Object.keys(BLESSINGS) as BlessingId[];

export function getModifier(id: BattleModifierId): ModifierDefinition { return BATTLE_MODIFIERS[id]; }
export function getBlessing(id: BlessingId): BlessingDefinition { return BLESSINGS[id]; }

export function pickUnusedModifiers(existing: Partial<Record<NodeId, BattleModifierId>>, count: number, random: () => number = Math.random): BattleModifierId[] {
  const used = new Set(Object.values(existing));
  const pool = MODIFIER_IDS.filter((id) => !used.has(id));
  const result: BattleModifierId[] = [];
  while (result.length < count && pool.length > 0) {
    const index = Math.floor(random() * pool.length);
    const picked = pool.splice(index, 1)[0];
    if (picked) result.push(picked);
  }
  return result;
}

export function pickBlessingChoices(existing: Partial<Record<BlessingId, 1 | 2>>, random: () => number = Math.random): BlessingId[] {
  const pool = BLESSING_IDS.filter((id) => (existing[id] ?? 0) < 2);
  const result: BlessingId[] = [];
  while (result.length < Math.min(3, pool.length) && pool.length > 0) {
    const index = Math.floor(random() * pool.length);
    const picked = pool.splice(index, 1)[0];
    if (picked) result.push(picked);
  }
  return result;
}
