import Phaser from 'phaser';
import { COLORS } from '../core/constants';
import { getAIAssistLevel, getActiveDeck, loadSave, saveActiveJourney } from '../core/save';
import { abandonJourney, chooseJourneyBlessing, createJourney, selectJourneyNode } from '../core/JourneySystem';
import { getJourneyNode, getNodesForLayer } from '../data/levels';
import { BLESSINGS } from '../data/journey';
import type { BlessingId, NodeId, SaveV2 } from '../core/types';
import { createButton, createPanel, createTopBar } from '../ui/components';

export class StageSelectScene extends Phaser.Scene {
  private save: SaveV2 = loadSave();
  private selectedNode: NodeId = 'l1_trial';

  constructor() { super('StageSelect'); }

  create(): void {
    this.save = loadSave();
    if (!this.save.activeJourney) this.save = saveActiveJourney(this.save, createJourney(getActiveDeck(this.save)));
    const pending = this.save.activeJourney?.pendingNextNodes;
    const stored = this.registry.get('journeySelectedNode') as NodeId | undefined;
    this.selectedNode = pending?.[0] ?? (stored && this.isNodeAvailable(stored) ? stored : this.save.activeJourney?.currentNodeId ?? 'l1_trial');
    this.cameras.main.setBackgroundColor('#15111c');
    createTopBar(this, '熔炉远征', '三场分支 · 失败清空临时祝福');
    this.drawMap();
    this.renderDetail();
    createButton(this, 150, 1008, 220, 64, '返回主菜单', () => this.scene.start('Menu'), { fontSize: 22 });
    createButton(this, 1760, 1008, 240, 64, '放弃路线', () => { this.save = abandonJourney(this.save); this.scene.restart(); }, { fill: 0x784d58, hoverFill: 0x9f626d, textColor: '#ffffff', fontSize: 21 });
    if (this.isSelectedAvailable() && this.save.activeJourney?.status !== 'active') {
      createButton(this, 960, 760, 300, 66, '开始节点', () => this.startSelected(), { fill: COLORS.gold, fontSize: 25 });
    }
    if (this.save.activeJourney?.status === 'active') {
      createButton(this, 960, 760, 300, 66, '继续当前节点', () => this.startBattle(), { fill: COLORS.gold, fontSize: 25 });
    }
  }

