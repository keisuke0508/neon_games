/** トランプ（52枚＋ジョーカー2枚） */

export type Suit = 's' | 'h' | 'd' | 'c';
/** rank: 2〜14（11=J, 12=Q, 13=K, 14=A） */
export type NormalCard = { joker: false; rank: number; suit: Suit };
export type Joker = { joker: true };
export type Card = NormalCard | Joker;

export const SUITS: readonly Suit[] = ['s', 'h', 'd', 'c'];

// U+FE0E を付けて、絵文字ではなく文字として表示する
export const SUIT_SYMBOL: Record<Suit, string> = { s: '♠︎', h: '♥︎', d: '♦︎', c: '♣︎' };
const SUIT_NAME: Record<Suit, string> = { s: 'スペード', h: 'ハート', d: 'ダイヤ', c: 'クラブ' };

/** ジョーカーを除いた52枚 */
export const STANDARD_CARDS: readonly NormalCard[] = SUITS.flatMap((suit) =>
  Array.from({ length: 13 }, (_, i): NormalCard => ({ joker: false, rank: i + 2, suit })),
);

export const JOKER: Joker = { joker: true };

export function rankText(rank: number): string {
  return ({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A' } as Record<number, string>)[rank] ?? String(rank);
}

/** 読み上げ用の名前（例：スペードのA、ジョーカー） */
export function cardLabel(card: Card): string {
  return card.joker ? 'ジョーカー' : `${SUIT_NAME[card.suit]}の${rankText(card.rank)}`;
}

/** カードの色：♠♣ は cyan、♥♦ は magenta、ジョーカーは yellow */
export function cardColor(card: Card): 'black' | 'red' | 'joker' {
  if (card.joker) return 'joker';
  return card.suit === 'h' || card.suit === 'd' ? 'red' : 'black';
}

/** 54枚の山札 */
export function createDeck(): Card[] {
  return [...STANDARD_CARDS.map((c) => ({ ...c })), { joker: true }, { joker: true }];
}

export function shuffle<T>(list: T[], random: () => number = Math.random): T[] {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

/** "As"（スペードのA）、"Th"（ハートの10）、"JK"（ジョーカー）のような表記から作る */
export function parseCard(code: string): Card {
  if (code === 'JK') return { joker: true };
  const r = code[0];
  const rank = 'TJQKA'.includes(r) ? 10 + 'TJQKA'.indexOf(r) : Number(r);
  return { joker: false, rank, suit: code[1] as Suit };
}

export const parseHand = (codes: string): Card[] => codes.split(' ').map(parseCard);
