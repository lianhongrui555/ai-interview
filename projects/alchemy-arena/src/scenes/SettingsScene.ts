import Phaser from 'phaser';
import { audioManager } from '../audio/AudioManager';
import { COLORS } from '../core/constants';
import { loadSave, updateSettings } from '../core/save';
import { createButton, createTopBar } from '../ui/components';

export class SettingsScene extends Phaser.Scene {
  private save = loadSave();
  private musicText?: Phaser.GameObjects.Text;
  private sfxText?: Phaser.GameObjects.Text;
  private speedText?: Phaser.GameObjects.Text;

  constructor() { super('Settings'); }

  create(): void {
    this.cameras.main.setBackgroundColor('#15111c');
    createTopBar(this, '设置', '修改后自动保存');
    this.add.text(960, 210, '音频设置', { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '38px', color: '#f6dfaa', fontStyle: 'bold' }).setOrigin(0.5);

    this.add.text(650, 355, '背景音乐', { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '28px', color: '#e5d8c4' }).setOrigin(0.5);
    createButton(this, 780, 355, 72, 58, '−', () => this.changeMusic(-0.1), { fontSize: 32 });
    this.musicText = this.add.text(880, 355, `${Math.round(this.save.settings.musicVolume * 100)}%`, { fontFamily: 'monospace', fontSize: '28px', color: '#ffffff' }).setOrigin(0.5);
    createButton(this, 980, 355, 72, 58, '＋', () => this.changeMusic(0.1), { fontSize: 32 });

    this.add.text(650, 465, '战斗音效', { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '28px', color: '#e5d8c4' }).setOrigin(0.5);
    createButton(this, 780, 465, 72, 58, '−', () => this.changeSfx(-0.1), { fontSize: 32 });
    this.sfxText = this.add.text(880, 465, `${Math.round(this.save.settings.sfxVolume * 100)}%`, { fontFamily: 'monospace', fontSize: '28px', color: '#ffffff' }).setOrigin(0.5);
    createButton(this, 980, 465, 72, 58, '＋', () => this.changeSfx(0.1), { fontSize: 32 });

    this.add.text(650, 575, '默认战斗速度', { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '28px', color: '#e5d8c4' }).setOrigin(0.5);
    createButton(this, 800, 575, 72, 58, '1×', () => this.changeSpeed(1), { fontSize: 26 });
    createButton(this, 980, 575, 72, 58, '2×', () => this.changeSpeed(2), { fontSize: 26 });
    this.speedText = this.add.text(890, 625, `当前：${this.save.settings.preferredBattleSpeed}×`, { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '18px', color: '#a99db1' }).setOrigin(0.5);
    this.add.text(960, 700, '首次点击开始后会播放原创合成芯片音乐。', { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '20px', color: '#9d91a5' }).setOrigin(0.5);
    createButton(this, 960, 815, 360, 76, '返回主菜单', () => this.scene.start('Menu'), { fill: COLORS.gold, hoverFill: 0xffd775, fontSize: 28 });
  }

  private changeMusic(delta: number): void {
    const volume = Math.max(0, Math.min(1, Number((this.save.settings.musicVolume + delta).toFixed(2))));
    this.save = updateSettings(this.save, { musicVolume: volume });
    audioManager.setVolumes(this.save.settings.musicVolume, this.save.settings.sfxVolume);
    if (volume > 0) audioManager.startMusic();
    this.musicText?.setText(`${Math.round(volume * 100)}%`);
  }

  private changeSpeed(speed: 1 | 2): void {
    this.save = updateSettings(this.save, { preferredBattleSpeed: speed });
    this.speedText?.setText(`当前：${speed}×`);
    audioManager.playSfx('click');
  }

  private changeSfx(delta: number): void {
    const volume = Math.max(0, Math.min(1, Number((this.save.settings.sfxVolume + delta).toFixed(2))));
    this.save = updateSettings(this.save, { sfxVolume: volume });
    audioManager.setVolumes(this.save.settings.musicVolume, this.save.settings.sfxVolume);
    this.sfxText?.setText(`${Math.round(volume * 100)}%`);
    audioManager.playSfx('click');
  }
}
