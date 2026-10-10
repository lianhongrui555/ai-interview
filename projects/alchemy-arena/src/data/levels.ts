import type { NodeId, StageConfig, StageNodeDefinition } from '../core/types';

export const STAGES: StageConfig[] = [
  {
    id: 1, name: '试炼熔炉', subtitle: 'AI 主动推进，但反应较慢', aiName: '见习炼金师',
    aiBehavior: { archetype: 'apprentice', reactionMin: 1.2, reactionMax: 1.8, fusionChance: 0, catalystChance: 0, defenseWeight: 0.35, offenseWeight: 0.8, laneSwitchChance: 0.15, mistakeChance: 0.3, preferTraps: false, preferBuildings: false },
    deck: ['anvil_guard', 'spark_archer', 'spore_squad', 'wind_griffin', 'steam_charger', 'alchemy_cannon', 'flame_flask', 'frost_reagent'],
    usesCatalysts: false, usesTraps: false, difficultyLabel: '普通', themeId: 'trial',
  },
  {
    id: 2, name: '白银工坊', subtitle: 'AI 使用工坊防线并在防守后反推', aiName: '白银铸造师',
    aiBehavior: { archetype: 'silversmith', reactionMin: 1.0, reactionMax: 1.5, fusionChance: 0.1, catalystChance: 0, defenseWeight: 0.75, offenseWeight: 0.45, laneSwitchChance: 0.1, mistakeChance: 0.2, preferTraps: true, preferBuildings: true },
    deck: ['anvil_guard', 'spark_archer', 'spore_squad', 'steam_charger', 'alchemy_cannon', 'life_spring', 'corrosion_mire', 'growth_serum'],
    usesCatalysts: false, usesTraps: true, difficultyLabel: '困难', themeId: 'silver',
  },
  {
    id: 3, name: '王冠坩埚', subtitle: 'AI 依赖熔铸连招与换路施压', aiName: '大炼金师',
    aiBehavior: { archetype: 'grand-alchemist', reactionMin: 0.8, reactionMax: 1.2, fusionChance: 0.25, catalystChance: 0.65, defenseWeight: 0.6, offenseWeight: 0.75, laneSwitchChance: 0.35, mistakeChance: 0.12, preferTraps: true, preferBuildings: true },
    deck: ['anvil_guard', 'spark_archer', 'wind_griffin', 'steam_charger', 'life_spring', 'blast_rune', 'order_crystal', 'chaos_dust'],
    usesCatalysts: true, usesTraps: true, difficultyLabel: '挑战', themeId: 'crown',
  },
];

export const JOURNEY_NODES: Record<NodeId, StageNodeDefinition> = {
  l1_trial: { id: 'l1_trial', layer: 1, name: '试炼熔炉', subtitle: '均衡军队与主动推进', aiStageId: 1, themeId: 'trial', boss: false, deck: STAGES[0]!.deck, starGoals: ['通关节点', '己方国王塔存活', '2 分 30 秒内获胜'] },
  l1_greenhouse: { id: 'l1_greenhouse', layer: 1, name: '菌丝温室', subtitle: '数量众多但单体脆弱', aiStageId: 1, themeId: 'spore', boss: false, deck: STAGES[0]!.deck, starGoals: ['通关节点', '己方国王塔存活', '2 分 30 秒内获胜'] },
  l2_silver: { id: 'l2_silver', layer: 2, name: '白银工坊', subtitle: '陷阱、建筑与防守反击', aiStageId: 2, themeId: 'silver', boss: false, deck: STAGES[1]!.deck, starGoals: ['通关节点', '己方国王塔存活', '2 分 30 秒内获胜'] },
  l2_frost: { id: 'l2_frost', layer: 2, name: '霜冻矿脉', subtitle: '控制法术与远程消耗', aiStageId: 2, themeId: 'frost', boss: false, deck: STAGES[1]!.deck, starGoals: ['通关节点', '己方国王塔存活', '2 分 30 秒内获胜'] },
  l3_crown: { id: 'l3_crown', layer: 3, name: '王冠坩埚', subtitle: '熔铸连招；守卫塔未破时国王塔受到减伤', aiStageId: 3, themeId: 'crown', boss: true, deck: STAGES[2]!.deck, starGoals: ['击败首领', '己方国王塔存活', '2 分 30 秒内获胜'] },
};

export function getStage(id: number): StageConfig { const stage = STAGES.find((item) => item.id === id); if (!stage) throw new Error(`未知关卡: ${id}`); return stage; }
export function getJourneyNode(id: NodeId): StageNodeDefinition { return JOURNEY_NODES[id]; }
export function getNodesForLayer(layer: 1 | 2 | 3): StageNodeDefinition[] { return Object.values(JOURNEY_NODES).filter((node) => node.layer === layer); }
