import {
  apply,
  createBettingRound,
  isAllowed,
  optionsFor,
  other,
  type BetAction,
  type BetOptions,
  type Seat,
} from './betting';
import { createDeck, JOKER, shuffle, type Card } from './cards';
import { cpuDecide, cpuKeep } from './cpu';
import { compareScores, evalHand, handName } from './hands';
import { ANTE, BET_INPUT_MAX, HAND_SIZE, MIN_BET, ROUNDS, START_COINS, TIMING } from './rules';

/**
 * 1vs1 ポーカーの進行（design/games/ポーカー.md §3）。
 * React に依存しない。画面の状態（PokerView）を持ち、変わるたびに購読者に知らせる。
 * 待ち時間は一時停止（ConfirmModal やルール説明を開いている間）できる。
 */

export type Phase = 'start' | 'play' | 'exchange' | 'showdown' | 'over';

export type CardView = {
  /** 描画のキー。新しく配られたカードは別のキーになる（配る動きをやり直すため） */
  id: number;
  card: Card;
  /** 裏向き */
  down: boolean;
  /** 配る動きの遅れ(ms)。null なら配る動きなし */
  dealDelay: number | null;
  /** 交換で消えるところ */
  leaving: boolean;
  /** 交換で選んでいる */
  selected: boolean;
};

export type ActionKind = 'check' | 'bet' | 'fold' | 'call' | 'raise' | 'keep' | 'exchange' | 'next';
export type ActionButton = { kind: ActionKind; amount?: number; disabled?: boolean };

export type BetPanel = {
  kind: 'bet' | 'raise';
  min: number;
  max: number;
  value: number;
  /** 数字キーを押した（最初の数字キーは初期値を置き換える） */
  typed: boolean;
  toCall: number;
  mustBet: boolean;
  opening: boolean;
};

export type BannerTone = 'plain' | 'phase' | 'you' | 'cpu' | 'draw';
export type Banner = { id: number; title: string; sub: string; tone: BannerTone };

export type PokerView = {
  phase: Phase;
  round: number;
  coins: Record<Seat, number>;
  pot: number;
  dealer: Seat | null;
  hands: Record<Seat, CardView[]>;
  handNames: Record<Seat, string>;
  /** CPU の吹き出し（id が変わると、出る動きをやり直す） */
  say: { id: number; text: string } | null;
  message: string;
  actions: ActionButton[];
  bet: BetPanel | null;
  banner: Banner | null;
  winner: Seat | null;
  /** 最終結果（あなたのコイン）。phase が over のとき */
  score: number | null;
};

class Cancelled extends Error {}

type Timer = { remaining: number; start: number; handle: ReturnType<typeof setTimeout> | null; resolve: () => void; reject: (e: Error) => void };

const fmt = (n: number) => n.toLocaleString();
const NAME: Record<Seat, string> = { you: 'あなた', cpu: 'CPU' };

export type PokerGameOptions = {
  random?: () => number;
  /** 演出の速さの倍率（テスト用。0 で待ち時間なし） */
  timeScale?: number;
};

export class PokerGame {
  private view: PokerView;
  private listeners = new Set<() => void>();
  private random: () => number;
  private timeScale: number;

  private timers = new Set<Timer>();
  private paused = false;
  private nextId = 1;

  // ゲームの状態
  private deck: Card[] = [];
  private cards: Record<Seat, Card[]> = { you: [], cpu: [] };

  // プレイヤーの入力待ち
  private betWaiter: { options: BetOptions; resolve: (a: BetAction) => void; reject: (e: Error) => void } | null = null;
  private exchangeWaiter: { resolve: (exchange: boolean) => void; reject: (e: Error) => void } | null = null;
  private nextWaiter: (() => void) | null = null;

  constructor(options: PokerGameOptions = {}) {
    this.random = options.random ?? Math.random;
    this.timeScale = options.timeScale ?? 1;
    this.view = this.initialView();
  }

  // ---------- 購読（useSyncExternalStore 用） ----------

  getSnapshot = (): PokerView => this.view;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private set(patch: Partial<PokerView>): void {
    this.view = { ...this.view, ...patch };
    this.listeners.forEach((l) => l());
  }

  private initialView(): PokerView {
    // スタート画面の背景：テーブルにカードを伏せて置いておく
    const facedown = () =>
      Array.from({ length: HAND_SIZE }, (): CardView => ({
        id: this.nextId++,
        card: JOKER,
        down: true,
        dealDelay: null,
        leaving: false,
        selected: false,
      }));
    return {
      phase: 'start',
      round: 1,
      coins: { you: START_COINS, cpu: START_COINS },
      pot: 0,
      dealer: null,
      hands: { you: facedown(), cpu: facedown() },
      handNames: { you: '', cpu: '' },
      say: null,
      message: '',
      actions: [],
      bet: null,
      banner: null,
      winner: null,
      score: null,
    };
  }

