'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameFrame } from '@/components/GameFrame';
import { ResultModal } from '@/components/ResultModal';
import { DIFFICULTY, FX, MAX_DT, VIEW } from './constants';
import { drawScene } from './draw';
import { createState, dangerOf, jump, metersOf, prepareLevel, release, step, type GameState } from './engine';
import { CANVAS_TEXT, mochiyPopOne, zenMaruGothic } from './fonts';
import styles from './KozoRun.module.scss';

/** start: スタート画面（背景はデモ） / play: プレイ中 / caught: つかまった直後 / over: ResultModal 表示中 */
export type Phase = 'start' | 'play' | 'caught' | 'over';

const INTERACTIVE = 'button, a, input, textarea, select, [contenteditable="true"]';

const shareTextOf = (score: number) => `小僧ランで母ちゃんから${score}m逃げた！ #小僧ラン #NEON_GAMES`;

/** 小僧ラン 〜迫り来る母ちゃんの恐怖〜（GameFrame の children として描画する） */
export default function KozoRun() {
  const { isPaused } = useGameFrame();
  const [phase, setPhase] = useState<Phase>('start');
  const [score, setScore] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const meterRef = useRef<HTMLSpanElement>(null);
  const stateRef = useRef<GameState>(createState(true));
  const phaseRef = useRef<Phase>('start');
  const pausedRef = useRef(isPaused);
  const resultTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownMeter = useRef(-1);
  const shownDanger = useRef('');

  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);

  const changePhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  // 距離表示：数字が変わったときだけ DOM を更新し、桁数とカンマ数を CSS に渡して枠の幅を固定する
  const setMeter = useCallback((m: number) => {
    const el = meterRef.current;
    if (!el || m === shownMeter.current) return;
    shownMeter.current = m;
    const text = m.toLocaleString();
    const digits = String(m).length;
    el.textContent = text;
    el.style.setProperty('--digits', String(digits));
    el.style.setProperty('--commas', String(text.length - digits));
  }, []);

  const setDanger = useCallback((danger: number) => {
    const value = Math.max(0, Math.min(1, danger)).toFixed(2);
    if (value === shownDanger.current) return;
    shownDanger.current = value;
    rootRef.current?.style.setProperty('--danger', value);
  }, []);

  const start = useCallback(() => {
    if (resultTimer.current) clearTimeout(resultTimer.current);
    stateRef.current = createState(false);
    setMeter(0);
    changePhase('play');
    rootRef.current?.focus({ preventScroll: true });
  }, [changePhase, setMeter]);

  const onCaught = useCallback(() => {
    setScore(metersOf(stateRef.current));
    changePhase('caught');
    resultTimer.current = setTimeout(() => changePhase('over'), FX.resultDelayMs);
  }, [changePhase]);

  // ゲームループ
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const fontFamily = mochiyPopOne.style.fontFamily;
    let raf = 0;
    let last = 0;
    let stopped = false;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = VIEW.width * dpr;
      canvas.height = VIEW.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const frame = (now: number) => {
      const ph = phaseRef.current;
      const s = stateRef.current;
      if ((ph === 'start' || ph === 'play') && !pausedRef.current) {
        const dt = last ? Math.min(MAX_DT, (now - last) / (1000 / 60)) : 1;
        last = now;
        const caught = step(s, dt);
        if (ph === 'play') setMeter(metersOf(s));
        if (caught) onCaught();
      } else {
        // 一時停止から戻ったときに、経過時間の補正で一気に進まないようにする
        last = 0;
      }
      drawScene(ctx, s, { caught: s.caught, fontFamily });
      setDanger(dangerOf(s));
      raf = requestAnimationFrame(frame);
    };

    // タブが隠れたら一時停止扱い（復帰時に dt を引き継がない）
    const onVisibility = () => {
      last = 0;
    };

    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);

    // canvas に描く文字のフォントを読み込んでから描画を始める
    const fonts = document.fonts;
    const ready = fonts ? fonts.load(`22px ${fontFamily}`, CANVAS_TEXT).then(() => fonts.ready) : Promise.resolve();
    ready
      .catch(() => undefined)
      .then(() => {
        if (!stopped) raf = requestAnimationFrame(frame);
      });

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [onCaught, setDanger, setMeter]);

  // 障害物が越えられるかの検証を、空き時間に全レベルぶん済ませておく
  useEffect(() => {
    let level = 0;
    let handle: number | null = null;
    const idle =
      window.requestIdleCallback?.bind(window) ?? ((cb: () => void) => window.setTimeout(cb, 50) as unknown as number);
    const cancel = window.cancelIdleCallback?.bind(window) ?? window.clearTimeout.bind(window);
    const next = () => {
      prepareLevel(level);
      level++;
      handle = level <= DIFFICULTY.maxLevel ? idle(next) : null;
    };
    handle = idle(next);
    return () => {
      if (handle !== null) cancel(handle);
    };
  }, []);

  // キー入力：プレイ中は Space でジャンプ（押している長さで高さが変わる）、スタート画面では Space で開始
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || pausedRef.current) return;
      const ph = phaseRef.current;
      if (ph === 'play') {
        e.preventDefault();
        if (!e.repeat) jump(stateRef.current);
      } else if (ph === 'start') {
        const target = e.target as Element | null;
        if (target?.closest?.(INTERACTIVE)) return;
        e.preventDefault();
        start();
      }
    };
    // 離すのは、一時停止中や画面外でも必ず受け付ける
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') release(stateRef.current);
    };
    const onPointerUp = () => release(stateRef.current);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('blur', onPointerUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('blur', onPointerUp);
    };
  }, [start]);

  useEffect(
    () => () => {
      if (resultTimer.current) clearTimeout(resultTimer.current);
    },
    [],
  );

  // タップ（押した瞬間）でジャンプ。指を離すまで高く跳ぶ。ボタンやリンクの上では反応しない
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pausedRef.current || phaseRef.current !== 'play') return;
    if ((e.target as Element).closest(INTERACTIVE)) return;
    jump(stateRef.current);
  };

  return (
    <div
      ref={rootRef}
      className={`${styles.root} ${mochiyPopOne.variable} ${zenMaruGothic.variable}`}
      data-phase={phase}
      tabIndex={-1}
      role="region"
      aria-label="小僧ラン"
      onPointerDown={onPointerDown}
    >
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      <div className={styles.danger} aria-hidden="true" />

      <div className={styles.hud}>
        <span className={styles.hudLabel}>逃げた距離</span>
        <span className={styles.hudValue}>
          <span ref={meterRef} className={styles.meter} data-testid="kozo-meter" />
          <small className={styles.hudUnit}>m</small>
        </span>
      </div>

      {phase === 'start' && (
        <div className={`${styles.layer} ${styles.start}`}>
          <div className={styles.startInner}>
            <p className={styles.badge}>母ちゃんから にげきれ！</p>
            <h2 className={styles.title}>小僧ラン</h2>
            <p className={styles.subtitle}>〜迫り来る母ちゃんの恐怖〜</p>
            <button type="button" className={styles.startButton} onClick={start}>
              にげる！
            </button>
            <p className={styles.hint}>スペースキー ／ 画面タップでジャンプ</p>
          </div>
        </div>
      )}

      <ResultModal
        isOpen={phase === 'over'}
        scoreLabel="逃げた距離"
        score={score}
        unit="m"
        shareText={shareTextOf(score)}
        onRetry={start}
      />
    </div>
  );
}
