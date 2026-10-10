import { describe, expect, it } from 'vitest';
import { createFusionResult, getFusionCost, getFusionRarity } from '../src/core/FusionSystem';
import { getCard } from '../src/data/cards';

describe('FusionSystem', () => {
  it('第一张素材决定主体类型，第二张提供固定词缀', () => {
    const result = createFusionResult('anvil_guard', 'frost_reagent', null, () => 0.1);
    expect(result.bodyCardId).toBe('anvil_guard');
    expect(result.traitCardId).toBe('frost_reagent');
    expect(result.trait).toBe('frost');
    expect(result.type).toBe('unit');
    expect(result.name).toContain('寒霜');
  });

  it('融合费用使用最高素材费用加一，并支持祝福折扣', () => {
    expect(getFusionCost(getCard('anvil_guard'), getCard('spark_archer'))).toBe(5);
    expect(getFusionCost(getCard('anvil_guard'), getCard('spark_archer'), 1)).toBe(4);
  });

  it('默认概率为普通 65%、稀有 20%、招牌 15%', () => {
    expect(getFusionRarity(null, () => 0.1)).toBe('common');
    expect(getFusionRarity(null, () => 0.7)).toBe('rare');
    expect(getFusionRarity(null, () => 0.9)).toBe('signature');
  });

  it('指定招牌配方在招牌判定时使用专属技能', () => {
    const result = createFusionResult('flame_flask', 'frost_reagent', null, () => 0.9);
    expect(result.name).toBe('冰火爆裂');
    expect(result.rarity).toBe('signature');
    expect(result.signatureRecipeId).toBe('fusion_icefire');
  });

  it('相同主体、词缀和稀有度生成固定结果', () => {
    const first = createFusionResult('spore_squad', 'growth_serum', null, () => 0.1);
    const second = createFusionResult('spore_squad', 'growth_serum', null, () => 0.1);
    expect(first).toEqual(second);
  });
});
