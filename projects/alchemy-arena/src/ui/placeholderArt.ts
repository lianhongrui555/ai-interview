import Phaser from 'phaser';
import { CARDS } from '../data/cards';
import { TRAITS } from '../core/FusionSystem';
import type { CardDefinition, FusionResult } from '../core/types';

const TYPE_COLORS: Record<string, number> = {
  unit: 0x3bb6d4,
  building: 0xb8864e,
  spell: 0x8156b8,
  trap: 0x55b66c,
  catalyst: 0xf0b84f,
  fusion: 0xf08b4f,
};

export function ensurePlaceholderTextures(scene: Phaser.Scene): void {
  for (const card of Object.values(CARDS)) {
    if (scene.textures.exists(card.artKey)) continue;
    drawCardTexture(scene, card.artKey, card);
  }
  if (!scene.textures.exists('tower_king_player')) drawTowerTexture(scene, 'tower_king_player', 0x3bb6d4, true);
  if (!scene.textures.exists('tower_guard_player')) drawTowerTexture(scene, 'tower_guard_player', 0x3bb6d4, false);
  if (!scene.textures.exists('tower_king_enemy')) drawTowerTexture(scene, 'tower_king_enemy', 0xd85b67, true);
  if (!scene.textures.exists('tower_guard_enemy')) drawTowerTexture(scene, 'tower_guard_enemy', 0xd85b67, false);
  if (!scene.textures.exists('particle_dot')) drawParticle(scene);
  if (!scene.textures.exists('spell_fusion_generic')) drawGenericFusion(scene, 'spell_fusion_generic', 0x9b6de0);
  if (!scene.textures.exists('trap_fusion_generic')) drawGenericFusion(scene, 'trap_fusion_generic', 0x62ca83);
}

export function ensureFusionTexture(scene: Phaser.Scene, result: FusionResult): string {
  if (scene.textures.exists(result.artKey)) return result.artKey;
  const texture = scene.textures.createCanvas(result.artKey, 128, 128);
  if (!texture) {
    drawGenericFusion(scene, result.artKey, result.rarity === 'signature' ? 0xf0b84f : TYPE_COLORS[result.type] ?? 0xf08b4f);
    return result.artKey;
  }
  drawFusionCanvas(scene, texture.getContext(), result);
  texture.refresh();
  return result.artKey;
}

interface FusionLayer {
  key: string;
  x?: number;
  y?: number;
  scale?: number;
  alpha?: number;
  rotation?: number;
  operation?: GlobalCompositeOperation;
}

const SIGNATURE_LAYERS: Record<string, FusionLayer[]> = {
  spell_fusion_icefire: [
    { key: 'spell_frost', x: -8, y: -5, scale: 0.98 },
    { key: 'spell_flame', x: 11, y: 8, scale: 0.72, alpha: 0.9, operation: 'screen' },
  ],
  unit_fusion_proliferation: [
    { key: 'spell_growth', scale: 0.98, alpha: 0.82 },
    { key: 'unit_spore', x: -28, y: -4, scale: 0.46 },
    { key: 'unit_spore', x: 25, y: 8, scale: 0.5 },
    { key: 'unit_spore', x: 2, y: 31, scale: 0.42 },
  ],
  unit_fusion_forge: [
    { key: 'unit_charger', x: -8, y: 2, scale: 0.98 },
    { key: 'unit_anvil', x: 18, y: 3, scale: 0.82, alpha: 0.9, operation: 'screen' },
  ],
  unit_fusion_thunder: [
    { key: 'trap_rune', scale: 0.96, alpha: 0.86 },
    { key: 'unit_griffin', x: 8, y: 2, scale: 0.78, operation: 'screen' },
  ],
  building_fusion_acid: [
    { key: 'trap_mire', x: -8, y: 8, scale: 0.9, alpha: 0.8 },
    { key: 'building_cannon', x: 10, y: -4, scale: 0.84 },
  ],
  building_fusion_frost: [
    { key: 'spell_frost', scale: 0.98, alpha: 0.82 },
    { key: 'building_spring', x: 8, y: 2, scale: 0.82 },
  ],
};

function drawFusionCanvas(scene: Phaser.Scene, context: CanvasRenderingContext2D, result: FusionResult): void {
  context.clearRect(0, 0, 128, 128);
  const traitColor = TRAITS[result.trait].color;
  const accent = result.rarity === 'signature' ? '#f0b84f' : '#' + traitColor.toString(16).padStart(6, '0');
  context.save();
  context.beginPath();
  context.arc(64, 64, 52, 0, Math.PI * 2);
  context.fillStyle = result.rarity === 'signature' ? 'rgba(78,48,20,0.78)' : 'rgba(35,27,46,0.88)';
  context.fill();
  context.lineWidth = 5;
  context.strokeStyle = accent;
  context.stroke();
  context.restore();

  const signatureLayers = SIGNATURE_LAYERS[result.artKey];
  if (signatureLayers) {
    for (const layer of signatureLayers) drawTextureLayer(scene, context, layer);
    drawFusionSpark(context, accent);
    return;
  }

  const sourceA = CARDS[result.sourceCardIds[0]]?.artKey;
  const sourceB = CARDS[result.sourceCardIds[1]]?.artKey;
  if (sourceA) {
    drawTextureLayer(scene, context, { key: sourceA, x: -3, y: 2, scale: 0.92 });
    context.save();
    context.globalCompositeOperation = 'source-atop';
    context.globalAlpha = result.rarity === 'common' ? 0.2 : 0.3;
    context.fillStyle = accent;
    context.fillRect(0, 0, 128, 128);
    context.restore();
  }
  if (sourceB) drawTextureLayer(scene, context, { key: sourceB, x: 39, y: 39, scale: 0.34, alpha: 0.92 });
  if (result.rarity === 'rare') drawTextureLayer(scene, context, { key: 'particle_dot', x: -39, y: -39, scale: 0.08, alpha: 0.9 });
  drawFusionSpark(context, accent);
}