  private drawMap(): void {
    const xPositions = [420, 960, 1500];
    const nodes = [getNodesForLayer(1), getNodesForLayer(2), getNodesForLayer(3)];
    for (let index = 0; index < 2; index += 1) {
      this.add.line(0, 0, xPositions[index]! + 80, 430, xPositions[index + 1]! - 80, 310, COLORS.gold, 0.35).setOrigin(0);
      this.add.line(0, 0, xPositions[index]! + 80, 560, xPositions[index + 1]! - 80, 650, COLORS.gold, 0.35).setOrigin(0);
    }
    ([1, 2, 3] as const).forEach((layer, layerIndex) => {
      this.add.text(xPositions[layerIndex]!, 180, `第 ${layer} 层`, { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '24px', color: '#c9b8d6' }).setOrigin(0.5);
      nodes[layerIndex]!.forEach((node, nodeIndex) => {
        const y = layer === 3 ? 490 : nodeIndex === 0 ? 330 : 650;
        const unlocked = this.isNodeAvailable(node.id);
        const current = this.save.activeJourney?.currentNodeId === node.id && this.save.activeJourney.status === 'active';
        const stars = this.save.nodeStars[node.id] ?? 0;
        const ring = this.add.circle(xPositions[layerIndex]!, y, 62, unlocked ? COLORS.purple : 0x46414e, 1).setStrokeStyle(current ? 8 : 5, current ? COLORS.gold : unlocked ? 0xb995d7 : 0x77717a, 1);
        this.add.text(xPositions[layerIndex]!, y - 5, node.boss ? '冠' : node.themeId === 'spore' ? '孢' : String(layer), { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '38px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
        this.add.text(xPositions[layerIndex]!, y + 82, node.name, { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '22px', color: unlocked ? '#f6dfaa' : '#77717a', fontStyle: 'bold' }).setOrigin(0.5);
        this.add.text(xPositions[layerIndex]!, y + 112, stars ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '☆☆☆', { fontFamily: 'sans-serif', fontSize: '24px', color: stars ? '#f0b84f' : '#665f6e' }).setOrigin(0.5);
        if (unlocked) ring.setInteractive({ useHandCursor: true }).on('pointerdown', () => { this.registry.set('journeySelectedNode', node.id); this.selectedNode = node.id; this.scene.restart(); });
      });
    });
  }

  private renderDetail(): void {
    const node = getJourneyNode(this.selectedNode);
    const panel = createPanel(this, 960, 880, 1540, 145, 0.98);
    panel.add(this.add.text(-720, -42, node.name, { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '28px', color: '#f6dfaa', fontStyle: 'bold' }).setOrigin(0, 0.5));
    panel.add(this.add.text(-720, 0, `${node.subtitle} · 敌方牌组：${node.deck.slice(0, 3).join('、')}`, { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '18px', color: '#b8a9c4' }).setOrigin(0, 0.5));
    const modifierId = this.save.activeJourney?.nodeModifiers[node.id];
    panel.add(this.add.text(-720, 40, `特殊规则：${modifierId ? '未知' : '无'} · 三星：${node.starGoals.join(' / ')}`, { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '18px', color: '#8fd5d2' }).setOrigin(0, 0.5));
  }

  private isNodeAvailable(nodeId: NodeId): boolean {
    const journey = this.save.activeJourney;
    if (!journey) return false;
    if (journey.pendingNextNodes?.length) return journey.pendingNextNodes.includes(nodeId);
    if (journey.status === 'active') return journey.currentNodeId === nodeId;
    return getJourneyNode(nodeId).layer === 1;
  }

  private isSelectedAvailable(): boolean { return this.isNodeAvailable(this.selectedNode); }

  private startSelected(): void {
    const journey = this.save.activeJourney;
    if (!journey) return;
    this.save = selectJourneyNode(this.save, this.selectedNode);
    if (this.save.activeJourney?.pendingBlessingChoices?.length) { this.showBlessingChoices(this.save.activeJourney.pendingBlessingChoices); return; }
    this.startBattle();
  }

  private showBlessingChoices(choices: BlessingId[]): void {
    const overlay = this.add.container(0, 0).setDepth(50);
    overlay.add(this.add.rectangle(960, 540, 1920, 1080, 0x08060c, 0.86).setInteractive());
    const panel = createPanel(this, 960, 500, 1120, 620, 1);
    panel.add(this.add.text(0, -240, '选择熔炉祝福', { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '40px', color: '#f6dfaa', fontStyle: 'bold' }).setOrigin(0.5));
    choices.forEach((id, index) => {
      const blessing = BLESSINGS[id];
      const card = createPanel(this, 640 + index * 320, -10, 260, 330, 1);
      card.add(this.add.circle(0, -95, 48, blessing.color, 1).setStrokeStyle(5, COLORS.gold, 1));
      card.add(this.add.text(0, -95, '祝', { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '36px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5));
      card.add(this.add.text(0, -5, blessing.name, { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '26px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5));
      card.add(this.add.text(0, 72, blessing.description, { fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '18px', color: '#c9b8d6', align: 'center', wordWrap: { width: 220 } }).setOrigin(0.5));
      const button = createButton(this, 640 + index * 320, 190, 220, 58, '选择', () => {
        this.save = chooseJourneyBlessing(this.save, id);
        overlay.destroy(true);
        this.startBattle();
      }, { fill: COLORS.gold, fontSize: 22 });
      overlay.add([card, button]);
    });
    overlay.add(panel);
  }

  private startBattle(): void {
    const journey = this.save.activeJourney;
    if (!journey) return;
    this.scene.start('Battle', { mode: 'campaign', stageId: getJourneyNode(journey.currentNodeId).aiStageId, nodeId: journey.currentNodeId, deckIds: journey.lockedDeckIds, modifierId: journey.nodeModifiers[journey.currentNodeId], blessings: journey.blessings, aiAssistLevel: getAIAssistLevel(this.save, journey.currentNodeId) });
  }
}
