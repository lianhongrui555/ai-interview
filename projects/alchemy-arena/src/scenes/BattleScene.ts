import Phaser from 'phaser';
import { audioManager } from '../audio/AudioManager';
import { AIController } from '../core/AIController';
import { BattleSimulation } from '../core/BattleSimulation';
import { ARENA, BATTLE_RULES, COLORS, GAME_WIDTH, TOWER_POSITIONS } from '../core/constants';
import { createFusionResult, getFusionCost } from '../core/FusionSystem';
import { completeJourneyNode } from '../core/JourneySystem';
import { getActiveDeck, loadSave, setTutorialState, updateSettings } from '../core/save';
import { CARDS, getCard } from '../data/cards';
import { getJourneyNode, getStage } from '../data/levels';
import { getModifier } from '../data/journey';
import type { BattleEvent, BattleSceneData, CatalystKind, FusionResult, Lane, Side, StageConfig, TowerState, UnitState } from '../core/types';
import { cardRoleLabel, cardTypeName, createButton, createPanel } from '../ui/components';
import { ensureFusionTexture } from '../ui/placeholderArt';

export class BattleScene extends Phaser.Scene {
  private stage!: StageConfig;
  private simulation!: BattleSimulation;
  private ai!: AIController;
  private fastMode = false;
  private paused = false;
  private speedMultiplier = 1;
  private sceneData?: BattleSceneData;
  private practiceInfinite = false;
  private practiceTimer = true;
  private practiceAiEnabled = false;
  private tutorialMode = false;
  private tutorialStep = 0;
  private fixedAccumulator = 0;
  private selectedHandIndex = -1;
  private fusionMode = false;
  private fusionSelection: number[] = [];
  private handLayer?: Phaser.GameObjects.Container;
  private pendingLayer?: Phaser.GameObjects.Container;
  private toastText?: Phaser.GameObjects.Text;
  private timerText?: Phaser.GameObjects.Text;
  private phaseText?: Phaser.GameObjects.Text;
  private playerElixirText?: Phaser.GameObjects.Text;
  private enemyElixirText?: Phaser.GameObjects.Text;
  private elixirBar?: Phaser.GameObjects.Rectangle;
  private crownsText?: Phaser.GameObjects.Text;
  private fusionButtonText?: Phaser.GameObjects.Text;
  private fusionGuideText?: Phaser.GameObjects.Text;
  private forgeZone?: Phaser.GameObjects.Container;
  private confirmFusionButton?: Phaser.GameObjects.Container;
  private cancelFusionButton?: Phaser.GameObjects.Container;
  private resultShown = false;
  private readonly unitViews = new Map<number, Phaser.GameObjects.Container>();
  private readonly towerViews = new Map<string, Phaser.GameObjects.Container>();
  private readonly trapViews = new Map<number, Phaser.GameObjects.Container>();
  private attackAudioCooldown = 0;
  private lastPointer = { x: 0, y: 0 };
  private cardClickCount = 0;

  constructor() { super('Battle'); }

  init(data?: BattleSceneData): void { this.sceneData = data; }

  create(): void {
    const stageId = this.sceneData?.stageId ?? (this.registry.get('selectedStageId') as number | undefined) ?? 1;
    const save = loadSave();
    this.stage = getStage(stageId);
    this.fastMode = Boolean(this.registry.get('fastBattle'));
    this.tutorialMode = this.sceneData?.mode === 'tutorial';
    this.tutorialStep = this.sceneData?.tutorialStep ?? 0;
    this.practiceAiEnabled = this.sceneData?.mode === 'practice' && this.sceneData.practice?.opponent !== 'off';
    this.practiceInfinite = this.sceneData?.practice?.infiniteElixir ?? false;
    this.practiceTimer = this.sceneData?.practice?.timerEnabled ?? true;
    this.speedMultiplier = save.settings.preferredBattleSpeed;
    const regularSeconds = this.fastMode ? 8 : BATTLE_RULES.regularSeconds;
    const overtimeSeconds = this.fastMode ? 4 : BATTLE_RULES.overtimeSeconds;
    this.simulation = new BattleSimulation(this.stage, this.sceneData?.deckIds ?? getActiveDeck(save), this.stage.deck, {
      regularSeconds,
      overtimeSeconds,
      timerEnabled: this.practiceTimer,
      infiniteElixir: this.practiceInfinite,
      modifierId: this.sceneData?.modifierId,
      blessings: this.sceneData?.blessings,
      bossShield: this.sceneData?.nodeId === 'l3_crown',
    });
    this.ai = new AIController(Math.random, this.sceneData?.aiAssistLevel ?? 0);
    this.cameras.main.setBackgroundColor('#100d16');
    this.drawArena();
    this.createTowerViews();
    this.createHud();
    this.createHandUi();
    this.registerInput();
    if (this.tutorialMode) this.setupTutorial();
    if (this.sceneData?.modifierId) this.showModifierBanner(this.sceneData.modifierId);

    this.add.text(960, 884, '拖动手牌到合法区域松手部署；单击卡牌查看详情。', {
      fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '18px', color: '#9e94a7',
    }).setOrigin(0.5);
    this.add.text(960, 1048, '第一张定主体，第二张定词缀；同组合和稀有度结果固定。', {
      fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '16px', color: '#73697d',
    }).setOrigin(0.5);
    if (this.registry.get('debugBattle')) {
      (window as unknown as { __ALCHEMY_BATTLE__: unknown }).__ALCHEMY_BATTLE__ = {
        snapshot: () => this.simulation.getSnapshot(),
        statistics: () => this.simulation.getStatistics(),
        hand: () => this.simulation.getHand('player'),
        selectedHandIndex: () => this.selectedHandIndex,
        tutorialStep: () => this.tutorialStep,
        fusionMode: () => this.fusionMode,
        fusionSelection: () => [...this.fusionSelection],
        pendingFusion: () => this.simulation.getPendingFusion('player'),
        lastPointer: () => ({ ...this.lastPointer }),
        cardClickCount: () => this.cardClickCount,
      };
    }
  }

  update(_time: number, deltaMs: number): void {
    const delta = Math.min(deltaMs / 1000, 0.1);
    if (this.paused) return;
    const speedMultiplier = this.fastMode ? 18 : this.speedMultiplier;
    this.fixedAccumulator += delta * speedMultiplier;
    const step = 1 / 60;
    let iterations = 0;
    while (this.fixedAccumulator >= step && iterations < 180) {
      this.simulation.update(step);
      if (this.sceneData?.mode !== 'practice' || this.practiceAiEnabled) this.ai.update(step, this.simulation);
      this.fixedAccumulator -= step;
      iterations += 1;
    }
    this.attackAudioCooldown = Math.max(0, this.attackAudioCooldown - delta);
    this.renderSimulation();
    this.renderQueuedEvents();
    this.updateHud();
    if (this.simulation.getSnapshot().result && !this.resultShown) this.showBattleResult();
  }

