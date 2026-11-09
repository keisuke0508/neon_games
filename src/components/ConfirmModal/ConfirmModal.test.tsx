import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { ConfirmModal } from './ConfirmModal';

function Harness({ onConfirm = jest.fn() }: { onConfirm?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        開く
      </button>
      <ConfirmModal
        isOpen={open}
        kicker="QUIT GAME?"
        title="ゲームを終了しますか？"
        message="プレイ中の内容は保存されません。"
        onConfirm={onConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}

async function openModal(onConfirm?: () => void) {
  const user = userEvent.setup();
  render(<Harness onConfirm={onConfirm} />);
  await user.click(screen.getByRole('button', { name: '開く' }));
  return user;
}

describe('ConfirmModal', () => {
  it('閉じているときは何も描画しない', () => {
    render(<Harness />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('dialog としてタイトルでラベル付けされ、文言を表示する', async () => {
    await openModal();
    const dialog = screen.getByRole('dialog', { name: 'ゲームを終了しますか？' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveTextContent('QUIT GAME?');
    expect(dialog).toHaveTextContent('プレイ中の内容は保存されません。');
  });

  it('ボタンは左が「いいえ」、右が「はい」で、開くと「いいえ」にフォーカスする', async () => {
    await openModal();
    const buttons = screen.getAllByRole('button').filter((b) => b.closest('[role="dialog"]'));
    expect(buttons.map((b) => b.textContent)).toEqual(['いいえ', 'はい']);
    expect(screen.getByRole('button', { name: 'いいえ' })).toHaveFocus();
  });

  it('「はい」で onConfirm を呼ぶ', async () => {
    const onConfirm = jest.fn();
    const user = await openModal(onConfirm);
    await user.click(screen.getByRole('button', { name: 'はい' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['「いいえ」', (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole('button', { name: 'いいえ' }))],
    ['Esc', (user: ReturnType<typeof userEvent.setup>) => user.keyboard('{Escape}')],
    ['背景クリック', (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByTestId('confirm-modal-backdrop'))],
  ])('%s で閉じ、開く前の要素にフォーカスを戻す', async (_, action) => {
    const user = await openModal();
    await action(user);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: '開く' })).toHaveFocus();
  });

  it('Tab でモーダル内をフォーカス循環する', async () => {
    const user = await openModal();
    const no = screen.getByRole('button', { name: 'いいえ' });
    const yes = screen.getByRole('button', { name: 'はい' });
    await user.tab();
    expect(yes).toHaveFocus();
    await user.tab();
    expect(no).toHaveFocus();
    await user.tab({ shift: true });
    expect(yes).toHaveFocus();
  });

  it('開いている間は背面のスクロールを止める', async () => {
    const user = await openModal();
    expect(document.body.style.overflow).toBe('hidden');
    await user.keyboard('{Escape}');
    expect(document.body.style.overflow).toBe('');
  });
});
