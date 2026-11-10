import { evalHand } from './hands';
import { PokerGame, type PokerView } from './game';
import { ANTE, ROUNDS, START_COINS } from './rules';

/** 再現できる乱数（mulberry32） */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

/** 条件を満たすまで、待ち時間を進める */
async function until(game: PokerGame, cond: (v: PokerView) => boolean, max = 2000) {
  for (let i = 0; i < max; i++) {
    if (cond(game.getSnapshot())) return;
    await tick();
  }
  throw new Error('条件を満たしませんでした');
}

/** でたらめに操作するプレイヤーで、最後まで遊ぶ */
async function playRandomly(seed: number) {
  const random = seeded(seed);
  const game = new PokerGame({ random: seeded(seed + 100), timeScale: 0 });
  const total = () => {
    const v = game.getSnapshot();
    return v.coins.you + v.coins.cpu + v.pot;
  };
  const rounds = new Set<number>();
  game.start();
  for (let step = 0; step < 20000 && game.getSnapshot().phase !== 'over'; step++) {
    const v = game.getSnapshot();
    expect(total()).toBe(START_COINS * 2);
    expect(v.coins.you).toBeGreaterThanOrEqual(0);
    expect(v.coins.cpu).toBeGreaterThanOrEqual(0);
    rounds.add(v.round);

    if (v.bet) {
      const r = random();
      if (r < 0.2) game.betKey(String(Math.floor(random() * 10)));
      else if (r < 0.3 && !v.bet.opening) game.cancelBet();
      else if (r < 0.4) game.betPreset(random() < 0.5 ? 'max' : 'half');
      else game.confirmBet();
    } else if (v.phase === 'exchange') {
      if (random() < 0.5) game.toggleCard(Math.floor(random() * 5));
      else game.exchange(random() < 0.7);
    } else if (v.actions.length) {
      const a = v.actions[Math.floor(random() * v.actions.length)];
      if (a.kind === 'bet' || a.kind === 'raise') game.openBet(a.kind);
      else if (a.kind === 'check' || a.kind === 'call' || a.kind === 'fold') game.act(a.kind);
      else if (a.kind === 'next') game.next();
      else if (a.kind === 'keep') game.exchange(false);
      else if (a.kind === 'exchange') game.exchange(true);
    }
    await tick();
  }
  game.dispose();
  return { view: game.getSnapshot(), rounds };
}

describe('ゲームの進行', () => {
  it.each([1, 2, 3, 4, 5, 6])('乱数 %i：コインの合計は常に一定で、最後まで遊ぶと結果になる', async (seed) => {
    const { view, rounds } = await playRandomly(seed);
    expect(view.phase).toBe('over');
    expect(view.score).toBe(view.coins.you);
    expect(view.coins.you + view.coins.cpu).toBe(START_COINS * 2);
    // 10回戦、またはどちらかが参加費を払えなくなったところで終わる
    const ended = view.round === ROUNDS || view.coins.you < ANTE || view.coins.cpu < ANTE;
    expect(ended).toBe(true);
    expect(rounds.size).toBe(view.round);
  });

  it('1回戦：参加費、親が先に賭ける、自分が親なら電卓が最初から開く', async () => {
    // 親決めで「あなた」になる乱数
    const game = new PokerGame({ random: () => 0.1, timeScale: 0 });
    game.start();
    await until(game, (v) => v.bet !== null);
    const v = game.getSnapshot();
    expect(v.dealer).toBe('you');
    expect(v.pot).toBe(ANTE * 2);
    expect(v.bet).toMatchObject({ kind: 'bet', mustBet: true, opening: true, value: 200 });
    expect(v.message).toBe('あなたは親です。ベット額を決めてください');
    expect(v.handNames.you).not.toBe('');
    game.dispose();
  });

  it('電卓：最初の数字は初期値を置き換え、範囲外では確定できない', async () => {
    const game = new PokerGame({ random: () => 0.1, timeScale: 0 });
    game.start();
    await until(game, (v) => v.bet !== null);
    game.betKey('5');
    expect(game.getSnapshot().bet?.value).toBe(5);
    game.betKey('0');
    game.betKey('0');
    expect(game.getSnapshot().bet?.value).toBe(500);
    game.betKey('BS');
    game.confirmBet(); // 50 は最低額未満
    expect(game.getSnapshot().bet?.value).toBe(50);
    game.betStep(100);
    game.confirmBet();
    await until(game, (v) => v.bet === null);
    expect(game.getSnapshot().pot).toBe(ANTE * 2 + 150);
    game.dispose();
  });

  it('交換：選んだカードだけ入れ替わり、役名が更新される', async () => {
    const game = new PokerGame({ random: seeded(9), timeScale: 0 });
    game.start();
    // 1回目の賭けを、コールかベットで進める
    await until(game, (v) => v.phase === 'exchange' || v.actions.length > 0 || v.bet !== null);
    for (let i = 0; i < 50 && game.getSnapshot().phase !== 'exchange'; i++) {
      const v = game.getSnapshot();
      if (v.bet) game.confirmBet();
      else if (v.actions.some((a) => a.kind === 'call')) game.act('call');
      else if (v.actions.some((a) => a.kind === 'check')) game.act('check');
      else if (v.actions.some((a) => a.kind === 'bet')) game.openBet('bet');
      await tick();
    }
    expect(game.getSnapshot().phase).toBe('exchange');
    const before = game.peekCards('you').slice();
    game.toggleCard(0);
    game.toggleCard(2);
    expect(game.getSnapshot().actions).toEqual([{ kind: 'keep' }, { kind: 'exchange', amount: 2, disabled: false }]);
    game.exchange(true);
    await until(game, (v) => v.phase !== 'exchange' && v.message.startsWith('2枚'));
    const after = game.peekCards('you');
    expect(after[1]).toBe(before[1]);
    expect(after[3]).toBe(before[3]);
    expect(after[4]).toBe(before[4]);
    expect(game.getSnapshot().handNames.you).not.toBe('');
    expect(evalHand(after)).toBeDefined();
    game.dispose();
  });

  it('一時停止している間は、CPU の考え中も進まない', async () => {
    // 親決めで「CPU」になる乱数
    const game = new PokerGame({ random: () => 0.9, timeScale: 0 });
    game.start();
    await until(game, (v) => v.message === 'CPU 考え中…');
    game.setPaused(true);
    for (let i = 0; i < 50; i++) await tick();
    expect(game.getSnapshot().message).toBe('CPU 考え中…');
    game.setPaused(false);
    await until(game, (v) => v.message !== 'CPU 考え中…');
    game.dispose();
  });

  it('「もう1度プレイする」（start）で、進行中の流れを止めて最初からやり直す', async () => {
    const game = new PokerGame({ random: () => 0.1, timeScale: 0 });
    game.start();
    await until(game, (v) => v.bet !== null);
    game.start();
    expect(game.getSnapshot()).toMatchObject({ round: 1, pot: 0, bet: null, coins: { you: START_COINS, cpu: START_COINS } });
    await until(game, (v) => v.bet !== null);
    expect(game.getSnapshot().pot).toBe(ANTE * 2);
    game.dispose();
  });
});