  private drawArena(): void {
    const theme = this.sceneData?.nodeId ? getJourneyNode(this.sceneData.nodeId).themeId : this.stage.themeId;
    const palettes = {
      trial: { grass: 0x243a34, grassLight: 0x31584a, river: 0x2d7fa1, bridge: 0x8f7048, particle: 0xf0b84f },
      spore: { grass: 0x263c2c, grassLight: 0x426347, river: 0x438b78, bridge: 0x8a7146, particle: 0x7edb65 },
      silver: { grass: 0x34373e, grassLight: 0x5c6068, river: 0x426d87, bridge: 0xa68a5a, particle: 0xd5d8e0 },
      frost: { grass: 0x26383e, grassLight: 0x41646c, river: 0x3f9bc2, bridge: 0x8298a0, particle: 0xbcecff },
      crown: { grass: 0x3a2b31, grassLight: 0x60404a, river: 0x784f7e, bridge: 0xb18b52, particle: 0xf6dfaa },
    } as const;
    const palette = palettes[theme];
    this.add.rectangle(960, 488, 1580, 725, palette.grass, 1).setStrokeStyle(5, 0x6f5a3e, 1);
    for (let x = ARENA.left; x <= ARENA.right; x += 80) this.add.line(0, 0, x, ARENA.top, x, ARENA.bottom, palette.grassLight, 0.28).setOrigin(0);
    for (let y = ARENA.top; y <= ARENA.bottom; y += 80) this.add.line(0, 0, ARENA.left, y, ARENA.right, y, palette.grassLight, 0.28).setOrigin(0);
    this.add.rectangle(960, 488, 80, 725, palette.river, 1).setStrokeStyle(3, 0x75d5eb, 0.75);
    for (let y = 142; y < 846; y += 34) this.add.line(0, 0, 925, y, 995, y + 18, 0xcceff5, 0.2);
    this.add.rectangle(960, ARENA.topLaneY, 110, 112, palette.bridge, 1).setStrokeStyle(4, 0xd2b06e, 1);
    this.add.rectangle(960, ARENA.bottomLaneY, 110, 112, palette.bridge, 1).setStrokeStyle(4, 0xd2b06e, 1);
    for (let index = 0; index < 22; index += 1) {
      const x = ARENA.left + 45 + ((index * 127) % 1510);
      const y = ARENA.top + 35 + ((index * 83) % 660);
      const dot = this.add.circle(x, y, 2 + (index % 3), palette.particle, 0.22).setDepth(1);
      this.tweens.add({ targets: dot, y: y - 12 - (index % 4) * 4, alpha: 0.04, duration: 1200 + index * 35, yoyo: true, repeat: -1 });
    }
    this.add.text(560, 152, '我方部署区', { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '18px', color: '#65d1e6' }).setOrigin(0.5);
    this.add.text(1370, 152, '敌方部署区', { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '18px', color: '#e77a82' }).setOrigin(0.5);
  }