  // ---------- 待ち時間（一時停止・中断できる） ----------

  /** ConfirmModal やルール説明を開いている間は、待ち時間を止める */
  setPaused(paused: boolean): void {
    if (paused === this.paused) return;
    this.paused = paused;
    for (const t of this.timers) {
      if (paused) {
        if (t.handle) clearTimeout(t.handle);
        t.handle = null;
        t.remaining -= Date.now() - t.start;
      } else {
        this.arm(t);
      }
    }
  }

  private arm(t: Timer): void {
    t.start = Date.now();
    t.handle = setTimeout(() => {
      this.timers.delete(t);
      t.resolve();
    }, Math.max(0, t.remaining));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const t: Timer = { remaining: ms * this.timeScale, start: 0, handle: null, resolve, reject };
      this.timers.add(t);
      if (!this.paused) this.arm(t);
    });
  }

  /** 進行中の流れをすべて止める */
  private cancelAll(): void {
    const error = new Cancelled();
    for (const t of this.timers) {
      if (t.handle) clearTimeout(t.handle);
      t.reject(error);
    }
    this.timers.clear();
    this.betWaiter?.reject(error);
    this.exchangeWaiter?.reject(error);
    this.betWaiter = null;
    this.exchangeWaiter = null;
    this.nextWaiter = null;
  }

  dispose(): void {
    this.cancelAll();
  }

  // ---------- 開始 ----------

  /** スタート、または「もう1度プレイする」：すぐ親決めから始める */
  start(): void {
    this.cancelAll();
    this.set({
      ...this.initialView(),
      phase: 'play',
      hands: { you: [], cpu: [] },
    });
    this.run().catch((e) => {
      if (!(e instanceof Cancelled)) throw e;
    });
  }

  private async run(): Promise<void> {
    for (let n = 1; n <= ROUNDS; n++) {
      await this.playRound(n);
      const last = n >= ROUNDS || this.view.coins.you < ANTE || this.view.coins.cpu < ANTE;
      if (last) {
        await this.sleep(TIMING.lastWait);
        break;
      }
      await this.waitNext();
    }
    await this.finish();
  }

  // ---------- 表示の小物 ----------

  private message(text: string): void {
    this.set({ message: text });
  }

  private say(seat: Seat, text: string): void {
    if (seat === 'cpu') this.set({ say: { id: this.nextId++, text } });
  }

  private async banner(title: string, sub: string, ms: number, tone: BannerTone = 'plain'): Promise<void> {
    this.set({ banner: { id: this.nextId++, title, sub, tone } });
    await this.sleep(ms);
    this.set({ banner: null });
  }

  private phaseBanner(title: string, sub: string): Promise<void> {
    return this.banner(title, sub, TIMING.phaseBanner, 'phase');
  }

  /** コインを POT に出す */
  private put(seat: Seat, amount: number): void {
    this.set({
      coins: { ...this.view.coins, [seat]: this.view.coins[seat] - amount },
      pot: this.view.pot + amount,
    });
  }

  private cardViews(seat: Seat, opts: { down: boolean; dealt: number[] }): CardView[] {
    return this.cards[seat].map((card, i) => {
      const prev = this.view.hands[seat][i];
      const k = opts.dealt.indexOf(i);
      return k >= 0 || !prev
        ? { id: this.nextId++, card, down: opts.down, dealDelay: Math.max(0, k) * TIMING.dealStagger, leaving: false, selected: false }
        : { ...prev, card, down: opts.down, dealDelay: null, leaving: false, selected: false };
    });
  }

  private showHandName(seat: Seat): void {
    this.set({ handNames: { ...this.view.handNames, [seat]: handName(this.cards[seat]) } });
  }

  // ---------- 1回戦 ----------

  private async playRound(n: number): Promise<void> {
    this.set({
      round: n,
      phase: 'play',
      winner: null,
      say: null,
      handNames: { you: '', cpu: '' },
      hands: { you: [], cpu: [] },
    });

    if (n === 1) await this.decideDealer();
    else {
      const dealer = other(this.view.dealer ?? 'you');
      this.set({ dealer });
      await this.banner(`ROUND ${n}`, `${NAME[dealer]}が親`, TIMING.roundBanner);
    }

    // 参加費
    this.put('you', Math.min(ANTE, this.view.coins.you));
    this.put('cpu', Math.min(ANTE, this.view.coins.cpu));
    this.message(`参加費 ${ANTE}コインずつ`);

    // 配る
    this.deck = shuffle(createDeck(), this.random);
    this.cards.you = this.deck.splice(0, HAND_SIZE);
    this.cards.cpu = this.deck.splice(0, HAND_SIZE);
    const all = [0, 1, 2, 3, 4];
    this.set({
      hands: { cpu: this.cardViews('cpu', { down: true, dealt: all }), you: this.cardViews('you', { down: false, dealt: all }) },
    });
    await this.sleep(TIMING.deal);
    this.showHandName('you');

    await this.phaseBanner('BET', '1回目のベット');
    const first = await this.bettingRound(1);
    if (first) return this.settleFold(first);

    await this.phaseBanner('CARD CHANGE', 'カードの交換');
    await this.exchangePhase();

    await this.phaseBanner('BET', '2回目のベット');
    const second = await this.bettingRound(2);
    if (second) return this.settleFold(second);

    await this.phaseBanner('SHOWDOWN', '手札を公開');
    await this.showdown();
  }

  private async decideDealer(): Promise<void> {
    this.message('親を決めています…');
    const final: Seat = this.random() < 0.5 ? 'you' : 'cpu';
    const steps = TIMING.dealerSteps + (final === 'cpu' ? 1 : 0);
    for (let i = 0; i < steps; i++) {
      this.set({ dealer: i % 2 === 0 ? 'you' : 'cpu' });
      await this.sleep(TIMING.dealerStep(i));
    }
    this.set({ dealer: final });
    await this.banner(`${NAME[final]}が親`, '親が先に賭けます', TIMING.dealerBanner);
  }

  // ---------- 賭け ----------

  /** @returns 降りた人（降りなければ null） */
  private async bettingRound(round: 1 | 2): Promise<Seat | null> {
    const st = createBettingRound(round, this.view.dealer ?? 'you');
    for (;;) {
      const actor = st.actor;
      const coins = this.view.coins;
      const o = optionsFor(st, coins);
      let action: BetAction;
      if (actor === 'you') {
        action = await this.waitBet(o);
      } else {
        this.say('cpu', '…');
        this.message('CPU 考え中…');
        await this.sleep(TIMING.cpuThinkMin + this.random() * TIMING.cpuThinkRange);
        action = cpuDecide(o, this.cards.cpu, round, coins.cpu, this.view.pot, this.random);
        if (!isAllowed(action, o)) action = o.toCall > 0 ? { type: 'call' } : { type: 'check' };
      }

      const result = apply(st, action, coins);
      const name = NAME[actor];
      if (result.folded) {
        this.say(actor, 'フォールド');
        this.message(`${name}は降りました`);
        return actor;
      }
      if (result.paid > 0) this.put(actor, result.paid);
      if (action.type === 'check') {
        this.say(actor, 'チェック');
        this.message(`${name}はチェック`);
      } else if (action.type === 'call') {
        this.say(actor, 'コール');
        this.message(`${name}はコール（${fmt(o.toCall)}）`);
      } else if (action.type === 'bet') {
        this.say(actor, `ベット ${fmt(action.amount)}`);
        this.message(`${name}はベット（${fmt(action.amount)}）`);
      } else if (action.type === 'raise') {
        this.say(actor, `レイズ +${fmt(action.amount)}`);
        this.message(`${name}はレイズ（${fmt(action.amount)}）`);
      }
      if (actor === 'cpu') await this.sleep(TIMING.afterCpu);
      if (result.done) return null;
    }
  }

  private waitBet(o: BetOptions): Promise<BetAction> {
    const actions: ActionButton[] = [];
    if (o.toCall === 0) {
      if (!o.mustBet) actions.push({ kind: 'check' });
      if (o.maxRaise >= MIN_BET) actions.push({ kind: 'bet' });
    } else {
      actions.push({ kind: 'fold' }, { kind: 'call', amount: o.toCall });
      if (o.canRaise) actions.push({ kind: 'raise' });
    }
    const message = o.toCall
      ? 'CPU のベットに どうする？'
      : o.mustBet
        ? 'あなたは親です。ベット額を決めてください'
        : o.opening
          ? 'ベット額を決めるか、チェックしてください'
          : 'チェックか、ベットか';
    this.set({ actions, message });

    return new Promise<BetAction>((resolve, reject) => {
      this.betWaiter = { options: o, resolve, reject };
      // 親が最初に賭ける番は、電卓を最初から開く
      if (o.opening) this.openBet('bet');
    });
  }

  private resolveBet(action: BetAction): void {
    const w = this.betWaiter;
    if (!w || !isAllowed(action, w.options)) return;
    this.betWaiter = null;
    this.set({ actions: [], bet: null });
    w.resolve(action);
  }

  // ---------- プレイヤーの操作（賭け） ----------

  /** チェック・コール・フォールド */
  act(kind: 'check' | 'call' | 'fold'): void {
    this.resolveBet({ type: kind });
  }

  /** 賭け金パネルを開く */
  openBet(kind: 'bet' | 'raise'): void {
    const o = this.betWaiter?.options;
    if (!o) return;
    const raise = kind === 'raise';
    const initial = raise ? Math.max(MIN_BET, o.toCall) : MIN_BET * 2;
    this.set({
      bet: {
        kind,
        min: MIN_BET,
        max: o.maxRaise,
        value: Math.min(o.maxRaise, initial),
        typed: false,
        toCall: o.toCall,
        mustBet: o.mustBet,
        opening: o.opening,
      },
    });
  }

  /** パネルの左下のボタン：親の最初の番（2回目の賭け）は「チェック」、それ以外は「戻る」 */
  cancelBet(): void {
    const bet = this.view.bet;
    if (!bet || bet.mustBet) return;
    if (bet.opening) this.resolveBet({ type: 'check' });
    else this.set({ bet: null });
  }

  /** Esc：閉じる。ただし親の最初の番は閉じない */
  escapeBet(): void {
    const bet = this.view.bet;
    if (bet && !bet.opening) this.set({ bet: null });
  }

  /** 数字キー（'0'〜'9'）、'C'（0にする）、'BS'（1桁消す） */
  betKey(key: string): void {
    const bet = this.view.bet;
    if (!bet) return;
    let value = bet.value;
    if (key === 'C') value = 0;
    else if (key === 'BS') value = Math.floor(value / 10);
    else if (/^[0-9]$/.test(key)) value = Math.min(BET_INPUT_MAX, (bet.typed ? value : 0) * 10 + Number(key));
    else return;
    this.set({ bet: { ...bet, value, typed: true } });
  }

  betStep(delta: number): void {
    const bet = this.view.bet;
    if (!bet) return;
    this.set({ bet: { ...bet, value: Math.max(0, Math.min(bet.max, bet.value + delta)), typed: true } });
  }

  betPreset(preset: 'min' | 'half' | 'max'): void {
    const bet = this.view.bet;
    if (!bet) return;
    const half = Math.max(bet.min, Math.min(bet.max, Math.round(this.view.pot / 2 / 100) * 100));
    const value = preset === 'min' ? bet.min : preset === 'max' ? bet.max : half;
    this.set({ bet: { ...bet, value, typed: false } });
  }

  confirmBet(): void {
    const bet = this.view.bet;
    if (!bet || bet.value < bet.min || bet.value > bet.max) return;
    this.resolveBet({ type: bet.kind, amount: bet.value } as BetAction);
  }

  // ---------- 交換 ----------

  private async exchangePhase(): Promise<void> {
    this.set({ phase: 'exchange', actions: this.exchangeActions(0) });
    this.message('交換するカードを選んでください');
    const exchange = await new Promise<boolean>((resolve, reject) => {
      this.exchangeWaiter = { resolve, reject };
    });
    this.exchangeWaiter = null;

    const drop = exchange ? this.view.hands.you.flatMap((c, i) => (c.selected ? [i] : [])) : [];
    this.set({ phase: 'play', actions: [] });

    // あなたの交換
    if (drop.length) {
      await this.replace('you', drop, false);
      this.message(`${drop.length}枚 交換しました`);
    } else {
      this.set({ hands: { ...this.view.hands, you: this.view.hands.you.map((c) => ({ ...c, selected: false })) } });
      this.message('交換しませんでした');
    }
    this.showHandName('you');
    await this.sleep(TIMING.afterExchange);

    // CPU の交換
    const keep = cpuKeep(this.cards.cpu);
    const cpuDrop = this.cards.cpu.map((_, i) => i).filter((i) => !keep.includes(i));
    if (cpuDrop.length) await this.replace('cpu', cpuDrop, true);
    this.say('cpu', cpuDrop.length ? `${cpuDrop.length}枚 交換` : '交換しない');
    this.message(cpuDrop.length ? `CPU は ${cpuDrop.length}枚 交換しました` : 'CPU は交換しませんでした');
    await this.sleep(TIMING.afterCpuExchange);
  }

  private async replace(seat: Seat, drop: number[], down: boolean): Promise<void> {
    this.set({
      hands: { ...this.view.hands, [seat]: this.view.hands[seat].map((c, i) => (drop.includes(i) ? { ...c, leaving: true } : c)) },
    });
    await this.sleep(TIMING.leave);
    for (const i of drop) this.cards[seat][i] = this.deck.shift() as Card;
    this.set({ hands: { ...this.view.hands, [seat]: this.cardViews(seat, { down, dealt: drop }) } });
  }

  private exchangeActions(selected: number): ActionButton[] {
    return [{ kind: 'keep' }, { kind: 'exchange', amount: selected, disabled: selected === 0 }];
  }

  /** 交換するカードの選択を切り替える */
  toggleCard(index: number): void {
    if (this.view.phase !== 'exchange' || !this.exchangeWaiter) return;
    const you = this.view.hands.you.map((c, i) => (i === index ? { ...c, selected: !c.selected } : c));
    const count = you.filter((c) => c.selected).length;
    this.set({ hands: { ...this.view.hands, you }, actions: this.exchangeActions(count) });
  }

  /** 「交換する」（true）／「交換しない」（false） */
  exchange(doExchange: boolean): void {
    const w = this.exchangeWaiter;
    if (!w) return;
    if (doExchange && !this.view.hands.you.some((c) => c.selected)) return;
    w.resolve(doExchange);
  }

  // ---------- 勝負・決着 ----------

  private async showdown(): Promise<void> {
    this.set({ phase: 'showdown' });
    this.message('ショーダウン！');
    this.set({ hands: { ...this.view.hands, cpu: this.view.hands.cpu.map((c) => ({ ...c, down: false, dealDelay: null })) } });
    await this.sleep(TIMING.revealWait);
    const you = evalHand(this.cards.you);
    const cpu = evalHand(this.cards.cpu);
    this.showHandName('cpu');
    await this.sleep(TIMING.beforeSettle);
    const d = compareScores(you, cpu);
    if (d > 0) await this.settle('you', `${handName(this.cards.you)} で あなたの勝ち！`);
    else if (d < 0) await this.settle('cpu', `${handName(this.cards.cpu)} で CPU の勝ち`);
    else await this.settle('draw', '同じ強さで引き分け');
  }

  private settleFold(folded: Seat): Promise<void> {
    return this.settle(
      other(folded),
      folded === 'you' ? 'あなたが降りたので CPU の勝ち' : 'CPU が降りたので あなたの勝ち！',
    );
  }

  private async settle(winner: Seat | 'draw', text: string): Promise<void> {
    const amount = this.view.pot;
    const coins = { ...this.view.coins };
    if (winner === 'draw') {
      // 奇数枚の端数は CPU 側
      const half = Math.floor(amount / 2);
      coins.you += half;
      coins.cpu += amount - half;
    } else {
      coins[winner] += amount;
    }
    this.set({ coins, pot: 0, winner: winner === 'draw' ? null : winner, actions: [], bet: null });
    this.message(text);
    if (winner === 'you') await this.banner('WIN!', `+${fmt(amount)}`, TIMING.settleBanner, 'you');
    else if (winner === 'cpu') await this.banner('LOSE…', `CPU +${fmt(amount)}`, TIMING.settleBanner, 'cpu');
    else await this.banner('DRAW', 'POT を半分ずつ', TIMING.settleBanner, 'draw');
  }

  // ---------- 次のゲームへ・結果 ----------

  private async waitNext(): Promise<void> {
    this.set({ actions: [{ kind: 'next' }] });
    await Promise.race([
      new Promise<void>((resolve) => {
        this.nextWaiter = resolve;
      }),
      this.sleep(TIMING.autoNext),
    ]);
    this.nextWaiter = null;
    this.set({ actions: [] });
  }

  /** 「次のゲームへ ▶」 */
  next(): void {
    this.nextWaiter?.();
  }

  private async finish(): Promise<void> {
    const { you, cpu } = this.view.coins;
    const sub = `${fmt(you)} vs ${fmt(cpu)}`;
    if (you > cpu) await this.banner('YOU WIN!', sub, TIMING.finalBanner, 'you');
    else if (you < cpu) await this.banner('YOU LOSE…', sub, TIMING.finalBanner, 'cpu');
    else await this.banner('DRAW', sub, TIMING.finalBanner, 'draw');
    this.set({ phase: 'over', score: you, actions: [] });
  }

  // ---------- テスト用 ----------

  /** テスト用：今の手札 */
  peekCards(seat: Seat): readonly Card[] {
    return this.cards[seat];
  }
}
