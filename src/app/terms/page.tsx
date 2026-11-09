import type { Metadata } from 'next';
import { StaticPage } from '@/components/StaticPage';

export const metadata: Metadata = {
  title: '利用規約',
};

// TODO: 本文確定後に差し替える
export default function TermsPage() {
  return (
    <div className="container">
      <StaticPage title="利用規約">
        <p>準備中です。</p>
      </StaticPage>
    </div>
  );
}
