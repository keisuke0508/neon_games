import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBox } from './SearchBox';

describe('SearchBox', () => {
  it('role="search" の form 内に、ラベル付きの検索欄を表示する', () => {
    render(<SearchBox value="" onChange={jest.fn()} />);
    expect(screen.getByRole('search')).toBeInTheDocument();
    const input = screen.getByRole('searchbox', { name: 'ゲーム名でさがす' });
    expect(input).toHaveAttribute('placeholder', 'ゲーム名を入力');
  });

  it('入力のたびに onChange を呼ぶ', async () => {
    const onChange = jest.fn();
    render(<SearchBox value="" onChange={onChange} />);
    await userEvent.type(screen.getByRole('searchbox'), 'ab');
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('submit しても画面遷移しない', () => {
    render(<SearchBox value="" onChange={jest.fn()} />);
    const event = new Event('submit', { bubbles: true, cancelable: true });
    fireEvent(screen.getByRole('search'), event);
    expect(event.defaultPrevented).toBe(true);
  });
});
