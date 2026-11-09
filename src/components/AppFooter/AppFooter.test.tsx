import { render, screen } from '@testing-library/react';
import { LeaveGuardProvider } from '@/contexts/LeaveGuardContext';
import { AppFooter } from './AppFooter';

describe('AppFooter', () => {
  it('ゲーム一覧・利用規約・プライバシーのリンクとコピーライトを表示する', () => {
    render(
      <LeaveGuardProvider>
        <AppFooter />
      </LeaveGuardProvider>,
    );
    expect(screen.getByRole('link', { name: 'ゲーム一覧' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: '利用規約' })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: 'プライバシー' })).toHaveAttribute('href', '/privacy_policy');
    expect(screen.getByText('© 2026 NEON_GAMES')).toBeInTheDocument();
  });
});
