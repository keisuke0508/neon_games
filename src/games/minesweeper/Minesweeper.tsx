'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import { useGameFrame } from '@/components/GameFrame';
import { ResultModal } from '@/components/ResultModal';
import { trapFocus } from '@/lib/focusTrap';
import { backgroundPattern, BG_COLS } from './background';
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
  placeMines,
  setFlag,
  type Board,
} from './board';
import { delaGothicOne, zenMaruGothic } from './fonts';
import { ClockIcon, FlagIcon, HomeIcon, MineIcon } from './icons';
import { LEVEL_ORDER, LEVELS, TIMING, type Level, type LevelKey } from './rules';
import styles from './Minesweeper.module.scss';

/** title: スタート画面 / levels: 難易度選択 / ready: 最初の1マス待ち / play / over: 終了の演出〜ResultModal */
type Screen = 'title' | 'levels' | 'ready' | 'play' | 'over';
type MenuKind = 'cell' | 'flag' | 'chord';
type Menu = { index: number; kind: MenuKind };
type Result = { cleared: boolean; seconds: number };

const BACKGROUND = backgroundPattern();

/** 経過時間：開始時刻からの差で数える（非表示のタブでも実時間で進む）。一時停止の分は差し引く */
class Stopwatch {
  private startAt: number | null = null;
  private pausedSince: number | null = null;
  private stoppedAt: number | null = null;

  start(now: number) {
    this.startAt = now;
    this.pausedSince = null;
    this.stoppedAt = null;
  }

  reset() {
    this.startAt = null;
    this.pausedSince = null;
    this.stoppedAt = null;
  }

  pause(now: number) {
    if (this.startAt !== null && this.pausedSince === null && this.stoppedAt === null) this.pausedSince = now;
  }

  resume(now: number) {
    if (this.startAt !== null && this.pausedSince !== null) {
      this.startAt += now - this.pausedSince;
      this.pausedSince = null;
    }
  }

  stop(now: number) {
    if (this.startAt !== null && this.stoppedAt === null) this.stoppedAt = this.pausedSince ?? now;
  }

  seconds(now: number): number {
    if (this.startAt === null) return 0;
    const end = this.stoppedAt ?? this.pausedSince ?? now;
    return Math.floor((end - this.startAt) / 1000);
  }
}

const now = () => performance.now();

