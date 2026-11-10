import type { BetAction, BetOptions } from './betting';
import { SUITS, type Card } from './cards';
import { evalHand, HAND_RANK } from './hands';
import { MIN_BET } from './rules';

/**
 * CPU の考え方（design/games/ポーカー.md §5 CPU の考え方。モックの cpuKeep / cpuDecide が基準）。
 * 強すぎず、弱すぎず、ときどき強気に出る。
 */

type Random = () => number;

/** 交換で残すカードの位置 */
export function cpuKeep(hand: readonly Card[]): number[] {
  const all = hand.map((_, i) => i);
  if (evalHand(hand)[0] >= HAND_RANK.straight) return all; // ストレート以上はそのまま
  const jokers = all.filter((i) => hand[i].joker);
  const natural = all.filter((i) => !hand[i].joker);
  const rankOf = (i: number) => {
    const c = hand[i];
    return c.joker ? 0 : c.rank;
  };

  // ペアがあればペア（とジョーカー）
  const count = new Map<number, number>();
  for (const i of natural) count.set(rankOf(i), (count.get(rankOf(i)) ?? 0) + 1);
  const paired = natural.filter((i) => (count.get(rankOf(i)) ?? 0) >= 2);
  if (paired.length) return [...jokers, ...paired];

  // 4枚そろったフラッシュの候補
  for (const s of SUITS) {
    const same = natural.filter((i) => {
      const c = hand[i];
      return !c.joker && c.suit === s;
    });
    if (same.length + jokers.length >= 4) return [...jokers, ...same];
  }

  // ストレートの候補（A は 1 としても使う）
  for (let low = 10; low >= 1; low--) {
    const pick: number[] = [];
    for (let r = low; r < low + 5; r++) {
      const i = natural.find((k) => rankOf(k) === r || (r === 1 && rankOf(k) === 14));
      if (i !== undefined) pick.push(i);
    }
    if (pick.length + jokers.length >= 4) return [...jokers, ...pick];
  }

  // ジョーカーと、J 以上の一番強いカード
  const high = [...natural].sort((a, b) => rankOf(b) - rankOf(a));
  return [...jokers, ...(high.length && rankOf(high[0]) >= 11 ? [high[0]] : [])];
}

/** 手の強さ：役の順位に、一番強いカードの強さを少し足した値 */
export function cpuStrength(hand: readonly Card[], round: 1 | 2): number {
  const score = evalHand(hand);
  let s = score[0] + (score[1] ?? 0) / 30;
  // 1回目の賭けでは、4枚そろったフラッシュやストレートの候補もワンペア程度とみなす
  if (round === 1 && score[0] === HAND_RANK.highCard && cpuKeep(hand).length >= 4) s = 1.1;
  return s;
}

const round100 = (v: number) => Math.max(MIN_BET, Math.round(v / 100) * 100);

export function cpuDecide(
  o: BetOptions,
  hand: readonly Card[],
  round: 1 | 2,
  coins: number,
  pot: number,
  random: Random = Math.random,
): BetAction {
  const s = cpuStrength(hand, round);
  const r = random();

  // 誰も賭けていない
  if (o.toCall === 0) {
    const want = o.mustBet || s >= 2 || (s >= 1 && r < 0.6) || r < 0.15;
    if (!want || o.maxRaise < MIN_BET) return { type: 'check' };
    const amount = round100(200 * (1 + s * 0.8) * (0.7 + random() * 0.6));
    return { type: 'bet', amount: Math.min(o.maxRaise, amount) };
  }

  // 相手が賭けた
  const ratio = o.toCall / (coins + 1);
  if (o.canRaise && ((s >= 3 && r < 0.5) || (s >= 2 && r < 0.25))) {
    const amount = round100(Math.max(o.toCall, pot / 3) * (0.6 + random()));
    return { type: 'raise', amount: Math.min(o.maxRaise, amount) };
  }
  if (s >= 2) return { type: 'call' };
  if (s >= 1) return ratio < 0.35 || r < 0.5 ? { type: 'call' } : { type: 'fold' };
  if (round === 1) return ratio < 0.12 || r < 0.35 ? { type: 'call' } : { type: 'fold' };
  return ratio < 0.1 && r < 0.3 ? { type: 'call' } : { type: 'fold' };
}
