import type { ReactNode } from 'react';
import styles from './StaticPage.module.scss';

export type StaticPageProps = {
  title: string;
  children: ReactNode;
};

/** 利用規約・プライバシーポリシーなどの文章ページの枠（本文確定までの暫定デザイン） */
export function StaticPage({ title, children }: StaticPageProps) {
  return (
    <article className={styles.page}>
      <h1 className={styles.heading}>{title}</h1>
      <div className={styles.body}>{children}</div>
    </article>
  );
}
