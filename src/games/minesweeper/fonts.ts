import { Dela_Gothic_One, Zen_Maru_Gothic } from 'next/font/google';

// このゲームのページでだけ読み込む（design/games/マインスイーパ.md §1 フォント）
export const delaGothicOne = Dela_Gothic_One({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dela',
});

export const zenMaruGothic = Zen_Maru_Gothic({
  weight: ['700', '900'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-zenmaru',
});
