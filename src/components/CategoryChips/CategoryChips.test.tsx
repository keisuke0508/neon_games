import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ALL_CATEGORY } from '@/lib/filterGames';
import { CategoryChips } from './CategoryChips';

const categories = [
  { id: 'puzzle', categoryName: 'パズル' },
  { id: 'action', categoryName: 'アクション' },
];

describe('CategoryChips', () => {
  it('先頭に ALL、続けてカテゴリをデータ順に並べ、選択中を aria-pressed で示す', () => {
    render(<CategoryChips categories={categories} selectedId={ALL_CATEGORY} onChange={jest.fn()} />);
    const group = screen.getByRole('group', { name: 'カテゴリ' });
    const buttons = Array.from(group.querySelectorAll('button'));
    expect(buttons.map((b) => b.textContent)).toEqual(['ALL', 'パズル', 'アクション']);
    expect(buttons.map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false']);
  });

  it('クリックでカテゴリ id を通知する', async () => {
    const onChange = jest.fn();
    render(<CategoryChips categories={categories} selectedId={ALL_CATEGORY} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'アクション' }));
    expect(onChange).toHaveBeenCalledWith('action');
  });
});
