import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { GameFrame } from '@/components/GameFrame';
import Minesweeper from './Minesweeper';

const advance = (ms: number) =>
  act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });

function renderGame() {
  return render(
    <GameFrame>
      <Minesweeper />
    </GameFrame>,
  );
}

const cells = () => within(screen.getByRole('grid', { name: '盤面' })).getAllByRole('button');
const unopened = () => cells().filter((c) => c.getAttribute('aria-label')?.endsWith('未開封'));
const minesText = () => screen.getByText('残りの爆弾').nextSibling?.textContent;
const timeText = () => screen.getByText('経過時間').nextSibling?.textContent;

/** かんたんで、左上のマスを最初に掘る */
async function startEasy() {
  renderGame();
  fireEvent.click(screen.getByRole('button', { name: '掘りはじめる' }));
  fireEvent.click(screen.getByRole('button', { name: /かんたん/ }));
  fireEvent.click(cells()[0]);
  await advance(1000);
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('Minesweeper', () => {
  it('スタート画面 →「掘りはじめる」で難易度選択（上から かんたん・ふつう・むずかしい）', () => {
    renderGame();
    expect(screen.getByRole('heading', { name: 'マインスイーパ' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '掘りはじめる' }));
    const levels = screen.getAllByRole('button').filter((b) => b.dataset.level);
    expect(levels.map((b) => b.textContent)).toEqual(['かんたん10×6・爆弾 8', 'ふつう14×8・爆弾 18', 'むずかしい18×10・爆弾 35']);
    expect(levels[0]).toHaveFocus();
  });

  it('難易度を選ぶとすぐ盤面になり、最初の1マスはメニューを出さずに掘る', async () => {
    renderGame();
    fireEvent.click(screen.getByRole('button', { name: '掘りはじめる' }));
    fireEvent.click(screen.getByRole('button', { name: /ふつう/ }));
    expect(cells()).toHaveLength(14 * 8);
    expect(screen.getByText('最初に掘るマスを選んでください')).toBeInTheDocument();
    expect(minesText()).toBe('18 / 18');
    expect(timeText()).toBe('00:00:00');

    fireEvent.click(cells()[20]);
    expect(screen.queryByRole('group', { name: 'マスの操作' })).toBeNull();
    // 最初のマスとその周りは必ず開く（爆弾を置かない）
    expect(cells()[20].getAttribute('aria-label')).toBe('2行7列 空き');
    await advance(1000);
    expect(screen.queryByText('最初に掘るマスを選んでください')).toBeNull();
  });

  it('経過時間は、最初のマスが開き終わってから数え始め、hh:mm:ss で表示する', async () => {
    await startEasy();
    await advance(62_000);
    expect(timeText()).toMatch(/^00:01:0[12]$/);
  });

  it('2手目からはメニュー：掘る／旗を置く／キャンセル。旗を置くと爆弾の数が減り、旗のマスは「旗を外す」', async () => {
    await startEasy();
    const target = unopened()[0];
    fireEvent.click(target);
    const menu = screen.getByRole('group', { name: 'マスの操作' });
    expect(within(menu).getAllByRole('button').map((b) => b.textContent)).toEqual(['掘る', '旗を置く', 'キャンセル']);
    expect(within(menu).getByRole('button', { name: '掘る' })).toHaveFocus();

    fireEvent.click(within(menu).getByRole('button', { name: '旗を置く' }));
    expect(minesText()).toBe('7 / 8');
    expect(target.getAttribute('aria-label')).toMatch(/旗$/);

    fireEvent.click(target);
    const menu2 = screen.getByRole('group', { name: 'マスの操作' });
    expect(within(menu2).getAllByRole('button').map((b) => b.textContent)).toEqual(['旗を外す', 'キャンセル']);
    fireEvent.click(within(menu2).getByRole('button', { name: '旗を外す' }));
    expect(minesText()).toBe('8 / 8');
  });

  it('メニューは同じマス・Esc・キャンセルで閉じる', async () => {
    await startEasy();
    const target = unopened()[0];
    fireEvent.click(target);
    fireEvent.click(target);
    expect(screen.queryByRole('group', { name: 'マスの操作' })).toBeNull();
    fireEvent.click(target);
    fireEvent.keyDown(screen.getByRole('group', { name: 'マスの操作' }), { key: 'Escape' });
    expect(screen.queryByRole('group', { name: 'マスの操作' })).toBeNull();
  });

  it('スタート画面に戻る：確認中は時間が止まり、「いいえ」で続き、「はい」でスタート画面へ', async () => {
    await startEasy();
    await advance(3000);
    fireEvent.click(screen.getByRole('button', { name: 'スタート画面に戻る' }));
    const dialog = screen.getByRole('dialog', { name: 'スタート画面に戻りますか？' });
    expect(within(dialog).getByRole('button', { name: 'いいえ' })).toHaveFocus();
    const before = timeText();
    await advance(10_000);
    expect(timeText()).toBe(before);

    fireEvent.click(within(dialog).getByRole('button', { name: 'いいえ' }));
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'スタート画面に戻る' }));
    fireEvent.click(screen.getByRole('button', { name: 'はい' }));
    expect(screen.getByRole('button', { name: '掘りはじめる' })).toBeInTheDocument();
  });

  it('最後まで掘ると、クリアかゲームオーバーの ResultModal になり、時間がスコアになる。「もう1度プレイする」で難易度選択へ', async () => {
    await startEasy();
    for (let k = 0; k < 100 && !screen.queryByRole('dialog'); k++) {
      const next = unopened()[0];
      if (!next) {
        await advance(5000);
        continue;
      }
      fireEvent.click(next);
      const menu = screen.queryByRole('group', { name: 'マスの操作' });
      if (menu) fireEvent.click(within(menu).getByRole('button', { name: '掘る' }));
      await advance(5000);
    }
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAccessibleName(/^(クリアタイム|ゲームオーバー)（かんたん）$/);
    expect(dialog).toHaveTextContent(/\d\d:\d\d:\d\d/);

    fireEvent.click(within(dialog).getByRole('button', { name: 'もう1度プレイする' }));
    expect(screen.getByText('難易度をえらんでください')).toBeInTheDocument();
  });
});
