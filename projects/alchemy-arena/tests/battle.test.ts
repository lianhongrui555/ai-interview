import { describe, expect, it } from 'vitest';
import { BattleSimulation } from '../src/core/BattleSimulation';
import { createFusionResult } from '../src/core/FusionSystem';
import { ALL_CARD_IDS, INITIAL_DECK_IDS, getCard } from '../src/data/cards';
import { getStage } from '../src/data/levels';

describe('BattleSimulation', () => {
  it('玩家可以部署手牌并正确扣除圣水', () => {
    const simulation = new BattleSimulation(getStage(1), INITIAL_DECK_IDS);
    const before = simulation.getElixir('player');
    expect(simulation.playHandCard('player', 0, 'top', 600, 310)).toBe(true);
    expect(simulation.getElixir('player')).toBe(before - 4);
    expect(simulation.units.filter((unit) => unit.owner === 'player')).toHaveLength(1);
  });

  it('熔铸会消耗两张牌并生成唯一待部署结果', () => {
    const simulation = new BattleSimulation(getStage(1), INITIAL_DECK_IDS, undefined, { startingElixir: 10 });
    const result = createFusionResult('anvil_guard', 'spark_archer', null, () => 0.1);
    expect(simulation.fuseCards('player', [0, 1], result)).toBe(true);
    expect(simulation.getPendingFusion('player')?.id).toBe(result.id);
    expect(simulation.getHand('player')).toHaveLength(4);
    expect(simulation.fuseCards('player', [0, 1], result)).toBe(false);
  });

  it('法术可以部署到整个战场区域', () => {
    const spellDeck = ['flame_flask', 'frost_reagent', 'growth_serum', 'corrosion_mire', 'anvil_guard', 'spark_archer', 'spore_squad', 'wind_griffin'];
    const simulation = new BattleSimulation(getStage(1), spellDeck, undefined, { startingElixir: 20 });
    expect(simulation.playHandCard('player', 0, 'top', 1500, 500)).toBe(true);
  });

  it('第二关敌方单位不再获得生命加成', () => {
    const simulation = new BattleSimulation(getStage(2), INITIAL_DECK_IDS, undefined, { startingElixir: 10 });
    expect(simulation.playHandCard('enemy', 0, 'top', 1300, 310)).toBe(true);
    const enemy = simulation.units.find((unit) => unit.owner === 'enemy');
    expect(enemy?.maxHp).toBe(1800);
  });

  it('十四张基础牌都可以被正常使用', () => {
    for (const cardId of ALL_CARD_IDS) {
      const deck = [cardId, ...ALL_CARD_IDS.filter((id) => id !== cardId).slice(0, 7)];
      const simulation = new BattleSimulation(getStage(1), deck, deck, { startingElixir: 100 });
      const card = getCard(cardId);
      const x = card.type === 'spell' ? 1500 : 760;
      const y = 310;
      expect(simulation.playHandCard('player', 0, 'top', x, y), `${card.name} 应可部署`).toBe(true);
      if (card.type === 'catalyst') expect(simulation.getFusionCatalyst('player')).toBe(card.catalyst?.kind);
    }
  });
  it('常规时间平局后进入加时，并在结束时按塔血量判定', () => {
    const simulation = new BattleSimulation(getStage(1), INITIAL_DECK_IDS, undefined, { regularSeconds: 1, overtimeSeconds: 1 });
    for (let index = 0; index < 25; index += 1) simulation.update(0.1);
    expect(simulation.getSnapshot().overtime).toBe(true);
    for (let index = 0; index < 15; index += 1) simulation.update(0.1);
    expect(simulation.getSnapshot().result?.reason).toBe('health');
  });
});



describe('练习与统计', () => {
  it('无限圣水不会被出牌消耗，并记录出牌统计', () => {
    const simulation = new BattleSimulation(getStage(1), INITIAL_DECK_IDS, undefined, { infiniteElixir: true });
    expect(simulation.playHandCard('player', 0, 'top', 600, 310)).toBe(true);
    simulation.update(0.1);
    expect(simulation.getElixir('player')).toBe(10);
    expect(simulation.getStatistics().cardsPlayed.player).toBe(1);
  });

  it('部署预览报告非法河道和圣水不足', () => {
    const simulation = new BattleSimulation(getStage(1), INITIAL_DECK_IDS);
    const card = getCard('anvil_guard');
    expect(simulation.getDeploymentPreview('player', card, 'top', 960, 310).valid).toBe(false);
    expect(simulation.getDeploymentPreview('player', card, 'top', 700, 310).valid).toBe(true);
  });
});


describe('国王塔唤醒', () => {
  it('开局国王塔沉睡，守卫塔被摧毁后激活', () => {
    const simulation = new BattleSimulation(getStage(1), INITIAL_DECK_IDS);
    expect(simulation.towers.find((tower) => tower.id === 'player_king')?.activated).toBe(false);
    expect(simulation.towers.find((tower) => tower.id === 'enemy_top')?.activated).toBe(true);
    const guard = simulation.towers.find((tower) => tower.id === 'enemy_top')!;
    (simulation as unknown as { damageTower: (tower: typeof guard, damage: number, attacker: 'player' | 'enemy') => void }).damageTower(guard, 99999, 'player');
    expect(simulation.towers.find((tower) => tower.id === 'enemy_king')?.activated).toBe(true);
  });
});

describe('卡牌定位', () => {
  it('铁砧守卫只锁定防御建筑，不攻击普通部队', () => {
    const simulation = new BattleSimulation(getStage(1), INITIAL_DECK_IDS, undefined, { startingElixir: 10 });
    expect(simulation.playHandCard('player', 0, 'top', 600, 310)).toBe(true);
    const giant = simulation.units.find((unit) => unit.owner === 'player')!;
    expect(giant.targetPreference).toBe('buildings');
    const target = (simulation as unknown as { findTarget: (unit: typeof giant) => { kind: string } }).findTarget(giant);
    expect(target.kind).toBe('tower');
  });

  it('防御塔使用降低后的生命和攻击数值', () => {
    const simulation = new BattleSimulation(getStage(1), INITIAL_DECK_IDS);
    const guard = simulation.towers.find((tower) => tower.id === 'player_top')!;
    const king = simulation.towers.find((tower) => tower.id === 'player_king')!;
    expect(guard.maxHp).toBe(1500);
    expect(guard.damage).toBe(82);
    expect(king.maxHp).toBe(2500);
    expect(king.damage).toBe(105);
  });
});