function drawTextureLayer(scene: Phaser.Scene, context: CanvasRenderingContext2D, layer: FusionLayer): void {
  if (!scene.textures.exists(layer.key)) return;
  const source = scene.textures.get(layer.key).getSourceImage() as CanvasImageSource;
  const scale = layer.scale ?? 1;
  context.save();
  context.translate(64 + (layer.x ?? 0), 64 + (layer.y ?? 0));
  context.rotate(layer.rotation ?? 0);
  context.globalAlpha = layer.alpha ?? 1;
  context.globalCompositeOperation = layer.operation ?? 'source-over';
  context.drawImage(source, -64 * scale, -64 * scale, 128 * scale, 128 * scale);
  context.restore();
}

function drawFusionSpark(context: CanvasRenderingContext2D, color: string): void {
  context.save();
  context.translate(64, 64);
  context.strokeStyle = color;
  context.lineWidth = 3;
  context.globalAlpha = 0.7;
  for (let index = 0; index < 8; index += 1) {
    context.rotate(Math.PI / 4);
    context.beginPath();
    context.moveTo(43, 0);
    context.lineTo(54, 0);
    context.stroke();
  }
  context.restore();
}

function drawCardTexture(scene: Phaser.Scene, key: string, card: CardDefinition): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  const color = TYPE_COLORS[card.type] ?? 0xffffff;
  const dark = Phaser.Display.Color.IntegerToColor(color).darken(35).color;
  graphics.fillStyle(0x201827, 1);
  graphics.fillRoundedRect(4, 4, 56, 56, 8);
  graphics.lineStyle(4, color, 1);
  graphics.strokeRoundedRect(4, 4, 56, 56, 8);
  graphics.fillStyle(dark, 1);
  graphics.fillCircle(32, 31, 19);
  graphics.fillStyle(color, 1);
  if (card.type === 'unit') {
    graphics.fillRect(23, 21, 18, 22);
    graphics.fillRect(17, 27, 30, 8);
    graphics.fillRect(20, 43, 7, 10);
    graphics.fillRect(37, 43, 7, 10);
  } else if (card.type === 'building') {
    graphics.fillRect(20, 25, 24, 28);
    graphics.fillRect(16, 48, 32, 6);
    graphics.fillStyle(0x201827, 1);
    graphics.fillRect(29, 35, 7, 18);
  } else if (card.type === 'spell') {
    graphics.fillCircle(32, 33, 13);
    graphics.fillRect(29, 12, 6, 15);
    graphics.fillStyle(0xffef9a, 1);
    graphics.fillCircle(27, 29, 4);
  } else if (card.type === 'trap') {
    graphics.fillTriangle(32, 14, 49, 48, 15, 48);
    graphics.fillStyle(0x201827, 1);
    graphics.fillRect(29, 29, 6, 13);
  } else {
    graphics.fillTriangle(32, 13, 49, 49, 15, 49);
    graphics.fillStyle(0xffef9a, 1);
    graphics.fillCircle(32, 34, 8);
  }
  graphics.generateTexture(key, 64, 64);
  graphics.destroy();
}

function drawTowerTexture(scene: Phaser.Scene, key: string, color: number, king: boolean): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.fillStyle(0x201827, 1);
  graphics.fillRoundedRect(6, 12, 84, 78, 8);
  graphics.lineStyle(5, color, 1);
  graphics.strokeRoundedRect(6, 12, 84, 78, 8);
  graphics.fillStyle(color, 1);
  graphics.fillRect(20, king ? 30 : 40, 56, king ? 50 : 40);
  graphics.fillRect(14, 22, 16, 21);
  graphics.fillRect(66, 22, 16, 21);
  graphics.fillStyle(0xffef9a, 1);
  graphics.fillCircle(48, king ? 40 : 49, king ? 13 : 10);
  graphics.generateTexture(key, 96, 96);
  graphics.destroy();
}

function drawParticle(scene: Phaser.Scene): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.fillStyle(0xffffff, 1);
  graphics.fillRect(0, 0, 8, 8);
  graphics.generateTexture('particle_dot', 8, 8);
  graphics.destroy();
}

function drawGenericFusion(scene: Phaser.Scene, key: string, color: number): void {
  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.fillStyle(0x201827, 1);
  graphics.fillCircle(32, 32, 27);
  graphics.lineStyle(5, color, 1);
  graphics.strokeCircle(32, 32, 25);
  graphics.fillStyle(color, 1);
  graphics.fillTriangle(32, 11, 51, 47, 13, 47);
  graphics.fillStyle(0xffef9a, 1);
  graphics.fillCircle(32, 35, 8);
  graphics.generateTexture(key, 64, 64);
  graphics.destroy();
}




