import { describe, expect, it } from 'vitest';
import { DeckSystem } from '../src/core/DeckSystem';
import { INITIAL_DECK_IDS } from '../src/data/cards';

describe('DeckSystem', () => {
  it('初始手牌为 4 张，出牌后从牌组循环补充', () => {
    const deck = new DeckSystem(INITIAL_DECK_IDS);
    expect(deck.copyHand()).toEqual(INITIAL_DECK_IDS.slice(0, 4));
    const played = deck.play(0);
    expect(played).toBe(INITIAL_DECK_IDS[0]);
    expect(deck.copyHand()[0]).toBe(INITIAL_DECK_IDS[4]);
  });

  it('熔铸可一次消耗两张不同手牌并补回两张', () => {
    const deck = new DeckSystem(INITIAL_DECK_IDS);
    const consumed = deck.consume([0, 2]);
    expect(consumed).toEqual([INITIAL_DECK_IDS[0], INITIAL_DECK_IDS[2]]);
    expect(deck.copyHand()).toEqual([INITIAL_DECK_IDS[4], INITIAL_DECK_IDS[1], INITIAL_DECK_IDS[5], INITIAL_DECK_IDS[3]]);
  });
});
