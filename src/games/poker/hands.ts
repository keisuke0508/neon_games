import { STANDARD_CARDS, type Card, type NormalCard } from './cards';

/**
 * 役の判定（design/games/ポーカー.md §5 役）。
 * 判定結果は [役の順位, 比べる数字…] の配列で、前から順に大きいほうが強い。
 */
export type HandScore = number[];

export type HandInfo = { name: string; desc: string; example: string };

/** 役の一覧。インデックスが役の順位（0: ノーペア 〜 10: ファイブカード） */
export const HANDS: readonly HandInfo[] = [
  { name: 'ノーペア', desc: '役なし。一番強いカードで比べます', example: 'As Jd 8c 5h 3s' },
  { name: 'ワンペア', desc: '同じ数字が2枚', example: 'Ts Th Ad 7c 4h' },
  { name: 'ツーペア', desc: 'ペアが2組', example: 'Js Jh 3d 3c 9s' },
  { name: 'スリーカード', desc: '同じ数字が3枚', example: '5s 5h 5d Kc 2s' },
  { name: 'ストレート', desc: '数字が5つ連続（マークはばらばら）', example: '8c 9d Ts Jh Qs' },
  { name: 'フラッシュ', desc: '同じマークが5枚', example: '2d 6d 9d Jd Kd' },
  { name: 'フルハウス', desc: 'スリーカード＋ワンペア', example: 'Qs Qh Qd 4c 4s' },
  { name: 'フォーカード', desc: '同じ数字が4枚', example: '7s 7h 7d 7c Ks' },
  { name: 'ストレートフラッシュ', desc: '同じマークで数字が5つ連続', example: '5h 6h 7h 8h 9h' },
  { name: 'ロイヤルストレートフラッシュ', desc: '同じマークの 10・J・Q・K・A', example: 'Ts Js Qs Ks As' },
  { name: 'ファイブカード', desc: '同じ数字が4枚＋ジョーカー', example: '9s 9h 9d 9c JK' },
];

export const HAND_RANK = {
  highCard: 0,
  onePair: 1,
  twoPair: 2,
  threeOfAKind: 3,
  straight: 4,
  flush: 5,
  fullHouse: 6,
  fourOfAKind: 7,
  straightFlush: 8,
  royalFlush: 9,
  fiveOfAKind: 10,
} as const;

/** ジョーカーを含まない5枚の判定 */
function evalNatural(cards: readonly NormalCard[]): HandScore {
  const ranks = cards.map((c) => c.rank).sort((a, b) => b - a);
  const flush = cards.every((c) => c.suit === cards[0].suit);
  const count = new Map<number, number>();
  for (const r of ranks) count.set(r, (count.get(r) ?? 0) + 1);
  // [枚数, 数字] を、枚数の多い順・数字の大きい順に
  const groups = [...count.entries()].map(([r, n]) => [n, r]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  const order = groups.map((g) => g[1]);
  const uniq = [...new Set(ranks)];

  // ストレートの一番上の数字（A-2-3-4-5 は 5）
  let straightHigh = 0;
  if (uniq.length === 5) {
    if (uniq[0] - uniq[4] === 4) straightHigh = uniq[0];
    else if (uniq[0] === 14 && uniq[1] === 5) straightHigh = 5;
  }

  if (groups[0][0] === 5) return [HAND_RANK.fiveOfAKind, order[0]];
  if (straightHigh && flush) return [straightHigh === 14 ? HAND_RANK.royalFlush : HAND_RANK.straightFlush, straightHigh];
  if (groups[0][0] === 4) return [HAND_RANK.fourOfAKind, ...order];
  if (groups[0][0] === 3 && groups[1][0] === 2) return [HAND_RANK.fullHouse, ...order];
  if (flush) return [HAND_RANK.flush, ...ranks];
  if (straightHigh) return [HAND_RANK.straight, straightHigh];
  if (groups[0][0] === 3) return [HAND_RANK.threeOfAKind, ...order];
  if (groups[0][0] === 2 && groups[1][0] === 2) return [HAND_RANK.twoPair, ...order];
  if (groups[0][0] === 2) return [HAND_RANK.onePair, ...order];
  return [HAND_RANK.highCard, ...ranks];
}

/** 強さを比べる。a が強ければ正、b が強ければ負、同じなら 0 */
export function compareScores(a: HandScore, b: HandScore): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

/** 5枚の役を判定する。ジョーカーは、一番強くなるカードの代わりにする */
export function evalHand(cards: readonly Card[]): HandScore {
  const natural = cards.filter((c): c is NormalCard => !c.joker);
  const jokers = cards.length - natural.length;
  if (jokers === 0) return evalNatural(natural);

  let best: HandScore = [-1];
  const fill = (hand: NormalCard[], left: number) => {
    if (left === 0) {
      const score = evalNatural(hand);
      if (compareScores(score, best) > 0) best = score;
      return;
    }
    for (const c of STANDARD_CARDS) fill([...hand, c], left - 1);
  };
  fill(natural, jokers);
  return best;
}

export function handName(cards: readonly Card[]): string {
  return HANDS[evalHand(cards)[0]].name;
}
