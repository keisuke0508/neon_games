import { parseHand } from './cards';
import { compareScores, evalHand, HAND_RANK, HANDS, handName } from './hands';

const name = (codes: string) => handName(parseHand(codes));
const beats = (a: string, b: string) => compareScores(evalHand(parseHand(a)), evalHand(parseHand(b)));

describe('役の判定', () => {
  it.each([
    ['As Jd 8c 5h 3s', 'ノーペア'],
    ['Ts Th Ad 7c 4h', 'ワンペア'],
    ['Js Jh 3d 3c 9s', 'ツーペア'],
    ['5s 5h 5d Kc 2s', 'スリーカード'],
    ['8c 9d Ts Jh Qs', 'ストレート'],
    ['As 2d 3c 4h 5s', 'ストレート'],
    ['2d 6d 9d Jd Kd', 'フラッシュ'],
    ['Qs Qh Qd 4c 4s', 'フルハウス'],
    ['7s 7h 7d 7c Ks', 'フォーカード'],
    ['5h 6h 7h 8h 9h', 'ストレートフラッシュ'],
    ['Ts Js Qs Ks As', 'ロイヤルストレートフラッシュ'],
    ['Ks As 2s 3s 4s', 'フラッシュ'], // K-A-2 のようには一周しない
  ])('%s は %s', (codes, expected) => {
    expect(name(codes)).toBe(expected);
  });

  it('役の見本は、それぞれの役になる', () => {
    HANDS.forEach((h) => expect(name(h.example)).toBe(h.name));
  });
});

describe('ジョーカー', () => {
  it.each([
    ['9s 9h 9d 9c JK', 'ファイブカード'],
    ['9s 9h 9d JK JK', 'ファイブカード'],
    ['Ts Js Qs Ks JK', 'ロイヤルストレートフラッシュ'],
    ['5h 6h 8h 9h JK', 'ストレートフラッシュ'],
    ['7s 7h 7d Kc JK', 'フォーカード'],
    ['Qs Qh 4d 4c JK', 'フルハウス'],
    ['2d 6d 9d Jd JK', 'フラッシュ'],
    ['8c 9d Jh Qs JK', 'ストレート'],
    ['5s 5h Kd 9c JK', 'スリーカード'],
    ['As Jd 8c 5h JK', 'ワンペア'],
    ['2s 7h 9d Kc JK', 'ワンペア'],
  ])('%s は %s（一番強くなるように使う）', (codes, expected) => {
    expect(name(codes)).toBe(expected);
  });

  it('ジョーカー2枚でも判定できる', () => {
    expect(evalHand(parseHand('2s 7h 9d JK JK'))[0]).toBe(HAND_RANK.threeOfAKind);
  });
});

describe('強さの比べ方', () => {
  it('役の順位で比べる', () => {
    expect(beats('Js Jh 3d 3c 9s', 'Ts Th Ad 7c 4h')).toBeGreaterThan(0);
  });

  it('同じ役なら、役を作っている数字、次に残りのカードで比べる', () => {
    expect(beats('Ks Kh 2d 3c 4s', 'Qs Qh Ad Kc Js')).toBeGreaterThan(0);
    expect(beats('Ks Kh Ad 3c 4s', 'Kd Kc Qd 3h 4h')).toBeGreaterThan(0);
  });

  it('A-2-3-4-5 は一番弱いストレート', () => {
    expect(beats('As 2d 3c 4h 5s', '2s 3d 4c 5h 6s')).toBeLessThan(0);
  });

  it('マークに強弱はなく、完全に同じなら引き分け', () => {
    expect(beats('As Jd 8c 5h 3s', 'Ah Jc 8d 5s 3h')).toBe(0);
  });
});
