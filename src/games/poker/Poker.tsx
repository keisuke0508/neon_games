'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useGameFrame } from '@/components/GameFrame';
import { ResultModal } from '@/components/ResultModal';
import type { Seat } from './betting';
import { BetPanel } from './BetPanel';
import { PokerGame, type ActionButton, type PokerView } from './game';
import { PlayingCard } from './PlayingCard';
import { RulesModal } from './RulesModal';
import { ROUNDS, TIMING } from './rules';
import styles from './Poker.module.scss';

const fmt = (n: number) => n.toLocaleString();

/** 数字を、最後にゆっくりになる動き（1 − (1 − p)³）で変える */
function useTweened(value: number, ms: number): number {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const begin = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      const v = Math.round(begin + (value - begin) * (1 - (1 - p) ** 3));
      from.current = v;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return shown;
}

function SeatInfo({ seat, view }: { seat: Seat; view: PokerView }) {
  const coins = useTweened(view.coins[seat], 500);
  return (
    <div className={styles.info}>
      <p className={styles.name}>
        {seat === 'you' ? 'YOU' : 'CPU'}
        <span className={styles.dealer} aria-hidden={view.dealer !== seat}>
          親
        </span>
      </p>
      <p className={styles.coins}>
        <b>{fmt(coins)}</b>
        <small>コイン</small>
      </p>
      <p className={styles.handName}>{view.handNames[seat]}</p>
      {seat === 'cpu' && view.say && (
        <p key={view.say.id} className={styles.say}>
          {view.say.text}
        </p>
      )}
    </div>
  );
}

function ActionLabel({ action }: { action: ActionButton }) {
  switch (action.kind) {
    case 'check':
      return <>チェック</>;
    case 'bet':
      return <>ベット…</>;
    case 'fold':
      return <>フォールド</>;
    case 'call':
      return (
        <>
          コール <b>{fmt(action.amount ?? 0)}</b>
        </>
      );
    case 'raise':
      return <>レイズ…</>;
    case 'keep':
      return <>交換しない</>;
    case 'exchange':
      return action.amount ? (
        <>
          <b>{action.amount}枚</b> 交換する
        </>
      ) : (
        <>交換する</>
      );
    case 'next':
      return <>次のゲームへ ▶</>;
  }
}

const VARIANT: Record<ActionButton['kind'], string> = {
  check: styles.ghost,
  bet: styles.ghost,
  raise: styles.ghost,
  keep: styles.ghost,
  fold: styles.danger,
  call: styles.primary,
  exchange: styles.primary,
  next: styles.primary,
};

