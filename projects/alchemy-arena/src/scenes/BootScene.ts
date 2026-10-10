import Phaser from 'phaser';
import { ASSET_MANIFEST } from '../assets/manifest';
import { ensurePlaceholderTextures } from '../ui/placeholderArt';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload(): void {
    const base = import.meta.env.BASE_URL;
    for (const [key, file] of Object.entries(ASSET_MANIFEST.cards)) this.load.image(key, `${base}assets/cards/${file}`);
    for (const [key, file] of Object.entries(ASSET_MANIFEST.towers)) this.load.image(key, `${base}assets/towers/${file}`);
  }

  create(): void {
    ensurePlaceholderTextures(this);
    const params = new URLSearchParams(window.location.search);
    this.registry.set('fastBattle', params.get('fast') === '1');
    this.registry.set('debugBattle', params.get('debug') === '1');
    this.scene.start('Menu');
  }
}
