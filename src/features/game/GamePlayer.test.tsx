import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppFooter } from '@/components/AppFooter';
import { AppHeader } from '@/components/AppHeader';
import { useGameFrame } from '@/components/GameFrame';
import { LeaveGuardProvider } from '@/contexts/LeaveGuardContext';
import { gameComponents } from '@/games';
import type { Game } from '@/types/game';
import { GamePlayer } from './GamePlayer';

const push = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

const game: Game = { id: 'test-game', title: 'テストゲーム', image: '', categoryIds: [] };

function PauseProbe() {
  const { isPaused } = useGameFrame();
  return <p>{isPaused ? 'PAUSED' : 'PLAYING'}</p>;
}

function renderPage(withPlayer = true) {
  return render(
    <LeaveGuardProvider>
      <AppHeader />
      {withPlayer && <GamePlayer game={game} />}
      <AppFooter />
    </LeaveGuardProvider>,
  );
}

beforeAll(() => {
  gameComponents[game.id] = PauseProbe;
});
afterAll(() => {
  delete gameComponents[game.id];
});
beforeEach(() => push.mockClear());

describe('GamePlayer', () => {
  it('ゲーム名、ゲーム本体、戻るボタンを表示する', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'テストゲーム' })).toBeInTheDocument();
    expect(screen.queryByText('STAGE 01')).toBeNull();
    expect(screen.getByText('PLAYING')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '◀ EXIT ／ TOPに戻る' })).toBeInTheDocument();
  });

  it('戻るボタンで ConfirmModal を開き、ゲームに一時停止を伝える', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: '◀ EXIT ／ TOPに戻る' }));
    const dialog = screen.getByRole('dialog', { name: 'ゲームを終了しますか？' });
    expect(dialog).not.toHaveTextContent('保存されません');
    expect(screen.getByText('PAUSED')).toBeInTheDocument();
  });

  it('「はい」で TOP へ移動する', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: '◀ EXIT ／ TOPに戻る' }));
    await user.click(screen.getByRole('button', { name: 'はい' }));
    expect(push).toHaveBeenCalledWith('/');
  });

  it('「いいえ」で閉じてゲームを続ける', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: '◀ EXIT ／ TOPに戻る' }));
    await user.click(screen.getByRole('button', { name: 'いいえ' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('PLAYING')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it.each(['NEON_GAMES', 'ゲーム一覧'])('「%s」リンクは遷移せずに ConfirmModal を開く', async (name) => {
    const user = userEvent.setup();
    renderPage();
    const link = screen.getByRole('link', { name });
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    link.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('ゲームページ以外では、ロゴは通常のリンクとして振る舞う', () => {
    renderPage(false);
    const link = screen.getByRole('link', { name: 'NEON_GAMES' });
    expect(link).toHaveAttribute('href', '/');
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    link.dispatchEvent(event);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
