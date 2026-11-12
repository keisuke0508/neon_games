import { neighbors } from './board';

/**
 * スタート画面の背景：マインスイーパらしい盤面の模様（design/games/マインスイーパ.md §3-2）。
 * サーバーとブラウザで同じ模様になるよう、決まった乱数で作る。
 */
export const BG_COLS = 22;
export const BG_ROWS = 12;

export type BgCell = { open: boolean; n: number; flag: boolean };

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

export function backgroundPattern(seed = 20261110): BgCell[] {
  const random = seeded(seed);
  const size = BG_COLS * BG_ROWS;
  const mines = new Set<number>();
  while (mines.size < 30) mines.add(Math.floor(random() * size));
  const dims = { cols: BG_COLS, rows: BG_ROWS };
  const cx = BG_COLS / 2;
  const cy = BG_ROWS / 2;
  return Array.from({ length: size }, (_, i) => {
    const x = i % BG_COLS;
    const y = Math.floor(i / BG_COLS);
    const dist = Math.hypot((x - cx) / 1.6, y - cy);
    // 中央が開いていて、数字と旗が見える模様
    const open = dist < 4.2 + Math.sin(x * 1.3 + y) * 1.2 && !mines.has(i);
    const n = neighbors(dims, i).filter((j) => mines.has(j)).length;
    return { open, n, flag: !open && mines.has(i) && random() < 0.5 };
  });
}
