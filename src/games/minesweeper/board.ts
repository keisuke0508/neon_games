import type { Level } from './rules';

/**
 * マインスイーパの盤面のルール（描画に依存しない）。
 * マスは左上から右へ、行ごとに 0, 1, 2 … と番号を振る。
 */

export type Cell = {
  mine: boolean;
  open: boolean;
  flag: boolean;
  /** 周りの爆弾の数 */
  n: number;
};

export type Board = {
  cols: number;
  rows: number;
  mines: number;
  cells: Cell[];
  /** 爆弾を置いたか（最初の1マスを掘るときに置く） */
  placed: boolean;
};

export function createBoard(level: Pick<Level, 'cols' | 'rows' | 'mines'>): Board {
  return {
    cols: level.cols,
    rows: level.rows,
    mines: level.mines,
    cells: Array.from({ length: level.cols * level.rows }, () => ({ mine: false, open: false, flag: false, n: 0 })),
    placed: false,
  };
}

/** 周り8マスの番号 */
export function neighbors(board: Pick<Board, 'cols' | 'rows'>, i: number): number[] {
  const { cols, rows } = board;
  const x = i % cols;
  const y = Math.floor(i / cols);
  const out: number[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < cols && ny < rows) out.push(ny * cols + nx);
    }
  }
  return out;
}

/**
 * 爆弾を置く。最初に選んだマスとその周り8マスには置かない（§5、§7-2）。
 * 盤面が小さくて置ききれない場合は、選んだマスだけを避ける。
 */
export function placeMines(board: Board, safe: number, random: () => number = Math.random): Board {
  const around = new Set([safe, ...neighbors(board, safe)]);
  const candidates = board.cells.length - around.size >= board.mines ? around : new Set([safe]);
  const pool = board.cells.map((_, i) => i).filter((i) => !candidates.has(i));
  const cells = board.cells.map((c) => ({ ...c, mine: false }));
  for (let k = 0; k < board.mines; k++) {
    const j = k + Math.floor(random() * (pool.length - k));
    [pool[k], pool[j]] = [pool[j], pool[k]];
    cells[pool[k]].mine = true;
  }
  cells.forEach((c, i) => {
    c.n = neighbors(board, i).filter((j) => cells[j].mine).length;
  });
  return { ...board, cells, placed: true };
}

export type Opened = {
  index: number;
  /** 掘り始めたマスからの距離（何手先か）。開く演出の遅れに使う */
  distance: number;
};

/**
 * 掘る。0 のマスは周りへ連鎖して開く。旗のマスは掘らない。
 * @returns 新しい盤面と、開いたマス（近い順）、掘ってしまった爆弾（なければ null）
 */
export function dig(board: Board, starts: readonly number[]): { board: Board; opened: Opened[]; boom: number | null } {
  const cells = board.cells.map((c) => ({ ...c }));
  const opened: Opened[] = [];
  const seen = new Set<number>();
  let queue: Opened[] = [];
  for (const i of starts) {
    if (!cells[i].open && !cells[i].flag && !seen.has(i)) {
      seen.add(i);
      queue.push({ index: i, distance: 0 });
    }
  }
  while (queue.length) {
    const next: Opened[] = [];
    for (const item of queue) {
      opened.push(item);
      const c = cells[item.index];
      c.open = true;
      if (!c.mine && c.n === 0) {
        for (const j of neighbors(board, item.index)) {
          if (!seen.has(j) && !cells[j].open && !cells[j].flag) {
            seen.add(j);
            next.push({ index: j, distance: item.distance + 1 });
          }
        }
      }
    }
    queue = next;
  }
  const boom = opened.find((o) => cells[o.index].mine);
  return { board: { ...board, cells }, opened, boom: boom ? boom.index : null };
}

export function setFlag(board: Board, i: number, flag: boolean): Board {
  if (board.cells[i].open) return board;
  const cells = board.cells.map((c, k) => (k === i ? { ...c, flag } : c));
  return { ...board, cells };
}

export function flagCount(board: Board): number {
  return board.cells.filter((c) => c.flag).length;
}

/** 爆弾の数の表示：「爆弾の総数 − 立てた旗の数」（マイナスにもなる） */
export function minesLeft(board: Board): number {
  return board.mines - flagCount(board);
}

/**
 * 数字のマスで周りをまとめて掘れるか：
 * 周りの旗の数が数字と同じで、まだ掘っていない（旗のない）マスが周りに残っているとき
 */
export function canChord(board: Board, i: number): boolean {
  const c = board.cells[i];
  if (!c.open || c.mine || c.n === 0) return false;
  const around = neighbors(board, i);
  const flags = around.filter((j) => board.cells[j].flag).length;
  return flags === c.n && around.some((j) => !board.cells[j].open && !board.cells[j].flag);
}

/** 数字のマスで掘られる周りのマス */
export function chordTargets(board: Board, i: number): number[] {
  return neighbors(board, i).filter((j) => !board.cells[j].open && !board.cells[j].flag);
}

/** 爆弾以外のマスをすべて掘ったか */
export function isCleared(board: Board): boolean {
  return board.placed && board.cells.every((c) => c.mine || c.open);
}

/** クリアしたとき：旗を立てていない爆弾に旗を立てる */
export function flagAllMines(board: Board): Board {
  return { ...board, cells: board.cells.map((c) => (c.mine && !c.flag ? { ...c, flag: true } : c)) };
}

/** 経過秒数を「hh:mm:ss」にする（仕様書） */
export function formatHMS(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
}

/** 読み上げ用のマスの名前（例：3行5列 未開封） */
export function cellLabel(board: Board, i: number): string {
  const c = board.cells[i];
  const x = (i % board.cols) + 1;
  const y = Math.floor(i / board.cols) + 1;
  const state = c.open ? (c.mine ? '爆弾' : c.n ? `数字${c.n}` : '空き') : c.flag ? '旗' : '未開封';
  return `${y}行${x}列 ${state}`;
}
