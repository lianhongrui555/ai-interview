import Phaser from 'phaser';
import { COLORS } from '../core/constants';
import { finalizeJourneyReward } from '../core/JourneySystem';
import { loadSave, unlockCard } from '../core/save';
import { CARDS } from '../data/cards';
import type { NodeId, SaveV2 } from '../core/types';
import { createButton, createCardView, createTopBar } from '../ui/components';

interface RewardData { nodeId: NodeId; won: boolean; }

export class RewardScene extends Phaser.Scene {
  private nodeId: NodeId = 'l1_trial';
  private won = false;
  private save: SaveV2 = loadSave();
  private choices: string[] = [];
  private chosen = false;

  constructor() { super('Reward'); }
  init(data: RewardData): void { this.nodeId = data.nodeId ?? 'l1_trial'; this.won = data.won ?? false; }

  create(): void {
    this.save = loadSave();
    this.choices = this.save.activeJourney?.pendingCardChoices ?? [];
    this.cameras.main.setBackgroundColor('#15111c');
    createTopBar(this, this.won ? '节点完成' : '路线终止', this.won ? '首次通关可永久解锁新卡' : '临时祝福已清空');
    if (!this.won) {
      createButton(this, 960, 610, 380, 78, '返回路线地图', () => this.scene.start('StageSelect'), { fill: COLORS.gold, fontSize: 27 });
      return;
    }
    if (this.choices.length === 0) {
      this.add.text(960, 430, '本次没有新的卡牌奖励', { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '38px', color: '#f6dfaa', fontStyle: 'bold' }).setOrigin(0.5);
      createButton(this, 960, 610, 380, 78, '继续路线', () => { this.save = finalizeJourneyReward(this.save); this.scene.start('StageSelect'); }, { fill: COLORS.gold, fontSize: 27 });
      return;
    }
    this.add.text(960, 175, '从坩埚中选取一张永久卡', { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '30px', color: '#f6dfaa', fontStyle: 'bold' }).setOrigin(0.5);
    this.choices.forEach((cardId, index) => {
      const card = CARDS[cardId];
      if (!card) return;
      const view = createCardView(this, 640 + index * 320, 445, 250, 340, card, () => this.choose(cardId), false);
      view.setDepth(2).setScale(0.78).setAlpha(0);
      this.tweens.add({ targets: view, scaleX: 1, scaleY: 1, alpha: 1, duration: 260, delay: index * 120, ease: 'Back.out' });
    });
    createButton(this, 960, 930, 320, 72, '继续路线', () => { this.save = finalizeJourneyReward(this.save); this.scene.start('StageSelect'); }, { fontSize: 24 });
  }

  private choose(cardId: string): void {
    if (this.chosen) return;
    this.chosen = true;
    this.save = unlockCard(this.save, cardId);
    this.save = finalizeJourneyReward(this.save);
    const card = CARDS[cardId];
    this.add.rectangle(960, 555, 820, 190, 0x17131e, 0.98).setStrokeStyle(5, COLORS.gold, 1).setDepth(10);
    this.add.text(960, 510, '新 卡 入 库', { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '22px', color: '#d7bc84' }).setOrigin(0.5).setDepth(11);
    this.add.text(960, 560, card?.name ?? cardId, { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '40px', color: '#f6dfaa', fontStyle: 'bold' }).setOrigin(0.5).setDepth(11);
    createButton(this, 960, 670, 320, 68, '继续路线', () => this.scene.start('StageSelect'), { fill: COLORS.gold, fontSize: 24 }).setDepth(12);
  }
}
