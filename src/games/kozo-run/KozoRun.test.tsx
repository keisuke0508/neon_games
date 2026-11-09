import { act, fireEvent, render, screen } from '@testing-library/react';
import { GameFrame } from '@/components/GameFrame';
import { FX } from './constants';
import KozoRun from './KozoRun';

// canvas と requestAnimationFrame はテストで手動制御する
let rafCallbacks: FrameRequestCallback[] = [];
let now = 0;

function runFrames(n: number) {
  for (let i = 0; i < n; i++) {
    now += 1000 / 60;
    const cbs = rafCallbacks;
    rafCallbacks = [];
    act(() => cbs.forEach((cb) => cb(now)));
  }
}

beforeEach(() => {
  rafCallbacks = [];
  now = 0;
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    rafCallbacks.push(cb);
    return rafCallbacks.length;
  });
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  const ctx = new Proxy(
    {},
    {
      get: (_, key) => (key === 'measureText' ? () => ({ width: 10 }) : key === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => {}),
      set: () => true,
    },
  );
  jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

async function renderGame(isPaused = false) {
  const utils = render(
    <GameFrame isPaused={isPaused}>
      <KozoRun />
    </GameFrame>,
  );
  // フォント読み込み（jsdom では document.fonts がないので即時）を待つ
  await act(async () => {});
  return utils;
}

const root = () => screen.getByRole('region', { name: '小僧ラン' });
const meter = () => screen.getByTestId('kozo-meter').textContent;

describe('KozoRun', () => {
  it('スタート画面を表示する', async () => {
    await renderGame();
    expect(root()).toHaveAttribute('data-phase', 'start');
    expect(screen.getByText('小僧ラン')).toBeInTheDocument();
    expect(screen.getByText('母ちゃんから にげきれ！')).toBeInTheDocument();
    expect(screen.getByText('スペースキー ／ 画面タップでジャンプ')).toBeInTheDocument();
  });

  it('「にげる！」でプレイを始め、走った距離を表示する', async () => {
    await renderGame();
    fireEvent.click(screen.getByRole('button', { name: 'にげる！' }));
    expect(root()).toHaveAttribute('data-phase', 'play');
    expect(screen.queryByRole('button', { name: 'にげる！' })).toBeNull();
    runFrames(30); // 15px × 30 = 450px = 11m
    expect(meter()).toBe('11');
  });

  it('スタート画面で Space を押すと始まり、プレイ中の Space はページをスクロールさせない', async () => {
    await renderGame();
    fireEvent.keyDown(window, { code: 'Space' });
    expect(root()).toHaveAttribute('data-phase', 'play');
    const event = new KeyboardEvent('keydown', { code: 'Space', cancelable: true, bubbles: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('一時停止中（ConfirmModal 表示中）は進まず、入力も受け付けない', async () => {
    const { rerender } = await renderGame();
    fireEvent.click(screen.getByRole('button', { name: 'にげる！' }));
    runFrames(60);
    rerender(
      <GameFrame isPaused>
        <KozoRun />
      </GameFrame>,
    );
    const before = meter();
    runFrames(120);
    expect(meter()).toBe(before);
    const event = new KeyboardEvent('keydown', { code: 'Space', cancelable: true, bubbles: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it('つかまると 650ms 後に ResultModal を開き、「もう1度プレイする」ですぐ再開する', async () => {
    // requestAnimationFrame は手動制御のまま、setTimeout だけ偽物にする
    jest.useFakeTimers({ doNotFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    await renderGame();
    fireEvent.click(screen.getByRole('button', { name: 'にげる！' }));
    // 最初の障害物（700px 先）で止まり続けるとつかまる
    for (let i = 0; i < 40 && root().dataset.phase === 'play'; i++) runFrames(10);
    expect(root()).toHaveAttribute('data-phase', 'caught');
    expect(screen.queryByRole('dialog')).toBeNull();

    act(() => jest.advanceTimersByTime(FX.resultDelayMs));
    const dialog = screen.getByRole('dialog', { name: '逃げた距離' });
    expect(dialog).toHaveTextContent(`${meter()}m`);
    expect(screen.getByRole('button', { name: 'もう1度プレイする' })).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: 'もう1度プレイする' }));
    expect(root()).toHaveAttribute('data-phase', 'play');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(meter()).toBe('0');
  });
});
