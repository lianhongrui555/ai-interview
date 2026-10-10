export class DeckSystem {
  private readonly queue: string[];
  readonly hand: string[] = [];
  readonly handSize: number;

  constructor(cards: string[], handSize = 4) {
    if (cards.length !== 8 || new Set(cards).size !== cards.length) {
      throw new Error('出战牌组必须由 8 张不重复的卡牌组成');
    }
    this.queue = [...cards];
    this.handSize = handSize;
    this.refill();
  }

  play(index: number): string {
    const card = this.hand[index];
    if (!card) throw new Error(`手牌位置不存在: ${index}`);
    this.hand[index] = this.queue.shift() ?? '';
    this.queue.push(card);
    return card;
  }

  consume(indices: number[]): string[] {
    const unique = [...new Set(indices)];
    if (unique.length !== indices.length || indices.length === 0) {
      throw new Error('需要消耗不同的手牌位置');
    }
    return unique.map((index) => this.play(index));
  }

  peekNext(): string {
    return this.queue[0] ?? '';
  }

  copyHand(): string[] {
    return [...this.hand];
  }

  private refill(): void {
    while (this.hand.length < this.handSize) {
      const card = this.queue.shift();
      if (!card) break;
      this.hand.push(card);
    }
  }
}
