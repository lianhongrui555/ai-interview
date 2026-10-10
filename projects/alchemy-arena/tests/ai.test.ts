import { describe, expect, it, vi } from 'vitest';
import { AIController } from '../src/core/AIController';
import { BattleSimulation } from '../src/core/BattleSimulation';
import { INITIAL_DECK_IDS } from '../src/data/cards';
import { STAGES, getStage } from '../src/data/levels';

function randomSequence(values: number[], fallback = 0.5): () => number {
  let index = 0;
  return () => values[index++] ?? fallback;
}

function createSimulation(stageId: number, enemyDeck?: string[], startingElixir = 10): BattleSimulation {
  return new BattleSimulation(getStage(stageId), INITIAL_DECK_IDS, enemyDeck, { startingElixir });
}

describe('AI 公平性与特点', () => {
  it('三关 AI 没有属性或圣水加成，反应区间符合设计', () => {
    const expected = [
      { min: 1.2, max: 1.8 },
      { min: 1.0, max: 1.5 },
      { min: 0.8, max: 1.2 },
    ];
    STAGES.forEach((stage, index) => {
      const simulation = createSimulation(stage.id);
      expect(simulation.options.enemyStatMultiplier).toBe(1);
      expect(simulation.options.enemyElixirMultiplier).toBe(1);
      expect(stage.aiBehavior.reactionMin).toBe(expected[index]!.min);
      expect(stage.aiBehavior.reactionMax).toBe(expected[index]!.max);

      expect(simulation.playHandCard('enemy', 0, 'top', 1200, 310)).toBe(true);
      const enemy = simulation.units.find((unit) => unit.owner === 'enemy')!;
      expect(enemy.maxHp).toBe(1800);
      expect(enemy.damage).toBe(180);
    });
  });

  it('见习炼金师不熔铸、不使用催化剂，也不读取玩家手牌', () => {
    const enemyDeck = ['order_crystal', 'anvil_guard', 'spark_archer', 'spore_squad', 'wind_griffin', 'steam_charger', 'alchemy_cannon', 'flame_flask'];
    const simulation = createSimulation(1, enemyDeck);
    const catalystSpy = vi.spyOn(simulation, 'useCatalyst');
    const fusionSpy = vi.spyOn(simulation, 'fuseCards');
    const handSpy = vi.spyOn(simulation, 'getHand');
    const snapshotSpy = vi.spyOn(simulation, 'getSnapshot');
    const ai = new AIController(randomSequence([0, 0.9, 0.9, 0.1, 0.1, 0.1]));

    ai.update(0, simulation);

    expect(catalystSpy).not.toHaveBeenCalled();
    expect(fusionSpy).not.toHaveBeenCalled();
    expect(simulation.units.some((unit) => unit.owner === 'enemy')).toBe(true);
    expect(handSpy.mock.calls.every(([side]) => side === 'enemy')).toBe(true);
    expect(handSpy).not.toHaveBeenCalledWith('player');
    expect(snapshotSpy).not.toHaveBeenCalled();
  });

  it('白银铸造师优先使用陷阱和建筑防守', () => {
    const trapSimulation = createSimulation(2, ['corrosion_mire', 'alchemy_cannon', 'life_spring', 'anvil_guard', 'spark_archer', 'spore_squad', 'flame_flask', 'wind_griffin']);
    expect(trapSimulation.playHandCard('player', 0, 'top', 1100, 310)).toBe(true);
    new AIController(randomSequence([0, 0.9, 0.9])).update(0, trapSimulation);
    expect(trapSimulation.traps.some((trap) => trap.owner === 'enemy' && trap.cardId === 'corrosion_mire')).toBe(true);

    const buildingSimulation = createSimulation(2, ['alchemy_cannon', 'life_spring', 'anvil_guard', 'spark_archer', 'spore_squad', 'wind_griffin', 'flame_flask', 'corrosion_mire']);
    expect(buildingSimulation.playHandCard('player', 0, 'top', 1100, 310)).toBe(true);
    new AIController(randomSequence([0, 0.9, 0.9])).update(0, buildingSimulation);
    expect(buildingSimulation.units.some((unit) => unit.owner === 'enemy' && unit.cardId === 'alchemy_cannon')).toBe(true);
  });

  it('大炼金师会使用催化剂并完成随机熔铸', () => {
    const enemyDeck = ['anvil_guard', 'spark_archer', 'order_crystal', 'spore_squad', 'wind_griffin', 'steam_charger', 'flame_flask', 'corrosion_mire'];
    const simulation = createSimulation(3, enemyDeck);
    const ai = new AIController(randomSequence([0, 0.9, 0.1, 0, 0.9, 0.1]));

    ai.update(0, simulation);
    expect(simulation.getFusionCatalyst('enemy')).toBe('order');

    ai.update(1, simulation);
    expect(simulation.getPendingFusion('enemy')).not.toBeNull();
    expect(simulation.getFusionCatalyst('enemy')).toBeNull();
  });

  it('大炼金师会在玩家明显偏线时有概率攻击较弱一路', () => {
    const stage = getStage(3);
    const simulation = new BattleSimulation({
      ...stage,
      usesCatalysts: false,
      aiBehavior: { ...stage.aiBehavior, reactionMin: 0, reactionMax: 0, fusionChance: 0, catalystChance: 0, mistakeChance: 0 },
    }, INITIAL_DECK_IDS, ['anvil_guard', 'spark_archer', 'spore_squad', 'wind_griffin', 'steam_charger', 'flame_flask', 'corrosion_mire', 'blast_rune'], { startingElixir: 10 });
    expect(simulation.playHandCard('player', 2, 'top', 800, 310)).toBe(true);
    expect(simulation.playHandCard('player', 0, 'bottom', 800, 680)).toBe(true);
    const playSpy = vi.spyOn(simulation, 'playHandCard');
    new AIController(randomSequence([0, 0, 0.9, 0, 0.2])).update(0, simulation);

    expect(playSpy.mock.calls[0]?.[2]).toBe('top');
  });

  it('连续失败辅助只增加失误和延迟，不修改生命或圣水', () => {
    const baseSimulation = createSimulation(1);
    const assistedSimulation = createSimulation(1);
    const basePlay = vi.spyOn(baseSimulation, 'playHandCard');
    const assistedPlay = vi.spyOn(assistedSimulation, 'playHandCard');

    new AIController(randomSequence([0, 0.34, 0, 0.5, 0.5, 0.5])).update(0, baseSimulation);
    new AIController(randomSequence([0, 0.34, 0, 0.5, 0.5, 0.5]), 1).update(0, assistedSimulation);

    expect(basePlay).toHaveBeenCalled();
    expect(assistedPlay).not.toHaveBeenCalled();
    expect(assistedSimulation.options.enemyStatMultiplier).toBe(1);
    expect(assistedSimulation.options.enemyElixirMultiplier).toBe(1);
  });
});
