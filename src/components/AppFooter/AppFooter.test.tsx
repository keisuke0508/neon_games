import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeaveGuardProvider } from '@/contexts/LeaveGuardContext';
import { buildShareUrl } from '../ShareButtons/shareUrls';
import { AppFooter, SHARE_TEXT } from './AppFooter';

function renderFooter() {
  return render(
    <LeaveGuardProvider>
      <AppFooter />
    </LeaveGuardProvider>,
  );
}

describe('AppFooter', () => {
  it('ゲーム一覧・利用規約・プライバシーのリンクとコピーライトを表示する', () => {
    renderFooter();
    expect(screen.getByRole('link', { name: 'ゲーム一覧' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: '利用規約' })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: 'プライバシー' })).toHaveAttribute('href', '/privacy_policy');
    expect(screen.getByText('© 2026 NEON_GAMES')).toBeInTheDocument();
  });

  it('サービスのシェアボタンを表示し、どのページからでもトップページの URL をシェアする', async () => {
    window.history.pushState({}, '', '/game/2');
    const open = jest.spyOn(window, 'open').mockReturnValue(null);
    renderFooter();
    expect(screen.getByText('NEON_GAMES をシェア')).toBeInTheDocument();
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['ポスト', 'LINE', 'Facebook', 'URLをコピー']);

    await userEvent.click(screen.getByRole('button', { name: 'ポスト' }));
    expect(open).toHaveBeenCalledWith(buildShareUrl('x', SHARE_TEXT, `${window.location.origin}/`), '_blank', expect.any(String));
    open.mockRestore();
    window.history.pushState({}, '', '/');
  });
});
