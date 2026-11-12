'use client';

import { useEffect, useRef, useState } from 'react';
import { FacebookIcon, LineIcon, LinkIcon, XIcon } from './icons';
import { buildShareUrl, resolveShareUrl, type ShareTarget } from './shareUrls';
import styles from './ShareButtons.module.scss';

export type ShareButtonsProps = {
  /** シェアする文章 */
  text: string;
  /** シェアする URL。省略時は現在のページ。"/" のような相対パスも使える */
  url?: string;
  /** 小見出し */
  title?: string;
  className?: string;
};

const COPIED_MS = 1600;

const TARGETS: { target: ShareTarget; label: string; Icon: typeof XIcon }[] = [
  { target: 'x', label: 'ポスト', Icon: XIcon },
  { target: 'line', label: 'LINE', Icon: LineIcon },
  { target: 'facebook', label: 'Facebook', Icon: FacebookIcon },
];

/**
 * SNS シェアのボタン群（docs/design.md §5 ShareButtons）。
 * 見た目は CSS カスタムプロパティ --share-border / --share-bg / --share-bg-hover / --share-ink / --share-radius で上書きできる。
 * 大きさは既定で cqw（親のコンテナ幅）に比例する。コンテナの外で使うときは
 * --share-height / --share-padding / --share-gap / --share-font-size / --share-icon-size /
 * --share-title-size / --share-title-gap / --share-justify で指定する。
 */
export function ShareButtons({ text, url, title = '結果をシェア', className }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const share = (target: ShareTarget) => {
    window.open(buildShareUrl(target, text, resolveShareUrl(url)), '_blank', 'noopener,width=600,height=560');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${text} ${resolveShareUrl(url)}`);
    } catch {
      return;
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), COPIED_MS);
  };

  return (
    <div className={[styles.root, className].filter(Boolean).join(' ')}>
      <p className={styles.title}>{title}</p>
      <div className={styles.buttons}>
        {TARGETS.map(({ target, label, Icon }) => (
          <button key={target} type="button" className={styles.button} onClick={() => share(target)}>
            <Icon className={styles.icon} />
            <span>{label}</span>
          </button>
        ))}
        <button type="button" className={styles.button} onClick={copy}>
          <LinkIcon className={styles.icon} />
          <span aria-live="polite">{copied ? 'コピーしました' : 'URLをコピー'}</span>
        </button>
      </div>
    </div>
  );
}
