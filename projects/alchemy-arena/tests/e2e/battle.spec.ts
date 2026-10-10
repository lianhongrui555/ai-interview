import { expect, test } from '@playwright/test';

const deck = ['anvil_guard', 'spore_squad', 'flame_flask', 'frost_reagent', 'alchemy_cannon', 'spark_archer', 'wind_griffin', 'order_crystal'];

async function seedSave(page: import('@playwright/test').Page, tutorialCompleted = true): Promise<void> {
  await page.addInitScript(({ tutorialCompleted, deck }) => {
    localStorage.setItem('alchemy-arena.save.v1', JSON.stringify({
      version: 2,
      unlockedCardIds: deck,
      deckPresets: { '1': deck, '2': deck, '3': deck },
      activeDeckPreset: 1,
      practice: { deckIds: deck, opponent: 'off', infiniteElixir: true, timerEnabled: false },
      nodeStars: {}, firstClearedNodeIds: [], unlockedJourneyLayers: [1], activeJourney: null,
      tutorialCompleted,
      tutorialStep: 0,
      settings: { musicVolume: 0, sfxVolume: 0, preferredBattleSpeed: 1 },
    }));
  }, { tutorialCompleted, deck });
}

async function enterBattle(page: import('@playwright/test').Page): Promise<void> {
  await seedSave(page, true);
  await page.goto('/alchemy-arena/?debug=1');
  await page.waitForTimeout(700);
  await page.mouse.click(960, 455);
  await page.waitForTimeout(900);
  await page.mouse.click(960, 760);
  await page.waitForTimeout(4800);
}

test('拖动卡牌可以完成部署', async ({ page }) => {
  await enterBattle(page);
  await page.mouse.move(610, 973);
  await page.mouse.down();
  await page.mouse.move(700, 310, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(350);
  const playerUnits = await page.evaluate(() => (window as any).__ALCHEMY_BATTLE__.snapshot().units.filter((unit: { owner: string }) => unit.owner === 'player').length);
  expect(playerUnits).toBeGreaterThan(0);
});

test('拖两张牌到左侧熔炉即可完成融合并部署', async ({ page }) => {
  await enterBattle(page);
  await page.mouse.move(950, 973);
  await page.mouse.down();
  await page.mouse.move(210, 780, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(180);
  await page.mouse.move(1120, 973);
  await page.mouse.down();
  await page.mouse.move(210, 780, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(180);
  expect(await page.evaluate(() => (window as any).__ALCHEMY_BATTLE__.fusionSelection())).toEqual([2, 3]);
  expect(await page.evaluate(() => (window as any).__ALCHEMY_BATTLE__.fusionMode())).toBe(true);
  await page.mouse.click(1180, 760);
  await page.waitForTimeout(1000);
  await page.mouse.click(960, 755);
  await page.waitForTimeout(180);
  expect(await page.evaluate(() => (window as any).__ALCHEMY_BATTLE__.pendingFusion())).not.toBeNull();
  await page.mouse.move(960, 833);
  await page.mouse.down();
  await page.mouse.move(700, 310, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => (window as any).__ALCHEMY_BATTLE__.pendingFusion())).toBeNull();
});

test('新存档首次进入会开启教程', async ({ page }) => {
  await seedSave(page, false);
  await page.goto('/alchemy-arena/?debug=1');
  await page.waitForTimeout(1200);
  expect(await page.evaluate(() => Boolean((window as any).__ALCHEMY_BATTLE__))).toBe(true);
  await page.mouse.move(610, 973);
  await page.mouse.down();
  await page.mouse.move(700, 310, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => (window as any).__ALCHEMY_BATTLE__.snapshot().units.some((unit: { owner: string }) => unit.owner === 'player'))).toBe(true);
  expect(await page.evaluate(() => (window as any).__ALCHEMY_BATTLE__.tutorialStep())).toBe(1);

  await page.waitForTimeout(3200);
  await page.mouse.move(780, 973);
  await page.mouse.down();
  await page.mouse.move(700, 680, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => (window as any).__ALCHEMY_BATTLE__.tutorialStep())).toBe(2);

  await page.mouse.click(960, 300);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => (window as any).__ALCHEMY_BATTLE__.tutorialStep())).toBe(3);

  await page.waitForTimeout(9000);
  await page.mouse.move(950, 973);
  await page.mouse.down();
  await page.mouse.move(210, 780, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(180);
  await page.mouse.move(1120, 973);
  await page.mouse.down();
  await page.mouse.move(210, 780, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(180);
  await page.mouse.click(1180, 760);
  await page.waitForTimeout(1000);
  await page.mouse.click(960, 755);
  await page.waitForTimeout(180);
  await page.mouse.move(960, 833);
  await page.mouse.down();
  await page.mouse.move(700, 310, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(350);
  expect(await page.evaluate(() => (window as any).__ALCHEMY_BATTLE__.tutorialStep())).toBe(4);
});

async function seedJourneySave(page: import('@playwright/test').Page, nodeId: string): Promise<void> {
  await page.addInitScript(({ activeDeck, currentNodeId }) => {
    localStorage.setItem('alchemy-arena.save.v1', JSON.stringify({
      version: 2,
      unlockedCardIds: activeDeck,
      deckPresets: { '1': activeDeck, '2': activeDeck, '3': activeDeck },
      activeDeckPreset: 1,
      practice: { deckIds: activeDeck, opponent: 'off', infiniteElixir: true, timerEnabled: false },
      nodeStars: {}, nodeLossStreaks: {}, firstClearedNodeIds: [], unlockedJourneyLayers: [1, 2, 3],
      activeJourney: {
        status: 'active',
        currentNodeId,
        route: [currentNodeId],
        nodeModifiers: {},
        blessings: {},
        lockedDeckIds: activeDeck,
      },
      tutorialCompleted: true,
      tutorialStep: 0,
      settings: { musicVolume: 0, sfxVolume: 0, preferredBattleSpeed: 1 },
    }));
  }, { activeDeck: deck, currentNodeId: nodeId });
}

async function enterFastJourneyBattle(page: import('@playwright/test').Page, nodeId: string): Promise<void> {
  await seedJourneySave(page, nodeId);
  await page.goto('/alchemy-arena/?debug=1&fast=1');
  await page.waitForTimeout(700);
  await page.mouse.click(960, 455);
  await page.waitForTimeout(800);
  await page.mouse.click(960, 760);
  await page.waitForFunction(() => Boolean((window as any).__ALCHEMY_BATTLE__), null, { timeout: 8000 });
}

const aiScenarios = [
  { nodeId: 'l1_trial', label: '见习炼金师' },
  { nodeId: 'l2_silver', label: '白银铸造师' },
  { nodeId: 'l3_crown', label: '大炼金师' },
];

for (const scenario of aiScenarios) {
  test(`${scenario.label} 可以快速完成一场对局并正常出牌`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await enterFastJourneyBattle(page, scenario.nodeId);

    await expect.poll(
      () => page.evaluate(() => (window as any).__ALCHEMY_BATTLE__.statistics().cardsPlayed.enemy),
      { timeout: 8000 },
    ).toBeGreaterThan(0);
    await expect.poll(
      () => page.evaluate(() => Boolean((window as any).__ALCHEMY_BATTLE__.snapshot().result)),
      { timeout: 8000 },
    ).toBe(true);
    expect(pageErrors).toEqual([]);
  });
}