import { MAX_RAISES, MIN_BET } from './rules';

/**
 * 1回の賭け（ベット・コール・レイズ・フォールド）のルール（design/games/ポーカー.md §3-6, §5）。
 * 状態は apply() で直接書き換える。
 */

export type Seat = 'you' | 'cpu';
export const other = (seat: Seat): Seat => (seat === 'you' ? 'cpu' : 'you');

export type BetAction =
  | { type: 'check' }
  | { type: 'call' }
  | { type: 'fold' }
  /** amount：ベット額 */
  | { type: 'bet'; amount: number }
  /** amount：コール額に上乗せする額 */
  | { type: 'raise'; amount: number };

export type BetOptions = {
  /** コールに必要な額（0 なら誰も賭けていない） */
  toCall: number;
  /** ベット・レイズできる最大額。「自分のコイン − コール額」と「相手のコイン」の小さいほう */
  maxRaise: number;
  canRaise: boolean;
  /** 1回目の賭けの親の最初の番：必ずベットする（チェックできない） */
  mustBet: boolean;
  /** 親の最初の番（電卓を最初から開く） */
  opening: boolean;
};

export type BettingRound = {
  /** 1: 交換前 / 2: 交換後 */
  round: 1 | 2;
  dealer: Seat;
  actor: Seat;
  /** この賭けで、それぞれが出した額 */
  bet: Record<Seat, number>;
  raises: number;
  acted: Record<Seat, boolean>;
};

export function createBettingRound(round: 1 | 2, dealer: Seat): BettingRound {
  return { round, dealer, actor: dealer, bet: { you: 0, cpu: 0 }, raises: 0, acted: { you: false, cpu: false } };
}

/** 今の番の人が選べること。coins は、今それぞれが持っているコイン */
export function optionsFor(st: BettingRound, coins: Record<Seat, number>): BetOptions {
  const actor = st.actor;
  const toCall = st.bet[other(actor)] - st.bet[actor];
  const maxRaise = Math.max(0, Math.min(coins[actor] - toCall, coins[other(actor)]));
  const opening = actor === st.dealer && !st.acted[actor] && toCall === 0 && maxRaise >= MIN_BET;
  return {
    toCall,
    maxRaise,
    canRaise: st.raises < MAX_RAISES && maxRaise >= MIN_BET,
    mustBet: opening && st.round === 1,
    opening,
  };
}

/** その行動ができるか */
export function isAllowed(action: BetAction, o: BetOptions): boolean {
  switch (action.type) {
    case 'check':
      return o.toCall === 0 && !o.mustBet;
    case 'call':
    case 'fold':
      return o.toCall > 0;
    case 'bet':
      return o.toCall === 0 && o.maxRaise >= MIN_BET && action.amount >= MIN_BET && action.amount <= o.maxRaise;
    case 'raise':
      return o.toCall > 0 && o.canRaise && action.amount >= MIN_BET && action.amount <= o.maxRaise;
  }
}

export type ApplyResult = {
  /** 番の人が POT に出す額 */
  paid: number;
  /** 降りた人 */
  folded?: Seat;
  /** この賭けが終わった（両者が1回以上行動し、額がそろった） */
  done: boolean;
};

/** 番の人の行動を反映し、次の人に番を回す */
export function apply(st: BettingRound, action: BetAction, coins: Record<Seat, number>): ApplyResult {
  const o = optionsFor(st, coins);
  if (!isAllowed(action, o)) throw new Error(`できない行動です: ${JSON.stringify(action)}`);
  const actor = st.actor;
  st.acted[actor] = true;
  if (action.type === 'fold') return { paid: 0, folded: actor, done: true };

  let paid = 0;
  if (action.type === 'call') paid = o.toCall;
  if (action.type === 'bet') paid = action.amount;
  if (action.type === 'raise') {
    paid = o.toCall + action.amount;
    st.raises++;
  }
  st.bet[actor] += paid;
  const done = st.acted.you && st.acted.cpu && st.bet.you === st.bet.cpu;
  if (!done) st.actor = other(actor);
  return { paid, done };
}
