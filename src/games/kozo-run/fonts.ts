import { Mochiy_Pop_One, Zen_Maru_Gothic } from 'next/font/google';

// このゲームのページでだけ読み込む（docs/games/小僧ラン_design.md §1 フォント）
export const mochiyPopOne = Mochiy_Pop_One({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mochiy',
});

export const zenMaruGothic = Zen_Maru_Gothic({
  weight: ['700', '900'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-zenmaru',
});

/** canvas に描く文字（フォントの日本語部分を先に読み込んでおく） */
export const CANVAS_TEXT = 'まちなさーい！つかまえた！ひぃ〜z';
