import Phaser from 'phaser';
import { COLORS } from '../core/constants';
import type { CardDefinition, FusionResult } from '../core/types';
import { audioManager } from '../audio/AudioManager';

export interface ButtonOptions {
  fill?: number;
  hoverFill?: number;
  textColor?: string;
  fontSize?: number;
  disabled?: boolean;
}

export function createButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  onClick: () => void,
  options: ButtonOptions = {},
): Phaser.GameObjects.Container {
  const fill = options.fill ?? COLORS.parchmentDark;
  const hoverFill = options.hoverFill ?? COLORS.gold;
  const disabled = options.disabled ?? false;
  const container = scene.add.container(x, y);
  const rect = scene.add.rectangle(0, 0, width, height, disabled ? 0x554f58 : fill, disabled ? 0.7 : 1)
    .setStrokeStyle(3, disabled ? 0x77717a : 0x241d29, 1);
  const labelText = scene.add.text(0, 0, label, {
    fontFamily: '"Microsoft YaHei", sans-serif',
    fontSize: `${options.fontSize ?? 28}px`,
    color: options.textColor ?? '#1d1826',
    fontStyle: 'bold',
    align: 'center',
  }).setOrigin(0.5);
  container.add([rect, labelText]);
  if (!disabled) {
    rect.setInteractive({ useHandCursor: true });
    rect.on('pointerover', () => rect.setFillStyle(hoverFill));
    rect.on('pointerout', () => rect.setFillStyle(fill));
    rect.on('pointerdown', () => {
      audioManager.playSfx('click');
      scene.tweens.add({ targets: container, scaleX: 0.96, scaleY: 0.96, yoyo: true, duration: 70 });
      onClick();
    });
  }
  return container;
}

export function createPanel(scene: Phaser.Scene, x: number, y: number, width: number, height: number, alpha = 0.96): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const shadow = scene.add.rectangle(7, 8, width, height, 0x000000, 0.28);
  const panel = scene.add.rectangle(0, 0, width, height, 0x211a29, alpha).setStrokeStyle(4, COLORS.parchmentDark, 0.9);
  container.add([shadow, panel]);
  return container;
}

export function createCardView(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  card: CardDefinition | FusionResult,
  onClick?: () => void,
  selected = false,
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const borderColor = selected ? COLORS.gold : cardColor(card);
  const background = scene.add.rectangle(0, 0, width, height, 0x271f30, 1).setStrokeStyle(selected ? 6 : 3, borderColor, 1);
  const art = scene.add.image(0, -height * 0.12, card.artKey).setDisplaySize(Math.min(width * 0.64, 110), Math.min(width * 0.64, 110));
  const cost = scene.add.circle(-width / 2 + 22, -height / 2 + 22, 19, 0x7848b6, 1).setStrokeStyle(3, 0xffffff, 0.8);
  const costText = scene.add.text(-width / 2 + 22, -height / 2 + 22, String(card.cost), { fontFamily: 'monospace', fontSize: '24px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
  const typeName = cardRoleLabel(card);
  const name = scene.add.text(0, height * 0.31, card.name, {
    fontFamily: '"Microsoft YaHei", sans-serif', fontSize: `${Math.max(17, width * 0.12)}px`, color: '#fff4d6', fontStyle: 'bold', align: 'center', wordWrap: { width: width - 14 },
  }).setOrigin(0.5);
  const type = scene.add.text(0, height * 0.43, typeName, { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '14px', color: '#c8b8d9' }).setOrigin(0.5);
  container.add([background, art, cost, costText, name, type]);
  if (onClick) {
    background.setInteractive({ useHandCursor: true });
    background.on('pointerover', () => container.setScale(1.035));
    background.on('pointerout', () => container.setScale(1));
    background.on('pointerdown', () => {
      audioManager.playSfx('click');
      onClick();
    });
  }
  return container;
}

export function cardRoleLabel(card: CardDefinition | FusionResult): string {
  if (card.role) return card.role;
  if (card.type === 'catalyst') return '熔铸辅助';
  if (card.type === 'building') return card.tags.includes('heal') ? '治疗建筑' : '防守建筑';
  if (card.type === 'spell') return card.tags.includes('damage') ? '伤害法术' : card.tags.includes('heal') ? '治疗法术' : '控制法术';
  if (card.type === 'trap') return card.tags.includes('dot') ? '持续陷阱' : '爆发陷阱';
  if ('stats' in card && card.stats?.targetPreference === 'buildings') return '建筑杀手坦克';
  if (card.tags.includes('swarm')) return '群体部队';
  if (card.tags.includes('ranged')) return '后排输出';
  if (card.tags.includes('charger')) return '冲锋输出';
  if (card.tags.includes('air')) return '空中突袭';
  return '前排单位';
}

export function cardTypeName(type: string): string {
  return ({ unit: '单位', building: '建筑', spell: '法术', trap: '陷阱', catalyst: '催化剂' } as Record<string, string>)[type] ?? type;
}

export function cardColor(card: CardDefinition | FusionResult): number {
  if ('rarity' in card && card.rarity === 'signature') return COLORS.gold;
  return ({ unit: COLORS.player, building: 0xb8864e, spell: COLORS.purple, trap: COLORS.green, catalyst: COLORS.gold } as Record<string, number>)[card.type] ?? COLORS.gold;
}

export function createTopBar(scene: Phaser.Scene, title: string, subtitle?: string): void {
  scene.add.rectangle(960, 0, 1920, 118, 0x15111b, 0.96).setOrigin(0.5, 0);
  scene.add.text(72, 58, title, { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '42px', color: '#f6dfaa', fontStyle: 'bold' }).setOrigin(0, 0.5);
  if (subtitle) scene.add.text(1870, 58, subtitle, { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '21px', color: '#b9a7c6' }).setOrigin(1, 0.5);
  scene.add.rectangle(960, 118, 1920, 3, COLORS.gold, 0.8);
}