/** 1vs1 ポーカー（GameFrame の children として描画する） */
export default function Poker() {
  const [game] = useState(() => new PokerGame());
  const view = useSyncExternalStore(game.subscribe, game.getSnapshot, game.getSnapshot);
  const { isPaused } = useGameFrame();
  const [rulesOpen, setRulesOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const pot = useTweened(view.pot, 400);

  useEffect(() => () => game.dispose(), [game]);

  // ConfirmModal やルール説明を開いている間は、CPU の考え中や自動の「次のゲームへ」を止める
  useEffect(() => {
    game.setPaused(isPaused || rulesOpen);
  }, [game, isPaused, rulesOpen]);

  // キーボード：ルール説明は Esc で閉じる。賭け金パネルは数字・Backspace・Enter・Esc
  const latest = useRef({ view, isPaused, rulesOpen });
  useEffect(() => {
    latest.current = { view, isPaused, rulesOpen };
  });
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const { view: v, isPaused: paused, rulesOpen: rules } = latest.current;
      if (paused) return;
      if (rules) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setRulesOpen(false);
        }
        return;
      }
      if (!v.bet) return;
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        game.betKey(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        game.betKey('BS');
      } else if (e.key === 'Enter') {
        // ボタンにフォーカスがあるときは、そのボタンを押す（ブラウザの標準の動き）
        if ((e.target as Element | null)?.closest?.('button')) return;
        e.preventDefault();
        game.confirmBet();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        game.escapeBet();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [game]);

  const start = () => {
    game.start();
    rootRef.current?.focus({ preventScroll: true });
  };

  const onAction = (a: ActionButton) => {
    switch (a.kind) {
      case 'check':
      case 'call':
      case 'fold':
        return game.act(a.kind);
      case 'bet':
      case 'raise':
        return game.openBet(a.kind);
      case 'keep':
        return game.exchange(false);
      case 'exchange':
        return game.exchange(true);
      case 'next':
        return game.next();
    }
  };

  const seatClass = (seat: Seat) =>
    [
      styles.seat,
      seat === 'you' ? styles.seatYou : styles.seatCpu,
      view.dealer === seat && styles.isDealer,
      view.winner === seat && styles.isWinner,
    ]
      .filter(Boolean)
      .join(' ');

  return (
    <div
      ref={rootRef}
      className={`${styles.root} ${view.bet ? styles.isBetting : ''}`}
      data-phase={view.phase}
      tabIndex={-1}
      role="region"
      aria-label="1vs1 ポーカー"
    >
      <div className={styles.table} aria-hidden="true" />

      <div className={styles.top}>
        <p className={styles.round}>
          ROUND <b>{view.round}</b>
          <span>/{ROUNDS}</span>
        </p>
        <button type="button" className={styles.rulesButton} onClick={() => setRulesOpen(true)}>
          ？ ルール
        </button>
      </div>

      <section className={seatClass('cpu')} aria-label="CPU">
        <SeatInfo seat="cpu" view={view} />
        <div className={styles.hand}>
          {view.hands.cpu.map((c, i) => (
            <PlayingCard
              key={c.id}
              card={c.card}
              down={c.down}
              dealDelay={c.dealDelay}
              leaving={c.leaving}
              flipDelay={i * TIMING.flipStagger}
            />
          ))}
        </div>
      </section>

      <section className={styles.center}>
        <p className={styles.pot}>
          <span>POT</span>
          <b>{fmt(pot)}</b>
        </p>
        <p className={styles.message} aria-live="polite">
          {view.message}
        </p>
      </section>

      <section className={seatClass('you')} aria-label="あなた">
        <SeatInfo seat="you" view={view} />
        <div className={styles.hand}>
          {view.hands.you.map((c, i) => (
            <PlayingCard
              key={c.id}
              as="button"
              card={c.card}
              down={c.down}
              dealDelay={c.dealDelay}
              leaving={c.leaving}
              selected={c.selected}
              disabled={view.phase !== 'exchange'}
              onClick={() => game.toggleCard(i)}
            />
          ))}
        </div>
      </section>

      <div className={styles.actions}>
        {view.actions.map((a) => (
          <button
            key={a.kind}
            type="button"
            className={`${styles.btn} ${VARIANT[a.kind]}`}
            disabled={a.disabled}
            onClick={() => onAction(a)}
          >
            <ActionLabel action={a} />
          </button>
        ))}
      </div>

      {view.bet && (
        <BetPanel
          bet={view.bet}
          onKey={(k) => game.betKey(k)}
          onStep={(d) => game.betStep(d)}
          onPreset={(p) => game.betPreset(p)}
          onCancel={() => {
            game.cancelBet();
            rootRef.current?.focus({ preventScroll: true });
          }}
          onConfirm={() => {
            game.confirmBet();
            rootRef.current?.focus({ preventScroll: true });
          }}
        />
      )}

      {view.banner && (
        <div key={view.banner.id} className={styles.banner} data-tone={view.banner.tone}>
          <p>
            {view.banner.title}
            <small>{view.banner.sub}</small>
          </p>
        </div>
      )}

      {view.phase === 'start' && (
        <div className={`${styles.layer} ${styles.start}`}>
          <div className={styles.startInner}>
            <p className={styles.kicker}>NEON CASINO</p>
            <h2 className={styles.title}>
              1vs1 <span>POKER</span>
            </h2>
            <p className={styles.subtitle}>CPU と10回戦。コインを増やせ！</p>
            <button type="button" className={`${styles.btn} ${styles.primary} ${styles.startButton}`} onClick={start}>
              START
            </button>
            <p className={styles.note}>PCはクリックとキーボード、スマホはタップで遊べます</p>
          </div>
        </div>
      )}

      {rulesOpen && <RulesModal onClose={() => setRulesOpen(false)} />}

      <ResultModal
        isOpen={view.phase === 'over'}
        scoreLabel="最終コイン"
        score={view.score ?? 0}
        unit="枚"
        shareText={`1vs1 ポーカーでコインを${fmt(view.score ?? 0)}枚にした！ #NEON_GAMES`}
        onRetry={start}
      />
    </div>
  );
}
