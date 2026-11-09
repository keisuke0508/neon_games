import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShareButtons } from './ShareButtons';
import { buildShareUrl } from './shareUrls';

const TEXT = '小僧ランで母ちゃんから12m逃げた！ #小僧ラン #NEON_GAMES';
const URL_ = 'https://example.com/game/1';

describe('buildShareUrl', () => {
  it('X / LINE / Facebook のシェア URL を組み立てる', () => {
    const t = encodeURIComponent(TEXT);
    const u = encodeURIComponent(URL_);
    expect(buildShareUrl('x', TEXT, URL_)).toBe(`https://x.com/intent/post?text=${t}&url=${u}`);
    expect(buildShareUrl('line', TEXT, URL_)).toBe(`https://social-plugins.line.me/lineit/share?url=${u}&text=${t}`);
    expect(buildShareUrl('facebook', TEXT, URL_)).toBe(`https://www.facebook.com/sharer/sharer.php?u=${u}`);
  });
});

describe('ShareButtons', () => {
  it('小見出しと4つのボタンを表示する', () => {
    render(<ShareButtons text={TEXT} url={URL_} />);
    expect(screen.getByText('結果をシェア')).toBeInTheDocument();
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['ポスト', 'LINE', 'Facebook', 'URLをコピー']);
  });

  it('SNS のボタンでシェア画面を別ウィンドウで開く', async () => {
    const open = jest.spyOn(window, 'open').mockReturnValue(null);
    render(<ShareButtons text={TEXT} url={URL_} />);
    await userEvent.click(screen.getByRole('button', { name: 'ポスト' }));
    expect(open).toHaveBeenCalledWith(buildShareUrl('x', TEXT, URL_), '_blank', expect.stringContaining('noopener'));
    open.mockRestore();
  });

  it('URL を省略すると現在のページの URL を使う', async () => {
    const open = jest.spyOn(window, 'open').mockReturnValue(null);
    render(<ShareButtons text={TEXT} />);
    await userEvent.click(screen.getByRole('button', { name: 'Facebook' }));
    expect(open).toHaveBeenCalledWith(
      buildShareUrl('facebook', TEXT, `${window.location.origin}${window.location.pathname}`),
      '_blank',
      expect.any(String),
    );
    open.mockRestore();
  });

  it('「URLをコピー」で文章と URL をコピーし、1.6秒間「コピーしました」にする', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    // user-event は setup() で navigator.clipboard を差し替えるので、その後で監視する
    const writeText = jest.spyOn(navigator.clipboard, 'writeText');

    render(<ShareButtons text={TEXT} url={URL_} />);
    await user.click(screen.getByRole('button', { name: 'URLをコピー' }));
    expect(writeText).toHaveBeenCalledWith(`${TEXT} ${URL_}`);
    expect(await screen.findByRole('button', { name: 'コピーしました' })).toBeInTheDocument();

    act(() => jest.advanceTimersByTime(1600));
    expect(screen.getByRole('button', { name: 'URLをコピー' })).toBeInTheDocument();
    jest.useRealTimers();
  });
});
