import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppButton } from './AppButton';

describe('AppButton', () => {
  it('type="button" のボタンを描画し、クリックで onClick を呼ぶ', async () => {
    const onClick = jest.fn();
    render(<AppButton onClick={onClick}>押す</AppButton>);
    const button = screen.getByRole('button', { name: '押す' });
    expect(button).toHaveAttribute('type', 'button');
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('variant に応じた class を付ける（既定は primary）', () => {
    render(
      <>
        <AppButton>A</AppButton>
        <AppButton variant="danger">B</AppButton>
        <AppButton variant="secondary">C</AppButton>
      </>,
    );
    expect(screen.getByRole('button', { name: 'A' })).toHaveClass('primary');
    expect(screen.getByRole('button', { name: 'B' })).toHaveClass('danger');
    expect(screen.getByRole('button', { name: 'C' })).toHaveClass('secondary');
  });

  it('href を渡すとリンクとして描画する', () => {
    render(<AppButton href="/">TOPに戻る</AppButton>);
    const link = screen.getByRole('link', { name: 'TOPに戻る' });
    expect(link).toHaveAttribute('href', '/');
    expect(link).toHaveClass('button', 'primary');
  });
});