/** マインスイーパ（GameFrame の children として描画する） */
export default function Minesweeper() {
  const { isPaused } = useGameFrame();
  const [screen, setScreen] = useState<Screen>('title');
  const [level, setLevel] = useState<Level>(LEVELS.easy);
  const [board, setBoard] = useState<Board>(() => createBoard(LEVELS.easy));
  /** 今開いているマスの、開く演出の遅れ(ms) */
  const [popping, setPopping] = useState<Map<number, number>>(new Map());
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [nope, setNope] = useState<{ index: number; key: number } | null>(null);
  const [flagging, setFlagging] = useState<number | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // 終了の演出
  const [boomAt, setBoomAt] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [showWrong, setShowWrong] = useState(false);
  const [shake, setShake] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [banner, setBanner] = useState<'clear' | 'boom' | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const startButtonRef = useRef<HTMLButtonElement>(null);
  const firstLevelRef = useRef<HTMLButtonElement>(null);
  const homeRef = useRef<HTMLButtonElement>(null);
  const confirmNoRef = useRef<HTMLButtonElement>(null);
  const confirmPanelRef = useRef<HTMLDivElement>(null);
  const stopwatch = useRef(new Stopwatch());
  /** 進行中の演出を中断するための番号（スタート画面に戻ると変わる） */
  const runRef = useRef(0);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  /** 待つ。スタート画面に戻るなどして run が変わったら false */
  const wait = useCallback((ms: number) => {
    const run = runRef.current;
    return new Promise<boolean>((resolve) => {
      const t = setTimeout(() => {
        timers.current.delete(t);
        resolve(run === runRef.current);
      }, ms);
      timers.current.add(t);
    });
  }, []);

  const cancelAll = useCallback(() => {
    runRef.current++;
    timers.current.forEach(clearTimeout);
    timers.current.clear();
  }, []);

  useEffect(() => cancelAll, [cancelAll]);

  // ---------- 経過時間 ----------

  // 確認モーダル（このゲームのもの・プラットフォームの ConfirmModal）を開いている間は止める
  const paused = confirmOpen || isPaused;
  useEffect(() => {
    if (paused) stopwatch.current.pause(now());
    else stopwatch.current.resume(now());
  }, [paused]);

  useEffect(() => {
    if (screen !== 'play') return;
    const tick = () => setElapsed(stopwatch.current.seconds(now()));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [screen]);

  // ---------- 画面の切り替え ----------

  const resetGame = useCallback(
    (next: Level) => {
      cancelAll();
      stopwatch.current.reset();
      setLevel(next);
      setBoard(createBoard(next));
      setPopping(new Map());
      setBusy(false);
      setMenu(null);
      setNope(null);
      setFocusIndex(0);
      setElapsed(0);
      setBoomAt(null);
      setRevealed(new Set());
      setShowWrong(false);
      setShake(false);
      setCleared(false);
      setBanner(null);
      setResult(null);
    },
    [cancelAll],
  );

  const showTitle = () => {
    resetGame(level);
    setConfirmOpen(false);
    setScreen('title');
  };

  const showLevels = () => {
    resetGame(level);
    setScreen('levels');
  };

  const chooseLevel = (key: LevelKey) => {
    resetGame(LEVELS[key]);
    setScreen('ready');
  };

  // 画面が変わったら、その画面の最初のボタンにフォーカス（最初の表示ではフォーカスを奪わない）
  const prevScreen = useRef<Screen>(screen);
  useEffect(() => {
    if (prevScreen.current === screen) return;
    prevScreen.current = screen;
    const focus = (el: HTMLElement | null | undefined) => el?.focus({ preventScroll: true });
    if (screen === 'title') focus(startButtonRef.current);
    if (screen === 'levels') focus(firstLevelRef.current);
    if (screen === 'ready') focus(cellRefs.current[0]);
  }, [screen]);

  // ---------- 掘る ----------

  /** 掘って、開く演出が終わるまで待つ。@returns 掘った爆弾（なければ null）。中断されたら undefined */
  const digCells = async (current: Board, starts: number[]): Promise<{ board: Board; boom: number | null } | undefined> => {
    const result = dig(current, starts);
    const delays = new Map(result.opened.map((o) => [o.index, o.distance * TIMING.openStep]));
    const maxDelay = Math.max(0, ...delays.values());
    setBoard(result.board);
    setPopping(delays);
    setBusy(true);
    const alive = await wait(maxDelay + TIMING.open);
    if (!alive) return undefined;
    setPopping(new Map());
    setBusy(false);
    return { board: result.board, boom: result.boom };
  };

  const lose = async (current: Board, at: number) => {
    stopwatch.current.stop(now());
    const seconds = stopwatch.current.seconds(now());
    setElapsed(seconds);
    setScreen('over');
    setBoomAt(at);
    setShake(true);
    if (!(await wait(TIMING.shake))) return;
    setShake(false);
    const rest = current.cells.flatMap((c, i) => (c.mine && i !== at && !c.flag ? [i] : []));
    setShowWrong(true);
    for (const i of rest) {
      setRevealed((prev) => new Set(prev).add(i));
      if (!(await wait(TIMING.revealStep))) return;
    }
    if (!(await wait(TIMING.beforeBoomBanner))) return;
    setBanner('boom');
    if (!(await wait(TIMING.banner))) return;
    setBanner(null);
    setResult({ cleared: false, seconds });
  };

  const win = async (current: Board) => {
    stopwatch.current.stop(now());
    const seconds = stopwatch.current.seconds(now());
    setElapsed(seconds);
    setScreen('over');
    setBoard(flagAllMines(current));
    setCleared(true);
    if (!(await wait(TIMING.beforeClearBanner))) return;
    setBanner('clear');
    if (!(await wait(TIMING.banner))) return;
    setBanner(null);
    setResult({ cleared: true, seconds });
  };

  const afterDig = async (done: { board: Board; boom: number | null } | undefined, focus: number) => {
    if (!done) return;
    if (done.boom !== null) return lose(done.board, done.boom);
    if (isCleared(done.board)) return win(done.board);
    cellRefs.current[focus]?.focus({ preventScroll: true });
  };

  // ---------- マスを選ぶ ----------

  const selectCell = async (i: number) => {
    if (busy || (screen !== 'ready' && screen !== 'play')) return;
    setFocusIndex(i);

    // 最初の1マス：メニューを出さずにすぐ掘る（そのマスと周りには爆弾を置かない）
    if (!board.placed) {
      const placed = placeMines(board, i);
      setScreen('play');
      const done = await digCells(placed, [i]);
      if (!done) return;
      stopwatch.current.start(now()); // 開き終わってから数え始める（仕様書）
      if (paused) stopwatch.current.pause(now());
      setElapsed(0);
      return afterDig(done, i);
    }

    // メニューを開いたまま同じマスを押したら閉じる
    if (menu?.index === i) {
      setMenu(null);
      return;
    }
    const c = board.cells[i];
    if (c.open) {
      if (!canChord(board, i)) {
        setMenu(null);
        setNope({ index: i, key: Date.now() });
        return;
      }
      setMenu({ index: i, kind: 'chord' });
      return;
    }
    setMenu({ index: i, kind: c.flag ? 'flag' : 'cell' });
  };

  const closeMenu = useCallback(
    (refocus = true) => {
      setMenu((m) => {
        if (m && refocus) requestAnimationFrame(() => cellRefs.current[m.index]?.focus({ preventScroll: true }));
        return null;
      });
    },
    [],
  );

  const onMenuAction = async (action: 'dig' | 'flag' | 'unflag' | 'chord' | 'cancel') => {
    const m = menu;
    if (!m) return;
    setMenu(null);
    const i = m.index;
    if (action === 'cancel') {
      cellRefs.current[i]?.focus({ preventScroll: true });
      return;
    }
    if (action === 'flag' || action === 'unflag') {
      setBoard(setFlag(board, i, action === 'flag'));
      if (action === 'flag') {
        setFlagging(i);
        void wait(TIMING.flag).then((alive) => alive && setFlagging(null));
      }
      cellRefs.current[i]?.focus({ preventScroll: true });
      return;
    }
    const done = await digCells(board, action === 'chord' ? chordTargets(board, i) : [i]);
    return afterDig(done, i);
  };

  // ---------- 選択メニューの位置 ----------

  useLayoutEffect(() => {
    const el = menuRef.current;
    const root = rootRef.current;
    const stage = stageRef.current;
    const cell = menu ? cellRefs.current[menu.index] : null;
    if (!menu || !el || !root || !stage || !cell) return;
    const rr = root.getBoundingClientRect();
    const mr = el.getBoundingClientRect();
    const cr = cell.getBoundingClientRect();
    // 数字のマスのときは、掘られる周りの3×3を隠さないよう、その範囲の外に出す
    const around = menu.kind === 'chord' ? chordTargets(board, menu.index) : [];
    const rects = [cr, ...around.map((j) => cellRefs.current[j]?.getBoundingClientRect()).filter(Boolean)] as DOMRect[];
    const top = Math.min(...rects.map((r) => r.top));
    const bottom = Math.max(...rects.map((r) => r.bottom));
    let left = cr.left - rr.left + cr.width / 2 - mr.width / 2;
    left = Math.max(8, Math.min(rr.width - mr.width - 8, left));
    // 上に出すと上部（爆弾の数・時間）に重なる場合は、下に出す
    let y = top - rr.top - mr.height - 8;
    const below = y < stage.getBoundingClientRect().top - rr.top;
    if (below) y = bottom - rr.top + 8;
    el.style.left = `${left}px`;
    el.style.top = `${y}px`;
    el.style.setProperty('--arrow', `${cr.left - rr.left + cr.width / 2 - left}px`);
    el.dataset.below = below ? 'true' : 'false';
    el.querySelector('button')?.focus({ preventScroll: true });
  }, [menu, board]);

  // ---------- スタート画面に戻る（確認モーダル） ----------

  const openConfirm = () => {
    setMenu(null);
    setConfirmOpen(true);
  };

  const closeConfirm = () => {
    setConfirmOpen(false);
    requestAnimationFrame(() => homeRef.current?.focus({ preventScroll: true }));
  };

  useEffect(() => {
    if (confirmOpen) confirmNoRef.current?.focus({ preventScroll: true });
  }, [confirmOpen]);

  // ---------- キーボード ----------

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      if (confirmOpen) {
        e.preventDefault();
        closeConfirm();
      } else if (menu) {
        e.preventDefault();
        closeMenu();
      }
      return;
    }
    // 盤面の中を矢印キーで移動
    const target = e.target as HTMLElement;
    const index = target.dataset.index;
    if (index === undefined || menu || !/^Arrow/.test(e.key)) return;
    const i = Number(index);
    const { cols } = board;
    const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols }[e.key] ?? 0;
    const j = i + delta;
    const wraps = (delta === 1 && j % cols === 0) || (delta === -1 && i % cols === 0);
    if (j < 0 || j >= board.cells.length || wraps) return;
    e.preventDefault();
    setFocusIndex(j);
    cellRefs.current[j]?.focus({ preventScroll: true });
  };

  // 盤面の外を押したらメニューを閉じる
  const onRootClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (menu && !(e.target as Element).closest('button')) closeMenu(false);
  };

  // ---------- 表示 ----------

  const left = minesLeft(board);
  const aroundTargets = useMemo(
    () => new Set(menu?.kind === 'chord' ? chordTargets(board, menu.index) : []),
    [menu, board],
  );
  const inGame = screen === 'ready' || screen === 'play' || screen === 'over';
  const rootStyle = { '--cols': level.cols, '--rows': level.rows } as CSSProperties;

  const cellClass = (i: number) => {
    const c = board.cells[i];
    return [
      styles.cell,
      c.open && styles.open,
      popping.has(i) && styles.popping,
      menu?.index === i && styles.target,
      aroundTargets.has(i) && styles.around,
      boomAt === i && styles.boom,
      revealed.has(i) && styles.reveal,
      showWrong && c.flag && !c.mine && styles.wrong,
      flagging === i && styles.flagging,
      nope?.index === i && styles.nope,
    ]
      .filter(Boolean)
      .join(' ');
  };

  const cellContent = (i: number) => {
    const c = board.cells[i];
    const showMine = (c.open && c.mine) || revealed.has(i);
    if (showMine) return <MineIcon />;
    if (c.open) return c.n ? <span>{c.n}</span> : null;
    if (c.flag) return <FlagIcon />;
    return null;
  };

  const rows = Array.from({ length: board.rows }, (_, y) => y);

  return (
    <div
      ref={rootRef}
      className={[
        styles.root,
        delaGothicOne.variable,
        zenMaruGothic.variable,
        shake && styles.shake,
        cleared && styles.cleared,
      ]
        .filter(Boolean)
        .join(' ')}
      style={rootStyle}
      data-screen={screen}
      role="region"
      aria-label="マインスイーパ"
      onKeyDown={onKeyDown}
      onClick={onRootClick}
    >
      {/* ---------- スタート画面・難易度選択 ---------- */}
      {!inGame && (
        <>
          <div className={styles.bg} aria-hidden="true">
            <div className={styles.bgBoard} style={{ '--bgcols': BG_COLS } as CSSProperties}>
              {BACKGROUND.map((c, i) => (
                <span key={i} className={`${styles.cell} ${c.open ? styles.open : ''}`} data-n={c.open ? c.n : undefined}>
                  {c.open && c.n ? <span>{c.n}</span> : null}
                  {c.flag ? <FlagIcon /> : null}
                </span>
              ))}
            </div>
          </div>
          <div className={`${styles.layer} ${styles.start}`}>
            {screen === 'title' ? (
              <div className={styles.startInner}>
                <p className={styles.badge}>工事中・爆弾に注意</p>
                <h2 className={styles.title}>マインスイーパ</h2>
                <p className={styles.subtitle}>爆弾を避けて、ぜんぶ掘りあてろ！</p>
                <button ref={startButtonRef} type="button" className={styles.startButton} onClick={() => setScreen('levels')}>
                  掘りはじめる
                </button>
              </div>
            ) : (
              <div className={`${styles.startInner} ${styles.levels}`}>
                <h2 className={styles.levelsTitle}>難易度をえらんでください</h2>
                {LEVEL_ORDER.map((key, k) => {
                  const lv = LEVELS[key];
                  return (
                    <button
                      key={key}
                      ref={k === 0 ? firstLevelRef : undefined}
                      type="button"
                      className={styles.levelButton}
                      data-level={key}
                      onClick={() => chooseLevel(key)}
                    >
                      <span className={styles.levelName}>{lv.name}</span>
                      <span className={styles.levelInfo}>
                        {lv.cols}×{lv.rows}・爆弾 {lv.mines}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ---------- プレイ画面 ---------- */}
      {inGame && (
        <>
          <div className={styles.top}>
            <p className={styles.levelLabel}>{level.name}</p>
            <p className={styles.hint}>{screen === 'ready' ? '最初に掘るマスを選んでください' : ''}</p>
            <div className={styles.hud}>
              <p className={`${styles.hudItem} ${styles.hudMines} ${left < 0 ? styles.minus : ''}`}>
                <MineIcon className={styles.hudIcon} />
                <span className={styles.srOnly}>残りの爆弾</span>
                <b>
                  {left} / {board.mines}
                </b>
              </p>
              <p className={styles.hudItem}>
                <ClockIcon className={styles.hudIcon} />
                <span className={styles.srOnly}>経過時間</span>
                <b>{formatHMS(elapsed)}</b>
              </p>
              <button
                ref={homeRef}
                type="button"
                className={styles.homeButton}
                aria-label="スタート画面に戻る"
                title="スタート画面に戻る"
                onClick={openConfirm}
              >
                <HomeIcon />
              </button>
            </div>
          </div>

          <div ref={stageRef} className={styles.stage}>
            <div className={styles.board} role="grid" aria-label="盤面">
              {rows.map((y) => (
                <div key={y} role="row" className={styles.row}>
                  {Array.from({ length: board.cols }, (_, x) => {
                    const i = y * board.cols + x;
                    return (
                      <div key={i} role="gridcell" className={styles.gridcell}>
                        <button
                          ref={(el) => {
                            cellRefs.current[i] = el;
                          }}
                          type="button"
                          className={cellClass(i)}
                          data-index={i}
                          data-n={board.cells[i].open && !board.cells[i].mine ? board.cells[i].n : undefined}
                          style={popping.has(i) ? ({ '--pop-delay': `${popping.get(i)}ms` } as CSSProperties) : undefined}
                          tabIndex={i === focusIndex ? 0 : -1}
                          aria-label={cellLabel(board, i)}
                          onClick={() => selectCell(i)}
                          onAnimationEnd={() => nope?.index === i && setNope(null)}
                        >
                          {cellContent(i)}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {menu && (
            <div ref={menuRef} className={styles.menu} role="group" aria-label="マスの操作">
              {menu.kind === 'cell' && (
                <>
                  <button type="button" className={`${styles.menuButton} ${styles.menuDig}`} onClick={() => onMenuAction('dig')}>
                    掘る
                  </button>
                  <button type="button" className={`${styles.menuButton} ${styles.menuFlag}`} onClick={() => onMenuAction('flag')}>
                    旗を置く
                  </button>
                </>
              )}
              {menu.kind === 'flag' && (
                <button type="button" className={`${styles.menuButton} ${styles.menuFlag}`} onClick={() => onMenuAction('unflag')}>
                  旗を外す
                </button>
              )}
              {menu.kind === 'chord' && (
                <button type="button" className={`${styles.menuButton} ${styles.menuDig}`} onClick={() => onMenuAction('chord')}>
                  掘る
                </button>
              )}
              <button type="button" className={styles.menuButton} onClick={() => onMenuAction('cancel')}>
                キャンセル
              </button>
            </div>
          )}

          {banner && (
            <div className={styles.banner} data-tone={banner}>
              <p>{banner === 'clear' ? 'CLEAR!' : 'BOOM!'}</p>
            </div>
          )}

          {confirmOpen && (
            <div
              className={`${styles.layer} ${styles.confirm}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="ms-confirm-title"
              onKeyDown={(e) => trapFocus(e, confirmPanelRef.current)}
            >
              <div ref={confirmPanelRef} className={styles.confirmPanel}>
                <p id="ms-confirm-title" className={styles.confirmTitle}>
                  スタート画面に戻りますか？
                </p>
                <p className={styles.confirmText}>このゲームの盤面と時間は消えます。</p>
                <div className={styles.confirmActions}>
                  <button ref={confirmNoRef} type="button" className={`${styles.confirmButton} ${styles.no}`} onClick={closeConfirm}>
                    いいえ
                  </button>
                  <button type="button" className={`${styles.confirmButton} ${styles.yes}`} onClick={showTitle}>
                    はい
                  </button>
                </div>
              </div>
            </div>
          )}

          <ResultModal
            isOpen={result !== null}
            scoreLabel={result ? `${result.cleared ? 'クリアタイム' : 'ゲームオーバー'}（${level.name}）` : ''}
            score={result?.seconds ?? 0}
            displayScore={formatHMS(result?.seconds ?? 0)}
            shareText={
              result?.cleared
                ? `マインスイーパ（${level.name}）を ${formatHMS(result.seconds)} でクリア！ #NEON_GAMES`
                : `マインスイーパ（${level.name}）で ${formatHMS(result?.seconds ?? 0)} 粘ったけど爆発…！ #NEON_GAMES`
            }
            onRetry={showLevels}
          />
        </>
      )}
    </div>
  );
}
