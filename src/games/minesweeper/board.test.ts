import {
  canChord,
  cellLabel,
  chordTargets,
  createBoard,
  dig,
  flagAllMines,
  formatHMS,
  isCleared,
  minesLeft,
  neighbors,
  placeMines,
  setFlag,
  type Board,
} from './board';
import { LEVELS } from './rules';

/** 文字列で盤面を作る（* が爆弾） */
function fromMap(map: string[], placed = true): Board {
  const rows = map.length;
  const cols = map[0].length;
  const b = createBoard({ cols, rows, mines: map.join('').split('*').length - 1 });
  const cells = b.cells.map((c, i) => ({ ...c, mine: map[Math.floor(i / cols)][i % cols] === '*' }));
  cells.forEach((c, i) => {
    c.n = neighbors(b, i).filter((j) => cells[j].mine).length;
  });
  return { ...b, cells, placed };
}

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

describe('爆弾を置く', () => {
  it.each(Object.values(LEVELS))('$name：爆弾の数どおりに置き、最初のマスと周り8マスには置かない', (level) => {
    for (let seed = 1; seed <= 30; seed++) {
      const board = createBoard(level);
      const safe = Math.floor(seeded(seed)() * board.cells.length);
      const placed = placeMines(board, safe, seeded(seed + 1));
      expect(placed.cells.filter((c) => c.mine)).toHaveLength(level.mines);
      for (const i of [safe, ...neighbors(board, safe)]) expect(placed.cells[i].mine).toBe(false);
      expect(placed.cells[safe].n).toBe(0);
    }
  });

  it('角のマスでも周りを避ける', () => {
    const placed = placeMines(createBoard(LEVELS.easy), 0, seeded(3));
    expect([0, 1, 10, 11].some((i) => placed.cells[i].mine)).toBe(false);
  });
});

describe('掘る', () => {
  const map = ['*....', '.....', '...*.', '.....'];

  it('0 のマスは周りへ連鎖して開き、近い順に距離が付く', () => {
    const { board, opened, boom } = dig(fromMap(map), [4]);
    expect(boom).toBeNull();
    expect(opened[0]).toEqual({ index: 4, distance: 0 });
    expect(opened.every((o, k) => k === 0 || o.distance >= opened[k - 1].distance)).toBe(true);
    expect(board.cells[4].open).toBe(true);
    expect(board.cells[0].open).toBe(false);
    expect(board.cells[13].open).toBe(false);
  });

  it('旗のマスは掘らない', () => {
    const flagged = setFlag(fromMap(map), 9, true);
    const { board } = dig(flagged, [4]);
    expect(board.cells[9].open).toBe(false);
  });

  it('爆弾を掘ると boom にその番号が入る', () => {
    expect(dig(fromMap(map), [0]).boom).toBe(0);
  });

  it('爆弾以外をすべて掘るとクリア', () => {
    let b = fromMap(['*.', '..']);
    b = dig(b, [1, 2, 3]).board;
    expect(isCleared(b)).toBe(true);
    expect(minesLeft(flagAllMines(b))).toBe(0);
  });
});

describe('旗と数字のマス', () => {
  const map = ['*..', '...', '...'];

  it('爆弾の数の表示は「総数 − 旗の数」で、マイナスにもなる', () => {
    let b = fromMap(map);
    expect(minesLeft(b)).toBe(1);
    b = setFlag(setFlag(b, 0, true), 8, true);
    expect(minesLeft(b)).toBe(-1);
  });

  it('数字と同じ数の旗が周りにあり、未開封のマスが残っているときだけ周りを掘れる', () => {
    let b = dig(fromMap(map), [4]).board; // 中央の 1
    expect(b.cells[4].n).toBe(1);
    expect(canChord(b, 4)).toBe(false);
    b = setFlag(b, 0, true);
    expect(canChord(b, 4)).toBe(true);
    expect(chordTargets(b, 4).sort()).toEqual([1, 2, 3, 5, 6, 7, 8]);
    b = dig(b, chordTargets(b, 4)).board;
    expect(canChord(b, 4)).toBe(false); // もう掘るマスがない
  });

  it('間違えた旗で周りを掘ると、爆弾を掘ってしまう', () => {
    let b = dig(fromMap(map), [4]).board;
    b = setFlag(b, 8, true);
    expect(dig(b, chordTargets(b, 4)).boom).toBe(0);
  });
});

describe('表示', () => {
  it.each([
    [0, '00:00:00'],
    [83, '00:01:23'],
    [3600 + 61, '01:01:01'],
  ])('%i 秒は %s', (sec, text) => {
    expect(formatHMS(sec)).toBe(text);
  });

  it('マスの読み上げ名', () => {
    let b = fromMap(['*.', '..']);
    expect(cellLabel(b, 3)).toBe('2行2列 未開封');
    b = setFlag(b, 0, true);
    expect(cellLabel(b, 0)).toBe('1行1列 旗');
    b = dig(b, [3]).board;
    expect(cellLabel(b, 3)).toBe('2行2列 数字1');
  });
});
