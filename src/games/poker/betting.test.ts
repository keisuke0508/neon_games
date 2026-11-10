import { apply, createBettingRound, isAllowed, optionsFor } from './betting';
import { parseHand } from './cards';
import { cpuDecide, cpuKeep } from './cpu';

const coins = (you: number, cpu: number) => ({ you, cpu });

describe('賭けのルール', () => {
  it('1回目の賭けの親は、必ずベットする（チェックできない）', () => {
    const st = createBettingRound(1, 'you');
    const o = optionsFor(st, coins(4900, 4900));
    expect(o).toMatchObject({ toCall: 0, mustBet: true, opening: true });
    expect(isAllowed({ type: 'check' }, o)).toBe(false);
    expect(isAllowed({ type: 'bet', amount: 100 }, o)).toBe(true);
  });

  it('2回目の賭けの親は、チェックもできる', () => {
    const o = optionsFor(createBettingRound(2, 'cpu'), coins(4900, 4900));
    expect(o).toMatchObject({ mustBet: false, opening: true });
    expect(isAllowed({ type: 'check' }, o)).toBe(true);
  });

  it('賭け金は最低100、最高は「自分のコイン − コール額」と「相手のコイン」の小さいほう', () => {
    const st = createBettingRound(1, 'you');
    apply(st, { type: 'bet', amount: 300 }, coins(4900, 1200));
    // CPU の番：コール 300、上乗せは min(1200 − 300, 4900 − 300)
    const o = optionsFor(st, coins(4600, 1200));
    expect(o.toCall).toBe(300);
    expect(o.maxRaise).toBe(900);
    expect(isAllowed({ type: 'raise', amount: 99 }, o)).toBe(false);
    expect(isAllowed({ type: 'raise', amount: 900 }, o)).toBe(true);
    expect(isAllowed({ type: 'raise', amount: 901 }, o)).toBe(false);
  });

  it('レイズは1回の賭けで2回まで', () => {
    const st = createBettingRound(1, 'you');
    let c = coins(4900, 4900);
    const pay = (seat: 'you' | 'cpu', amount: number) => {
      c = { ...c, [seat]: c[seat] - amount };
    };
    pay('you', apply(st, { type: 'bet', amount: 100 }, c).paid);
    pay('cpu', apply(st, { type: 'raise', amount: 100 }, c).paid);
    pay('you', apply(st, { type: 'raise', amount: 100 }, c).paid);
    const o = optionsFor(st, c);
    expect(o.canRaise).toBe(false);
    expect(() => apply(st, { type: 'raise', amount: 100 }, c)).toThrow();
  });

  it('両者が行動して額がそろったら終わり。降りたらそこで終わり', () => {
    const st = createBettingRound(2, 'cpu');
    expect(apply(st, { type: 'check' }, coins(4800, 4800)).done).toBe(false);
    expect(apply(st, { type: 'check' }, coins(4800, 4800)).done).toBe(true);

    const st2 = createBettingRound(1, 'cpu');
    apply(st2, { type: 'bet', amount: 200 }, coins(4900, 4900));
    expect(apply(st2, { type: 'fold' }, coins(4900, 4700))).toEqual({ paid: 0, folded: 'you', done: true });
  });
});

describe('CPU', () => {
  it('ストレート以上は交換しない。ペアは残す', () => {
    expect(cpuKeep(parseHand('8c 9d Ts Jh Qs'))).toEqual([0, 1, 2, 3, 4]);
    expect(cpuKeep(parseHand('Ts Th Ad 7c 4h')).sort()).toEqual([0, 1]);
  });

  it('ジョーカーは必ず残す', () => {
    expect(cpuKeep(parseHand('2s 7h 9d 4c JK'))).toContain(4);
  });

  it('ルールで許された行動だけを選ぶ（いろいろな手札・状況で）', () => {
    const hands = ['As Jd 8c 5h 3s', 'Ts Th Ad 7c 4h', '5s 5h 5d Kc 2s', '9s 9h 9d 9c JK'].map(parseHand);
    let seed = 1;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (const hand of hands) {
      for (const round of [1, 2] as const) {
        for (let i = 0; i < 50; i++) {
          const st = createBettingRound(round, 'cpu');
          const c = coins(1000 + Math.floor(random() * 8000), 1000 + Math.floor(random() * 8000));
          if (random() < 0.5) {
            st.actor = 'you';
            const amt = 100 * (1 + Math.floor(random() * 5));
            c.you -= apply(st, { type: 'bet', amount: amt }, c).paid;
          }
          const o = optionsFor(st, c);
          expect(isAllowed(cpuDecide(o, hand, round, c.cpu, 200, random), o)).toBe(true);
        }
      }
    }
  });
});
