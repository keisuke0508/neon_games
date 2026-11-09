export type ShareTarget = 'x' | 'line' | 'facebook';

/** SNS ごとのシェア用 URL（docs/design.md §5 ShareButtons） */
export function buildShareUrl(target: ShareTarget, text: string, url: string): string {
  const t = encodeURIComponent(text);
  const u = encodeURIComponent(url);
  switch (target) {
    case 'x':
      return `https://x.com/intent/post?text=${t}&url=${u}`;
    case 'line':
      return `https://social-plugins.line.me/lineit/share?url=${u}&text=${t}`;
    case 'facebook':
      // Facebook は文章を渡せない
      return `https://www.facebook.com/sharer/sharer.php?u=${u}`;
  }
}

/** 現在のページの URL（ハッシュとクエリを除く） */
export function currentPageUrl(): string {
  return `${window.location.origin}${window.location.pathname}`;
}
