import Phaser from 'phaser';
import './style.css';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { StageSelectScene } from './scenes/StageSelectScene';
import { DeckScene } from './scenes/DeckScene';
import { SettingsScene } from './scenes/SettingsScene';
import { PracticeScene } from './scenes/PracticeScene';
import { BattleScene } from './scenes/BattleScene';
import { RewardScene } from './scenes/RewardScene';
import { GAME_HEIGHT, GAME_WIDTH } from './core/constants';
import { audioManager } from './audio/AudioManager';
import { loadSave } from './core/save';

const save = loadSave();
audioManager.setVolumes(save.settings.musicVolume, save.settings.sfxVolume);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-root',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#17131f',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    activePointers: 3,
  },
  scene: [BootScene, MenuScene, StageSelectScene, PracticeScene, DeckScene, SettingsScene, BattleScene, RewardScene],
});

export default game;

