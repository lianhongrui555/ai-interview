export const GAME_WIDTH = 1920;
export const GAME_HEIGHT = 1080;

export const ARENA = {
  left: 170,
  right: 1750,
  top: 125,
  bottom: 850,
  riverLeft: 920,
  riverRight: 1000,
  topLaneY: 310,
  bottomLaneY: 680,
};

export const TOWER_POSITIONS = {
  playerKing: { x: 260, y: 500 },
  playerTop: { x: 500, y: 310 },
  playerBottom: { x: 500, y: 680 },
  enemyKing: { x: 1660, y: 500 },
  enemyTop: { x: 1420, y: 310 },
  enemyBottom: { x: 1420, y: 680 },
};

export const BATTLE_RULES = {
  regularSeconds: 180,
  overtimeSeconds: 60,
  maxElixir: 10,
  startingElixir: 5,
  elixirInterval: 2.8,
  handSize: 4,
  deckSize: 8,
  maxFusionCost: 7,
};

export const COLORS = {
  ink: 0x1d1826,
  parchment: 0xe9d6a7,
  parchmentDark: 0xbba06f,
  player: 0x3bb6d4,
  enemy: 0xd85b67,
  gold: 0xf0b84f,
  green: 0x55b66c,
  purple: 0x8156b8,
  river: 0x2d7fa1,
  grass: 0x263d35,
  grassLight: 0x335247,
  bridge: 0x8f7048,
};

export const DEPLOY_MARGIN = 42;
