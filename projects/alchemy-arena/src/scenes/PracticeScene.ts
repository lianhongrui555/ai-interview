import Phaser from 'phaser';
import { COLORS } from '../core/constants';
import { loadSave, updatePractice } from '../core/save';
import { CARDS } from '../data/cards';
import type { PracticeSettings, SaveV2 } from '../core/types';
import { createButton, createCardView, createTopBar } from '../ui/components';

export class PracticeScene extends Phaser.Scene {
  private save: SaveV2 = loadSave();
  private practice: PracticeSettings = { ...this.save.practice };
  private feedback?: Phaser.GameObjects.Text;

  constructor() { super('Practice'); }

  create(): void {
    this.save = loadSave();
    this.practice = { ...this.save.practice, deckIds: [...this.save.practice.deckIds] };
    this.cameras.main.setBackgroundColor('#15111c');
    createTopBar(this, '自由练习场', '全部 14 张卡临时试用 · 不影响正式进度');
    this.renderDeck();
    this.renderCollection();
    this.renderControls();
    this.feedback = this.add.text(960, 1018, `当前牌组 ${this.practice.deckIds.length}/8`, { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '19px', color: '#a99db1' }).setOrigin(0.5);
    createButton(this, 150, 1008, 220, 66, '返回主菜单', () => this.scene.start('Menu'), { fontSize: 22 });
    createButton(this, 1740, 1008, 230, 66, '开始练习', () => this.startPractice(), { fill: COLORS.gold, hoverFill: 0xffd775, fontSize: 24, disabled: this.practice.deckIds.length !== 8 });
  }

  private renderDeck(): void {
    this.add.text(960, 145, '练习牌组（点击收藏卡加入或移出）', { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '24px', color: '#f6dfaa', fontStyle: 'bold' }).setOrigin(0.5);
    for (let index = 0; index < 8; index += 1) {
      const card = CARDS[this.practice.deckIds[index] ?? ''];
      const x = 290 + index * 190;
      if (card) createCardView(this, x, 260, 155, 150, card, () => this.toggleCard(card.id), true);
      else this.add.rectangle(x, 260, 155, 150, 0x17131e, 0.9).setStrokeStyle(3, 0x756b7f, 0.8);
    }
  }

  private renderCollection(): void {
    Object.keys(CARDS).forEach((cardId, index) => {
      const card = CARDS[cardId];
      if (!card) return;
      const x = 205 + (index % 7) * 252;
      const y = index < 7 ? 460 : 630;
      createCardView(this, x, y, 180, 150, card, () => this.toggleCard(cardId), this.practice.deckIds.includes(cardId));
    });
  }

  private renderControls(): void {
    this.add.text(350, 785, 'AI 对手', { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '22px', color: '#d8c9e5', fontStyle: 'bold' }).setOrigin(0.5);
    (['off', 1, 2, 3] as const).forEach((opponent, index) => {
      const label = opponent === 'off' ? '关闭 AI' : `第 ${opponent} 关 AI`;
      createButton(this, 190 + index * 170, 840, 150, 54, label, () => this.updatePractice({ opponent }), { fill: this.practice.opponent === opponent ? COLORS.gold : COLORS.parchmentDark, fontSize: 17 });
    });
    createButton(this, 930, 840, 220, 54, this.practice.infiniteElixir ? '无限圣水：开' : '无限圣水：关', () => this.updatePractice({ infiniteElixir: !this.practice.infiniteElixir }), { fontSize: 18 });
    createButton(this, 1180, 840, 220, 54, this.practice.timerEnabled ? '计时：开' : '计时：关', () => this.updatePractice({ timerEnabled: !this.practice.timerEnabled }), { fontSize: 18 });
    createButton(this, 1530, 840, 260, 54, '清空战场', () => {}, { fontSize: 18 });
    this.add.text(1530, 883, '进入战斗后可清空或重置', { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '16px', color: '#8f8498' }).setOrigin(0.5);
  }

  private toggleCard(cardId: string): void {
    const index = this.practice.deckIds.indexOf(cardId);
    if (index >= 0) this.practice.deckIds.splice(index, 1);
    else if (this.practice.deckIds.length < 8) this.practice.deckIds.push(cardId);
    else { this.feedback?.setText('牌组已满，请先移除一张卡牌。').setColor('#ff9a8a'); return; }
    this.save = updatePractice(this.save, this.practice);
    this.practice = { ...this.save.practice, deckIds: [...this.save.practice.deckIds] };
    this.scene.restart();
  }

  private updatePractice(settings: Partial<PracticeSettings>): void {
    this.save = updatePractice(this.save, settings);
    this.practice = { ...this.save.practice, deckIds: [...this.save.practice.deckIds] };
    this.scene.restart();
  }

  private startPractice(): void {
    if (this.practice.deckIds.length !== 8) return;
    const stageId = this.practice.opponent === 'off' ? 1 : this.practice.opponent;
    this.scene.start('Battle', {
      mode: 'practice', stageId, deckIds: this.practice.deckIds, practice: this.practice,
    });
  }
}
