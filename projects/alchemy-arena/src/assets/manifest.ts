export interface AssetManifest {
  cards: Record<string, string>;
  towers: Record<string, string>;
}

export const ASSET_MANIFEST: AssetManifest = {
  cards: {
    unit_anvil: 'unit_anvil.png',
    unit_archer: 'unit_archer.png',
    unit_spore: 'unit_spore.png',
    unit_griffin: 'unit_griffin.png',
    building_cannon: 'building_cannon.png',
    spell_flame: 'spell_flame.png',
    spell_frost: 'spell_frost.png',
    catalyst_order: 'catalyst_order.png',
    unit_charger: 'unit_charger.png',
    building_spring: 'building_spring.png',
    spell_growth: 'spell_growth.png',
    trap_mire: 'trap_mire.png',
    trap_rune: 'trap_rune.png',
    catalyst_chaos: 'catalyst_chaos.png',
  },
  towers: {
    tower_king_player: 'tower_king_player.png',
    tower_king_enemy: 'tower_king_player.png',
    tower_guard_player: 'tower_guard_player.png',
    tower_guard_enemy: 'tower_guard_player.png',
  },
};