  private createHud(): void {
    this.add.rectangle(960, 52, 1900, 104, 0x17131f, 0.97).setStrokeStyle(3, COLORS.parchmentDark, 0.8);
    this.add.text(64, 50, this.stage.name, { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '28px', color: '#f6dfaa', fontStyle: 'bold' }).setOrigin(0, 0.5);
    this.add.text(64, 80, `对手：${this.stage.aiName} · ${this.stage.difficultyLabel}`, { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '17px', color: '#a99db1' }).setOrigin(0, 0.5);
    this.timerText = this.add.text(960, 45, '03:00', { fontFamily: 'monospace', fontSize: '38px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    this.phaseText = this.add.text(960, 82, '常规时间', { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '17px', color: '#a99db1' }).setOrigin(0.5);
    this.crownsText = this.add.text(1810, 52, '皇冠 0 : 0', { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '22px', color: '#f6dfaa' }).setOrigin(1, 0.5);

    this.add.text(590, 34, '圣水储备', { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '19px', color: '#d9b8f0', fontStyle: 'bold' }).setOrigin(0.5).setDepth(12);
    this.add.rectangle(590, 83, 500, 34, 0x21172b, 1).setStrokeStyle(4, 0x9d72c7, 1).setDepth(12);
    for (let index = 1; index < 10; index += 1) {
      this.add.rectangle(340 + index * 50, 83, 2, 24, 0x101018, 0.38).setDepth(13);
    }
    this.elixirBar = this.add.rectangle(340, 83, 0, 26, 0xb85ce0, 1).setOrigin(0, 0.5).setDepth(13);
    this.playerElixirText = this.add.text(590, 83, '我方圣水 5.0 / 10', {
      fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '24px', color: '#ffffff', fontStyle: 'bold', stroke: '#261832', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(14);
    this.enemyElixirText = this.add.text(1540, 83, '敌方圣水 5.0', { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '20px', color: '#d7bdca', fontStyle: 'bold' }).setOrigin(0.5).setDepth(12);
    createButton(this, 1635, 83, 130, 48, this.speedMultiplier === 2 ? '2× 速度' : '1× 速度', () => this.toggleSpeed(), { fill: 0x3b5060, hoverFill: 0x51748a, textColor: '#ffffff', fontSize: 18 }).setDepth(13);
    createButton(this, 1785, 83, 130, 48, '暂停', () => this.togglePause(), { fontSize: 18 }).setDepth(13);
    this.toastText = this.add.text(960, 842, '', { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '20px', color: '#ffe08a', backgroundColor: '#1b1720cc', padding: { x: 14, y: 7 } }).setOrigin(0.5).setDepth(20);
  }

  private createHandUi(): void {
    this.add.rectangle(960, 968, 1900, 215, 0x17131f, 0.98).setStrokeStyle(4, COLORS.parchmentDark, 0.9).setDepth(8);
    createButton(this, 220, 889, 220, 58, '熔铸工坊', () => this.toggleFusionMode(), { fill: COLORS.purple, hoverFill: 0xa576dc, textColor: '#ffffff', fontSize: 22 });
    this.fusionButtonText = this.add.text(220, 842, '直接把两张手牌拖进左侧熔炉', { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '16px', color: '#cab6dc' }).setOrigin(0.5);
    this.fusionGuideText = this.add.text(950, 800, '拖动手牌部署；点击手牌查看详情', { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '18px', color: '#d8c9e5', backgroundColor: '#17131fdd', padding: { x: 12, y: 6 } }).setOrigin(0.5).setDepth(15);
    this.cancelFusionButton = createButton(this, 740, 760, 230, 64, '退出融合', () => this.toggleFusionMode(false), { fontSize: 20 }).setVisible(false);
    this.confirmFusionButton = createButton(this, 1180, 760, 280, 64, '确认熔铸', () => this.confirmFusion(), { fill: COLORS.gold, hoverFill: 0xffd775, fontSize: 20 }).setVisible(false);
    this.forgeZone = this.add.container(210, 780).setDepth(19).setVisible(true);
    this.forgeZone.add(this.add.rectangle(0, 0, 360, 125, 0x22172d, 0.97).setStrokeStyle(4, COLORS.purple, 1));
    this.forgeZone.add(this.add.text(0, -47, '融合熔炉：先拖第一张，再拖第二张', { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '20px', color: '#d9b8f0', fontStyle: 'bold' }).setOrigin(0.5));
    this.forgeZone.add(this.add.rectangle(-85, 8, 135, 58, 0x160f1d, 0.95).setStrokeStyle(2, COLORS.gold, 0.8));
    this.forgeZone.add(this.add.rectangle(85, 8, 135, 58, 0x160f1d, 0.95).setStrokeStyle(2, COLORS.gold, 0.8));
    this.forgeZone.add(this.add.text(-85, 8, '① 主体（第一张）', { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '16px', color: '#a99db1' }).setOrigin(0.5).setName('forge-body'));
    this.forgeZone.add(this.add.text(85, 8, '② 词缀（第二张）', { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '16px', color: '#a99db1' }).setOrigin(0.5).setName('forge-trait'));
    this.pendingLayer = this.add.container(0, 0).setDepth(20);
    this.renderForgeSlots();
    this.refreshHandUi();
  }

  private registerInput(): void {
    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.lastPointer = { x: pointer.x, y: pointer.y };
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.lastPointer = { x: pointer.x, y: pointer.y };
    });
    this.input.keyboard?.on('keydown-ESC', () => { if (this.fusionMode) this.toggleFusionMode(false); else this.togglePause(); });
  }

  private refreshHandUi(): void {
    this.handLayer?.destroy(true);
    this.handLayer = this.add.container(0, 0).setDepth(8);
    const hand = this.simulation.getHand('player');
    hand.forEach((cardId, index) => {
      const card = getCard(cardId);
      const x = 610 + index * 170;
      const y = 973;
      const container = this.createHandCard(x, y, card.id, card.name, card.cost, card.artKey, index);
      this.handLayer?.add(container);
    });

    const nextId = this.simulation.getNextCard('player');
    if (nextId) {
      const next = getCard(nextId);
      const nextCard = this.createHandCard(1390, 973, next.id, next.name, next.cost, next.artKey, -1);
      nextCard.setAlpha(0.38);
      this.handLayer?.add(nextCard);
      this.handLayer?.add(this.add.text(1390, 1040, '下一张', { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '14px', color: '#8f8498' }).setOrigin(0.5));
    }

    this.fusionButtonText?.setText(this.fusionMode
      ? `已选择 ${this.fusionSelection.length}/2 张`
      : this.simulation.getPendingFusion('player')
        ? '已有待部署融合卡'
        : this.simulation.getFusionCatalyst('player') === 'order'
          ? '秩序结晶：稀有度更稳定'
          : this.simulation.getFusionCatalyst('player') === 'chaos'
            ? '混沌粉尘：招牌概率提高'
            : '直接把两张手牌拖进左侧熔炉');
    if (this.fusionGuideText) {
      const hand = this.simulation.getHand('player');
      if (this.fusionMode && this.fusionSelection.length === 0) this.fusionGuideText.setText('把第一张手牌拖到左侧①主体槽');
      else if (this.fusionMode && this.fusionSelection.length === 1) this.fusionGuideText.setText(`① 主体：${getCard(hand[this.fusionSelection[0]!]!).name} · 把第二张拖到左侧②词缀槽`);
      else if (this.fusionMode && this.fusionSelection.length === 2) {
        const body = getCard(hand[this.fusionSelection[0]!]!);
        const trait = getCard(hand[this.fusionSelection[1]!]!);
        this.fusionGuideText.setText(`主体 ${body.name} × 词缀 ${trait.name} · 点击右侧“确认熔铸”`);
      } else if (this.simulation.getPendingFusion('player')) this.fusionGuideText.setText('融合已完成：把下方金色结果卡拖到战场');
      else this.fusionGuideText.setText('拖动手牌部署；融合时直接把两张牌拖到左侧熔炉');
    }
    this.renderPendingFusion();
  }

  private createHandCard(x: number, y: number, id: string, name: string, cost: number, artKey: string, index: number): Phaser.GameObjects.Container {
    const selected = this.selectedHandIndex === index || this.fusionSelection.includes(index);
    const affordable = index < 0 || this.simulation.canAfford('player', cost);
    const container = this.add.container(x, y);
    const box = this.add.rectangle(0, 0, 150, 158, 0x282031, affordable ? 1 : 0.5).setStrokeStyle(selected ? 5 : 3, selected ? COLORS.gold : 0x8e789b, 1);
    const art = this.add.image(0, -24, artKey).setDisplaySize(72, 72).setAlpha(affordable ? 1 : 0.45);
    const costCircle = this.add.circle(-57, -57, 17, 0x7848b6, 1).setStrokeStyle(2, 0xffffff, 0.8);
    const costText = this.add.text(-57, -57, String(cost), { fontFamily: 'monospace', fontSize: '20px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    const nameText = this.add.text(0, 35, name, { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '16px', color: '#fff4d6', fontStyle: 'bold', align: 'center', wordWrap: { width: 134 } }).setOrigin(0.5);
    if (this.fusionMode && index >= 0) {
      const order = this.fusionSelection.indexOf(index);
      const marker = order === 0 ? '① 主体（第一张）' : order === 1 ? '② 词缀（第二张）' : '点击选择';
      container.add(this.add.text(0, 65, marker, { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '14px', color: order >= 0 ? '#f6dfaa' : '#9d91a5', fontStyle: 'bold' }).setOrigin(0.5));
    }
    container.add([box, art, costCircle, costText, nameText]);
    box.setInteractive({ useHandCursor: true });
    box.setData('handIndex', index);
    box.setData('homeX', x);
    box.setData('homeY', y);
    box.on('pointerdown', () => this.handleHandCardClick(index));
    this.input.setDraggable(box);
    box.on('dragstart', () => {
      if (index < 0) return;
      container.setDepth(30);
    });
    box.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      if (index < 0) return;
      container.setPosition(dragX, dragY);
    });
    box.on('dragend', (pointer: Phaser.Input.Pointer) => {
      if (index < 0) return;
      const card = getCard(id);
      const droppedOnCauldron = pointer.x >= 105 && pointer.x <= 335 && pointer.y >= 845 && pointer.y <= 940;
      const droppedOnForge = pointer.x >= 30 && pointer.x <= 390 && pointer.y >= 717 && pointer.y <= 843;
      container.setPosition(x, y);
      container.setDepth(8);

      // 融合不再需要先点按钮：把牌直接拖进左侧熔炉就能放入素材槽。
      if (droppedOnForge) {
        this.addFusionMaterial(index, card.type === 'catalyst');
        return;
      }
      if (this.fusionMode) {
        this.showToast('把牌拖到左侧熔炉，或点“退出融合”', true);
        return;
      }
      if (card.type === 'catalyst' && droppedOnCauldron && this.simulation.useCatalyst('player', index)) {
        audioManager.playSfx('fusion');
        this.refreshHandUi();
        return;
      }
      if (pointer.y < ARENA.bottom && pointer.y > ARENA.top && pointer.x > ARENA.left && pointer.x < ARENA.right) {
        const lane = this.simulation.getLaneForPosition(pointer.y);
        if (this.simulation.playHandCard('player', index, lane, pointer.x, pointer.y)) {
          audioManager.playSfx('deploy');
          this.selectedHandIndex = -1;
          this.refreshHandUi();
          this.advanceTutorial(card.id);
          return;
        }
        const preview = this.simulation.getDeploymentPreview('player', card, lane, pointer.x, pointer.y);
        this.showToast(preview.reason === 'not-enough-elixir' ? '圣水不足' : '此处无法部署', true);
      }
    });
    return container;
  }

  private getHandIndexAt(x: number, y: number): number {
    if (y < 880 || y > 1072) return -1;
    for (let index = 0; index < 4; index += 1) {
      const centerX = 610 + index * 170;
      if (x >= centerX - 76 && x <= centerX + 76) return index;
    }
    return -1;
  }

  private handleHandCardClick(index: number): void {
    this.cardClickCount += 1;
    if (index < 0) return;
    const cardId = this.simulation.getHand('player')[index];
    if (!cardId) return;
    const card = getCard(cardId);
    if (this.fusionMode && card.type !== 'catalyst') {
      const existing = this.fusionSelection.indexOf(index);
      if (existing >= 0) this.fusionSelection.splice(existing, 1);
      else if (this.fusionSelection.length < 2) this.fusionSelection.push(index);
      this.refreshFusionControls();
      this.refreshHandUi();
      return;
    }
    this.showCardDetail(card);
  }

  private showCardDetail(card: ReturnType<typeof getCard>): void {
    const stats = card.stats;
    const detail = stats
      ? `${card.name} · ${cardRoleLabel(card)} · ${card.cost}费 · 生命 ${stats.maxHp} · 伤害 ${stats.damage} · ${stats.targetPreference === 'buildings' ? '仅攻击建筑' : `射程 ${stats.range}`}`
      : `${card.name} · ${card.cost}费 · ${card.description}`;
    this.showToast(detail);
  }

  private toggleFusionMode(force?: boolean): void {
    if (this.simulation.getPendingFusion('player')) {
      this.showToast('请先把已有的融合卡拖到战场', true);
      return;
    }
    const nextMode = force ?? !this.fusionMode;
    this.fusionMode = nextMode;
    if (!nextMode) this.fusionSelection = [];
    this.selectedHandIndex = -1;
    this.refreshFusionControls();
    this.refreshHandUi();
    if (nextMode && this.fusionSelection.length === 0) this.showToast('把第一张拖到左侧①，第二张拖到②');
  }

  private refreshFusionControls(): void {
    this.forgeZone?.setVisible(true);
    this.cancelFusionButton?.setVisible(this.fusionMode);
    this.confirmFusionButton?.setVisible(this.fusionMode);
    const label = this.confirmFusionButton?.list.find((item) => item instanceof Phaser.GameObjects.Text) as Phaser.GameObjects.Text | undefined;
    if (this.fusionSelection.length === 0) {
      label?.setText('确认熔铸（先拖两张）');
    } else if (this.fusionSelection.length === 1) {
      label?.setText('还差 1 张素材');
    } else {
      const ids = this.fusionSelection.map((index) => this.simulation.getHand('player')[index]).filter(Boolean) as string[];
      const cost = ids.length === 2 ? getFusionCost(getCard(ids[0]!), getCard(ids[1]!), this.sceneData?.blessings?.['fusion-discount'] ?? 0) : 0;
      label?.setText(`确认熔铸 ${cost} 费`);
    }
    this.renderForgeSlots();
  }

  private confirmFusion(): void {
    if (this.fusionSelection.length !== 2) {
      this.showToast('请先选择两张非催化剂手牌', true);
      return;
    }
    const hand = this.simulation.getHand('player');
    const ids = this.fusionSelection.map((index) => hand[index]);
    if (ids.some((id) => !id || getCard(id).type === 'catalyst')) {
      this.showToast('催化剂不能作为熔铸素材', true);
      return;
    }
    const result = createFusionResult(ids[0]!, ids[1]!, this.simulation.getFusionCatalyst('player'), Math.random, this.sceneData?.blessings?.['fusion-discount'] ?? 0);
    if (!this.simulation.fuseCards('player', [this.fusionSelection[0]!, this.fusionSelection[1]!], result)) {
      this.showToast('熔铸失败：圣水不足或状态无效', true);
      return;
    }
    audioManager.playSfx('fusion');
    this.fusionMode = false;
    this.fusionSelection = [];
    this.refreshFusionControls();
    this.refreshHandUi();
    const sourceArtKeys = ids.map((id) => getCard(id!).artKey) as [string, string];
    this.playFusionAnimation(result, sourceArtKeys);
  }

  private playFusionAnimation(result: FusionResult, sourceArtKeys: [string, string]): void {
    const accent = result.rarity === 'signature' ? COLORS.gold : result.rarity === 'rare' ? 0x58cfe0 : COLORS.purple;
    const overlay = this.add.container(0, 0).setDepth(60);
    const blocker = this.add.rectangle(960, 540, 1920, 1080, 0x08060c, 0.88).setInteractive();
    const glow = this.add.circle(960, 520, 210, accent, 0.08).setStrokeStyle(4, accent, 0.5);
    const ring = this.add.circle(960, 520, 82, 0x241a2e, 0.98).setStrokeStyle(8, accent, 0.95);
    const innerRing = this.add.circle(960, 520, 48, 0x120f16, 0.98).setStrokeStyle(4, 0xffffff, 0.32);
    const sourceA = this.add.image(650, 520, sourceArtKeys[0]).setDisplaySize(118, 118);
    const sourceB = this.add.image(1270, 520, sourceArtKeys[1]).setDisplaySize(118, 118);
    const title = this.add.text(960, 325, result.rarity !== 'common' ? '稀有共鸣正在形成……' : '炼金素材开始融合……', {
      fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '30px', color: result.rarity === 'signature' ? '#ffe09a' : '#d8c9e5', fontStyle: 'bold',
    }).setOrigin(0.5);
    const hint = this.add.text(960, 720, '随机结果由两张素材的标签共同决定', {
      fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '20px', color: '#9f91aa',
    }).setOrigin(0.5);
    overlay.add([blocker, glow, ring, innerRing, sourceA, sourceB, title, hint]);

    const sparks: Phaser.GameObjects.Arc[] = [];
    for (let index = 0; index < 14; index += 1) {
      const angle = (Math.PI * 2 * index) / 14;
      const spark = this.add.circle(960 + Math.cos(angle) * 150, 520 + Math.sin(angle) * 150, 5, result.rarity === 'signature' ? COLORS.gold : accent, 0.95);
      sparks.push(spark);
      overlay.add(spark);
      this.tweens.add({ targets: spark, x: 960, y: 520, alpha: 0.2, duration: 620 + index * 12, ease: 'Cubic.in' });
    }

    this.tweens.add({ targets: sourceA, x: 960, y: 520, scaleX: 0.38, scaleY: 0.38, angle: 360, alpha: 0.2, duration: 720, ease: 'Cubic.in' });
    this.tweens.add({ targets: sourceB, x: 960, y: 520, scaleX: 0.38, scaleY: 0.38, angle: -360, alpha: 0.2, duration: 720, ease: 'Cubic.in' });
    this.tweens.add({ targets: ring, scaleX: 1.38, scaleY: 1.38, angle: 180, duration: 720, ease: 'Sine.inOut' });
    this.tweens.add({ targets: glow, scaleX: 1.25, scaleY: 1.25, alpha: 0.34, yoyo: true, duration: 360, ease: 'Sine.inOut' });
    this.tweens.add({ targets: innerRing, scaleX: 0.35, scaleY: 0.35, alpha: 0, duration: 720, ease: 'Cubic.in' });

    this.time.delayedCall(740, () => {
      sparks.forEach((spark) => spark.destroy());
      overlay.destroy(true);
      this.showFusionReveal(result, sourceArtKeys);
    });
  }

  private showFusionReveal(result: FusionResult, sourceArtKeys: [string, string]): void {
    const artKey = ensureFusionTexture(this, result);
    const accent = result.rarity === 'signature' ? COLORS.gold : result.rarity === 'rare' ? 0x58cfe0 : COLORS.purple;
    const overlay = this.add.container(0, 0).setDepth(60);
    const blocker = this.add.rectangle(960, 540, 1920, 1080, 0x09070c, 0.82).setInteractive();
    const panel = createPanel(this, 960, 525, 720, 570, 1);
    const outerGlow = this.add.circle(0, -132, 92, accent, result.rarity === 'signature' ? 0.16 : 0.08).setStrokeStyle(result.rarity === 'signature' ? 8 : 5, accent, 0.95);
    const ring = this.add.circle(0, -132, 76, 0x2d2038, 1).setStrokeStyle(6, accent, 1);
    const art = this.add.image(0, -132, artKey).setDisplaySize(132, 132);
    const title = this.add.text(0, -34, result.rarity === 'signature' ? '★ 招牌配方触发 ★' : result.rarity === 'rare' ? '稀有共鸣结果' : '随机熔铸完成', {
      fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '23px', color: result.rarity === 'signature' ? '#f6dfaa' : '#c9b8d6', fontStyle: 'bold',
    }).setOrigin(0.5);
    const name = this.add.text(0, 25, result.name, { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '42px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    const meta = this.add.text(0, 76, `${cardTypeName(result.type)} · ${result.cost} 费 · 投入 ${getCard(result.sourceCardIds[0]!).name} + ${getCard(result.sourceCardIds[1]!).name}`, {
      fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '18px', color: '#d8c9e5', align: 'center', wordWrap: { width: 620 },
    }).setOrigin(0.5);
    const description = this.add.text(0, 139, result.description, {
      fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '21px', color: '#c9b8d6', align: 'center', wordWrap: { width: 600 },
    }).setOrigin(0.5);
    const deployHint = this.add.text(0, 205, '结果会放到战场底部，之后直接把金色卡拖到合法区域使用', {
      fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '17px', color: '#9f91aa', align: 'center', wordWrap: { width: 600 },
    }).setOrigin(0.5);
    panel.add([outerGlow, ring, art, title, name, meta, description, deployHint]);
    overlay.add([blocker, panel]);

    const button = createButton(this, 960, 755, 300, 72, '放入待部署槽', () => overlay.destroy(true), {
      fill: result.rarity === 'signature' ? COLORS.gold : COLORS.parchmentDark,
      hoverFill: result.rarity === 'signature' ? 0xffd775 : 0xdcc68f,
      fontSize: 24,
    });
    overlay.add(button);
    overlay.setAlpha(0);
    overlay.setScale(0.94);
    this.tweens.add({ targets: overlay, alpha: 1, scaleX: 1, scaleY: 1, duration: 260, ease: 'Back.out' });
    if (result.rarity === 'signature') {
      this.cameras.main.shake(180, 0.005);
      this.createBurst(960, 520, COLORS.gold);
    }
  }
  private renderPendingFusion(): void {
    this.pendingLayer?.removeAll(true);
    const pending = this.simulation.getPendingFusion('player');
    if (!pending) return;
    const container = this.add.container(960, 833).setDepth(20).setName('pending-card');
    const box = this.add.rectangle(0, 0, 420, 46, 0x3f2c16, 0.98).setStrokeStyle(3, COLORS.gold, 1);
    const text = this.add.text(0, 0, `拖到战场释放：${pending.name}`, { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '18px', color: '#ffe6a4', fontStyle: 'bold' }).setOrigin(0.5);
    container.add([box, text]);
    box.setInteractive({ useHandCursor: true });
    this.input.setDraggable(box);
    box.on('dragstart', () => container.setDepth(40));
    box.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => container.setPosition(dragX, dragY));
    box.on('dragend', (pointer: Phaser.Input.Pointer) => {
      if (pointer.y < ARENA.bottom && pointer.y > ARENA.top && pointer.x > ARENA.left && pointer.x < ARENA.right) {
        const lane = this.simulation.getLaneForPosition(pointer.y);
        if (this.simulation.deployPendingFusion('player', lane, pointer.x, pointer.y)) {
          audioManager.playSfx('deploy');
          this.pendingLayer?.removeAll(true);
          this.refreshHandUi();
          this.advanceTutorial('fusion');
          return;
        }
        this.showToast('融合卡无法部署到此处', true);
      }
      container.setPosition(960, 833);
      container.setDepth(8);
    });
    this.pendingLayer?.add(container);
    this.tweens.add({ targets: container, scaleX: 1.04, scaleY: 1.04, yoyo: true, repeat: -1, duration: 620, ease: 'Sine.inOut' });
  }

  private renderSimulation(): void {
    this.syncTowerViews();
    this.syncUnitViews();
    this.syncTrapViews();
  }

  private createTowerViews(): void {
    for (const tower of this.simulation.towers) {
      const key = tower.lane === 'king' ? `tower_king_${tower.side}` : `tower_guard_${tower.side}`;
      const container = this.add.container(tower.x, tower.y);
      const image = this.add.image(0, 0, key).setDisplaySize(tower.lane === 'king' ? 102 : 88, tower.lane === 'king' ? 102 : 88);
      if (tower.side === 'enemy') image.setTint(0xe88f94);
      const barBack = this.add.rectangle(0, 53, 90, 12, 0x201827, 1).setStrokeStyle(2, 0x000000, 0.7);
      const bar = this.add.rectangle(-43, 53, 86, 8, tower.side === 'player' ? COLORS.player : COLORS.enemy, 1).setOrigin(0, 0.5).setName('hp-bar');
      const activation = this.add.circle(0, 0, tower.lane === 'king' ? 64 : 0, 0xffffff, 0).setStrokeStyle(4, COLORS.gold, 0.9).setVisible(tower.lane === 'king' && tower.activated);
      const label = this.add.text(0, -63, tower.lane === 'king' ? '国王塔' : '守卫塔', { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '15px', color: '#f1e7dc' }).setOrigin(0.5).setName('tower-label');
      container.add([image, barBack, bar, activation, label]);
      this.towerViews.set(tower.id, container);
    }
  }

  private syncTowerViews(): void {
    for (const tower of this.simulation.towers) {
      const container = this.towerViews.get(tower.id);
      if (!container) continue;
      container.setAlpha(tower.alive ? 1 : 0.22);
      const bar = container.getByName('hp-bar') as Phaser.GameObjects.Rectangle | null;
      bar?.setDisplaySize(86 * Math.max(0, tower.hp / tower.maxHp), 8);
      const label = container.getByName('tower-label') as Phaser.GameObjects.Text | null;
      if (tower.lane === 'king') label?.setText(tower.activated ? '国王塔 · 已激活' : '国王塔 · 沉睡');
      const activation = container.list.find((item) => item instanceof Phaser.GameObjects.Arc) as Phaser.GameObjects.Arc | undefined;
      if (activation) activation.setVisible(tower.lane === 'king' && tower.activated);
    }
  }

  private syncUnitViews(): void {
    for (const unit of this.simulation.units) {
      if (!unit.alive) {
        const dead = this.unitViews.get(unit.id);
        if (dead) {
          this.tweens.add({ targets: dead, alpha: 0, scaleX: 0.3, scaleY: 0.3, duration: 180, onComplete: () => dead.destroy(true) });
          this.unitViews.delete(unit.id);
        }
        continue;
      }
      let view = this.unitViews.get(unit.id);
      if (!view) {
        view = this.createUnitView(unit);
        this.unitViews.set(unit.id, view);
      }
      view.setPosition(unit.x, unit.y);
      const bar = view.getByName('unit-hp') as Phaser.GameObjects.Rectangle | null;
      bar?.setDisplaySize(58 * Math.max(0, unit.hp / unit.maxHp), 6);
    }
  }

  private createUnitView(unit: UnitState): Phaser.GameObjects.Container {
    const container = this.add.container(unit.x, unit.y);
    const key = CARDS[unit.cardId]?.artKey ?? (unit.movement === 'air' ? 'spell_fusion_generic' : 'unit_spore');
    const sprite = this.add.image(0, 0, key).setDisplaySize(unit.radius * 2.55, unit.radius * 2.55);
    if (unit.owner === 'enemy') sprite.setTint(0xffaaaa);
    const back = this.add.rectangle(0, unit.radius + 12, 62, 9, 0x201827, 1);
    const bar = this.add.rectangle(-29, unit.radius + 12, 58, 6, unit.owner === 'player' ? COLORS.green : COLORS.enemy, 1).setOrigin(0, 0.5).setName('unit-hp');
    const name = this.add.text(0, -unit.radius - 19, unit.name, { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '13px', color: '#ffffff', backgroundColor: '#17131faa', padding: { x: 3, y: 1 } }).setOrigin(0.5);
    container.add([sprite, back, bar, name]);
    if (unit.movement === 'air') this.tweens.add({ targets: sprite, y: -9, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    else this.tweens.add({ targets: sprite, scaleX: 1.05, scaleY: 0.95, duration: 420 + (unit.id % 5) * 40, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    return container;
  }

  private syncTrapViews(): void {
    for (const trap of this.simulation.traps) {
      if (!trap.alive) {
        const existing = this.trapViews.get(trap.id);
        existing?.destroy(true);
        this.trapViews.delete(trap.id);
        continue;
      }
      if (this.trapViews.has(trap.id)) continue;
      const card = CARDS[trap.cardId];
      const container = this.add.container(trap.x, trap.y);
      const image = this.add.image(0, 0, card?.artKey ?? 'trap_fusion_generic').setDisplaySize(58, 58).setAlpha(trap.owner === 'player' ? 0.74 : 0.46);
      const ring = this.add.circle(0, 0, trap.triggerRadius, 0xffffff, 0).setStrokeStyle(2, trap.owner === 'player' ? COLORS.player : COLORS.enemy, 0.35);
      container.add([image, ring]);
      this.trapViews.set(trap.id, container);
    }
  }

  private renderQueuedEvents(): void {
    while (this.simulation.events.length > 0) {
      const event = this.simulation.events.shift();
      if (!event) break;
      this.renderBattleEvent(event);
    }
  }

  private renderBattleEvent(event: BattleEvent): void {
    if (event.type === 'attack' && event.x !== undefined && event.y !== undefined && event.targetX !== undefined && event.targetY !== undefined) {
      const color = event.side === 'player' ? COLORS.player : COLORS.enemy;
      const dot = this.add.circle(event.x, event.y, 5, color, 0.9).setDepth(4);
      this.tweens.add({ targets: dot, x: event.targetX, y: event.targetY, duration: 90, onComplete: () => dot.destroy() });
      if (this.attackAudioCooldown <= 0) {
        audioManager.playSfx('attack');
        this.attackAudioCooldown = 0.18;
      }
    } else if (event.type === 'spell' && event.x !== undefined && event.y !== undefined) {
      this.playSpellEffect(event);
    } else if (event.type === 'trap-trigger' && event.x !== undefined && event.y !== undefined) {
      this.playTrapEffect(event);
      audioManager.playSfx('tower');
    } else if (event.type === 'unit-died' && event.x !== undefined && event.y !== undefined) {
      this.createBurst(event.x, event.y, event.side === 'player' ? COLORS.player : COLORS.enemy);
    } else if (event.type === 'tower-activated' && event.x !== undefined && event.y !== undefined) {
      outerRing(this, event.x, event.y);
      audioManager.playSfx('victory');
    } else if (event.type === 'tower-destroyed' && event.x !== undefined && event.y !== undefined) {
      outerRing(this, event.x, event.y);
      audioManager.playSfx('tower');
    }
  }

  private playSpellEffect(event: BattleEvent): void {
    if (!event.cardId || event.x === undefined || event.y === undefined) return;
    const side = event.side ?? 'player';
    const origin = side === 'player' ? TOWER_POSITIONS.playerKing : TOWER_POSITIONS.enemyKing;
    const cardArtKey = CARDS[event.cardId]?.artKey;
    const projectile = this.add.image(origin.x, origin.y, cardArtKey ?? 'particle_dot').setDepth(11);
    if (cardArtKey) projectile.setDisplaySize(46, 46);
    else projectile.setDisplaySize(20, 20).setTint(side === 'player' ? COLORS.player : COLORS.enemy);
    this.tweens.add({
      targets: projectile,
      x: event.x,
      y: event.y,
      angle: side === 'player' ? 180 : -180,
      duration: 185,
      ease: 'Quad.in',
      onComplete: () => {
        projectile.destroy();
        this.spawnSpellImpact(event.cardId!, event.x!, event.y!);
      },
    });
  }

  private spawnSpellImpact(cardId: string, x: number, y: number): void {
    if (cardId === 'flame_flask') this.playFlameEffect(x, y);
    else if (cardId === 'frost_reagent') this.playFrostEffect(x, y);
    else if (cardId === 'growth_serum') this.playGrowthEffect(x, y);
    else if (cardId === 'corrosion_mire') this.playAcidEffect(x, y);
    else if (cardId === 'blast_rune' || cardId === 'trap_rune') this.playRuneEffect(x, y);
    else if (cardId === 'fusion_icefire') { this.playFlameEffect(x, y); this.playFrostEffect(x, y); }
    else if (cardId === 'fusion_proliferation') { this.playGrowthEffect(x, y); this.spawnIconBurst(x, y, 'unit_spore', 6, 92); }
    else if (cardId === 'fusion_forge_rider') { this.playForgeEffect(x, y); }
    else if (cardId === 'fusion_thunder_dive') { this.playRuneEffect(x, y); this.spawnRing(x, y, 0x6fe9ff, 145, 430, 7); }
    else if (cardId === 'fusion_acid_cannon') this.playAcidEffect(x, y);
    else if (cardId === 'fusion_frost_spring') { this.playFrostEffect(x, y); this.playGrowthEffect(x, y); }
    else if (cardId.startsWith('fusion_mystic_trap_')) this.playAcidEffect(x, y);
    else this.playGenericSpellEffect(x, y);
  }

  private playTrapEffect(event: BattleEvent): void {
    if (!event.cardId || event.x === undefined || event.y === undefined) return;
    this.spawnSpellImpact(event.cardId, event.x, event.y);
  }

  private playFlameEffect(x: number, y: number): void {
    this.spawnRing(x, y, 0xff5a22, 132, 430, 9);
    this.spawnRing(x, y, 0xffc244, 92, 340, 6);
    for (let index = 0; index < 18; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 45 + Math.random() * 105;
      const dot = this.add.circle(x, y, 4 + Math.random() * 7, [0xff4d1f, 0xff8c2f, 0xffd35c][index % 3]!, 0.96).setDepth(12);
      this.tweens.add({
        targets: dot,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance - 22,
        alpha: 0,
        scaleX: 0.3,
        scaleY: 0.3,
        duration: 300 + Math.random() * 220,
        ease: 'Cubic.out',
        onComplete: () => dot.destroy(),
      });
    }
  }

  private playFrostEffect(x: number, y: number): void {
    this.spawnRing(x, y, 0x79dcff, 145, 460, 9);
    this.spawnRing(x, y, 0xe6fbff, 105, 330, 5);
    for (let index = 0; index < 14; index += 1) {
      const angle = (Math.PI * 2 * index) / 14;
      const shard = this.add.rectangle(x, y, 7, 25, 0xbcecff, 0.95).setDepth(12).setRotation(angle);
      this.tweens.add({
        targets: shard,
        x: x + Math.cos(angle) * (70 + (index % 4) * 16),
        y: y + Math.sin(angle) * (70 + (index % 4) * 16),
        rotation: angle + Math.PI,
        alpha: 0,
        duration: 360 + index * 18,
        ease: 'Cubic.out',
        onComplete: () => shard.destroy(),
      });
    }
  }

  private playGrowthEffect(x: number, y: number): void {
    this.spawnRing(x, y, 0x78e47b, 168, 520, 8);
    this.spawnRing(x, y, 0xd9ff8d, 112, 400, 5);
    for (let index = 0; index < 9; index += 1) {
      const cross = this.add.text(x - 70 + index * 18, y + 22, '+', {
        fontFamily: 'monospace', fontSize: `${22 + (index % 3) * 7}px`, color: '#baff88', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(12);
      this.tweens.add({ targets: cross, y: y - 72 - (index % 3) * 20, alpha: 0, duration: 620 + index * 30, ease: 'Sine.out', onComplete: () => cross.destroy() });
    }
  }

  private playAcidEffect(x: number, y: number): void {
    const puddle = this.add.ellipse(x, y, 28, 12, 0x5dbb57, 0.82).setDepth(11);
    this.tweens.add({ targets: puddle, scaleX: 5.2, scaleY: 4.2, alpha: 0, duration: 620, ease: 'Cubic.out', onComplete: () => puddle.destroy() });
    for (let index = 0; index < 16; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const drop = this.add.circle(x, y - 10, 5 + Math.random() * 6, index % 2 ? 0x78d56f : 0xb5e56f, 0.92).setDepth(12);
      this.tweens.add({ targets: drop, x: x + Math.cos(angle) * 110, y: y + Math.sin(angle) * 64, alpha: 0, duration: 380 + Math.random() * 260, onComplete: () => drop.destroy() });
    }
  }

  private playRuneEffect(x: number, y: number): void {
    this.spawnRing(x, y, 0xa66cff, 148, 480, 8);
    this.spawnLightning(x, y, 0xd79cff, 9);
    this.spawnLightning(x, y, 0xff5b78, 5);
  }

  private playForgeEffect(x: number, y: number): void {
    this.spawnRing(x, y, 0xffa33c, 140, 430, 10);
    this.spawnRadialBurst(x, y, 0xffd36a, 18, 125);
  }

  private playGenericSpellEffect(x: number, y: number): void {
    this.spawnRing(x, y, 0xb879e8, 125, 420, 7);
    this.spawnRadialBurst(x, y, 0xe2c4ff, 14, 105);
  }

  private spawnRing(x: number, y: number, color: number, radius: number, duration: number, width: number): void {
    const ring = this.add.circle(x, y, 12, 0xffffff, 0).setStrokeStyle(width, color, 0.95).setDepth(11);
    this.tweens.add({ targets: ring, radius, alpha: 0, duration, ease: 'Cubic.out', onComplete: () => ring.destroy() });
  }

  private spawnRadialBurst(x: number, y: number, color: number, count: number, distance: number): void {
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count;
      const dot = this.add.rectangle(x, y, 7, 7, color, 0.94).setDepth(12).setRotation(angle);
      this.tweens.add({ targets: dot, x: x + Math.cos(angle) * distance, y: y + Math.sin(angle) * distance, alpha: 0, duration: 320 + index * 12, onComplete: () => dot.destroy() });
    }
  }

  private spawnIconBurst(x: number, y: number, textureKey: string, count: number, distance: number): void {
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count;
      const icon = this.add.image(x, y, textureKey).setDisplaySize(44, 44).setDepth(12);
      this.tweens.add({ targets: icon, x: x + Math.cos(angle) * distance, y: y + Math.sin(angle) * distance, scaleX: 0.2, scaleY: 0.2, alpha: 0, duration: 520, onComplete: () => icon.destroy() });
    }
  }

  private spawnLightning(x: number, y: number, color: number, count: number): void {
    const graphics = this.add.graphics().setDepth(13);
    graphics.lineStyle(6, color, 0.95);
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count + Math.random() * 0.18;
      const endX = x + Math.cos(angle) * (95 + Math.random() * 55);
      const endY = y + Math.sin(angle) * (95 + Math.random() * 55);
      const midX = x + Math.cos(angle + (Math.random() - 0.5) * 0.5) * 58;
      const midY = y + Math.sin(angle + (Math.random() - 0.5) * 0.5) * 58;
      graphics.beginPath();
      graphics.moveTo(x, y);
      graphics.lineTo(midX, midY);
      graphics.lineTo(endX, endY);
      graphics.strokePath();
    }
    this.tweens.add({ targets: graphics, alpha: 0, duration: 280, onComplete: () => graphics.destroy() });
  }

  private createBurst(x: number, y: number, color: number): void {
    for (let index = 0; index < 7; index += 1) {
      const dot = this.add.rectangle(x, y, 7, 7, color, 0.9).setDepth(5);
      const angle = (Math.PI * 2 * index) / 7;
      this.tweens.add({ targets: dot, x: x + Math.cos(angle) * 50, y: y + Math.sin(angle) * 50, alpha: 0, duration: 280, onComplete: () => dot.destroy() });
    }
  }

  private updateHud(): void {
    const snapshot = this.simulation.getSnapshot();
    const seconds = Math.max(0, Math.ceil(snapshot.timeLeft));
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    this.timerText?.setText(`${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`);
    this.phaseText?.setText(snapshot.overtime ? '加时 · 双倍圣水' : '常规时间');
    this.playerElixirText?.setText(`我方圣水 ${snapshot.playerElixir.toFixed(1)} / 10`);
    this.enemyElixirText?.setText(`敌方圣水 ${snapshot.enemyElixir.toFixed(1)}`);
    this.elixirBar?.setDisplaySize(50 * snapshot.playerElixir, 26);
    const playerCrowns = snapshot.towers.filter((tower) => tower.side === 'enemy' && !tower.alive).reduce((sum, tower) => sum + (tower.lane === 'king' ? 3 : 1), 0);
    const enemyCrowns = snapshot.towers.filter((tower) => tower.side === 'player' && !tower.alive).reduce((sum, tower) => sum + (tower.lane === 'king' ? 3 : 1), 0);
    this.crownsText?.setText(`皇冠 ${playerCrowns} : ${enemyCrowns}`);
  }

  private showBattleResult(): void {
    this.resultShown = true;
    const result = this.simulation.getSnapshot().result;
    if (!result) return;
    const won = result.winner === 'player';
    const playerKingAlive = this.simulation.towers.some((tower) => tower.side === 'player' && tower.lane === 'king' && tower.alive);
    audioManager.playSfx(won ? 'victory' : 'defeat');
    let save = loadSave();
    const mode = this.sceneData?.mode ?? 'campaign';
    const nodeId = this.sceneData?.nodeId ?? 'l1_trial';
    if (mode === 'campaign') save = completeJourneyNode(save, nodeId, { winner: result.winner, playerKingAlive, elapsedSeconds: this.simulation.getSnapshot().elapsed });
    if (mode === 'tutorial') save = setTutorialState(save, true, 0);
    const overlay = this.add.container(0, 0).setDepth(100);
    const blocker = this.add.rectangle(960, 540, 1920, 1080, 0x08060c, 0.82).setInteractive();
    const panel = createPanel(this, 960, 500, 650, 470, 1);
    panel.add(this.add.text(0, -135, won ? '胜 利' : result.winner === 'draw' ? '平 局' : '失 败', { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '54px', color: won ? '#f6dfaa' : '#e07d84', fontStyle: 'bold' }).setOrigin(0.5));
    panel.add(this.add.text(0, -55, `皇冠 ${result.playerCrowns} : ${result.enemyCrowns}`, { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '28px', color: '#ffffff' }).setOrigin(0.5));
    const stats = this.simulation.getStatistics();
    panel.add(this.add.text(0, 25, `伤害 ${Math.round(stats.damage.player)} · 治疗 ${Math.round(stats.healing.player)} · 出牌 ${stats.cardsPlayed.player} · 熔铸 ${stats.fusions.player}`, { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '20px', color: '#c9b8d6' }).setOrigin(0.5));
    overlay.add([blocker, panel]);
    const label = mode === 'tutorial' ? '完成教学' : mode === 'practice' ? '重赛' : won ? '查看结果' : '返回路线地图';
    const button = createButton(this, 960, 620, 330, 72, label, () => {
      if (mode === 'tutorial') this.scene.start('Menu');
      else if (mode === 'practice') this.scene.restart(this.sceneData);
      else this.scene.start('Reward', { nodeId, won });
    }, { fill: COLORS.gold, hoverFill: 0xffd775, fontSize: 24 });
    button.setDepth(102);
    if (mode === 'practice') createButton(this, 960, 720, 260, 56, '退出练习', () => this.scene.start('Menu'), { fontSize: 20 }).setDepth(102);
  }

  private toggleSpeed(): void {
    this.speedMultiplier = this.speedMultiplier === 1 ? 2 : 1;
    const save = loadSave();
    updateSettings(save, { preferredBattleSpeed: this.speedMultiplier as 1 | 2 });
    this.showToast(`战斗速度：${this.speedMultiplier}×`);
  }

  private setupTutorial(): void {
    this.children.getByName('tutorial-guide')?.destroy();
    const titles = ['第一步：拖曳部署','第二步：等待并消耗圣水','第三步：认识塔与胜负','第四步：完成一次熔铸','第五步：出发吧'];
    const bodies = [
      '把铁砧守卫拖到战场左侧，松手即可部署。',
      '把孢子小队拖到战场。圣水不足时等紫色圣水条恢复。',
      '先破守卫塔，再打国王塔。时间结束会比较剩余塔生命。',
      '把炽焰瓶拖到左侧①主体，把霜冻试剂拖到②词缀，再点“确认熔铸”。结果卡拖到战场即可。',
      '你已经掌握基础操作。真实路线每轮三战，失败会清空本轮祝福。',
    ];
    const overlay = this.add.container(0, 0).setName('tutorial-guide').setDepth(75);
    const panel = createPanel(this, 960, 190, 900, 150, 0.98);
    panel.add(this.add.text(-410, -44, titles[this.tutorialStep] ?? titles[4]!, { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '24px', color: '#f6dfaa', fontStyle: 'bold' }).setOrigin(0, 0.5));
    panel.add(this.add.text(-410, 4, bodies[this.tutorialStep] ?? bodies[4]!, { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '18px', color: '#d8c9e5', wordWrap: { width: 580 } }).setOrigin(0, 0.5));
    panel.add(this.add.text(280, -44, `第 ${this.tutorialStep + 1}/5 步`, { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '17px', color: '#9f91aa' }).setOrigin(0.5));
    const skipAll = createButton(this, 410, -28, 120, 44, '跳过教学', () => { setTutorialState(loadSave(), true, 0); this.scene.start('Menu'); }, { fontSize: 17 });
    const replay = createButton(this, 410, 28, 120, 44, '重播本步', () => this.scene.restart({ ...this.sceneData!, tutorialStep: this.tutorialStep }), { fontSize: 16 });
    const skipStep = createButton(this, 260, 28, 120, 44, '跳过本步', () => this.goToTutorialStep(this.tutorialStep + 1), { fontSize: 16 });
    panel.add([skipAll, replay, skipStep]);
    overlay.add(panel);

    if (this.tutorialStep === 2) {
      overlay.add(createButton(this, 960, 300, 240, 56, '继续', () => this.goToTutorialStep(3), { fill: COLORS.gold, fontSize: 20 }));
    }
    if (this.tutorialStep === 4) {
      overlay.add(createButton(this, 960, 300, 240, 56, '完成教学', () => { setTutorialState(loadSave(), true, 0); this.scene.start('Menu'); }, { fill: COLORS.gold, fontSize: 20 }));
    }
  }

  private goToTutorialStep(step: number): void {
    this.tutorialStep = Math.max(0, Math.min(4, step));
    setTutorialState(loadSave(), false, this.tutorialStep);
    this.setupTutorial();
  }

  private advanceTutorial(action: string): void {
    if (!this.tutorialMode) return;
    let nextStep: number | null = null;
    if (this.tutorialStep === 0 && action === 'anvil_guard') nextStep = 1;
    else if (this.tutorialStep === 1 && action === 'spore_squad') nextStep = 2;
    else if (this.tutorialStep === 3 && action === 'fusion') nextStep = 4;
    if (nextStep === null) return;
    this.goToTutorialStep(nextStep);
  }
  private showModifierBanner(modifierId: import('../core/types').BattleModifierId): void {
    const modifier = getModifier(modifierId);
    this.paused = true;
    const overlay = this.add.container(0, 0).setDepth(80);
    overlay.add(this.add.rectangle(960, 540, 1920, 1080, 0x08060c, 0.82).setInteractive());
    const panel = createPanel(this, 960, 520, 760, 330, 1);
    panel.add(this.add.text(0, -82, '本节点特殊规则', { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '23px', color: '#c9b8d6' }).setOrigin(0.5));
    panel.add(this.add.text(0, -18, modifier.name, { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '44px', color: '#f6dfaa', fontStyle: 'bold' }).setOrigin(0.5));
    panel.add(this.add.text(0, 68, modifier.description, { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '21px', color: '#d8c9e5', align: 'center', wordWrap: { width: 650 } }).setOrigin(0.5));
    overlay.add(panel);
    this.time.delayedCall(3000, () => { overlay.destroy(true); this.paused = false; });
  }
  private togglePause(force?: boolean): void {
    if (this.resultShown) return;
    this.paused = force ?? !this.paused;
    if (!this.paused) return;
    const overlay = this.add.container(0, 0).setDepth(90);
    overlay.add(this.add.rectangle(960, 540, 1920, 1080, 0x08060c, 0.82).setInteractive());
    const panel = createPanel(this, 960, 500, 620, 470, 1);
    panel.add(this.add.text(0, -165, '战斗暂停', { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '44px', color: '#f6dfaa', fontStyle: 'bold' }).setOrigin(0.5));
    overlay.add(panel);
    createButton(this, 960, 390, 320, 62, '继续战斗', () => { overlay.destroy(true); this.paused = false; }, { fill: COLORS.gold, fontSize: 23 }).setDepth(91);
    createButton(this, 960, 468, 320, 62, '重新开始本节点', () => this.scene.restart(this.sceneData), { fontSize: 22 }).setDepth(91);
    createButton(this, 960, 546, 320, 62, '放弃本局', () => this.confirmSurrender(), { fill: 0x784d58, hoverFill: 0x9f626d, textColor: '#ffffff', fontSize: 22 }).setDepth(91);
  }
  private confirmSurrender(): void {
    const overlay = this.add.container(0, 0).setDepth(90);
    const blocker = this.add.rectangle(960, 540, 1920, 1080, 0x08060c, 0.75).setInteractive();
    const panel = createPanel(this, 960, 500, 560, 320, 1);
    panel.add(this.add.text(0, -70, '确定投降并结束本局？', { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '30px', color: '#f6dfaa', fontStyle: 'bold' }).setOrigin(0.5));
    overlay.add([blocker, panel]);
    createButton(this, 800, 585, 220, 64, '取消', () => overlay.destroy(true), { fontSize: 22 }).setDepth(91);
    createButton(this, 1120, 585, 220, 64, '确认投降', () => this.scene.start('StageSelect'), { fill: 0xa5525d, hoverFill: 0xd06b76, textColor: '#ffffff', fontSize: 22 }).setDepth(91);
  }

  private showToast(message: string, isError = false): void {
    if (!this.toastText) return;
    this.toastText.setText(message).setColor(isError ? '#ff9a8a' : '#ffe08a').setAlpha(1);
    this.tweens.killTweensOf(this.toastText);
    this.tweens.add({ targets: this.toastText, alpha: 0, delay: 1100, duration: 500 });
  }
  private addFusionMaterial(index: number, isCatalyst: boolean): void {
    if (this.simulation.getPendingFusion('player')) { this.showToast('先把已有的融合卡拖到战场', true); return; }
    if (isCatalyst) { this.showToast('催化剂不能作为融合素材', true); return; }
    if (this.fusionSelection.includes(index)) return;
    if (this.fusionSelection.length >= 2) { this.showToast('熔炉已经放满两张素材', true); return; }
    this.fusionMode = true;
    this.fusionSelection.push(index);
    this.refreshFusionControls();
    this.refreshHandUi();
    this.showToast(this.fusionSelection.length === 1 ? '第一张已放入①主体，再拖第二张到②词缀' : '两张已放好，点击“确认熔铸”');
  }

  private renderForgeSlots(): void {
    if (!this.forgeZone) return;
    const hand = this.simulation.getHand('player');
    const body = hand[this.fusionSelection[0] ?? -1];
    const trait = hand[this.fusionSelection[1] ?? -1];
    const bodyText = this.forgeZone.getByName('forge-body') as Phaser.GameObjects.Text | null;
    const traitText = this.forgeZone.getByName('forge-trait') as Phaser.GameObjects.Text | null;
    bodyText?.setText(body ? `① ${getCard(body).name}` : '① 主体（第一张）');
    traitText?.setText(trait ? `② ${getCard(trait).name}` : '② 词缀（第二张）');
  }
}

function outerRing(scene: Phaser.Scene, x: number, y: number): void {
  const ring = scene.add.circle(x, y, 20, 0xffffff, 0).setStrokeStyle(8, COLORS.gold, 1).setDepth(10);
  scene.tweens.add({ targets: ring, radius: 130, alpha: 0, duration: 600, onComplete: () => ring.destroy() });
}
