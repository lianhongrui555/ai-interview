import Phaser from 'phaser';
import { COLORS } from '../core/constants';
import { CARDS } from '../data/cards';
import { loadSave, setActiveDeckPreset, updateDeck } from '../core/save';
import { createButton, createCardView, createTopBar } from '../ui/components';
import type { DeckPresetId, SaveV2 } from '../core/types';

export class DeckScene extends Phaser.Scene {
  private save: SaveV2 = loadSave();
  private deck: string[] = [];
  private preservedDeck: string[] | null = null;
  private deckLayer?: Phaser.GameObjects.Container;
  private feedback?: Phaser.GameObjects.Text;

  constructor() { super('Deck'); }

  init(data?: { preserveDeck?: string[] }): void {
    this.preservedDeck = data?.preserveDeck?.length ? [...data.preserveDeck] : null;
  }

  create(): void {
    this.save = loadSave();
    this.deck = this.preservedDeck ? [...this.preservedDeck] : [...this.save.deckPresets[String(this.save.activeDeckPreset) as '1' | '2' | '3']];
    this.preservedDeck = null;
    this.cameras.main.setBackgroundColor('#15111c');
    createTopBar(this, '牌组编辑', `牌组 ${this.save.activeDeckPreset} · 已解锁 ${this.save.unlockedCardIds.length}/14 张`);
    for (const preset of [1, 2, 3] as DeckPresetId[]) {
      createButton(this, 760 + (preset - 1) * 130, 145, 118, 48, '牌组 ' + preset, () => { this.save = setActiveDeckPreset(loadSave(), preset); this.scene.restart(); }, { fill: preset === this.save.activeDeckPreset ? COLORS.gold : COLORS.parchmentDark, fontSize: 19 });
    }
    this.deckLayer = this.add.container(0, 0);
    this.renderDeckSlots();
    this.renderCollection();
    this.feedback = this.add.text(960, 1018, '点击已选卡牌可移除；点击收藏中的卡牌可加入牌组。', { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '20px', color: '#a99db1' }).setOrigin(0.5);
    createButton(this, 1740, 1008, 230, 66, '保存牌组', () => this.saveDeck(), { fill: COLORS.gold, hoverFill: 0xffd775, fontSize: 25 });
    createButton(this, 150, 1008, 220, 66, '返回主菜单', () => this.scene.start('Menu'), { fontSize: 22 });
  }

  private renderDeckSlots(): void {
    this.add.text(960, 164, '出战牌组（8 张）', { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '25px', color: '#f6dfaa', fontStyle: 'bold' }).setOrigin(0.5);
    for (let index = 0; index < 8; index += 1) {
      const cardId = this.deck[index] ?? '';
      const card = cardId ? CARDS[cardId] : null;
      const x = 290 + index * 190;
      if (card) {
        const view = createCardView(this, x, 320, 160, 210, card, () => this.toggleCard(cardId), true);
        this.deckLayer?.add(view);
      } else {
        const empty = this.add.rectangle(x, 320, 160, 210, 0x17131e, 0.9).setStrokeStyle(3, 0x756b7f, 0.8);
        const plus = this.add.text(x, 320, '+', { fontSize: '48px', color: '#756b7f' }).setOrigin(0.5);
        this.deckLayer?.add([empty, plus]);
      }
    }
  }

  private renderCollection(): void {
    this.add.text(960, 478, '永久卡牌收藏', { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '25px', color: '#f6dfaa', fontStyle: 'bold' }).setOrigin(0.5);
    Object.keys(CARDS).forEach((cardId, index) => {
      const card = CARDS[cardId];
      if (!card) return;
      const unlocked = this.save.unlockedCardIds.includes(cardId);
      const selected = this.deck.includes(cardId);
      const x = 205 + (index % 7) * 252;
      const y = index < 7 ? 645 : 845;
      const view = createCardView(this, x, y, 180, 168, card, unlocked ? () => this.toggleCard(cardId) : undefined, selected);
      if (!unlocked) {
        view.setAlpha(0.34);
        view.add(this.add.text(0, 0, '未解锁', { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '20px', color: '#ffffff', backgroundColor: '#1b1720' }).setOrigin(0.5));
      }
    });
  }

  private toggleCard(cardId: string): void {
    const existing = this.deck.indexOf(cardId);
    if (existing >= 0) {
      this.deck.splice(existing, 1);
    } else if (this.deck.length < 8) {
      this.deck.push(cardId);
    } else {
      this.feedback?.setText('牌组已满，请先移除一张卡牌。').setColor('#ff9a8a');
      return;
    }
    this.scene.restart({ preserveDeck: this.deck });
  }

  private saveDeck(): void {
    if (this.deck.length !== 8) {
      this.feedback?.setText('必须选择正好 8 张卡牌才能保存。').setColor('#ff9a8a');
      return;
    }
    try {
      this.save = updateDeck(this.save, this.deck, this.save.activeDeckPreset);
      this.feedback?.setText('牌组已保存。').setColor('#81d69b');
    } catch (error) {
      this.feedback?.setText(error instanceof Error ? error.message : '保存失败').setColor('#ff9a8a');
    }
  }
}



