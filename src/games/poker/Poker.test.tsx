import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { GameFrame } from '@/components/GameFrame';
import Poker from './Poker';

function renderGame(isPaused = false) {
  return render(
    <GameFrame isPaused={isPaused}>
      <Poker />
    </GameFrame>,
  );
}

/** 待ち時間を進める（進行は Promise でつながっているので、非同期で進める） */
const advance = (ms: number) =>
  act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });

beforeEach(() => {
  jest.useFakeTimers();
  // 親決めで「あなた」が親になる
  jest.spyOn(Math, 'random').mockReturnValue(0.1);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('Poker', () => {
  it('スタート画面を表示する', () => {
    renderGame();
    expect(screen.getByRole('heading', { name: '1vs1 POKER' })).toBeInTheDocument();
    expect(screen.getByText('CPU と10回戦。コインを増やせ！')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'START' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '？ ルール' })).toBeInTheDocument();
  });

  it('ルール説明：役を強い順に並べ、× にフォーカスし、Esc で閉じて元の場所にフォーカスを戻す', () => {
    renderGame();
    const open = screen.getByRole('button', { name: '？ ルール' });
    open.focus();
    fireEvent.click(open);
    const dialog = screen.getByRole('dialog', { name: 'ルール説明' });
    expect(screen.getByRole('button', { name: '閉じる' })).toHaveFocus();
    const items = within(dialog).getAllByRole('listitem').filter((li) => li.closest('ol'));
    expect(items[0]).toHaveTextContent('ファイブカード');
    expect(items[items.length - 1]).toHaveTextContent('ノーペア');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'ルール説明' })).toBeNull();
    expect(open).toHaveFocus();
  });

  it('START で親を決め、自分が親なら電卓が開き、キーボードで金額を入れてベットできる', async () => {
    renderGame();
    fireEvent.click(screen.getByRole('button', { name: 'START' }));
    await advance(10_000);

    // カードが5枚配られ、交換の前は押せない
    const cards = within(screen.getByRole('region', { name: 'あなた' })).getAllByRole('button');
    expect(cards).toHaveLength(5);
    cards.forEach((c) => expect(c).toBeDisabled());

    const panel = screen.getByRole('dialog', { name: '賭け金の入力' });
    expect(within(panel).queryByRole('button', { name: '戻る' })).toBeNull(); // 1回目の親は必ず賭ける
    fireEvent.keyDown(window, { key: '3' });
    fireEvent.keyDown(window, { key: '0' });
    fireEvent.keyDown(window, { key: '0' });
    expect(within(panel).getByRole('button', { name: 'ベット 300' })).toBeEnabled();
    fireEvent.keyDown(document.body, { key: 'Enter' });

    expect(screen.queryByRole('dialog', { name: '賭け金の入力' })).toBeNull();
    // POT は 参加費 100 × 2 ＋ ベット 300。すぐに CPU の番になる
    await advance(500);
    expect(screen.getByText('POT').nextSibling).toHaveTextContent('500');
    expect(screen.getByText('CPU 考え中…')).toBeInTheDocument();
  });

  it('一時停止中（ConfirmModal 表示中）は、キー入力を受け付けない', async () => {
    const { rerender } = renderGame();
    fireEvent.click(screen.getByRole('button', { name: 'START' }));
    await advance(10_000);
    rerender(
      <GameFrame isPaused>
        <Poker />
      </GameFrame>,
    );
    fireEvent.keyDown(window, { key: '7' });
    expect(within(screen.getByRole('dialog', { name: '賭け金の入力' })).getByRole('button', { name: 'ベット 200' })).toBeInTheDocument();
  });
});
