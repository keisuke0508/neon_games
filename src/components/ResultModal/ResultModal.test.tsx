import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResultModal } from './ResultModal';

const props = {
  scoreLabel: '逃げた距離',
  score: 12345,
  unit: 'm',
  shareText: 'テスト',
  onRetry: jest.fn(),
};

describe('ResultModal', () => {
  it('閉じているときは何も描画しない', () => {
    render(<ResultModal {...props} isOpen={false} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('scoreLabel でラベル付けされた dialog に、3桁区切りのスコアと単位を表示する', () => {
    render(<ResultModal {...props} isOpen />);
    const dialog = screen.getByRole('dialog', { name: '逃げた距離' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveTextContent('12,345m');
    expect(screen.getByText('結果をシェア')).toBeInTheDocument();
  });

  it('開くと「もう1度プレイする」にフォーカスし、押すと onRetry を呼ぶ', async () => {
    const onRetry = jest.fn();
    render(<ResultModal {...props} isOpen onRetry={onRetry} />);
    const retry = screen.getByRole('button', { name: 'もう1度プレイする' });
    expect(retry).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('displayScore を渡すと、数値の代わりにその文字列を表示する', () => {
    render(<ResultModal {...props} isOpen score={83} displayScore="00:01:23" unit={undefined} />);
    expect(screen.getByRole('dialog')).toHaveTextContent('00:01:23');
    expect(screen.getByRole('dialog')).not.toHaveTextContent('83');
  });

  it('Esc では閉じない', async () => {
    render(<ResultModal {...props} isOpen />);
    await userEvent.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
